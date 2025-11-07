#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Finanzas Futuras
Tests all endpoints according to the test flow specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from frontend/.env
BASE_URL = "https://moneymasters-1.preview.emergentagent.com/api"

class FinanzasFuturasAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_auth_register_new_user(self):
        """Test POST /api/auth/register with new user"""
        try:
            payload = {
                "username": "testuser1",
                "age": 10
            }
            response = self.session.post(f"{self.base_url}/auth/register", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["username"] == "testuser1" and data["age"] == 10:
                    self.test_user_id = data["id"]
                    self.log_test("Auth Register New User", True, f"User created with ID: {self.test_user_id}")
                    return True
                else:
                    self.log_test("Auth Register New User", False, f"Invalid response structure: {data}")
                    return False
            else:
                self.log_test("Auth Register New User", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Auth Register New User", False, f"Exception: {str(e)}")
            return False
            
    def test_auth_login_existing_user(self):
        """Test POST /api/auth/login with existing user"""
        try:
            payload = {"username": "testuser1"}
            response = self.session.post(f"{self.base_url}/auth/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data["id"] == self.test_user_id and data["username"] == "testuser1":
                    self.log_test("Auth Login Existing User", True, "Login successful, user data matches")
                    return True
                else:
                    self.log_test("Auth Login Existing User", False, f"User data mismatch: {data}")
                    return False
            else:
                self.log_test("Auth Login Existing User", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Auth Login Existing User", False, f"Exception: {str(e)}")
            return False
            
    def test_auth_register_duplicate_user(self):
        """Test POST /api/auth/register with existing username (should fail with 400)"""
        try:
            payload = {
                "username": "testuser1",
                "age": 12
            }
            response = self.session.post(f"{self.base_url}/auth/register", json=payload)
            
            if response.status_code == 400:
                self.log_test("Auth Register Duplicate User", True, "Correctly rejected duplicate username")
                return True
            else:
                self.log_test("Auth Register Duplicate User", False, f"Expected 400, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Auth Register Duplicate User", False, f"Exception: {str(e)}")
            return False
            
    def test_auth_login_nonexistent_user(self):
        """Test POST /api/auth/login with non-existent username (should fail with 404)"""
        try:
            payload = {"username": "nonexistentuser"}
            response = self.session.post(f"{self.base_url}/auth/login", json=payload)
            
            if response.status_code == 404:
                self.log_test("Auth Login Nonexistent User", True, "Correctly rejected non-existent user")
                return True
            else:
                self.log_test("Auth Login Nonexistent User", False, f"Expected 404, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Auth Login Nonexistent User", False, f"Exception: {str(e)}")
            return False
            
    def test_get_user_profile(self):
        """Test GET /api/user/{user_id}"""
        try:
            response = self.session.get(f"{self.base_url}/user/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data["id"] == self.test_user_id and data["username"] == "testuser1":
                    self.log_test("Get User Profile", True, f"User profile retrieved: {data}")
                    return True
                else:
                    self.log_test("Get User Profile", False, f"Invalid user data: {data}")
                    return False
            else:
                self.log_test("Get User Profile", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get User Profile", False, f"Exception: {str(e)}")
            return False
            
    def test_update_avatar(self):
        """Test PUT /api/user/avatar"""
        try:
            payload = {
                "user_id": self.test_user_id,
                "avatar_config": {"color": "red", "style": "cool"}
            }
            response = self.session.put(f"{self.base_url}/user/avatar", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data["avatar_config"] == {"color": "red", "style": "cool"}:
                    self.log_test("Update Avatar", True, "Avatar updated successfully")
                    return True
                else:
                    self.log_test("Update Avatar", False, f"Avatar config not updated: {data}")
                    return False
            else:
                self.log_test("Update Avatar", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Avatar", False, f"Exception: {str(e)}")
            return False
            
    def test_get_progress(self):
        """Test GET /api/progress/{user_id} (should create if not exists)"""
        try:
            response = self.session.get(f"{self.base_url}/progress/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and data["user_id"] == self.test_user_id:
                    self.log_test("Get Progress", True, f"Progress retrieved/created: {data}")
                    return True
                else:
                    self.log_test("Get Progress", False, f"Invalid progress data: {data}")
                    return False
            else:
                self.log_test("Get Progress", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Progress", False, f"Exception: {str(e)}")
            return False
            
    def test_update_progress(self):
        """Test POST /api/progress/update"""
        try:
            payload = {
                "user_id": self.test_user_id,
                "completed_modules": ["lemonade_stand"],
                "module_scores": {"lemonade_stand": 100},
                "total_score": 100
            }
            response = self.session.post(f"{self.base_url}/progress/update", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Update Progress", True, "Progress updated successfully")
                    return True
                else:
                    self.log_test("Update Progress", False, f"Update failed: {data}")
                    return False
            else:
                self.log_test("Update Progress", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Progress", False, f"Exception: {str(e)}")
            return False
            
    def test_get_primary_modules(self):
        """Test GET /api/modules/primary"""
        try:
            response = self.session.get(f"{self.base_url}/modules/primary")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 4:
                    # Check structure of first module
                    module = data[0]
                    required_fields = ["id", "title", "description", "icon", "coins_reward", "type"]
                    if all(field in module for field in required_fields):
                        self.log_test("Get Primary Modules", True, f"4 modules retrieved with correct structure")
                        return True
                    else:
                        self.log_test("Get Primary Modules", False, f"Module missing required fields: {module}")
                        return False
                else:
                    self.log_test("Get Primary Modules", False, f"Expected 4 modules, got: {len(data) if isinstance(data, list) else 'not a list'}")
                    return False
            else:
                self.log_test("Get Primary Modules", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Primary Modules", False, f"Exception: {str(e)}")
            return False
            
    def test_save_lemonade_game(self):
        """Test POST /api/game/lemonade"""
        try:
            payload = {
                "user_id": self.test_user_id,
                "ingredients_cost": 10.0,
                "sales_revenue": 25.0,
                "profit": 15.0,
                "savings": 7.5,
                "expenses": 4.5,
                "fun_money": 3.0,
                "completed": True,
                "score": 80
            }
            response = self.session.post(f"{self.base_url}/game/lemonade", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("score") == 80:
                    self.log_test("Save Lemonade Game", True, "Game state saved successfully")
                    return True
                else:
                    self.log_test("Save Lemonade Game", False, f"Save failed: {data}")
                    return False
            else:
                self.log_test("Save Lemonade Game", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Save Lemonade Game", False, f"Exception: {str(e)}")
            return False
            
    def test_get_lemonade_game(self):
        """Test GET /api/game/lemonade/{user_id}"""
        try:
            response = self.session.get(f"{self.base_url}/game/lemonade/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data and data.get("user_id") == self.test_user_id and data.get("score") == 80:
                    self.log_test("Get Lemonade Game", True, "Game state retrieved successfully")
                    return True
                else:
                    self.log_test("Get Lemonade Game", False, f"Invalid game data: {data}")
                    return False
            else:
                self.log_test("Get Lemonade Game", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Lemonade Game", False, f"Exception: {str(e)}")
            return False
            
    def test_add_coins(self):
        """Test POST /api/coins/add"""
        try:
            payload = {
                "user_id": self.test_user_id,
                "coins": 50
            }
            response = self.session.post(f"{self.base_url}/coins/add", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "new_total" in data:
                    self.log_test("Add Coins", True, f"Coins added, new total: {data['new_total']}")
                    return True
                else:
                    self.log_test("Add Coins", False, f"Coin addition failed: {data}")
                    return False
            else:
                self.log_test("Add Coins", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Add Coins", False, f"Exception: {str(e)}")
            return False
            
    def test_verify_coins_updated(self):
        """Verify coins were actually added to user"""
        try:
            response = self.session.get(f"{self.base_url}/user/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("coins", 0) >= 50:
                    self.log_test("Verify Coins Updated", True, f"User has {data['coins']} coins")
                    return True
                else:
                    self.log_test("Verify Coins Updated", False, f"Expected at least 50 coins, got {data.get('coins', 0)}")
                    return False
            else:
                self.log_test("Verify Coins Updated", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Verify Coins Updated", False, f"Exception: {str(e)}")
            return False
            
    def test_unlock_badge(self):
        """Test POST /api/badges/unlock"""
        try:
            payload = {
                "user_id": self.test_user_id,
                "badge_id": "first_module"
            }
            response = self.session.post(f"{self.base_url}/badges/unlock", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("new_badge"):
                    self.log_test("Unlock Badge", True, "Badge unlocked successfully")
                    return True
                else:
                    self.log_test("Unlock Badge", False, f"Badge unlock failed: {data}")
                    return False
            else:
                self.log_test("Unlock Badge", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Unlock Badge", False, f"Exception: {str(e)}")
            return False
            
    def test_unlock_duplicate_badge(self):
        """Test POST /api/badges/unlock with same badge (should not duplicate)"""
        try:
            payload = {
                "user_id": self.test_user_id,
                "badge_id": "first_module"
            }
            response = self.session.post(f"{self.base_url}/badges/unlock", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and not data.get("new_badge"):
                    self.log_test("Unlock Duplicate Badge", True, "Correctly prevented badge duplication")
                    return True
                else:
                    self.log_test("Unlock Duplicate Badge", False, f"Should not add duplicate badge: {data}")
                    return False
            else:
                self.log_test("Unlock Duplicate Badge", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Unlock Duplicate Badge", False, f"Exception: {str(e)}")
            return False
            
    def test_verify_badge_in_user(self):
        """Verify badge was added to user's badges array"""
        try:
            response = self.session.get(f"{self.base_url}/user/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                badges = data.get("badges", [])
                if "first_module" in badges and badges.count("first_module") == 1:
                    self.log_test("Verify Badge in User", True, f"Badge correctly added to user: {badges}")
                    return True
                else:
                    self.log_test("Verify Badge in User", False, f"Badge not found or duplicated: {badges}")
                    return False
            else:
                self.log_test("Verify Badge in User", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Verify Badge in User", False, f"Exception: {str(e)}")
            return False
            
    def run_all_tests(self):
        """Run complete test suite"""
        print(f"🚀 Starting Finanzas Futuras Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Auth Tests
        print("\n🔐 AUTH TESTS")
        self.test_auth_register_new_user()
        if self.test_user_id:
            self.test_auth_login_existing_user()
        self.test_auth_register_duplicate_user()
        self.test_auth_login_nonexistent_user()
        
        if not self.test_user_id:
            print("❌ Cannot continue tests without valid user_id")
            return
            
        # User Tests
        print("\n👤 USER TESTS")
        self.test_get_user_profile()
        self.test_update_avatar()
        
        # Progress Tests
        print("\n📊 PROGRESS TESTS")
        self.test_get_progress()
        self.test_update_progress()
        
        # Modules Test
        print("\n📚 MODULES TESTS")
        self.test_get_primary_modules()
        
        # Game Tests
        print("\n🎮 GAME TESTS")
        self.test_save_lemonade_game()
        self.test_get_lemonade_game()
        
        # Coins & Badges Tests
        print("\n🪙 COINS & BADGES TESTS")
        self.test_add_coins()
        self.test_verify_coins_updated()
        self.test_unlock_badge()
        self.test_unlock_duplicate_badge()
        self.test_verify_badge_in_user()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = FinanzasFuturasAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)