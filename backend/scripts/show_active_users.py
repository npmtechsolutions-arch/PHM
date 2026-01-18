import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import User

def show_active_users():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active == True).order_by(User.created_at.desc()).all()
        
        print(f"\n{'='*80}")
        print(f"ACTIVE USERS ({len(users)} total)")
        print(f"{'='*80}\n")
        
        print(f"{'Email':<35} | {'Name':<20} | {'Role':<20} | {'Warehouse':<15} | {'Shop'}")
        print("-" * 120)
        
        for user in users:
            role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
            wh = user.assigned_warehouse_id[:8] + "..." if user.assigned_warehouse_id else "-"
            shop = user.assigned_shop_id[:8] + "..." if user.assigned_shop_id else "-"
            
            print(f"{user.email:<35} | {user.full_name:<20} | {role_str:<20} | {wh:<15} | {shop}")
        
        print(f"\n{'='*80}")
        print(f"Total Active Users: {len(users)}")
        print(f"{'='*80}\n")
                
    finally:
        db.close()

if __name__ == "__main__":
    show_active_users()
