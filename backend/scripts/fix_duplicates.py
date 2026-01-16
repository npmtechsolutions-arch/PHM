
import sys
import logging
from sqlalchemy import func

sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import DepartmentMaster, DesignationMaster, Employee

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_duplicates():
    db = SessionLocal()
    try:
        logger.info("🔧 Starting Duplicate Cleanup...")

        # --- Fix Departments ---
        # Find duplicate names
        dup_names = db.query(DepartmentMaster.name).group_by(DepartmentMaster.name).having(func.count(DepartmentMaster.id) > 1).all()
        
        for (name,) in dup_names:
            logger.info(f"Processing Duplicate Department: {name}")
            records = db.query(DepartmentMaster).filter(DepartmentMaster.name == name).all()
            
            # Strategy: Keep the one with 'DEPT-' prefix if exists, or just the last one
            keep = None
            for r in records:
                if r.code.startswith('DEPT-'):
                    keep = r
                    break
            if not keep:
                keep = records[0] # Fallback
            
            # Remap others to 'keep'
            for r in records:
                if r.id == keep.id:
                    continue
                
                logger.info(f"  Mergin {r.code} -> {keep.code}")
                
                # Update Employees
                # Using SQL update for efficiency
                updated = db.query(Employee).filter(Employee.department == r.code).update({Employee.department: keep.code})
                logger.info(f"  Updated {updated} employees")
                
                # Delete duplicate
                db.delete(r)
                
        # --- Fix Designations ---
        dup_names = db.query(DesignationMaster.name).group_by(DesignationMaster.name).having(func.count(DesignationMaster.id) > 1).all()
        
        for (name,) in dup_names:
            logger.info(f"Processing Duplicate Designation: {name}")
            records = db.query(DesignationMaster).filter(DesignationMaster.name == name).all()
            
            # Strategy: Keep the one with 'DESIG-' prefix
            keep = None
            for r in records:
                if r.code.startswith('DESIG-'):
                    keep = r
                    break
            if not keep:
                keep = records[0]
            
            for r in records:
                if r.id == keep.id:
                    continue
                
                logger.info(f"  Mergin {r.code} -> {keep.code}")
                
                updated = db.query(Employee).filter(Employee.designation == r.code).update({Employee.designation: keep.code})
                logger.info(f"  Updated {updated} employees")
                
                db.delete(r)

        db.commit()
        logger.info("✅ Duplicates merged and cleaned successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error during cleanup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_duplicates()
