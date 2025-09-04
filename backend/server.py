from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import jwt
from passlib.hash import bcrypt
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app without a prefix
app = FastAPI(title="Flicksy API", description="Connect, Share, Discover – Welcome to Flicksy!")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# User Models
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    display_name: str = Field(..., min_length=1, max_length=50)
    bio: Optional[str] = Field(None, max_length=160)
    is_verified: bool = False
    role: str = "user"  # user, moderator, admin, super_admin

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0

class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    bio: Optional[str]
    is_verified: bool
    role: str
    followers_count: int
    following_count: int
    posts_count: int
    created_at: datetime

# Search Models
class SearchResult(BaseModel):
    users: List[UserResponse]
    posts: List['PostResponse']
    total_results: int

# Post Models
class PostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    author_id: str
    author_username: str
    author_display_name: str
    author_is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    likes_count: int = 0
    comments_count: int = 0
    reposts_count: int = 0

class PostResponse(Post):
    liked_by_user: bool = False

# Comment Models
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=280)

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    post_id: str
    author_id: str
    author_username: str
    author_display_name: str
    author_is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    likes_count: int = 0

# Admin Models
class AdminStats(BaseModel):
    total_users: int
    total_posts: int
    total_comments: int
    verified_users: int
    pending_verifications: int
    recent_signups: int

class VerificationRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_username: str
    user_display_name: str
    reason: str
    status: str  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None

class VerificationRequestCreate(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)

class UserManagement(BaseModel):
    id: str
    username: str
    display_name: str
    email: str
    is_verified: bool
    role: str
    posts_count: int
    created_at: datetime
    is_banned: bool = False

# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Utility Functions
def validate_username(username: str) -> bool:
    """Validate username format: alphanumeric and underscores only"""
    return bool(re.match(r'^[a-zA-Z0-9_]+$', username))

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.verify(password, hashed)

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user has admin permissions"""
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def get_moderator_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user has moderator permissions"""
    if current_user["role"] not in ["moderator", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Moderator access required")
    return current_user

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Validate username format
    if not validate_username(user_data.username):
        raise HTTPException(
            status_code=400, 
            detail="Username can only contain letters, numbers, and underscores"
        )
    
    # Check if username or email already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"username": user_data.username},
            {"email": user_data.email}
        ]
    })
    
    if existing_user:
        if existing_user["username"] == user_data.username:
            raise HTTPException(status_code=400, detail="Username already taken")
        else:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    
    user = User(**user_dict)
    user_doc = user.dict()
    user_doc["password_hash"] = hashed_password
    user_doc["is_banned"] = False
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.dict())
    )

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    # Find user by username
    user = await db.users.find_one({"username": login_data.username})
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Check if user is banned
    if user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Account has been suspended")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**{k: v for k, v in user.items() if k != "password_hash"})
    )

# User Routes
@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in current_user.items() if k != "password_hash"})

@api_router.get("/users/{username}", response_model=UserResponse)
async def get_user_profile(username: str):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(**{k: v for k, v in user.items() if k != "password_hash"})

# Search Routes
@api_router.get("/search", response_model=SearchResult)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    type: str = Query("all", regex="^(all|users|posts)$", description="Search type"),
    limit: int = Query(10, ge=1, le=50, description="Results limit"),
    current_user: dict = Depends(get_current_user)
):
    """Search for users and posts"""
    users = []
    posts = []
    
    # Create case-insensitive regex pattern
    search_pattern = {"$regex": re.escape(q), "$options": "i"}
    
    if type in ["all", "users"]:
        # Search users by username, display_name, or bio
        user_cursor = db.users.find({
            "$or": [
                {"username": search_pattern},
                {"display_name": search_pattern},
                {"bio": search_pattern}
            ],
            "is_banned": {"$ne": True}
        }).limit(limit)
        
        user_docs = await user_cursor.to_list(length=limit)
        users = [UserResponse(**{k: v for k, v in user.items() if k != "password_hash"}) 
                for user in user_docs]
    
    if type in ["all", "posts"]:
        # Search posts by content
        posts_cursor = db.posts.find({
            "content": search_pattern
        }).sort("created_at", -1).limit(limit)
        
        post_docs = await posts_cursor.to_list(length=limit)
        
        # Check which posts are liked by current user
        post_ids = [post["id"] for post in post_docs]
        liked_posts = await db.likes.find({
            "user_id": current_user["id"],
            "post_id": {"$in": post_ids}
        }).to_list(len(post_ids))
        
        liked_post_ids = {like["post_id"] for like in liked_posts}
        
        posts = [PostResponse(**post, liked_by_user=post["id"] in liked_post_ids) 
                for post in post_docs]
    
    total_results = len(users) + len(posts)
    
    return SearchResult(
        users=users,
        posts=posts,
        total_results=total_results
    )

@api_router.get("/trending/hashtags")
async def get_trending_hashtags(limit: int = Query(10, ge=1, le=20)):
    """Get trending hashtags"""
    # Simple hashtag extraction from recent posts
    recent_posts = await db.posts.find().sort("created_at", -1).limit(1000).to_list(1000)
    
    hashtag_counts = {}
    hashtag_pattern = re.compile(r'#(\w+)', re.IGNORECASE)
    
    for post in recent_posts:
        hashtags = hashtag_pattern.findall(post["content"])
        for hashtag in hashtags:
            hashtag_lower = hashtag.lower()
            hashtag_counts[hashtag_lower] = hashtag_counts.get(hashtag_lower, 0) + 1
    
    # Sort by count and return top hashtags
    trending = sorted(hashtag_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    return [{"hashtag": f"#{hashtag}", "count": count} for hashtag, count in trending]

# Post Routes
@api_router.post("/posts", response_model=PostResponse)
async def create_post(post_data: PostCreate, current_user: dict = Depends(get_current_user)):
    # Check if user is banned
    if current_user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Account suspended - cannot create posts")
    
    post = Post(
        content=post_data.content,
        author_id=current_user["id"],
        author_username=current_user["username"],
        author_display_name=current_user["display_name"],
        author_is_verified=current_user["is_verified"]
    )
    
    post_dict = post.dict()
    await db.posts.insert_one(post_dict)
    
    # Update user's post count
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"posts_count": 1}}
    )
    
    return PostResponse(**post.dict(), liked_by_user=False)

@api_router.get("/posts", response_model=List[PostResponse])
async def get_posts(limit: int = 20, skip: int = 0, current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find().sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Check which posts are liked by current user
    liked_posts = await db.likes.find({
        "user_id": current_user["id"],
        "post_id": {"$in": [post["id"] for post in posts]}
    }).to_list(len(posts))
    
    liked_post_ids = {like["post_id"] for like in liked_posts}
    
    post_responses = []
    for post in posts:
        post_response = PostResponse(**post, liked_by_user=post["id"] in liked_post_ids)
        post_responses.append(post_response)
    
    return post_responses

@api_router.get("/posts/trending", response_model=List[PostResponse])
async def get_trending_posts(limit: int = 10, current_user: dict = Depends(get_current_user)):
    """Get trending posts based on likes and comments in the last 24 hours"""
    # Get posts from last 24 hours and sort by engagement
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    posts = await db.posts.find({
        "created_at": {"$gte": twenty_four_hours_ago}
    }).sort([
        ("likes_count", -1),
        ("comments_count", -1),
        ("created_at", -1)
    ]).limit(limit).to_list(limit)
    
    # Check which posts are liked by current user
    liked_posts = await db.likes.find({
        "user_id": current_user["id"],
        "post_id": {"$in": [post["id"] for post in posts]}
    }).to_list(len(posts))
    
    liked_post_ids = {like["post_id"] for like in liked_posts}
    
    return [PostResponse(**post, liked_by_user=post["id"] in liked_post_ids) for post in posts]

@api_router.post("/posts/{post_id}/like")
async def toggle_like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    # Check if post exists
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if user already liked this post
    existing_like = await db.likes.find_one({
        "user_id": current_user["id"],
        "post_id": post_id
    })
    
    if existing_like:
        # Unlike the post
        await db.likes.delete_one({"id": existing_like["id"]})
        await db.posts.update_one(
            {"id": post_id},
            {"$inc": {"likes_count": -1}}
        )
        return {"liked": False, "message": "Post unliked"}
    else:
        # Like the post
        like_data = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "post_id": post_id,
            "created_at": datetime.now(timezone.utc)
        }
        await db.likes.insert_one(like_data)
        await db.posts.update_one(
            {"id": post_id},
            {"$inc": {"likes_count": 1}}
        )
        return {"liked": True, "message": "Post liked"}

@api_router.get("/posts/{post_id}/comments", response_model=List[Comment])
async def get_post_comments(post_id: str, limit: int = 50, skip: int = 0):
    # Check if post exists
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comments = await db.comments.find({"post_id": post_id}).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)
    return [Comment(**comment) for comment in comments]

@api_router.post("/posts/{post_id}/comments", response_model=Comment)
async def create_comment(post_id: str, comment_data: CommentCreate, current_user: dict = Depends(get_current_user)):
    # Check if user is banned
    if current_user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Account suspended - cannot comment")
    
    # Check if post exists
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = Comment(
        content=comment_data.content,
        post_id=post_id,
        author_id=current_user["id"],
        author_username=current_user["username"],
        author_display_name=current_user["display_name"],
        author_is_verified=current_user["is_verified"]
    )
    
    comment_dict = comment.dict()
    await db.comments.insert_one(comment_dict)
    
    # Update post's comment count
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return comment

# Verification Routes
@api_router.post("/verification/request")
async def request_verification(request_data: VerificationRequestCreate, current_user: dict = Depends(get_current_user)):
    # Check if user already has a pending request
    existing_request = await db.verification_requests.find_one({
        "user_id": current_user["id"],
        "status": "pending"
    })
    
    if existing_request:
        raise HTTPException(status_code=400, detail="You already have a pending verification request")
    
    # Check if user is already verified
    if current_user["is_verified"]:
        raise HTTPException(status_code=400, detail="User is already verified")
    
    verification_request = VerificationRequest(
        user_id=current_user["id"],
        user_username=current_user["username"],
        user_display_name=current_user["display_name"],
        reason=request_data.reason,
        status="pending"
    )
    
    await db.verification_requests.insert_one(verification_request.dict())
    return {"message": "Verification request submitted successfully"}

@api_router.get("/verification/my-requests", response_model=List[VerificationRequest])
async def get_my_verification_requests(current_user: dict = Depends(get_current_user)):
    requests = await db.verification_requests.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(10)
    return [VerificationRequest(**req) for req in requests]

# Admin Routes
@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(admin_user: dict = Depends(get_admin_user)):
    # Count total users
    total_users = await db.users.count_documents({})
    
    # Count total posts
    total_posts = await db.posts.count_documents({})
    
    # Count total comments
    total_comments = await db.comments.count_documents({})
    
    # Count verified users
    verified_users = await db.users.count_documents({"is_verified": True})
    
    # Count pending verification requests
    pending_verifications = await db.verification_requests.count_documents({"status": "pending"})
    
    # Count recent signups (last 7 days)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_signups = await db.users.count_documents({"created_at": {"$gte": seven_days_ago}})
    
    return AdminStats(
        total_users=total_users,
        total_posts=total_posts,
        total_comments=total_comments,
        verified_users=verified_users,
        pending_verifications=pending_verifications,
        recent_signups=recent_signups
    )

@api_router.get("/admin/users", response_model=List[UserManagement])
async def get_all_users(admin_user: dict = Depends(get_admin_user), limit: int = 50, skip: int = 0):
    users = await db.users.find().sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    user_list = []
    for user in users:
        user_mgmt = UserManagement(
            id=user["id"],
            username=user["username"],
            display_name=user["display_name"],
            email=user["email"],
            is_verified=user["is_verified"],
            role=user.get("role", "user"),
            posts_count=user.get("posts_count", 0),
            created_at=user["created_at"],
            is_banned=user.get("is_banned", False)
        )
        user_list.append(user_mgmt)
    
    return user_list

@api_router.get("/admin/verification-requests", response_model=List[VerificationRequest])
async def get_verification_requests(admin_user: dict = Depends(get_admin_user), status: str = "pending"):
    requests = await db.verification_requests.find({"status": status}).sort("created_at", -1).to_list(100)
    return [VerificationRequest(**req) for req in requests]

@api_router.post("/admin/verification/{request_id}/approve")
async def approve_verification(request_id: str, admin_user: dict = Depends(get_admin_user)):
    # Find the verification request
    request = await db.verification_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Verification request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request has already been processed")
    
    # Update the verification request
    await db.verification_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": admin_user["id"],
                "reviewed_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Verify the user
    await db.users.update_one(
        {"id": request["user_id"]},
        {"$set": {"is_verified": True}}
    )
    
    return {"message": "User verified successfully"}

@api_router.post("/admin/verification/{request_id}/reject")
async def reject_verification(request_id: str, admin_user: dict = Depends(get_admin_user)):
    # Find the verification request
    request = await db.verification_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Verification request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request has already been processed")
    
    # Update the verification request
    await db.verification_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "rejected",
                "reviewed_by": admin_user["id"],
                "reviewed_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "Verification request rejected"}

@api_router.post("/admin/users/{user_id}/ban")
async def ban_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot ban admin users
    if user.get("role") in ["admin", "super_admin"]:
        raise HTTPException(status_code=400, detail="Cannot ban admin users")
    
    # Ban the user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_banned": True}}
    )
    
    return {"message": f"User {user['username']} has been banned"}

@api_router.post("/admin/users/{user_id}/unban")
async def unban_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Unban the user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_banned": False}}
    )
    
    return {"message": f"User {user['username']} has been unbanned"}

@api_router.delete("/admin/posts/{post_id}")
async def delete_post_admin(post_id: str, moderator_user: dict = Depends(get_moderator_user)):
    # Check if post exists
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Delete the post
    await db.posts.delete_one({"id": post_id})
    
    # Delete associated comments and likes
    await db.comments.delete_many({"post_id": post_id})
    await db.likes.delete_many({"post_id": post_id})
    
    # Update user's post count
    await db.users.update_one(
        {"id": post["author_id"]},
        {"$inc": {"posts_count": -1}}
    )
    
    return {"message": "Post deleted successfully"}

# Health Check
@api_router.get("/")
async def root():
    return {"message": "Flicksy API is running", "version": "2.0.0", "tagline": "Connect, Share, Discover"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()