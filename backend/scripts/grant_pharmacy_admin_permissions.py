"""
Grant Pharmacy Admin all required permissions for Dashboard access
Pharmacy Admin needs access to:
- Reports
- Inventory
- Incoming Shipments (Dispatches)
- Purchase Requests
- Employees
- Attendance
- Salary
- POS Billing
- Invoices
- Returns & Refunds
- Customers

Run with: python -m scripts.grant_pharmacy_admin_permissions
"""
import sys
sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import Role, Permission

def grant_pharmacy_admin_permissions():
    db = SessionLocal()
    
    try:
        print("Granting Pharmacy Admin all required permissions...")
        
        # Get Pharmacy Admin role
        pharmacy_admin = db.query(Role).filter(Role.name == 'pharmacy_admin').first()
        if not pharmacy_admin:
            print("  ERROR: Pharmacy Admin role not found")
            return
        
        # All permissions Pharmacy Admin should have
        permission_codes = [
            # ═══════════════════════════════════════════════════════════════
            # 📊 DASHBOARD
            # ═══════════════════════════════════════════════════════════════
            'dashboard.view',
            
            # ═══════════════════════════════════════════════════════════════
            # 📁 MASTER DATA (View, Create, Edit - NO DELETE)
            # ═══════════════════════════════════════════════════════════════
            # Categories
            'categories.view',
            'categories.create',
            'categories.edit',
            'categories.manage',
            
            # Units
            'units.view',
            'units.create',
            'units.edit',
            'units.manage',
            
            # Brands
            'brands.view',
            'brands.create',
            'brands.edit',
            'brands.manage',
            
            # Manufacturers
            'manufacturers.view',
            'manufacturers.create',
            'manufacturers.edit',
            'manufacturers.manage',
            
            # Medicine Types
            'medicine_types.view',
            'medicine_types.create',
            'medicine_types.edit',
            'medicine_types.manage',
            
            # HSN Codes
            'hsn.view',
            'hsn.create',
            'hsn.edit',
            'hsn.manage',
            
            # GST Slabs
            'gst.view',
            'gst.create',
            'gst.edit',
            'gst.manage',
            
            # Suppliers
            'suppliers.view',
            'suppliers.create',
            'suppliers.edit',
            'suppliers.manage',
            
            # Payment Methods
            'payment_methods.view',
            'payment_methods.create',
            'payment_methods.edit',
            'payment_methods.manage',
            
            # Adjustment Reasons
            'adjustment_reasons.view',
            'adjustment_reasons.create',
            'adjustment_reasons.edit',
            'adjustment_reasons.manage',
            
            # Racks
            'racks.view',
            'racks.create',
            'racks.edit',
            'racks.manage',
            
            # ═══════════════════════════════════════════════════════════════
            # 💊 MEDICINE MASTER
            # ═══════════════════════════════════════════════════════════════
            'medicines.view',
            'medicines.create',
            
            # ═══════════════════════════════════════════════════════════════
            # 📊 REPORTS
            # ═══════════════════════════════════════════════════════════════
            'reports.view.shop',
            'reports.view.global',  # For sidebar visibility
            'reports.export',
            
            # ═══════════════════════════════════════════════════════════════
            # 📦 INVENTORY
            # ═══════════════════════════════════════════════════════════════
            'inventory.view.shop',
            'inventory.adjust.shop',
            'inventory.entry.shop',  # For direct stock entry if needed
            
            # ═══════════════════════════════════════════════════════════════
            # 🚚 INCOMING SHIPMENTS (DISPATCHES)
            # ═══════════════════════════════════════════════════════════════
            'dispatches.view.shop',
            
            # ═══════════════════════════════════════════════════════════════
            # 📝 PURCHASE REQUESTS
            # ═══════════════════════════════════════════════════════════════
            'purchase_requests.view.shop',
            'purchase_requests.create.shop',
            
            # ═══════════════════════════════════════════════════════════════
            # 👥 EMPLOYEES
            # ═══════════════════════════════════════════════════════════════
            'employees.view.shop',
            'employees.manage.shop',
            
            # ═══════════════════════════════════════════════════════════════
            # 📋 ATTENDANCE
            # ═══════════════════════════════════════════════════════════════
            'attendance.manage.shop',
            
            # ═══════════════════════════════════════════════════════════════
            # 💰 SALARY
            # ═══════════════════════════════════════════════════════════════
            'salary.manage.shop',
            
            # ═══════════════════════════════════════════════════════════════
            # 💳 POS BILLING
            # ═══════════════════════════════════════════════════════════════
            'billing.view.shop',
            'billing.create.shop',
            'billing.void.shop',
            
            # ═══════════════════════════════════════════════════════════════
            # 📄 INVOICES
            # ═══════════════════════════════════════════════════════════════
            # 'billing.view.shop' already covers invoices
            
            # ═══════════════════════════════════════════════════════════════
            # 🔄 RETURNS & REFUNDS
            # ═══════════════════════════════════════════════════════════════
            'returns.view.shop',
            'returns.create.shop',
            
            # ═══════════════════════════════════════════════════════════════
            # 👤 CUSTOMERS
            # ═══════════════════════════════════════════════════════════════
            'customers.view.shop',
            'customers.manage.shop',
            
            # ═══════════════════════════════════════════════════════════════
            # 🔔 NOTIFICATIONS
            # ═══════════════════════════════════════════════════════════════
            'notifications.view',
        ]
        
        # Get all permissions
        permissions_to_add = db.query(Permission).filter(
            Permission.code.in_(permission_codes)
        ).all()
        
        # Get current permission IDs
        current_perm_ids = set(p.id for p in pharmacy_admin.permissions)
        
        # Add new permissions
        added_count = 0
        skipped_count = 0
        
        for perm in permissions_to_add:
            if perm.id not in current_perm_ids:
                pharmacy_admin.permissions.append(perm)
                print(f"  [ADDED] {perm.code}")
                added_count += 1
            else:
                print(f"  [SKIP] Already has: {perm.code}")
                skipped_count += 1
        
        # Check for missing permissions
        found_codes = {p.code for p in permissions_to_add}
        missing_codes = set(permission_codes) - found_codes
        if missing_codes:
            print(f"\n  [WARNING] Missing permissions in database (need to be created):")
            for code in missing_codes:
                print(f"     - {code}")
        
        db.commit()
        
        print(f"\n[SUCCESS] Permission update complete!")
        print(f"   Added: {added_count}")
        print(f"   Already had: {skipped_count}")
        print(f"   Total permissions: {len(pharmacy_admin.permissions)}")
        
        # Show all current permissions
        print(f"\nCurrent Pharmacy Admin Permissions:")
        for perm in sorted(pharmacy_admin.permissions, key=lambda p: p.code):
            print(f"   - {perm.code}")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    grant_pharmacy_admin_permissions()
