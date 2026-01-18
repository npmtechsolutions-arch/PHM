import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def login():
    login_url = f"{BASE_URL}/auth/login"
    login_data = {"username": "admin@pharmaec.com", "password": "admin123"}
    resp = requests.post(login_url, data=login_data)
    if resp.status_code == 200:
        return resp.json()["access_token"]
    else:
        print(f"Login failed: {resp.text}")
        return None

def test_create_shop(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Payload similar to what frontend likely sends (missing required fields or empty strings)
    # The frontend validates name, code, city, state, license, warehouse_id.
    # It leaves address, pincode, phone as empty strings if not filled.
    # Backend expects address, pincode, phone as str (Required).
    
    payload = {
        "name": "Test Shop Debug 3",
        "code": "DBG003",
        "shop_type": "retail",
        "license_number": "LIC-12345",
        "address": "",  # Empty
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "", # Empty
        "phone": "",   # Empty
        "warehouse_id": "c71855e2-a815-4bac-949e-dee4987cb9f4" # Real warehouse ID from DB
    }
    
    with open("debug_output.txt", "w") as f:
        f.write("Sending Payload to /shops:\n")
        f.write(json.dumps(payload, indent=2))
        f.write("\n\n")
        
        resp = requests.post(f"{BASE_URL}/shops", json=payload, headers=headers)
        f.write(f"Status Code: {resp.status_code}\n")
        f.write(f"Response Body: {resp.text}\n")
        
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 422:
            print("422 ERROR - Validation failed!")
            print(resp.text)
        elif resp.status_code == 200 or resp.status_code == 201:
            print("SUCCESS - Shop created!")
        else:
            print(f"Error: {resp.text}")

if __name__ == "__main__":
    token = login()
    if token:
        test_create_shop(token)
        print("\nFull output written to debug_output.txt")
