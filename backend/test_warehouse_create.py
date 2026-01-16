import requests
import sys

BASE_URL = "http://localhost:8001/api/v1"

def test_warehouse_creation():
    # 1. Login
    try:
        login_resp = requests.post(f"{BASE_URL}/auth/login", data={
            "username": "admin@pharmaec.com",
            "password": "admin123"
        })
        if login_resp.status_code != 200:
            print(f"Login failed: {login_resp.status_code} {login_resp.text}")
            return
            
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Create Warehouse
        warehouse_data = {
            "name": "Test Warehouse Debug",
            "code": "WHDEBUG01",
            "address": "123 Debug St",
            "city": "Debug City",
            "state": "Debug State",
            "pincode": "123456",
            "capacity": 1000
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/warehouses", 
            json=warehouse_data,
            headers=headers
        )
        
        if create_resp.status_code == 200:
            print("SUCCESS: Warehouse created successfully")
            print(create_resp.json())
        else:
            print(f"FAILURE: {create_resp.status_code}")
            print(create_resp.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_warehouse_creation()
