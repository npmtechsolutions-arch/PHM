"""
Create missing permissions for Warehouse Admin
Run with: python scripts/create_missing_permissions.py
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
from app.db.models import Permission
from app.db.models import generate_uuid
from datetime import datetime

def create_missing_permissions():
    db: Session = SessionLocal()
    
    try:
        print("🔧 Creating Missing Permissions...")
        print("="*60)
        
        # Define missing permissions based on the script output
        # Using the correct format: module.action.scope
        missing_permissions = [
            # Master Data - Edit permissions (use 'edit' action)
            ("categories.edit", "categories", "edit", "global", "Edit categories"),
            ("units.edit", "units", "edit", "global", "Edit units"),
            ("brands.edit", "brands", "edit", "global", "Edit brands"),
            ("manufacturers.edit", "manufacturers", "edit", "global", "Edit manufacturers"),
            ("medicine_types.edit", "medicine_types", "edit", "global", "Edit medicine types"),
            ("hsn.edit", "hsn", "edit", "global", "Edit HSN codes"),
            ("gst.edit", "gst", "edit", "global", "Edit GST slabs"),
            ("suppliers.edit", "suppliers", "edit", "global", "Edit suppliers"),
            ("payment_methods.edit", "payment_methods", "edit", "global", "Edit payment methods"),
            ("adjustment_reasons.edit", "adjustment_reasons", "edit", "global", "Edit adjustment reasons"),
            ("racks.edit", "racks", "edit", "global", "Edit racks"),
            
            # Master Data - Manage permissions (for sidebar visibility)
            ("brands.manage", "brands", "manage", "global", "Manage brands"),
            ("manufacturers.manage", "manufacturers", "manage", "global", "Manage manufacturers"),
            ("medicine_types.manage", "medicine_types", "manage", "global", "Manage medicine types"),
            ("suppliers.manage", "suppliers", "manage", "global", "Manage suppliers"),
            ("payment_methods.manage", "payment_methods", "manage", "global", "Manage payment methods"),
            ("adjustment_reasons.manage", "adjustment_reasons", "manage", "global", "Manage adjustment reasons"),
            ("racks.manage", "racks", "manage", "global", "Manage racks"),
        ]
        
        created_count = 0
        existing_count = 0
        
        for code, module, action, scope, description in missing_permissions:
            # Check if permission already exists
            existing = db.query(Permission).filter(Permission.code == code).first()
            
            if existing:
                existing_count += 1
                print(f"⏭️  Already exists: {code}")
                continue
            
            # Create new permission
            permission = Permission(
                id=generate_uuid(),
                code=code,
                module=module,
                action=action,
                scope=scope,
                description=description,
                created_at=datetime.utcnow()
            )
            
            db.add(permission)
            created_count += 1
            print(f"✅ Created: {code}")
        
        db.commit()
        
        print(f"\n{'='*60}")
        print(f"✅ Successfully created {created_count} new permissions")
        print(f"⏭️  {existing_count} already existed")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_missing_permissions()
