import requests
import json

BASE_URL = "http://localhost:8000/api/v1"
LOGIN_Email = "shop1admin@gmail.com"
LOGIN_PASSWORD = "password123"

def login():
    print(f"Logging in as {LOGIN_Email}...")
    response = requests.post(f"{BASE_URL}/auth/login", data={"username": LOGIN_Email, "password": LOGIN_PASSWORD})
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return None
    token = response.json()["access_token"]
    print("Login successful.")
    return token

def check_invoices():
    token = login()
    if not token:
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    print("\nFetching Invoices (status=completed)...")
    res = requests.get(f"{BASE_URL}/invoices", headers=headers, params={"size": 10, "status": "completed"})
    
    if res.status_code == 200:
        total = res.json().get("total", 0)
        print(f"Total Invoices (completed): {total}")
    else:
        print(f"Failed: {res.text}")

    print("\nFetching Invoices (status=paid)...")
    res2 = requests.get(f"{BASE_URL}/invoices", headers=headers, params={"size": 10, "status": "paid"})
    
    if res2.status_code == 200:
        total = res2.json().get("total", 0)
        print(f"Total Invoices (paid): {total}")
    else:
        print(f"Failed: {res2.text}")

if __name__ == "__main__":
    check_invoices()
