import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader } from "./components/ui/card";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Heart, MessageCircle, Repeat2, Share, Plus, Check, User, Home, Bell, Search, LogOut } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login/Register Component
const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    display_name: "",
    bio: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      login(response.data.access_token, response.data.user);
    } catch (error) {
      setError(error.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Flicksy
          </h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? "Welcome back!" : "Join the conversation"}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs value={isLogin ? "login" : "register"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="login" 
                onClick={() => {setIsLogin(true); setError("");}}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                onClick={() => {setIsLogin(false); setError("");}}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Register
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Display Name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                    required
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Bio (optional)"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 h-auto"
              disabled={loading}
            >
              {loading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Post Component
const PostCard = ({ post, onLike, onComment }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const { token } = useAuth();

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return "now";
  };

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const response = await axios.get(`${API}/posts/${post.id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(response.data);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await axios.post(
        `${API}/posts/${post.id}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([...comments, response.data]);
      setNewComment("");
      onComment && onComment(post.id);
    } catch (error) {
      console.error("Failed to post comment:", error);
    }
  };

  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  return (
    <Card className="mb-4 border-gray-100 hover:shadow-md transition-all duration-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          <Avatar className="w-12 h-12 border-2 border-gray-100">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
              {post.author_display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {post.author_display_name}
              </h3>
              {post.author_is_verified && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                  <Check className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">
              @{post.author_username} · {formatTime(post.created_at)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </p>
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center space-x-2 text-sm transition-colors duration-200 ${
                post.liked_by_user 
                  ? "text-red-500 hover:text-red-600" 
                  : "text-gray-500 hover:text-red-500"
              }`}
            >
              <Heart className={`w-5 h-5 ${post.liked_by_user ? "fill-current" : ""}`} />
              <span>{post.likes_count}</span>
            </button>

            <button
              onClick={toggleComments}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-500 transition-colors duration-200"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{post.comments_count}</span>
            </button>

            <button className="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-500 transition-colors duration-200">
              <Repeat2 className="w-5 h-5" />
              <span>{post.reposts_count}</span>
            </button>

            <button className="text-gray-500 hover:text-blue-500 transition-colors duration-200">
              <Share className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <form onSubmit={handleCommentSubmit} className="mb-4">
              <div className="flex space-x-3">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!newComment.trim()}
                >
                  Post
                </Button>
              </div>
            </form>

            {loadingComments ? (
              <div className="text-center py-4 text-gray-500">Loading comments...</div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gray-200 text-xs">
                        {comment.author_display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900">
                          {comment.author_display_name}
                        </span>
                        {comment.author_is_verified && (
                          <Check className="w-3 h-3 text-blue-500" />
                        )}
                        <span className="text-xs text-gray-500">
                          @{comment.author_username} · {formatTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

// Main Feed Component
const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [postingLoading, setPostingLoading] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setPostingLoading(true);
    try {
      const response = await axios.post(
        `${API}/posts`,
        { content: newPost },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts([response.data, ...posts]);
      setNewPost("");
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setPostingLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await axios.post(
        `${API}/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            liked_by_user: !post.liked_by_user,
            likes_count: post.liked_by_user ? post.likes_count - 1 : post.likes_count + 1
          };
        }
        return post;
      }));
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleComment = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments_count: post.comments_count + 1
        };
      }
      return post;
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Create Post */}
      <Card className="mb-6 border-gray-100 bg-white shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handlePostSubmit}>
            <div className="flex space-x-4">
              <Avatar className="w-12 h-12 border-2 border-gray-100">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                  {user?.display_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's happening?"
                  className="border-none resize-none focus:ring-0 text-lg placeholder-gray-500"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-400">
                    {newPost.length}/500
                  </span>
                  <Button 
                    type="submit" 
                    disabled={!newPost.trim() || postingLoading}
                    className="bg-blue-600 hover:bg-blue-700 px-6 h-9 font-medium"
                  >
                    {postingLoading ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Posts */}
      <div>
        {posts.length === 0 ? (
          <Card className="text-center py-12 border-gray-100">
            <CardContent>
              <div className="text-gray-500 mb-4">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                <p>Be the first to share something!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-6 fixed left-0 top-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FairSocial
        </h1>
      </div>

      <nav className="space-y-4">
        <Link to="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
          <Home className="w-6 h-6 text-gray-600" />
          <span className="font-medium text-gray-800">Home</span>
        </Link>
        <Link to="/search" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
          <Search className="w-6 h-6 text-gray-600" />
          <span className="font-medium text-gray-800">Search</span>
        </Link>
        <Link to="/notifications" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-6 h-6 text-gray-600" />
          <span className="font-medium text-gray-800">Notifications</span>
        </Link>
        <Link to="/profile" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
          <User className="w-6 h-6 text-gray-600" />
          <span className="font-medium text-gray-800">Profile</span>
        </Link>
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg mb-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
              {user?.display_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{user?.display_name}</p>
            <p className="text-sm text-gray-500 truncate">@{user?.username}</p>
          </div>
          {user?.is_verified && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              <Check className="w-3 h-3" />
            </Badge>
          )}
        </div>
        <Button 
          onClick={logout} 
          variant="outline" 
          className="w-full border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

// Main Layout
const Layout = ({ children }) => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="ml-64 p-6">
        {children}
      </main>
    </div>
  );
};

// Profile Component
const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="mb-6 border-gray-100 bg-white">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-6">
            <Avatar className="w-24 h-24 border-4 border-gray-100">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-2xl font-bold">
                {user?.display_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{user?.display_name}</h1>
                {user?.is_verified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                    <Check className="w-4 h-4 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mb-4">@{user?.username}</p>
              {user?.bio && (
                <p className="text-gray-700 mb-4">{user.bio}</p>
              )}
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span><strong>{user?.following_count}</strong> Following</span>
                <span><strong>{user?.followers_count}</strong> Followers</span>
                <span><strong>{user?.posts_count}</strong> Posts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center py-12 text-gray-500">
        <p>User posts will be displayed here in the next update.</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? children : <AuthForm />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthForm />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Feed />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/search" element={<div className="text-center py-12 text-gray-500">Search functionality coming soon...</div>} />
                    <Route path="/notifications" element={<div className="text-center py-12 text-gray-500">Notifications coming soon...</div>} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;