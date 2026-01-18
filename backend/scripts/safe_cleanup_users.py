import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import User
from sqlalchemy import text

def safe_delete_inactive_users():
    """Safely delete inactive users or just deactivate them"""
    db = SessionLocal()
    try:
        # Find all inactive users
        inactive_users = db.query(User).filter(User.is_active == False).all()
        
        print(f"\n=== Found {len(inactive_users)} INACTIVE users ===\n")
        
        for user in inactive_users:
            role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
            print(f"  - {user.email:35} | {user.full_name:20} | {role_str}")
        
        if not inactive_users:
            print("\n✅ No inactive users found.")
            return
        
        print("\n⚠️  Some users may have related records (employees, transactions, etc.)")
        print("Options:")
        print("1. Try to DELETE (may fail if they have related records)")
        print("2. Just mark as PERMANENTLY INACTIVE (safer)")
        
        choice = input("\nChoose option (1/2): ")
        
        if choice == "1":
            # Try to delete
            deleted = 0
            failed = []
            
            for user in inactive_users:
                try:
                    db.delete(user)
                    db.flush()  # Try to commit this one
                    deleted += 1
                    print(f"  ✅ Deleted: {user.email}")
                except Exception as e:
                    db.rollback()
                    failed.append((user.email, str(e)))
                    print(f"  ❌ Cannot delete: {user.email} (has related records)")
            
            if deleted > 0:
                confirm = input(f"\n⚠️  Commit deletion of {deleted} users? (yes/no): ")
                if confirm.lower() == 'yes':
                    db.commit()
                    print(f"\n✅ Successfully deleted {deleted} users!")
                else:
                    db.rollback()
                    print("\n❌ Deletion cancelled.")
            
            if failed:
                print(f"\n⚠️  {len(failed)} users could not be deleted (they have related records)")
                
        elif choice == "2":
            # Just ensure they're inactive (already are)
            print("\n✅ Users are already marked as inactive. No action needed.")
            print("   They won't appear in active user lists.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def permanently_remove_test_users():
    """Remove specific test users by updating their email to mark as deleted"""
    db = SessionLocal()
    try:
        # Find inactive test users
        test_patterns = ['test.', 'dpdhilip', '123@gmail', 'dha@gmail', 'pranitha@gmail']
        
        inactive_test_users = db.query(User).filter(
            User.is_active == False
        ).all()
        
        # Filter for test users
        test_users = [u for u in inactive_test_users 
                     if any(pattern in u.email.lower() for pattern in test_patterns)]
        
        if not test_users:
            print("\n✅ No inactive test users found.")
            return
        
        print(f"\n=== Found {len(test_users)} INACTIVE TEST users ===\n")
        for user in test_users:
            print(f"  - {user.email}")
        
        confirm = input(f"\n⚠️  Mark these {len(test_users)} users as [DELETED]? (yes/no): ")
        
        if confirm.lower() == 'yes':
            for user in test_users:
                # Mark email as deleted
                user.email = f"[DELETED]_{user.id}@deleted.local"
                user.full_name = f"[DELETED] {user.full_name}"
            
            db.commit()
            print(f"\n✅ Successfully marked {len(test_users)} users as deleted!")
            print("   They are now hidden and cannot log in.")
        else:
            print("\n❌ Operation cancelled.")
                
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("SAFE USER CLEANUP UTILITY")
    print("="*60)
    
    print("\nOptions:")
    print("1. View all inactive users")
    print("2. Try to delete inactive users (may fail if they have records)")
    print("3. Mark inactive test users as [DELETED] (safer)")
    
    choice = input("\nEnter choice (1/2/3): ")
    
    if choice == "1":
        db = SessionLocal()
        try:
            inactive = db.query(User).filter(User.is_active == False).all()
            print(f"\n=== {len(inactive)} INACTIVE users ===\n")
            for u in inactive:
                role_str = u.role.value if hasattr(u.role, 'value') else str(u.role)
                print(f"{u.email:35} | {u.full_name:20} | {role_str}")
        finally:
            db.close()
    elif choice == "2":
        safe_delete_inactive_users()
    elif choice == "3":
        permanently_remove_test_users()
    else:
        print("Invalid choice!")
