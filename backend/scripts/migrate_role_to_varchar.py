"""
Alter users.role column from ENUM to VARCHAR to fix case sensitivity issue
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from sqlalchemy import text

def alter_role_column():
    db = SessionLocal()
    try:
        print("\n=== Altering users.role column from ENUM to VARCHAR ===\n")
        
        # Step 1: Alter column type from ENUM to VARCHAR
        print("Step 1: Converting role column to VARCHAR...")
        db.execute(text("""
            ALTER TABLE users 
            ALTER COLUMN role TYPE VARCHAR(50) 
            USING role::text;
        """))
        
        print("✅ Column altered successfully!")
        
        # Step 2: Drop the old enum type if it exists and is no longer used
        print("\nStep 2: Attempting to drop old roletype enum...")
        try:
            db.execute(text("DROP TYPE IF EXISTS roletype CASCADE;"))
            print("✅ Old enum type dropped!")
        except Exception as e:
            print(f"⚠️  Could not drop enum type (might still be in use): {e}")
        
        db.commit()
        print("\n✅ Migration completed successfully!")
        print("The users.role column is now VARCHAR(50) and accepts lowercase values.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    alter_role_column()
