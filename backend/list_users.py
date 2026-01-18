import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import User

def list_users():
    """List all users in the database"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        print("\n" + "=" * 60)
        print("DATABASE USERS")
        print("=" * 60)
        
        if not users:
            print("\n⚠️  No users found in database!")
            print("\nYou need to create a user first. Run:")
            print("  python -c \"from app.db.init_db import create_super_admin; create_super_admin()\"")
        else:
            print(f"\nFound {len(users)} user(s):\n")
            for i, user in enumerate(users, 1):
                print(f"{i}. Email: {user.email}")
                print(f"   Name: {user.full_name}")
                print(f"   Role: {user.role.value if user.role else 'N/A'}")
                print(f"   Active: {user.is_active}")
                print(f"   Shop ID: {user.assigned_shop_id or 'N/A'}")
                print(f"   Warehouse ID: {user.assigned_warehouse_id or 'N/A'}")
                print()
        
        print("=" * 60 + "\n")
        
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
