
import sys
import logging

sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import (
    DesignationMaster, DepartmentMaster, GenderMaster, 
    EmploymentTypeMaster, StatusMaster
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_hr_masters():
    db = SessionLocal()
    try:
        logger.info("🌱 Seeding HR Master Data...")

        # 1. Departments
        departments = [
            ("DEPT-OPS", "Operations", "General Operations"),
            ("DEPT-PHARM", "Pharmacy", "Pharmacy Department"),
            ("DEPT-WH", "Warehouse", "Warehouse & Logistics"),
            ("DEPT-ACCT", "Accounts", "Finance & Accounts"),
            ("DEPT-HR", "HR", "Human Resources"),
            ("DEPT-ADMIN", "Administration", "General Administration"),
        ]
        
        for code, name, desc in departments:
            exists = db.query(DepartmentMaster).filter(DepartmentMaster.code == code).first()
            if not exists:
                db.add(DepartmentMaster(code=code, name=name, description=desc, is_active=True, sort_order=0))
                logger.info(f"   + Created Department: {name}")

        # 2. Designations
        designations = [
            ("DESIG-MGR", "Manager", 1),
            ("DESIG-PHARM", "Pharmacist", 2),
            ("DESIG-ASST-PHARM", "Asst. Pharmacist", 3),
            ("DESIG-CASH", "Cashier", 3),
            ("DESIG-WH-KEEPER", "Warehouse Keeper", 3),
            ("DESIG-DRIVER", "Delivery Driver", 4),
            ("DESIG-HELPER", "Helper", 4),
            ("DESIG-HR-EXEC", "HR Executive", 2),
            ("DESIG-ACCT", "Accountant", 2),
        ]

        for code, name, level in designations:
            exists = db.query(DesignationMaster).filter(DesignationMaster.code == code).first()
            if not exists:
                db.add(DesignationMaster(code=code, name=name, level=level, is_active=True, sort_order=level))
                logger.info(f"   + Created Designation: {name}")

        # 3. Genders
        genders = [
            ("MALE", "Male"),
            ("FEMALE", "Female"),
            ("OTHER", "Other"),
        ]

        for code, name in genders:
            exists = db.query(GenderMaster).filter(GenderMaster.code == code).first()
            if not exists:
                db.add(GenderMaster(code=code, name=name, is_active=True, sort_order=0))
                logger.info(f"   + Created Gender: {name}")

        # 4. Employment Types
        emp_types = [
            ("FULL_TIME", "Full Time"),
            ("PART_TIME", "Part Time"),
            ("CONTRACT", "Contract"),
            ("INTERN", "Intern"),
            ("PROBATION", "Probation"),
        ]

        for code, name in emp_types:
            exists = db.query(EmploymentTypeMaster).filter(EmploymentTypeMaster.code == code).first()
            if not exists:
                db.add(EmploymentTypeMaster(code=code, name=name, is_active=True, sort_order=0))
                logger.info(f"   + Created Employment Type: {name}")

        # 5. Statuses
        statuses = [
            # Employee Statuses
            ("active", "Active", "employee", False, True),
            ("on_leave", "On Leave", "employee", False, False),
            ("terminated", "Terminated", "employee", True, False),
            ("resigned", "Resigned", "employee", True, False),
            # User Statuses (if needed separately, generally boolean in User model)
        ]

        for code, name, entity, is_term, is_def in statuses:
            exists = db.query(StatusMaster).filter(StatusMaster.code == code, StatusMaster.entity_type == entity).first()
            if not exists:
                db.add(StatusMaster(
                    code=code, name=name, entity_type=entity, 
                    is_terminal=is_term, is_default=is_def, is_active=True, sort_order=0
                ))
                logger.info(f"   + Created Status: {name} ({entity})")

        db.commit()
        logger.info("✅ HR Master Data Seeded Successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error seeding HR data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_hr_masters()
