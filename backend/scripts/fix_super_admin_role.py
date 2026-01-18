"""
Check and fix super admin role in database
"""
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_Kwb6WtM7HlPI@ep-misty-band-a1ncnenu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")

# Create engine and session
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def check_and_fix_super_admin():
    session = Session()
    
    try:
        # Find all users and their roles
        query = text("""
            SELECT 
                u.id,
                u.email,
                u.full_name,
                u.role as legacy_role,
                u.role_id,
                r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.email
        """)
        
        result = session.execute(query)
        users = result.fetchall()
        
        print("\n" + "="*80)
        print("CURRENT USER ROLES")
        print("="*80 + "\n")
        
        for user in users:
            print(f"Email: {user.email}")
            print(f"  Full Name: {user.full_name}")
            print(f"  Legacy Role: {user.legacy_role}")
            print(f"  Role ID: {user.role_id}")
            print(f"  Role Name (from FK): {user.role_name}")
            print()
        
        # Find users with role issues
        print("\n" + "="*80)
        print("FIXING SUPER ADMIN ROLE")
        print("="*80 + "\n")
        
        # Check if there's a super_admin role in roles table
        role_check = session.execute(text("SELECT id, name FROM roles WHERE name = 'super_admin'"))
        super_admin_role = role_check.first()
        
        if super_admin_role:
            print(f"Found super_admin role: {super_admin_role.id}")
            
            # Find users who should be super admin
            # Option 1: Users with legacy_role = 'super_admin' but no role_id
            fix_query = text("""
                UPDATE users 
                SET role_id = :role_id
                WHERE (role = 'super_admin' OR role = 'SUPER_ADMIN' OR role LIKE '%super%admin%')
                AND role_id IS NULL
                RETURNING id, email
            """)
            
            fixed = session.execute(fix_query, {"role_id": super_admin_role.id})
            fixed_users = fixed.fetchall()
            
            if fixed_users:
                print("\nFixed users:")
                for fu in fixed_users:
                    print(f"  - {fu.email} (ID: {fu.id})")
                session.commit()
                print("\n✓ Super admin role assignments fixed!")
            else:
                print("\nNo users needed fixing.")
        else:
            print("WARNING: No super_admin role found in roles table!")
            print("You may need to run the role seeding script first.")
        
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    check_and_fix_super_admin()
