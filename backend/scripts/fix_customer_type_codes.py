"""
Fix Customer Type Codes - Migrate from uppercase to lowercase
Run with: python -m scripts.fix_customer_type_codes
"""
import sys
sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import CustomerTypeMaster

def fix_customer_type_codes():
    db = SessionLocal()
    try:
        print("🔧 Fixing Customer Type codes to lowercase...")
        
        # Define the mapping from old (uppercase) to new (lowercase)
        code_mapping = {
            "REGULAR": "regular",
            "SENIOR": "senior", 
            "VIP": "vip",
            "CORPORATE": "corporate",
            "STAFF": "insurance",  # Map STAFF to insurance to match backend enum
            "INSURANCE": "insurance",
        }
        
        updated = 0
        for old_code, new_code in code_mapping.items():
            existing = db.query(CustomerTypeMaster).filter(CustomerTypeMaster.code == old_code).first()
            if existing:
                # Check if new code already exists
                new_exists = db.query(CustomerTypeMaster).filter(CustomerTypeMaster.code == new_code).first()
                if new_exists and new_exists.id != existing.id:
                    # Delete the old one since new one exists
                    db.delete(existing)
                    print(f"   > Deleted duplicate {old_code} (new code {new_code} already exists)")
                else:
                    existing.code = new_code
                    print(f"   > Updated {old_code} -> {new_code}")
                updated += 1
        
        db.commit()
        print(f"✅ Fixed {updated} customer type codes!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_customer_type_codes()
