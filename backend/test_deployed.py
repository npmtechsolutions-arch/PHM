"""
Test DEPLOYED backend server (Coolify)
"""
import requests
import json

# DEPLOYED SERVER URL
DEPLOYED_URL = "http://backend-pms.sslip.io"
API_URL = f"{DEPLOYED_URL}/api/v1"

def test_deployed_server():
    """Test if deployed server is accessible"""
    print("\n" + "="*60)
    print("TESTING DEPLOYED SERVER")
    print(f"URL: {DEPLOYED_URL}")
    print("="*60)
    
    # Test 1: Check if server is reachable
    print("\n1. Checking if server is reachable...")
    try:
        response = requests.get(f"{DEPLOYED_URL}/docs", timeout=10)
        if response.status_code == 200:
            print(f"   ✅ Server is ONLINE at {DEPLOYED_URL}")
        else:
            print(f"   ⚠️  Server responded with status: {response.status_code}")
    except requests.exceptions.ConnectionError as e:
        print(f"   ❌ CONNECTION ERROR!")
        print(f"   Cannot reach {DEPLOYED_URL}")
        print(f"\n   Possible reasons:")
        print(f"   1. Server is not deployed yet in Coolify")
        print(f"   2. Domain 'backend-pms.sslip.io' is not configured")
        print(f"   3. Server is not running")
        print(f"\n   Error details: {str(e)}")
        return False
    except requests.exceptions.Timeout:
        print(f"   ❌ TIMEOUT!")
        print(f"   Server took too long to respond")
        return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False
    
    # Test 2: Check API health
    print("\n2. Checking API health...")
    try:
        response = requests.get(f"{API_URL}/auth/me", timeout=5)
        # We expect 401 (unauthorized) which means API is working
        if response.status_code == 401:
            print("   ✅ API is WORKING (returned 401 as expected)")
        elif response.status_code == 200:
            print("   ✅ API is WORKING")
        else:
            print(f"   ⚠️  API responded with status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ API Error: {str(e)}")
        return False
    
    # Test 3: Try login
    print("\n3. Testing login endpoint...")
    login_data = {
        "username": "test.shopowner@phm.test",
        "password": "password123"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        
        if response.status_code == 200:
            print("   ✅ Login SUCCESSFUL!")
            data = response.json()
            token = data.get("access_token")
            print(f"   Token: {token[:50]}...")
            return token
        elif response.status_code == 401:
            print(f"   ❌ Login FAILED - Wrong credentials")
            print(f"   Response: {response.text}")
        else:
            print(f"   ❌ Login FAILED with status {response.status_code}")
            print(f"   Response: {response.text}")
        return None
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def check_dns():
    """Check if domain resolves"""
    print("\n" + "="*60)
    print("DNS CHECK")
    print("="*60)
    
    import socket
    
    domain = "backend-pms.sslip.io"
    print(f"\nChecking DNS for: {domain}")
    
    try:
        ip = socket.gethostbyname(domain)
        print(f"   ✅ Domain resolves to: {ip}")
        return True
    except socket.gaierror:
        print(f"   ❌ Domain does NOT resolve!")
        print(f"\n   This means:")
        print(f"   - The domain is not configured in Coolify")
        print(f"   - OR the server is not deployed yet")
        return False

if __name__ == "__main__":
    print("\n🌐 TESTING DEPLOYED BACKEND SERVER")
    
    # First check DNS
    dns_ok = check_dns()
    
    if dns_ok:
        # Then test server
        token = test_deployed_server()
    else:
        print("\n⚠️  Cannot test server - domain doesn't resolve")
        print("\nTO FIX:")
        print("1. Deploy your backend in Coolify")
        print("2. Configure domain: backend-pms.sslip.io")
        print("3. Make sure the service is running")
    
    print("\n" + "="*60)
    print("TEST COMPLETE!")
    print("="*60 + "\n")
