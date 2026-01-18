import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import User

def check_users():
    db = SessionLocal()
    try:
        print("\n=== ALL USERS IN DATABASE ===\n")
        users = db.query(User).order_by(User.created_at.desc()).all()
        
        for user in users:
            print(f"Email: {user.email}")
            print(f"  Name: {user.full_name}")
            print(f"  Role: {user.role}")
            print(f"  Warehouse ID: {user.assigned_warehouse_id}")
            print(f"  Shop ID: {user.assigned_shop_id}")
            print(f"  Active: {user.is_active}")
            print(f"  Created: {user.created_at}")
            print("-" * 50)
        
        print(f"\nTotal users: {len(users)}")
        
        # Count by warehouse
        print("\n=== USERS BY WAREHOUSE ===")
        warehouse_users = {}
        for user in users:
            wh_id = user.assigned_warehouse_id or "None"
            if wh_id not in warehouse_users:
                warehouse_users[wh_id] = []
            warehouse_users[wh_id].append(user.email)
        
        for wh_id, emails in warehouse_users.items():
            print(f"\nWarehouse {wh_id}: {len(emails)} users")
            for email in emails:
                print(f"  - {email}")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
