"""
Test Backend API Endpoints and CORS Configuration
Tests all major endpoints on the production backend
"""
import requests
import json
from typing import Dict, Any

# Backend URL to test
BASE_URL = "https://host.app.npmtech.in"
API_BASE = f"{BASE_URL}/api/v1"

def print_header(text: str):
    print(f"\n{'='*60}")
    print(f"{text.center(60)}")
    print(f"{'='*60}\n")

def test_cors_headers(url: str, origin: str = "http://localhost:5173") -> bool:
    """Test if CORS headers are properly set"""
    try:
        response = requests.options(url, headers={
            'Origin': origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        })
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
        }
        
        print(f"CORS Headers for {origin}:")
        for key, value in cors_headers.items():
            if value:
                print(f"  {key}: {value}")
        
        if cors_headers['Access-Control-Allow-Origin']:
            print(f"[SUCCESS] CORS enabled for origin: {origin}")
            return True
        else:
            print(f"[ERROR] CORS NOT enabled for origin: {origin}")
            return False
            
    except Exception as e:
        print(f"[ERROR] CORS test failed: {str(e)}")
        return False

def test_endpoint(method: str, endpoint: str, data: Dict[str, Any] = None, 
                  headers: Dict[str, str] = None, auth_token: str = None) -> Dict[str, Any]:
    """Test a single endpoint"""
    url = f"{API_BASE}{endpoint}"
    
    if headers is None:
        headers = {}
    
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    headers['Origin'] = 'http://localhost:5173'  # Simulate frontend request
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, headers=headers)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            return {'success': False, 'error': f'Unsupported method: {method}'}
        
        return {
            'success': response.status_code < 400,
            'status_code': response.status_code,
            'response': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
            'cors_header': response.headers.get('Access-Control-Allow-Origin')
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def main():
    print_header("Backend API & CORS Testing")
    
    # Test 1: Health Check
    print_header("1. Health Check Endpoint")
    result = test_endpoint('GET', '/health')
    if result.get('success'):
        print(f"[SUCCESS] Health check passed: {result['status_code']}")
        print(f"Response: {json.dumps(result['response'], indent=2)}")
        if result.get('cors_header'):
            print(f"[SUCCESS] CORS Header Present: {result['cors_header']}")
        else:
            print("[ERROR] CORS Header Missing!")
    else:
        print(f"[ERROR] Health check failed: {result.get('status_code', 'No Status')} - {result.get('response', result.get('error', 'Unknown Error'))}")
    
    # Test 2: CORS Preflight for Login
    print_header("2. CORS Preflight Test (Login Endpoint)")
    cors_ok = test_cors_headers(f"{API_BASE}/auth/login")
    
    # Test 3: Try actual login with admin credentials
    print_header("3. Actual Login Test (admin@example.com)")
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            data={'username': 'admin@example.com', 'password': 'admin123'},
            headers={
                'Origin': 'http://localhost:5173',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )
        
        print(f"Login Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("[SUCCESS] Login successful!")
            token_data = response.json()
            access_token = token_data.get('access_token')
            print(f"Access Token: {access_token[:30]}..." if access_token else "No token received")
            
            if response.headers.get('Access-Control-Allow-Origin'):
                print(f"[SUCCESS] CORS Header: {response.headers.get('Access-Control-Allow-Origin')}")
            else:
                print("[ERROR] CORS Header Missing!")
            
            # Test 4: Authenticated endpoint
            if access_token:
                print_header("4. Authenticated Endpoint Test (/auth/me)")
                me_result = test_endpoint('GET', '/auth/me', auth_token=access_token)
                if me_result.get('success'):
                    print(f"[SUCCESS] Auth test passed: {me_result['status_code']}")
                    print(f"User Data: {json.dumps(me_result['response'], indent=2)}")
                    if me_result.get('cors_header'):
                        print(f"[SUCCESS] CORS Header: {me_result['cors_header']}")
                else:
                    print(f"[ERROR] Auth test failed: {me_result.get('error', 'Unknown error')}")
        else:
            print(f"[ERROR] Login failed with status: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            if response.headers.get('Access-Control-Allow-Origin'):
                print(f"[SUCCESS] CORS Header: {response.headers.get('Access-Control-Allow-Origin')}")
            else:
                print("[ERROR] CORS Header Missing!")
                
    except Exception as e:
        print(f"[ERROR] Login test failed: {str(e)}")
    
    # Test 5: Test multiple origins
    print_header("5. Multiple Origin CORS Test")
    origins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://pmsmdu.netlify.app',
        'https://pms.npmtech.in',
        'https://random-domain.com'
    ]
    
    for origin in origins:
        print(f"\nTesting origin: {origin}")
        test_cors_headers(f"{API_BASE}/auth/login", origin)
    
    # Summary
    print_header("Test Summary")
    print(f"Backend URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print("[SUCCESS] All tests completed!")
    print()

if __name__ == "__main__":
    main()
