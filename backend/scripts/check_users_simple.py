import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import User

def check_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total users in database: {len(users)}")
        print(f"\nRecent 5 users:")
        for user in db.query(User).order_by(User.created_at.desc()).limit(5).all():
            role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
            print(f"{user.email} | {role_str} | WH:{user.assigned_warehouse_id} | Shop:{user.assigned_shop_id}")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
