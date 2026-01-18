import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"
LOGIN_URL = f"{BASE_URL}/auth/login"
MEDICINES_URL = f"{BASE_URL}/medicines"

def verify_api():
    print("VERIFYING API Response for 'selling_price'...")
    
    # 1. Login to get token
    payload = {
        "username": "admin@pharmaec.com",
        "password": "admin123"
    }
    
    try:
        session = requests.Session()
        print(f"  Logging in to {LOGIN_URL}...")
        login_resp = session.post(LOGIN_URL, data=payload) 
        
        if login_resp.status_code != 200:
            print(f"LOGIN FAILED: {login_resp.status_code} {login_resp.text}")
            return
            
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Fetch Medicines
        print(f"  Fetching medicines from {MEDICINES_URL}...")
        resp = session.get(MEDICINES_URL, headers=headers)
        
        if resp.status_code != 200:
            print(f"FETCH FAILED: {resp.status_code} {resp.text}")
            return
            
        data = resp.json()
        print(f"FETCH SUCCESS: {data.get('total', 0)} medicines.")
        
        if data.get('items'):
            item = data['items'][0]
            print("\nFIRST MEDICINE SAMPLE:")
            print(f"  Name: {item.get('name')}")
            print(f"  MRP: {item.get('mrp')}")
            print(f"  Purchase Price: {item.get('purchase_price')}")
            
            # CHECK SELLING PRICE
            if 'selling_price' in item:
                print(f"  [OK] Sale Value (selling_price): {item.get('selling_price')}")
            else:
                print(f"  [MISSING] 'selling_price' field MISSING in API response!")
                print(f"  Keys found: {list(item.keys())}")
        else:
            print("  NO ITEMS found in response.")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    verify_api()
