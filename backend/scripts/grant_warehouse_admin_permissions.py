"""
Grant comprehensive permissions to Warehouse Admin role
Based on 9 core modules for warehouse operations management
"""
# -*- coding: utf-8 -*-
import sys
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import Role, Permission, RolePermission

def grant_warehouse_admin_permissions():
    db: Session = SessionLocal()
    
    try:
        # Find Warehouse Admin role
        warehouse_admin = db.query(Role).filter(Role.name == "warehouse_admin").first()
        if not warehouse_admin:
            print("❌ Warehouse Admin role not found!")
            return
        
        print(f"✅ Found Warehouse Admin role: {warehouse_admin.id}")
        
        # Define all permissions for Warehouse Admin based on 9 modules
        warehouse_admin_permissions = [
            # ═══════════════════════════════════════════════════════════════
            # 📊 DASHBOARD
            # ═══════════════════════════════════════════════════════════════
            "dashboard.view",                 # View dashboard
            
            # ═══════════════════════════════════════════════════════════════
            # 🔐 USER MANAGEMENT (WAREHOUSE-SCOPED ONLY)
            # Can create/manage users ONLY for their warehouse
            # Can assign only: warehouse_employee, warehouse_supervisor, inventory_manager
            # Cannot assign: warehouse_admin, super_admin
            # ═══════════════════════════════════════════════════════════════
            "users.view.warehouse",           # View users in their warehouse
            "users.create.warehouse",         # Create users for their warehouse
            "users.update.warehouse",         # Update users in their warehouse
            "users.delete.warehouse",         # Deactivate users in their warehouse
            
            # ═══════════════════════════════════════════════════════════════
            # 1️⃣ WAREHOUSE MANAGEMENT
            # ═══════════════════════════════════════════════════════════════
            "warehouses.view",                # View warehouses (for sidebar)
            
            # ═══════════════════════════════════════════════════════════════
            # 2️⃣ INVENTORY MANAGEMENT
            # ═══════════════════════════════════════════════════════════════
            "inventory.view.warehouse",       # View warehouse inventory
            "inventory.view.shop",            # View shop inventory (for sidebar)
            "inventory.entry.warehouse",      # Stock entry
            "inventory.adjust.warehouse",     # Stock adjustment
            "inventory.adjust.shop",          # Shop stock adjustment (for sidebar)
            
            # ═══════════════════════════════════════════════════════════════
            # 3️⃣ PURCHASE & DISPATCH
            # ═══════════════════════════════════════════════════════════════
            "purchase_requests.view.warehouse",   # View shop purchase requests
            "purchase_requests.view.shop",        # View shop purchase requests (for sidebar)
            "purchase_requests.create.shop",     # Create purchase requests (for sidebar)
            "purchase_requests.approve.warehouse", # Approve purchase requests
            "dispatches.view.warehouse",          # View dispatches
            "dispatches.view.shop",               # View shop dispatches (for sidebar)
            "dispatches.create.warehouse",        # Create dispatch orders
            
            # ═══════════════════════════════════════════════════════════════
            # 4️⃣ MEDICINE CATALOG (LIMITED)
            # ═══════════════════════════════════════════════════════════════
            "medicines.view",                 # View medicines (for sidebar)
            "medicines.create",               # Create medicines (for sidebar)
            
            # ═══════════════════════════════════════════════════════════════
            # 5️⃣ SHOP OVERSIGHT (Not needed - warehouse admin doesn't manage shops)
            # ═══════════════════════════════════════════════════════════════
            
            # ═══════════════════════════════════════════════════════════════
            # 6️⃣ TAX & ACCOUNTING (Available through Reports)
            # ═══════════════════════════════════════════════════════════════
            
            # ═══════════════════════════════════════════════════════════════
            # 7️⃣ INVENTORY OVERSIGHT
            # ═══════════════════════════════════════════════════════════════
            "inventory.view.global",          # View inventory oversight (for sidebar)
            
            # ═══════════════════════════════════════════════════════════════
            # 8️⃣ REPORTS & ANALYTICS
            # ═══════════════════════════════════════════════════════════════
            "reports.view.global",            # View reports (for sidebar)
            "reports.view.warehouse",         # View warehouse reports
            "reports.view.shop",              # View shop reports (for sidebar)
            
            # ═══════════════════════════════════════════════════════════════
            # 9️⃣ HR MANAGEMENT
            # ═══════════════════════════════════════════════════════════════
            "employees.view.warehouse",       # View warehouse employees
            "employees.view.shop",            # View shop employees (for sidebar)
            "employees.view.global",          # View employees (for sidebar)
            "employees.manage.warehouse",     # Manage employees (for sidebar)
            "employees.manage.shop",          # Manage shop employees (for sidebar)
            "attendance.manage.warehouse",    # Manage attendance
            "attendance.manage.shop",         # Manage shop attendance (for sidebar)
            "salary.manage.warehouse",        # Manage salary (for sidebar)
            "salary.manage.shop",             # Manage shop salary (for sidebar)
            
            # ═══════════════════════════════════════════════════════════════
            # 🔟 NOTIFICATIONS & ALERTS
            # ═══════════════════════════════════════════════════════════════
            "notifications.view",             # View notifications
            
            # ═══════════════════════════════════════════════════════════════
            # MASTER DATA (CREATE, UPDATE - NO DELETE)
            # Warehouse Admin can add/edit master data but cannot delete
            # ═══════════════════════════════════════════════════════════════
            # ═══════════════════════════════════════════════════════════════
            # MASTER DATA (VIEW, CREATE, EDIT - NO DELETE)
            # Warehouse Admin can add/edit master data but cannot delete
            # ═══════════════════════════════════════════════════════════════
            
            # Categories
            "categories.view",                # View medicine categories
            "categories.create",              # Create new categories
            "categories.edit",                # Edit categories
            "categories.manage",              # Manage categories (for sidebar)
            
            # Units
            "units.view",                     # View units
            "units.create",                   # Create new units
            "units.edit",                     # Edit units
            "units.manage",                   # Manage units (for sidebar)
            
            # Brands
            "brands.view",                    # View brands
            "brands.create",                  # Create new brands
            "brands.edit",                    # Edit brands
            "brands.manage",                  # Manage brands (for sidebar)
            
            # Manufacturers
            "manufacturers.view",             # View manufacturers
            "manufacturers.create",           # Create new manufacturers
            "manufacturers.edit",            # Edit manufacturers
            "manufacturers.manage",          # Manage manufacturers (for sidebar)
            
            # Medicine Types
            "medicine_types.view",            # View medicine types
            "medicine_types.create",          # Create new medicine types
            "medicine_types.edit",           # Edit medicine types
            "medicine_types.manage",         # Manage medicine types (for sidebar)
            
            # HSN Codes
            "hsn.view",                       # View HSN codes
            "hsn.create",                     # Create new HSN codes
            "hsn.edit",                       # Edit HSN codes
            "hsn.manage",                     # Manage HSN codes (for sidebar)
            
            # GST Slabs
            "gst.view",                       # View GST slabs
            "gst.create",                     # Create new GST slabs
            "gst.edit",                       # Edit GST slabs
            "gst.manage",                     # Manage GST slabs (for sidebar)
            
            # Suppliers
            "suppliers.view",                 # View suppliers
            "suppliers.create",               # Create new suppliers
            "suppliers.edit",                 # Edit suppliers
            "suppliers.manage",               # Manage suppliers (for sidebar)
            
            # Payment Methods
            "payment_methods.view",           # View payment methods
            "payment_methods.create",         # Create new payment methods
            "payment_methods.edit",           # Edit payment methods
            "payment_methods.manage",        # Manage payment methods (for sidebar)
            
            # Adjustment Reasons
            "adjustment_reasons.view",        # View adjustment reasons
            "adjustment_reasons.create",      # Create new adjustment reasons
            "adjustment_reasons.edit",        # Edit adjustment reasons
            "adjustment_reasons.manage",      # Manage adjustment reasons (for sidebar)
            
            # Racks
            "racks.view",                     # View racks
            "racks.create",                   # Create new racks
            "racks.edit",                     # Edit racks
            "racks.manage",                   # Manage racks (for sidebar)
            "racks.manage.warehouse",         # Manage warehouse racks
        ]
        
        print(f"\n📋 Granting {len(warehouse_admin_permissions)} permissions to Warehouse Admin...")
        
        granted_count = 0
        missing_permissions = []
        
        for perm_code in warehouse_admin_permissions:
            # Find the permission
            permission = db.query(Permission).filter(Permission.code == perm_code).first()
            
            if not permission:
                missing_permissions.append(perm_code)
                print(f"⚠️  Permission not found: {perm_code}")
                continue
            
            # Check if already assigned
            existing = db.query(RolePermission).filter(
                RolePermission.role_id == warehouse_admin.id,
                RolePermission.permission_id == permission.id
            ).first()
            
            if not existing:
                role_perm = RolePermission(
                    role_id=warehouse_admin.id,
                    permission_id=permission.id
                )
                db.add(role_perm)
                granted_count += 1
                print(f"✅ Granted: {perm_code}")
            else:
                print(f"⏭️  Already exists: {perm_code}")
        
        db.commit()
        
        print(f"\n{'='*60}")
        print(f"✅ Successfully granted {granted_count} new permissions")
        print(f"⏭️  {len(warehouse_admin_permissions) - granted_count - len(missing_permissions)} already existed")
        
        if missing_permissions:
            print(f"\n⚠️  {len(missing_permissions)} permissions not found in database:")
            for perm in missing_permissions:
                print(f"   - {perm}")
            print("\n💡 These permissions need to be created first!")
        
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Granting Warehouse Admin Permissions...")
    print("="*60)
    grant_warehouse_admin_permissions()
