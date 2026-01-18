
import sys
import os
from sqlalchemy import text

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import engine

def add_columns():
    with engine.connect() as conn:
        # Transaction
        trans = conn.begin()
        try:
            print("Attempting to add rack_name column to shop_stock...")
            try:
                conn.execute(text("ALTER TABLE shop_stock ADD COLUMN rack_name VARCHAR(100)"))
                print("Added rack_name.")
            except Exception as e:
                print(f"rack_name might already exist or error: {e}")

            print("Attempting to add rack_number column to shop_stock...")
            try:
                conn.execute(text("ALTER TABLE shop_stock ADD COLUMN rack_number VARCHAR(50)"))
                print("Added rack_number.")
            except Exception as e:
                print(f"rack_number might already exist or error: {e}")
            
            trans.commit()
            print("Migration completed.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    add_columns()
