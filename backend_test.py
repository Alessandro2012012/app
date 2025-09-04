import requests
import sys
import json
from datetime import datetime

class FairSocialAPITester:
    def __init__(self, base_url="https://fairsocial.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_post_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test("API Health Check", "GET", "", 200)

    def test_user_registration(self, username, email, display_name, password, bio=""):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "username": username,
                "email": email,
                "display_name": display_name,
                "password": password,
                "bio": bio
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   ✅ Token received: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self, username, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "username": username,
                "password": password
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   ✅ Token received: {self.token[:20]}...")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User Info",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_post(self, content):
        """Test creating a post"""
        success, response = self.run_test(
            "Create Post",
            "POST",
            "posts",
            200,
            data={"content": content}
        )
        
        if success and 'id' in response:
            self.created_post_id = response['id']
            print(f"   ✅ Post created with ID: {self.created_post_id}")
            return True
        return False

    def test_get_posts(self):
        """Test getting posts feed"""
        success, response = self.run_test(
            "Get Posts Feed",
            "GET",
            "posts",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} posts")
            return True
        return False

    def test_like_post(self, post_id):
        """Test liking a post"""
        success, response = self.run_test(
            "Like Post",
            "POST",
            f"posts/{post_id}/like",
            200
        )
        return success

    def test_get_comments(self, post_id):
        """Test getting post comments"""
        success, response = self.run_test(
            "Get Post Comments",
            "GET",
            f"posts/{post_id}/comments",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} comments")
            return True
        return False

    def test_create_comment(self, post_id, content):
        """Test creating a comment"""
        success, response = self.run_test(
            "Create Comment",
            "POST",
            f"posts/{post_id}/comments",
            200,
            data={"content": content}
        )
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login Test",
            "POST",
            "auth/login",
            401,
            data={
                "username": "nonexistent_user",
                "password": "wrong_password"
            }
        )
        return success

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access Test",
            "GET",
            "auth/me",
            401,
            headers={'Authorization': ''}
        )
        
        # Restore token
        self.token = temp_token
        return success

def main():
    print("🚀 Starting FairSocial API Tests")
    print("=" * 50)
    
    # Setup
    tester = FairSocialAPITester()
    timestamp = datetime.now().strftime('%H%M%S')
    test_user1 = f"testuser1_{timestamp}"
    test_user2 = f"testuser2_{timestamp}"
    
    # Test data as specified in the request
    user1_data = {
        "username": test_user1,
        "email": f"test1_{timestamp}@example.com",
        "display_name": "Test User 1",
        "password": "password123",
        "bio": "This is test user 1"
    }
    
    user2_data = {
        "username": test_user2,
        "email": f"test2_{timestamp}@example.com", 
        "display_name": "Test User 2",
        "password": "password123",
        "bio": "This is test user 2"
    }

    # Run tests in sequence
    print("\n📋 PHASE 1: Basic API Tests")
    
    # Health check
    if not tester.test_health_check():
        print("❌ API health check failed, stopping tests")
        return 1

    # Test user registration
    if not tester.test_user_registration(**user1_data):
        print("❌ User registration failed, stopping tests")
        return 1

    # Test getting current user info
    if not tester.test_get_current_user():
        print("❌ Get current user failed")
        return 1

    print("\n📋 PHASE 2: Post Management Tests")
    
    # Test post creation
    test_post_content = "This is my first post on FairSocial! 🎉"
    if not tester.test_create_post(test_post_content):
        print("❌ Post creation failed")
        return 1

    # Test getting posts feed
    if not tester.test_get_posts():
        print("❌ Get posts feed failed")
        return 1

    # Test liking a post
    if tester.created_post_id:
        if not tester.test_like_post(tester.created_post_id):
            print("❌ Like post failed")
            return 1

        # Test getting comments (should be empty initially)
        if not tester.test_get_comments(tester.created_post_id):
            print("❌ Get comments failed")
            return 1

        # Test creating a comment
        test_comment = "Great post!"
        if not tester.test_create_comment(tester.created_post_id, test_comment):
            print("❌ Create comment failed")
            return 1

        # Test getting comments again (should have 1 comment now)
        if not tester.test_get_comments(tester.created_post_id):
            print("❌ Get comments after creation failed")
            return 1

    print("\n📋 PHASE 3: Authentication Tests")
    
    # Test login with existing user
    if not tester.test_user_login(user1_data["username"], user1_data["password"]):
        print("❌ User login failed")
        return 1

    # Test invalid login
    if not tester.test_invalid_login():
        print("❌ Invalid login test failed")
        return 1

    # Test unauthorized access
    if not tester.test_unauthorized_access():
        print("❌ Unauthorized access test failed")
        return 1

    print("\n📋 PHASE 4: Second User Tests")
    
    # Register second user
    if not tester.test_user_registration(**user2_data):
        print("❌ Second user registration failed")
        return 1

    # Create post with second user
    if not tester.test_create_post("Hello from Test User 2!"):
        print("❌ Second user post creation failed")
        return 1

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())