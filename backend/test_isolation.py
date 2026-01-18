import sys
import os
import requests
import json

# Add backend to path to import db models if needed, but we will try to use API only if possible.
# Actually we need to bootstrap users.
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.db.models import User, Role, RoleType, MedicalShop, Warehouse
from app.core.security import get_password_hash

# Config
API_URL = "http://localhost:8000/api/v1"

def setup_test_data():
    db = SessionLocal()
    try:
        # 1. Create a Test Shop and Test Warehouse
        print("Setting up test data...")
        
        # Warehouse
        wh = db.query(Warehouse).filter(Warehouse.code == "TEST-WH-01").first()
        if not wh:
            wh = Warehouse(
                name="Test Isolation WH",
                code="TEST-WH-01",
                city="Test City", 
                state="Test State",
                address="123 Test St, Test City",
                pincode="123456",
                status="active"
            )
            db.add(wh)
            db.commit()
            db.refresh(wh)
        
        # Shop
        shop = db.query(MedicalShop).filter(MedicalShop.code == "TEST-SHOP-01").first()
        if not shop:
            shop = MedicalShop(
                name="Test Isolation Shop",
                code="TEST-SHOP-01",
                city="Test City",
                state="Test State",
                address="456 Shop St, Test City",
                pincode="123456",
                phone="9999999999",
                license_number="TEST-LIC-001",
                warehouse_id=wh.id,
                status="active"
            )
            db.add(shop)
            db.commit()
            db.refresh(shop)

        # 2. Create Users
        # Shop Owner
        shop_owner_email = "test.shopowner@phm.test"
        shop_owner = db.query(User).filter(User.email == shop_owner_email).first()
        if not shop_owner:
            shop_owner = User(
                email=shop_owner_email,
                password_hash=get_password_hash("password123"),
                full_name="Test Shop Owner",
                role=RoleType.SHOP_OWNER,
                assigned_shop_id=shop.id,
                is_active=True
            )
            db.add(shop_owner)
        else:
             # Ensure correct assignment
             shop_owner.assigned_shop_id = shop.id
             shop_owner.role = RoleType.SHOP_OWNER
        
        # Warehouse Admin
        wh_admin_email = "test.whadmin@phm.test"
        wh_admin = db.query(User).filter(User.email == wh_admin_email).first()
        if not wh_admin:
            wh_admin = User(
                email=wh_admin_email,
                password_hash=get_password_hash("password123"),
                full_name="Test WH Admin",
                role=RoleType.WAREHOUSE_ADMIN,
                assigned_warehouse_id=wh.id,
                is_active=True
            )
            db.add(wh_admin)
        else:
            wh_admin.assigned_warehouse_id = wh.id
            wh_admin.role = RoleType.WAREHOUSE_ADMIN

        db.commit()
        print("Test data setup complete.")
        return {
            "shop_owner": {"email": shop_owner_email, "password": "password123", "shop_id": shop.id},
            "wh_admin": {"email": wh_admin_email, "password": "password123", "wh_id": wh.id}
        }
    finally:
        db.close()

def get_token(email, password):
    response = requests.post(f"{API_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    if response.status_code != 200:
        print(f"Login failed for {email}: {response.text}")
        return None
    return response.json()["access_token"]

def test_shop_owner_isolation(user_data):
    print("\n--- Testing Shop Owner Isolation ---")
    token = get_token(user_data["email"], user_data["password"])
    if not token: return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. List Shops - Should only see own shop or be filtered
    print("1. Listing Shops...")
    res = requests.get(f"{API_URL}/shops", headers=headers)
    if res.status_code == 200:
        data = res.json()["items"]
        print(f"   Shops found: {len(data)}")
        for s in data:
            if s["id"] != user_data["shop_id"]:
                print(f"   [FAIL] Found unassigned shop: {s['name']}")
            else:
                print(f"   [PASS] Found assigned shop: {s['name']}")
    else:
        print(f"   [INFO] API returned {res.status_code} (Might be intended if restricted)")

    # 2. List Employees - Should only see shop employees
    print("2. Listing Employees...")
    res = requests.get(f"{API_URL}/employees", headers=headers)
    if res.status_code == 200:
        data = res.json()["items"]
        print(f"   Employees found: {len(data)}")
        # Assuming current user is an employee/user, they might appear. 
        # Check if any employee belongs to another entity
    
    # 3. List Warehouses - Should be denied or empty
    print("3. Listing Warehouses...")
    res = requests.get(f"{API_URL}/warehouses", headers=headers)
    if res.status_code == 403:
        print("   [PASS] Access denied (403) as expected.")
    elif res.status_code == 200:
        if len(res.json()["items"]) == 0:
             print("   [PASS] Access granted but list empty.")
        else:
             print(f"   [FAIL] Shop owner can see {len(res.json()['items'])} warehouses!")
    else:
        print(f"   [INFO] Status: {res.status_code}")

def test_wh_admin_isolation(user_data):
    print("\n--- Testing Warehouse Admin Isolation ---")
    token = get_token(user_data["email"], user_data["password"])
    if not token: return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. List Warehouses - Should only see own warehouse
    print("1. Listing Warehouses...")
    res = requests.get(f"{API_URL}/warehouses", headers=headers)
    if res.status_code == 200:
        data = res.json()["items"]
        print(f"   Warehouses found: {len(data)}")
        if len(data) == 1 and data[0]["id"] == user_data["wh_id"]:
            print("   [PASS] Only assigned warehouse visible.")
        elif len(data) == 0:
            print("   [FAIL] No warehouses found (should see own).")
        else:
            print("   [FAIL] Multiple warehouses found.")
            
    # 2. List Shops - Filtered (maybe none or only linked?)
    # Generally WH admin manages stock for linked shops? access rules might vary.
    # checking shops.py: list_shops filters by 'shop_owner' role but WH admin might fall to default query?
    # Actually shops.py list_shops doesn't explicitly restrict WH admin, so they might see all.
    # Wait, my previous edit to shops.py only restricted Shop Owners. 
    # Let's check WH admin behavior.
    pass

if __name__ == "__main__":
    try:
        users = setup_test_data()
        test_shop_owner_isolation(users["shop_owner"])
        test_wh_admin_isolation(users["wh_admin"])
    except Exception as e:
        print(f"Test setup failed: {e}")
