import requests
import json

# Test the login endpoint
API_URL = "http://localhost:8000/api/v1"

def test_login():
    """Test login with demo credentials"""
    print("=" * 50)
    print("Testing Login Endpoint")
    print("=" * 50)
    
    # Try to login
    login_url = f"{API_URL}/auth/login"
    
    # OAuth2 requires form data with 'username' field
    login_data = {
        "username": "admin@example.com",  # Change this to your test email
        "password": "admin123"             # Change this to your test password
    }
    
    print(f"\n1. Testing POST {login_url}")
    print(f"   Credentials: {login_data['username']}")
    
    try:
        response = requests.post(
            login_url,
            data=login_data,  # Use 'data' for form-encoded
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"\n   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ LOGIN SUCCESS!")
            data = response.json()
            print(f"\n   Response:")
            print(f"   - Access Token: {data.get('access_token', 'N/A')[:50]}...")
            print(f"   - Token Type: {data.get('token_type', 'N/A')}")
            print(f"   - User: {data.get('user', {}).get('email', 'N/A')}")
            print(f"   - Role: {data.get('user', {}).get('role', 'N/A')}")
            return data.get('access_token')
        else:
            print(f"   ❌ LOGIN FAILED!")
            print(f"   Error: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("   ❌ CONNECTION ERROR!")
        print("   Backend server is not running at http://localhost:8000")
        return None
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return None


def test_protected_endpoint(token):
    """Test a protected endpoint with the token"""
    if not token:
        print("\n⚠️  Skipping protected endpoint test (no token)")
        return
    
    print("\n" + "=" * 50)
    print("Testing Protected Endpoint (/auth/me)")
    print("=" * 50)
    
    me_url = f"{API_URL}/auth/me"
    
    try:
        response = requests.get(
            me_url,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"\n   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ AUTHENTICATION SUCCESS!")
            data = response.json()
            print(f"\n   User Info:")
            print(f"   - ID: {data.get('id', 'N/A')}")
            print(f"   - Email: {data.get('email', 'N/A')}")
            print(f"   - Name: {data.get('full_name', 'N/A')}")
            print(f"   - Role: {data.get('role', 'N/A')}")
            print(f"   - Shop ID: {data.get('shop_id', 'N/A')}")
            print(f"   - Warehouse ID: {data.get('warehouse_id', 'N/A')}")
        else:
            print(f"   ❌ AUTHENTICATION FAILED!")
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")


if __name__ == "__main__":
    print("\n🔐 Backend Login Test Script")
    print("=" * 50)
    
    # Test login
    token = test_login()
    
    # Test protected endpoint
    test_protected_endpoint(token)
    
    print("\n" + "=" * 50)
    print("Test Complete!")
    print("=" * 50 + "\n")
