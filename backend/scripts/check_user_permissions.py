"""
Fixed diagnostic script to check user permissions
"""
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_Kwb6WtM7HlPI@ep-misty-band-a1ncnenu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")

# Create engine and session
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def check_permissions():
    """Check user permissions using raw SQL to avoid import issues"""
    session = Session()
    
    try:
        # Query users with their roles
        query = text("""
            SELECT 
                u.id as user_id,
                u.email,
                u.is_active,
                r.id as role_id,
                r.name as role_name,
                r.role_type,
                u.warehouse_id,
                u.shop_id,
                (SELECT COUNT(*) 
                 FROM role_permissions rp 
                 WHERE rp.role_id = r.id) as permission_count
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.email
        """)
        
        result = session.execute(query)
        users = result.fetchall()
        
        print("\n" + "="*80)
        print("USER PERMISSIONS REPORT")
        print("="*80 + "\n")
        
        for user in users:
            print(f"Email: {user.email}")
            print(f"User ID: {user.user_id}")
            print(f"Active: {user.is_active}")
            
            if user.role_name:
                print(f"Role: {user.role_name} (Type: {user.role_type})")
                print(f"Permission Count: {user.permission_count}")
                
                if user.permission_count == 0:
                    print("  WARNING: NO PERMISSIONS ASSIGNED!")
            else:
                print("  WARNING: NO ROLE ASSIGNED!")
            
            print(f"Warehouse ID: {user.warehouse_id}")
            print(f"Shop ID: {user.shop_id}")
            print("-" * 80 + "\n")
        
        # Find users with zero permissions
        print("\nUSERS WITH ZERO PERMISSIONS:")
        print("-" * 80)
        zero_perm_users = [u for u in users if u.permission_count == 0 and u.role_name]
        if zero_perm_users:
            for user in zero_perm_users:
                print(f"  - {user.email} (Role: {user.role_name})")
        else:
            print("  None found")
        print()
        
    finally:
        session.close()

if __name__ == "__main__":
    check_permissions()
