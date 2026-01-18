"""
Simple test to verify backend server is working
"""
import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_server():
    """Test if server is running"""
    print("\n" + "="*60)
    print("TESTING BACKEND SERVER")
    print("="*60)
    
    # Test 1: Check if server is alive
    print("\n1. Testing if server is running...")
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("   ✅ Server is RUNNING at", BASE_URL)
        else:
            print("   ❌ Server responded with status:", response.status_code)
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Server is NOT RUNNING!")
        print("   Please start the server with:")
        print("   cd backend")
        print("   python -m uvicorn main:app --reload --port 8000")
        return False
    
    # Test 2: Try login
    print("\n2. Testing login endpoint...")
    login_data = {
        "username": "test.shopowner@phm.test",
        "password": "password123"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            print("   ✅ Login SUCCESSFUL!")
            data = response.json()
            token = data.get("access_token")
            print(f"   Token received: {token[:50]}...")
            return token
        else:
            print(f"   ❌ Login FAILED with status {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def test_protected_endpoint(token):
    """Test protected endpoint"""
    if not token:
        print("\n⚠️  Skipping protected endpoint test (no token)")
        return
    
    print("\n3. Testing protected endpoint (/auth/me)...")
    try:
        response = requests.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            print("   ✅ Protected endpoint WORKS!")
            user = response.json()
            print(f"   User: {user.get('email')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Shop ID: {user.get('shop_id', 'N/A')}")
        else:
            print(f"   ❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_shops_endpoint(token):
    """Test shops listing with entity isolation"""
    if not token:
        return
    
    print("\n4. Testing shops endpoint (entity isolation)...")
    try:
        response = requests.get(
            f"{API_URL}/shops",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            shops = data.get("items", [])
            print(f"   ✅ Shops endpoint WORKS!")
            print(f"   User can see {len(shops)} shop(s)")
            if shops:
                print(f"   First shop: {shops[0].get('name')}")
        else:
            print(f"   ❌ Failed with status {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    print("\n🔍 BACKEND SERVER TEST")
    
    # Run tests
    token = test_server()
    test_protected_endpoint(token)
    test_shops_endpoint(token)
    
    print("\n" + "="*60)
    print("TEST COMPLETE!")
    print("="*60 + "\n")
