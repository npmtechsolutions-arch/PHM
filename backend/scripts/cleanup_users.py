import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import User

def delete_inactive_users():
    """Delete all inactive users from the database"""
    db = SessionLocal()
    try:
        # Find all inactive users
        inactive_users = db.query(User).filter(User.is_active == False).all()
        
        print(f"\n=== Found {len(inactive_users)} INACTIVE users ===\n")
        
        for user in inactive_users:
            role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
            print(f"  - {user.email} ({user.full_name}) - {role_str}")
        
        if inactive_users:
            confirm = input(f"\n⚠️  DELETE all {len(inactive_users)} inactive users? (yes/no): ")
            
            if confirm.lower() == 'yes':
                for user in inactive_users:
                    db.delete(user)
                
                db.commit()
                print(f"\n✅ Successfully deleted {len(inactive_users)} inactive users!")
            else:
                print("\n❌ Deletion cancelled.")
        else:
            print("\n✅ No inactive users found.")
                
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def delete_specific_users():
    """Delete specific users by email"""
    db = SessionLocal()
    try:
        # List of emails to delete
        emails_to_delete = [
            "dpdhilip078@gmail.com",
            "dha@gmail.com",
            "dpdhlip07@gmail.com",
            "dpdhilip09@gmail.com",
            "test.user@example.com",
            "dpdhilip08@gmail.com",
            "pranitha@gmail.com",
            "dpdhilip07@gmail.com",
            "123@gmail.com"
        ]
        
        print(f"\n=== Deleting {len(emails_to_delete)} specific users ===\n")
        
        deleted_count = 0
        for email in emails_to_delete:
            user = db.query(User).filter(User.email == email).first()
            if user:
                print(f"  Deleting: {user.email} ({user.full_name})")
                db.delete(user)
                deleted_count += 1
            else:
                print(f"  Not found: {email}")
        
        if deleted_count > 0:
            confirm = input(f"\n⚠️  Confirm deletion of {deleted_count} users? (yes/no): ")
            
            if confirm.lower() == 'yes':
                db.commit()
                print(f"\n✅ Successfully deleted {deleted_count} users!")
            else:
                db.rollback()
                print("\n❌ Deletion cancelled.")
        else:
            print("\n✅ No users to delete.")
                
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def show_all_users():
    """Show all users in the database"""
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.is_active.desc(), User.created_at.desc()).all()
        
        print(f"\n=== ALL USERS ({len(users)} total) ===\n")
        
        active_count = 0
        inactive_count = 0
        
        for user in users:
            role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
            status = "ACTIVE" if user.is_active else "INACTIVE"
            
            if user.is_active:
                active_count += 1
            else:
                inactive_count += 1
            
            print(f"[{status:8}] {user.email:30} | {user.full_name:20} | {role_str}")
        
        print(f"\nActive: {active_count} | Inactive: {inactive_count}")
                
    finally:
        db.close()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("USER CLEANUP UTILITY")
    print("="*60)
    
    print("\nOptions:")
    print("1. Show all users")
    print("2. Delete all INACTIVE users")
    print("3. Delete specific test users")
    
    choice = input("\nEnter choice (1/2/3): ")
    
    if choice == "1":
        show_all_users()
    elif choice == "2":
        delete_inactive_users()
    elif choice == "3":
        delete_specific_users()
    else:
        print("Invalid choice!")
