import React, { useState, useEffect, useRef } from "react";
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
import { 
  Heart, MessageCircle, Repeat2, Share, Plus, Check, User, Home, Bell, 
  Search, LogOut, Shield, Settings, Users, BarChart, TrendingUp, Hash,
  Sparkles, Video, Image as ImageIcon, Mic
} from "lucide-react";

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

// Landing Page Component
const LandingPage = ({ onShowAuth }) => {
  const [stats, setStats] = useState({
    users: "10K+",
    posts: "50K+",
    interactions: "500K+"
  });

  return (
    <div className="landing-hero">
      {/* Floating Elements */}
      <div className="floating-element">
        <Sparkles size={60} />
      </div>
      <div className="floating-element">
        <Heart size={40} />
      </div>
      <div className="floating-element">
        <MessageCircle size={50} />
      </div>

      <div className="landing-content flex flex-col items-center justify-center min-h-screen text-center px-4">
        {/* Hero Content */}
        <div className="animate-slide-up">
          <h1 className="hero-title">
            Connect, Share, Discover
            <br />
            <span className="text-gradient">Welcome to Flicksy!</span>
          </h1>
          
          <p className="hero-subtitle">
            The next-generation social platform where authentic connections thrive. 
            Share your moments, discover amazing content, and build meaningful relationships.
          </p>

          <div className="hero-cta">
            <button 
              className="btn-primary animate-scale-in"
              onClick={() => onShowAuth(false)}
              style={{ animationDelay: '0.2s' }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Sign Up Now
            </button>
            <button 
              className="btn-secondary animate-scale-in"
              onClick={() => onShowAuth(true)}
              style={{ animationDelay: '0.4s' }}
            >
              <User className="w-5 h-5 mr-2" />
              I Have an Account
            </button>
          </div>
        </div>

        {/* Social Proof */}
        <div className="social-proof animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="proof-item">
            <span className="proof-number">{stats.users}</span>
            <span>Active Users</span>
          </div>
          <div className="proof-item">
            <span className="proof-number">{stats.posts}</span>
            <span>Posts Shared</span>
          </div>
          <div className="proof-item">
            <span className="proof-number">{stats.interactions}</span>
            <span>Interactions</span>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="glass-effect p-6 rounded-2xl text-white">
            <Video className="w-12 h-12 mb-4 mx-auto text-flicksy-pink" />
            <h3 className="text-xl font-bold mb-2">Rich Media</h3>
            <p className="text-sm opacity-90">Share photos, videos, and stories with stunning quality</p>
          </div>
          <div className="glass-effect p-6 rounded-2xl text-white">
            <Shield className="w-12 h-12 mb-4 mx-auto text-flicksy-blue" />
            <h3 className="text-xl font-bold mb-2">Verified Accounts</h3>
            <p className="text-sm opacity-90">Get verified and build trust with your community</p>
          </div>
          <div className="glass-effect p-6 rounded-2xl text-white">
            <TrendingUp className="w-12 h-12 mb-4 mx-auto text-purple-400" />
            <h3 className="text-xl font-bold mb-2">Trending Topics</h3>
            <p className="text-sm opacity-90">Discover what's happening around the world</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Auth Form
const AuthForm = ({ isLogin, onToggle, onSuccess }) => {
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
      onSuccess && onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center p-4">
      <div className="auth-card w-full max-w-md p-8 rounded-2xl animate-scale-in">
        {/* Logo */}
        <div className="auth-logo">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins mb-2">
            {isLogin ? "Welcome back!" : "Join Flicksy"}
          </h1>
          <p className="text-gray-600">
            {isLogin ? "Sign in to your account" : "Create your account and start connecting"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
            <p className="text-red-700 text-sm">{error}</p>
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
              className="h-12 border-2 border-gray-200 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              className="h-12 border-2 border-gray-200 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
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
                  className="h-12 border-2 border-gray-200 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
                />
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  required
                  className="h-12 border-2 border-gray-200 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
                />
              </div>
              <div>
                <Textarea
                  placeholder="Tell us about yourself (optional)"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="border-2 border-gray-200 focus:border-pink-500 focus:ring-pink-500 rounded-xl resize-none"
                  rows={3}
                />
              </div>
            </>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            ) : (
              isLogin ? "Sign In" : "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggle}
            className="text-gray-600 hover:text-pink-500 transition-colors font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Search Component
const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { token } = useAuth();
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  return (
    <div className="search-container" ref={searchRef}>
      <div className="relative">
        <Search className="search-icon w-5 h-5" />
        <input
          type="text"
          placeholder="Search users, posts, hashtags..."
          value={query}
          onChange={handleInputChange}
          className="search-input"
          onFocus={() => query && setShowResults(true)}
        />
      </div>

      {showResults && (results || loading) && (
        <div className="search-results">
          {loading ? (
            <div className="search-result-item">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500 mr-3"></div>
                Searching...
              </div>
            </div>
          ) : results ? (
            <>
              {results.users.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 font-semibold text-sm text-gray-700">
                    Users
                  </div>
                  {results.users.map((user) => (
                    <div key={user.id} className="search-result-item">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-blue-500 text-white">
                            {user.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-gray-900">{user.display_name}</p>
                            {user.is_verified && (
                              <Check className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.posts.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 font-semibold text-sm text-gray-700">
                    Posts
                  </div>
                  {results.posts.map((post) => (
                    <div key={post.id} className="search-result-item">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-blue-500 text-white text-xs">
                            {post.author_display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-sm text-gray-900">{post.author_display_name}</p>
                            {post.author_is_verified && (
                              <Check className="w-3 h-3 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.total_results === 0 && (
                <div className="search-result-item text-center text-gray-500">
                  No results found for "{query}"
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

// Trending Component
const TrendingSection = () => {
  const [trending, setTrending] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    fetchTrending();
    fetchTrendingPosts();
  }, []);

  const fetchTrending = async () => {
    try {
      const response = await axios.get(`${API}/trending/hashtags`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrending(response.data.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch trending hashtags:", error);
    }
  };

  const fetchTrendingPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts/trending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrendingPosts(response.data.slice(0, 3));
    } catch (error) {
      console.error("Failed to fetch trending posts:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Trending Hashtags */}
      <div className="trending-section">
        <div className="flex items-center mb-4">
          <TrendingUp className="w-5 h-5 text-pink-500 mr-2" />
          <h3 className="trending-title">Trending Hashtags</h3>
        </div>
        {trending.length > 0 ? (
          <div className="space-y-2">
            {trending.map((item, index) => (
              <div key={index} className="trending-item">
                <div className="trending-hashtag">{item.hashtag}</div>
                <div className="text-sm text-gray-500">{item.count} posts</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No trending hashtags yet</p>
        )}
      </div>

      {/* Trending Posts */}
      <div className="trending-section">
        <div className="flex items-center mb-4">
          <Sparkles className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="trending-title">Hot Posts</h3>
        </div>
        {trendingPosts.length > 0 ? (
          <div className="space-y-3">
            {trendingPosts.map((post) => (
              <div key={post.id} className="trending-item">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-blue-500 text-white text-xs">
                      {post.author_display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-sm">{post.author_display_name}</p>
                      {post.author_is_verified && (
                        <Check className="w-3 h-3 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3">{post.content}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Heart className="w-3 h-3 mr-1" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {post.comments_count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No trending posts yet</p>
        )}
      </div>
    </div>
  );
};

// Verification Request Component
const VerificationRequest = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const response = await axios.get(`${API}/verification/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch verification requests:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    try {
      await axios.post(
        `${API}/verification/request`,
        { reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowDialog(false);
      setReason("");
      fetchMyRequests();
    } catch (error) {
      console.error("Failed to submit verification request:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700 border-green-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6 shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold font-poppins">Get Verified</h2>
              <p className="opacity-90">Join the verified community on Flicksy</p>
            </div>
            <Shield className="w-12 h-12 opacity-80" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Verification Benefits</h3>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Blue checkmark next to your name</li>
                <li>• Increased visibility and trust</li>
                <li>• Priority in search results</li>
                <li>• Access to exclusive features</li>
              </ul>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl">
                  <Check className="w-4 h-4 mr-2" />
                  Request Verification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Request Verification</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Why should your account be verified?
                    </label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why you deserve verification (minimum 10 characters)"
                      rows={4}
                      minLength={10}
                      maxLength={500}
                      required
                      className="border-2 border-gray-200 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {reason.length}/500 characters
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading || reason.length < 10}
                    className="w-full bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 rounded-xl"
                  >
                    {loading ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* My Requests */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <h3 className="text-xl font-semibold">My Verification Requests</h3>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No verification requests yet</p>
              <p className="text-sm">Request verification to get the blue checkmark!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={`${getStatusColor(request.status)} font-medium`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{request.reason}</p>
                  {request.reviewed_at && (
                    <p className="text-sm text-gray-500 mt-2">
                      Reviewed on {new Date(request.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Admin Panel Component (keeping the existing implementation with enhanced styling)
const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats");
  const { token } = useAuth();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, verificationRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/verification-requests`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setVerificationRequests(verificationRes.data);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = async (requestId, action) => {
    try {
      await axios.post(
        `${API}/admin/verification/${requestId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAdminData();
    } catch (error) {
      console.error(`Failed to ${action} verification:`, error);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      await axios.post(
        `${API}/admin/users/${userId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAdminData();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="mb-6 shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-t-lg">
          <div className="flex items-center">
            <Shield className="w-8 h-8 mr-3" />
            <div>
              <h2 className="text-2xl font-bold font-poppins">Flicksy Admin Panel</h2>
              <p className="opacity-90">Manage your platform with powerful tools</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="stats" className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BarChart className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="verifications" className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Check className="w-4 h-4 mr-2" />
            Verifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="admin-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="admin-stat">
                    <div className="admin-stat-icon bg-blue-100 text-blue-600">
                      <Users />
                    </div>
                    <div>
                      <div className="admin-stat-number">{stats.total_users}</div>
                      <div className="admin-stat-label">Total Users</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="admin-stat">
                    <div className="admin-stat-icon bg-green-100 text-green-600">
                      <MessageCircle />
                    </div>
                    <div>
                      <div className="admin-stat-number">{stats.total_posts}</div>
                      <div className="admin-stat-label">Total Posts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="admin-stat">
                    <div className="admin-stat-icon bg-purple-100 text-purple-600">
                      <Check />
                    </div>
                    <div>
                      <div className="admin-stat-number">{stats.verified_users}</div>
                      <div className="admin-stat-label">Verified Users</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="admin-stat">
                    <div className="admin-stat-icon bg-orange-100 text-orange-600">
                      <Bell />
                    </div>
                    <div>
                      <div className="admin-stat-number">{stats.pending_verifications}</div>
                      <div className="admin-stat-label">Pending Verifications</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="admin-stat">
                    <div className="admin-stat-icon bg-red-100 text-red-600">
                      <TrendingUp />
                    </div>
                    <div>
                      <div className="admin-stat-number">{stats.recent_signups}</div>
                      <div className="admin-stat-label">New Users (7 days)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="admin-stat">
                    <div className="admin-stat-icon bg-teal-100 text-teal-600">
                      <MessageCircle />
                    </div>
                    <div>
                      <div className="admin-stat-number">{stats.total_comments}</div>
                      <div className="admin-stat-label">Total Comments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <h3 className="text-xl font-semibold">User Management</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-blue-500 text-white font-semibold">
                          {user.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{user.display_name}</h4>
                          {user.is_verified && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                              <Check className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {user.is_banned && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">Banned</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                        <p className="text-xs text-gray-500">{user.posts_count} posts • {user.role}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {user.is_banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserAction(user.id, 'unban')}
                          className="text-green-600 border-green-600 hover:bg-green-50 rounded-lg"
                        >
                          Unban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserAction(user.id, 'ban')}
                          className="text-red-600 border-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <h3 className="text-xl font-semibold">Verification Requests</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {verificationRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Check className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No pending verification requests</p>
                    <p>All caught up! New requests will appear here.</p>
                  </div>
                ) : (
                  verificationRequests.map((request) => (
                    <div key={request.id} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-blue-500 text-white font-semibold">
                              {request.user_display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-lg">{request.user_display_name}</h4>
                            <p className="text-sm text-gray-600">@{request.user_username}</p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <Button
                            size="sm"
                            onClick={() => handleVerificationAction(request.id, 'approve')}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerificationAction(request.id, 'reject')}
                            className="text-red-600 border-red-600 hover:bg-red-50 rounded-lg"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg mb-3">
                        <p className="text-gray-700 leading-relaxed">{request.reason}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Submitted on {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Post Component (enhanced version)
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
    <div className="post-card animate-fade-in">
      <CardHeader className="pb-3">
        <div className="post-author">
          <div className="post-avatar">
            {post.author_display_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {post.author_display_name}
              </h3>
              {post.author_is_verified && (
                <div className="verified-badge">
                  <Check className="w-3 h-3" />
                  Verified
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              @{post.author_username} · {formatTime(post.created_at)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="post-content">
          {post.content}
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <div className="post-actions">
          <button
            onClick={() => onLike(post.id)}
            className={`post-action ${post.liked_by_user ? 'liked' : ''}`}
          >
            <Heart className={`w-5 h-5 ${post.liked_by_user ? "fill-current" : ""}`} />
            <span>{post.likes_count}</span>
          </button>

          <button
            onClick={toggleComments}
            className="post-action"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{post.comments_count}</span>
          </button>

          <button className="post-action">
            <Repeat2 className="w-5 h-5" />
            <span>{post.reposts_count}</span>
          </button>

          <button className="post-action">
            <Share className="w-5 h-5" />
          </button>
        </div>

        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <form onSubmit={handleCommentSubmit} className="mb-4">
              <div className="flex space-x-3">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 border-gray-200 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white rounded-xl"
                  disabled={!newComment.trim()}
                >
                  Post
                </Button>
              </div>
            </form>

            {loadingComments ? (
              <div className="text-center py-4 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto mb-2"></div>
                Loading comments...
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {comment.author_display_name.charAt(0).toUpperCase()}
                    </div>
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
    </div>
  );
};

// Enhanced Feed Component
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-container">
      {/* Create Post */}
      <Card className="mb-6 shadow-lg border-0 bg-white">
        <CardContent className="pt-6">
          <form onSubmit={handlePostSubmit}>
            <div className="flex space-x-4">
              <div className="post-avatar">
                {user?.display_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's happening on Flicksy?"
                  className="border-none resize-none focus:ring-0 text-lg placeholder-gray-500 min-h-[100px]"
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-4 text-gray-400">
                    <button type="button" className="hover:text-pink-500 transition-colors">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button type="button" className="hover:text-pink-500 transition-colors">
                      <Video className="w-5 h-5" />
                    </button>
                    <button type="button" className="hover:text-pink-500 transition-colors">
                      <Mic className="w-5 h-5" />
                    </button>
                    <span className="text-sm">
                      {newPost.length}/500
                    </span>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!newPost.trim() || postingLoading}
                    className="bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white px-8 py-2 rounded-xl font-semibold"
                  >
                    {postingLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Posting...
                      </div>
                    ) : (
                      "Post"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <Card className="text-center py-16 shadow-lg border-0">
            <CardContent>
              <div className="text-gray-500">
                <Sparkles className="w-20 h-20 mx-auto mb-6 opacity-30" />
                <h3 className="text-2xl font-bold mb-4 text-gray-700">Welcome to Flicksy!</h3>
                <p className="text-lg mb-2">Your feed is waiting for amazing content</p>
                <p>Be the first to share something incredible!</p>
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

// Enhanced Sidebar Component
const Sidebar = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <div className="sidebar">
      <div>
        <h1 className="sidebar-logo">Flicksy</h1>
        <div className="mb-6">
          <SearchBar />
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" className="sidebar-nav-link">
          <Home className="w-6 h-6" />
          <span>Home</span>
        </Link>
        <Link to="/explore" className="sidebar-nav-link">
          <TrendingUp className="w-6 h-6" />
          <span>Explore</span>
        </Link>
        <Link to="/notifications" className="sidebar-nav-link">
          <Bell className="w-6 h-6" />
          <span>Notifications</span>
        </Link>
        <Link to="/profile" className="sidebar-nav-link">
          <User className="w-6 h-6" />
          <span>Profile</span>
        </Link>
        <Link to="/verification" className="sidebar-nav-link">
          <Check className="w-6 h-6" />
          <span>Get Verified</span>
        </Link>
        {isAdmin && (
          <Link to="/admin" className="sidebar-nav-link">
            <Shield className="w-6 h-6" />
            <span>Admin Panel</span>
          </Link>
        )}
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user?.display_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{user?.display_name}</p>
            <p className="text-sm text-gray-500 truncate">@{user?.username}</p>
          </div>
          {user?.is_verified && (
            <div className="verified-badge text-xs">
              <Check className="w-3 h-3" />
            </div>
          )}
        </div>
        <Button 
          onClick={logout} 
          variant="outline" 
          className="w-full border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl h-12"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

// Enhanced Layout Component
const Layout = ({ children }) => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="ml-80 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {children}
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <TrendingSection />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Profile Component (enhanced)
const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6 shadow-xl border-0 overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
        
        <CardContent className="pt-0">
          <div className="flex items-start space-x-6 -mt-16 relative">
            <div className="w-32 h-32 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full border-4 border-white flex items-center justify-center text-white text-4xl font-bold shadow-xl">
              {user?.display_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 pt-20">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 font-poppins">{user?.display_name}</h1>
                {user?.is_verified && (
                  <div className="verified-badge">
                    <Check className="w-4 h-4" />
                    Verified
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-lg mb-4">@{user?.username}</p>
              {user?.bio && (
                <p className="text-gray-700 mb-6 text-lg leading-relaxed">{user.bio}</p>
              )}
              <div className="flex items-center space-x-8 text-lg">
                <span className="flex items-center">
                  <strong className="text-gray-900">{user?.following_count}</strong>
                  <span className="text-gray-600 ml-1">Following</span>
                </span>
                <span className="flex items-center">
                  <strong className="text-gray-900">{user?.followers_count}</strong>
                  <span className="text-gray-600 ml-1">Followers</span>
                </span>
                <span className="flex items-center">
                  <strong className="text-gray-900">{user?.posts_count}</strong>
                  <span className="text-gray-600 ml-1">Posts</span>
                </span>
              </div>
            </div>
            <div className="pt-20">
              <Button className="bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white px-6 py-2 rounded-xl">
                Edit Profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center py-16 text-gray-500">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <h3 className="text-xl font-semibold mb-2">Your posts will appear here</h3>
        <p>Start sharing your thoughts and connect with the Flicksy community!</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-6"></div>
          <p className="text-white text-xl font-semibold">Loading Flicksy...</p>
        </div>
      </div>
    );
  }

  return user ? children : <AuthWrapper />;
};

// Auth Wrapper Component
const AuthWrapper = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  if (showAuth) {
    return (
      <AuthForm 
        isLogin={isLogin} 
        onToggle={() => setIsLogin(!isLogin)}
        onSuccess={() => setShowAuth(false)}
      />
    );
  }

  return <LandingPage onShowAuth={(login) => { setIsLogin(login); setShowAuth(true); }} />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Feed />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/verification" element={<VerificationRequest />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/explore" element={<TrendingSection />} />
                    <Route path="/notifications" element={
                      <div className="text-center py-16">
                        <Bell className="w-20 h-20 mx-auto mb-6 text-gray-300" />
                        <h3 className="text-2xl font-bold text-gray-700 mb-4">Notifications Coming Soon</h3>
                        <p className="text-gray-500">Stay tuned for real-time notifications!</p>
                      </div>
                    } />
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