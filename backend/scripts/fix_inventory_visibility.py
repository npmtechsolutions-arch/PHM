
"""
Fix Inventory Visibility for Warehouse Admin
Run with: python -m scripts.fix_inventory_visibility
"""
import sys
import sys
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.database import SessionLocal
from app.db.models import Permission, Role, RolePermission

def fix_permissions():
    db = SessionLocal()
    
    try:
        print("🔧 fixing Inventory Visibility Permissions...")
        
        # 1. Define permissions to ensure
        perms_to_ensure = [
            {
                "code": "inventory.view.warehouse",
                "module": "inventory", 
                "action": "view",
                "scope": "warehouse",
                "description": "View warehouse inventory"
            },
            {
                "code": "inventory.view.shop",
                "module": "inventory",
                "action": "view", 
                "scope": "shop",
                "description": "View shop inventory"
            }
        ]
        
        # 2. Create them if missing
        for p_data in perms_to_ensure:
            perm = db.query(Permission).filter(Permission.code == p_data["code"]).first()
            if not perm:
                print(f"  ➕ Creating permission: {p_data['code']}")
                perm = Permission(**p_data)
                db.add(perm)
                db.commit()
                db.refresh(perm)
            else:
                print(f"  ✅ Permission exists: {p_data['code']}")
                
            # 3. Assign to Warehouse Admin
            role = db.query(Role).filter(Role.name == "warehouse_admin").first()
            if role:
                # Check if linked
                link = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id
                ).first()
                if not link:
                    print(f"  🔗 Linking {p_data['code']} to Warehouse Admin")
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
                    db.commit()
                else:
                    print(f"  👍 Already linked to Warehouse Admin")
            else:
                print("❌ Warehouse Admin role not found")

        print("✅ Done!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_permissions()
