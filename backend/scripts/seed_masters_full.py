
"""
Full Master Data Seed Script
Populates all master data tables including Brands, Manufacturers, Suppliers, and configuration masters.
Run with: python -m scripts.seed_masters_full
"""
import sys
import uuid
from datetime import datetime

sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import (
    BrandMaster, ManufacturerMaster, SupplierMaster, AdjustmentReasonMaster,
    PaymentMethodMaster, ShopTypeMaster, CustomerTypeMaster, MedicineTypeMaster,
    GSTSlabMaster, GenderMaster, EmploymentTypeMaster, UrgencyMaster,
    StatusMaster, DesignationMaster, DepartmentMaster
)

def seed_masters_full():
    db = SessionLocal()
    try:
        print("🌱 Starting Full Master Data Seed...")

        # Helper function to seed generic masters
        def seed_generic(model, data, unique_field='code'):
            count = 0
            for item_data in data:
                filter_kwargs = {unique_field: item_data[unique_field]}
                existing = db.query(model).filter_by(**filter_kwargs).first()
                if not existing:
                    item = model(**item_data)
                    db.add(item)
                    count += 1
            db.flush()
            print(f"   > Seeded {count} items for {model.__tablename__}")

        # 1. Brands
        brands = [
            {"code": "GSK", "name": "GlaxoSmithKline", "description": "Global healthcare company"},
            {"code": "PFIZER", "name": "Pfizer", "description": "Biopharmaceutical company"},
            {"code": "CIPLA", "name": "Cipla", "description": "Indian multinational pharmaceutical"},
            {"code": "SUN", "name": "Sun Pharma", "description": "Specialty generic dermatology"},
            {"code": "ABBOTT", "name": "Abbott", "description": "Diagnostics and medical devices"},
            {"code": "DRREDDY", "name": "Dr. Reddy's", "description": "Generic pharmaceuticals"},
            {"code": "LUPIN", "name": "Lupin Limited", "description": "Biotechnology company"},
            {"code": "ALKEM", "name": "Alkem Laboratories", "description": "Pharmaceutical preparations"},
            {"code": "MANKIND", "name": "Mankind Pharma", "description": "Indian pharma company"},
            {"code": "TORRENT", "name": "Torrent Pharma", "description": "Cardiovascular and CNS"},
        ]
        seed_generic(BrandMaster, brands)

        # 2. Manufacturers
        manufacturers = [
            {"code": "GSK_MFG", "name": "GlaxoSmithKline Pharmaceuticals Ltd", "address": "Mumbai, India", "contact_person": "Sales Head", "phone": "1800-222-333"},
            {"code": "PFIZER_MFG", "name": "Pfizer Ltd", "address": "Mumbai, India", "contact_person": "Distributor Rep", "phone": "1800-444-555"},
            {"code": "CIPLA_MFG", "name": "Cipla Ltd", "address": "Mumbai, India", "contact_person": "Sales Manager", "phone": "1800-666-777"},
            {"code": "SUN_MFG", "name": "Sun Pharmaceutical Industries Ltd", "address": "Mumbai, India", "contact_person": "Area Manager", "phone": "1800-888-999"},
            {"code": "MICRO_LABS", "name": "Micro Labs Ltd", "address": "Bangalore, India", "contact_person": "Rep", "phone": "080-2222-3333"},
        ]
        seed_generic(ManufacturerMaster, manufacturers)

        # 3. Suppliers
        suppliers = [
            {"code": "MED_DIST_1", "name": "Medicare Distributors", "address": "Andheri East, Mumbai", "gst_number": "27AAAAA0000A1Z5", "credit_days": 30, "phone": "9876543210"},
            {"code": "PHARMA_LINK", "name": "PharmaLink Supply Chain", "address": "Bhiwandi, Thane", "gst_number": "27BBBBB0000B1Z5", "credit_days": 45, "phone": "9876543211"},
            {"code": "HEALTH_LOG", "name": "HealthLogistics Inc", "address": "Navi Mumbai", "gst_number": "27CCCCC0000C1Z5", "credit_days": 15, "phone": "9876543212"},
            {"code": "CITY_PHARMA", "name": "City Pharma Agencies", "address": "Dadar, Mumbai", "gst_number": "27DDDDD0000D1Z5", "credit_days": 7, "phone": "9876543213"},
        ]
        seed_generic(SupplierMaster, suppliers)

        # 4. Adjustment Reasons
        adj_reasons = [
            {"code": "DAMAGED", "name": "Damaged Goods", "adjustment_type": "decrease", "description": "Broken or damaged during handling"},
            {"code": "EXPIRED", "name": "Expired Stock", "adjustment_type": "decrease", "description": "Products past expiry date"},
            {"code": "THEFT", "name": "Theft/Loss", "adjustment_type": "decrease", "description": "Unaccounted missing stock"},
            {"code": "FOUND", "name": "Stock Found", "adjustment_type": "increase", "description": "Excess stock found during audit"},
            {"code": "CORRECTION", "name": "Data Entry Error", "adjustment_type": "increase", "description": "Correction of previous entry error"}, # Could be both, using increase for now or need separate codes
            {"code": "CORRECTION_DEC", "name": "Data Entry Error (Dec)", "adjustment_type": "decrease", "description": "Correction of previous entry error"},
        ]
        seed_generic(AdjustmentReasonMaster, adj_reasons)

        # 5. Payment Methods
        pay_methods = [
            {"code": "CASH", "name": "Cash", "sort_order": 1},
            {"code": "CARD", "name": "Credit/Debit Card", "sort_order": 2},
            {"code": "UPI", "name": "UPI / QR Code", "sort_order": 3},
            {"code": "NETBANK", "name": "Net Banking", "sort_order": 4},
            {"code": "CHEQUE", "name": "Cheque", "sort_order": 5},
            {"code": "CREDIT", "name": "Credit (Postpaid)", "sort_order": 6},
        ]
        seed_generic(PaymentMethodMaster, pay_methods)

        # 6. Shop Types
        shop_types = [
            {"code": "RETAIL", "name": "Retail Pharmacy", "sort_order": 1},
            {"code": "WHOLESALE", "name": "Wholesale Distributor", "sort_order": 2},
            {"code": "HOSPITAL", "name": "Hospital Pharmacy", "sort_order": 3},
            {"code": "CLINIC", "name": "Clinic Dispensary", "sort_order": 4},
        ]
        seed_generic(ShopTypeMaster, shop_types)

        # 7. Customer Types - MUST be lowercase to match CustomerType enum in app/models/customer.py
        cust_types = [
            {"code": "regular", "name": "Regular", "discount_percent": 0.0, "sort_order": 1},
            {"code": "senior", "name": "Senior Citizen", "discount_percent": 10.0, "sort_order": 2},
            {"code": "vip", "name": "VIP / Member", "discount_percent": 15.0, "sort_order": 3},
            {"code": "corporate", "name": "Corporate Account", "discount_percent": 5.0, "credit_limit": 50000.0, "sort_order": 4},
            {"code": "insurance", "name": "Insurance", "discount_percent": 0.0, "sort_order": 5},
        ]
        seed_generic(CustomerTypeMaster, cust_types)

        # 8. Medicine Types
        med_types = [
            {"code": "TABLET", "name": "Tablet", "sort_order": 1},
            {"code": "CAPSULE", "name": "Capsule", "sort_order": 2},
            {"code": "SYRUP", "name": "Syrup / Liquid", "sort_order": 3},
            {"code": "INJECTION", "name": "Injection", "sort_order": 4},
            {"code": "OINTMENT", "name": "Ointment / Cream", "sort_order": 5},
            {"code": "DROPS", "name": "Drops (Eye/Ear)", "sort_order": 6},
            {"code": "POWDER", "name": "Powder / Granules", "sort_order": 7},
            {"code": "DEVICE", "name": "Medical Device", "sort_order": 8},
            {"code": "SURGICAL", "name": "Surgical Item", "sort_order": 9},
        ]
        seed_generic(MedicineTypeMaster, med_types)

        # 9. GST Slabs
        gst_slabs = [
            {"rate": 0.0, "cgst_rate": 0.0, "sgst_rate": 0.0, "igst_rate": 0.0, "description": "Nil Rated"},
            {"rate": 5.0, "cgst_rate": 2.5, "sgst_rate": 2.5, "igst_rate": 5.0, "description": "Essential Medicines"},
            {"rate": 12.0, "cgst_rate": 6.0, "sgst_rate": 6.0, "igst_rate": 12.0, "description": "Standard Medicines"},
            {"rate": 18.0, "cgst_rate": 9.0, "sgst_rate": 9.0, "igst_rate": 18.0, "description": "Supplements / Equipment"},
            {"rate": 28.0, "cgst_rate": 14.0, "sgst_rate": 14.0, "igst_rate": 28.0, "description": "Luxury Items"},
        ]
        seed_generic(GSTSlabMaster, gst_slabs, unique_field='rate')

        # 10. Genders
        genders = [
            {"code": "M", "name": "Male", "sort_order": 1},
            {"code": "F", "name": "Female", "sort_order": 2},
            {"code": "O", "name": "Other", "sort_order": 3},
        ]
        seed_generic(GenderMaster, genders)

        # 11. Employment Types
        emp_types = [
            {"code": "FULL_TIME", "name": "Full Time", "sort_order": 1},
            {"code": "PART_TIME", "name": "Part Time", "sort_order": 2},
            {"code": "CONTRACT", "name": "Contractual", "sort_order": 3},
            {"code": "INTERN", "name": "Internship", "sort_order": 4},
        ]
        seed_generic(EmploymentTypeMaster, emp_types)

        # 12. Urgency
        urgency = [
            {"code": "LOW", "name": "Low", "color": "blue", "sort_order": 1},
            {"code": "NORMAL", "name": "Normal", "color": "green", "sort_order": 2},
            {"code": "HIGH", "name": "High", "color": "orange", "sort_order": 3},
            {"code": "CRITICAL", "name": "Critical", "color": "red", "sort_order": 4},
        ]
        seed_generic(UrgencyMaster, urgency)

        # 13. Departments
        departments = [
            {"code": "PHARMACY", "name": "Pharmacy Operations", "sort_order": 1},
            {"code": "WAREHOUSE", "name": "Warehouse / Logistics", "sort_order": 2},
            {"code": "ADMIN", "name": "Administration", "sort_order": 3},
            {"code": "ACCOUNTS", "name": "Accounts & Finance", "sort_order": 4},
            {"code": "HR", "name": "Human Resources", "sort_order": 5},
            {"code": "IT", "name": "IT Support", "sort_order": 6},
        ]
        seed_generic(DepartmentMaster, departments)

        # 14. Designations
        designations = [
            {"code": "SUPER_ADMIN", "name": "Super Administrator", "level": 1, "sort_order": 1},
            {"code": "WH_MANAGER", "name": "Warehouse Manager", "level": 2, "sort_order": 2},
            {"code": "PH_MANAGER", "name": "Pharmacy Manager", "level": 2, "sort_order": 3},
            {"code": "PHARMACIST", "name": "Pharmacist", "level": 3, "sort_order": 4},
            {"code": "ASST_PHARMACIST", "name": "Assistant Pharmacist", "level": 4, "sort_order": 5},
            {"code": "CASHIER", "name": "Cashier", "level": 4, "sort_order": 6},
            {"code": "STORE_KEEPER", "name": "Store Keeper", "level": 4, "sort_order": 7},
            {"code": "DELIVERY_BOY", "name": "Delivery Staff", "level": 5, "sort_order": 8},
        ]
        seed_generic(DesignationMaster, designations)

        # 15. Statuses (Sample)
        statuses = [
            {"entity_type": "invoice", "code": "pending", "name": "Pending", "is_default": True, "sort_order": 1},
            {"entity_type": "invoice", "code": "completed", "name": "Completed", "is_terminal": True, "sort_order": 2},
            {"entity_type": "invoice", "code": "cancelled", "name": "Cancelled", "is_terminal": True, "sort_order": 3},
            {"entity_type": "purchase_request", "code": "pending", "name": "Pending Approval", "is_default": True, "sort_order": 1},
            {"entity_type": "purchase_request", "code": "approved", "name": "Approved", "sort_order": 2},
            {"entity_type": "purchase_request", "code": "rejected", "name": "Rejected", "is_terminal": True, "sort_order": 3},
            {"entity_type": "purchase_request", "code": "completed", "name": "Fulfilled", "is_terminal": True, "sort_order": 4},
        ]
        # StatusMaster uses entity_type + code as unique index
        for item_data in statuses:
            existing = db.query(StatusMaster).filter_by(entity_type=item_data['entity_type'], code=item_data['code']).first()
            if not existing:
                item = StatusMaster(**item_data)
                db.add(item)
        db.flush()
        print(f"   > Seeded {len(statuses)} statuses")

        db.commit()
        print("✅ Full Master Data Seeded Successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding full master data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_masters_full()
