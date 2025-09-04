from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
app = FastAPI(title="Flicksy API", description="A modern, transparent social media platform")

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
    followers_count: int
    following_count: int
    posts_count: int
    created_at: datetime

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

# Post Routes
@api_router.post("/posts", response_model=PostResponse)
async def create_post(post_data: PostCreate, current_user: dict = Depends(get_current_user)):
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

# Health Check
@api_router.get("/")
async def root():
    return {"message": "Flicksy API is running", "version": "1.0.0"}

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