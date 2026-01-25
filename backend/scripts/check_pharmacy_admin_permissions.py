"""
Check and verify Pharmacy Admin permissions in the backend
Run with: python -m scripts.check_pharmacy_admin_permissions
"""
import sys
sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import Role, Permission

def check_pharmacy_admin_permissions():
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("PHARMACY ADMIN PERMISSIONS CHECK")
        print("=" * 60)
        
        # Get Pharmacy Admin role
        pharmacy_admin = db.query(Role).filter(Role.name == 'pharmacy_admin').first()
        if not pharmacy_admin:
            print("\n[ERROR] Pharmacy Admin role not found in database!")
            return
        
        print(f"\nRole: {pharmacy_admin.name}")
        print(f"Description: {pharmacy_admin.description}")
        print(f"Entity Type: {pharmacy_admin.entity_type}")
        print(f"Total Permissions: {len(pharmacy_admin.permissions)}")
        
        # Required permissions for Pharmacy Admin Dashboard
        required_permissions = {
            'Dashboard': ['dashboard.view'],
            'Reports': ['reports.view.shop', 'reports.export'],
            'Inventory': ['inventory.view.shop', 'inventory.adjust.shop'],
            'Incoming Shipments': ['dispatches.view.shop'],
            'Purchase Requests': ['purchase_requests.view.shop', 'purchase_requests.create.shop'],
            'Employees': ['employees.view.shop', 'employees.manage.shop'],
            'Attendance': ['attendance.manage.shop'],
            'Salary': ['salary.manage.shop'],
            'POS Billing': ['billing.create.shop'],
            'Invoices': ['billing.view.shop'],
            'Returns & Refunds': ['returns.view.shop', 'returns.create.shop'],
            'Customers': ['customers.view.shop', 'customers.manage.shop'],
            'Medicines': ['medicines.view'],
            'Notifications': ['notifications.view'],
        }
        
        # Get current permission codes
        current_perms = {p.code for p in pharmacy_admin.permissions}
        
        print("\n" + "=" * 60)
        print("PERMISSION VERIFICATION")
        print("=" * 60)
        
        all_good = True
        for module, perms in required_permissions.items():
            print(f"\n[{module}]")
            for perm in perms:
                if perm in current_perms:
                    print(f"  [OK] {perm}")
                else:
                    print(f"  [MISSING] {perm}")
                    all_good = False
        
        # Show all permissions grouped by module
        print("\n" + "=" * 60)
        print("ALL PHARMACY ADMIN PERMISSIONS (Grouped by Module)")
        print("=" * 60)
        
        # Group permissions by module
        by_module = {}
        for perm in sorted(pharmacy_admin.permissions, key=lambda p: (p.module, p.action)):
            if perm.module not in by_module:
                by_module[perm.module] = []
            by_module[perm.module].append(perm)
        
        for module in sorted(by_module.keys()):
            print(f"\n[{module.upper()}]")
            for perm in by_module[module]:
                scope = f".{perm.scope}" if perm.scope != 'global' else ""
                print(f"  - {perm.code} ({perm.action}{scope})")
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total Permissions: {len(pharmacy_admin.permissions)}")
        
        if all_good:
            print("\n[SUCCESS] All required permissions are present!")
        else:
            print("\n[WARNING] Some required permissions are missing!")
            print("Run: python -m scripts.grant_pharmacy_admin_permissions")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_pharmacy_admin_permissions()
