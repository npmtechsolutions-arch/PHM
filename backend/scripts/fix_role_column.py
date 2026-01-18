"""
Simple migration to change users.role from ENUM to VARCHAR
"""
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    try:
        print("\n=== Migrating users.role column ===\n")
        
        # Alter column type
        print("Converting role column to VARCHAR...")
        cur.execute("""
            ALTER TABLE users 
            ALTER COLUMN role TYPE VARCHAR(50) 
            USING role::text;
        """)
        
        conn.commit()
        print("✅ Migration successful!")
        print("The users.role column now accepts lowercase values like 'warehouse_employee'")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
