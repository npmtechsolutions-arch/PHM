import sys
import os
import random
from datetime import date, timedelta, datetime

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal, engine
from app.db.models import (
    Medicine, Batch, ShopStock, WarehouseStock, StockMovement,
    InvoiceItem, DispatchItem, ReturnItem, PurchaseRequestItem,
    SupplierMaster, BrandMaster, ManufacturerMaster,
    StockAdjustment, ExpiryAlert
)
from sqlalchemy import text

def reset_and_seed_catalog():
    db = SessionLocal()
    try:
        print("🌱 Starting Catalog Reset and Seeding...")
        
        # 0. Ensure Schema Updates (Add selling_price if missing)
        print("  Checking schema...")
        try:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE medicines ADD COLUMN IF NOT EXISTS selling_price FLOAT DEFAULT 0.0"))
                conn.commit()
            print("  ✅ Schema updated (selling_price column check).")
        except Exception as e:
            print(f"  ⚠️ Schema update note: {e}")
        
        # 1. Clean up existing data (Delete Only)
        # We need to delete in order of dependencies (Child -> Parent)
        
        print("  Deleting existing data...")
        
        # Delete Transaction/Movement Items first
        db.query(StockAdjustment).delete()
        db.query(ExpiryAlert).delete()
        db.query(StockMovement).delete()
        db.query(InvoiceItem).delete()
        db.query(ReturnItem).delete()
        db.query(DispatchItem).delete()
        db.query(PurchaseRequestItem).delete()
        
        # Delete Stock
        db.query(ShopStock).delete()
        db.query(WarehouseStock).delete()
        
        # Delete Batches
        db.query(Batch).delete()
        
        # Delete Medicines
        db.query(Medicine).delete()
        
        # Delete Suppliers if requested (User said "Delete existing suppliers")
        db.query(SupplierMaster).delete()
        
        # We can also clean up Brands and Manufacturers if we want a fresh start, 
        # but User specifically mentioned Medicines and Suppliers.
        # Let's keep Brands/Manufacturers as they might be useful, 
        # but we will ensure our new medicines use valid ones.
        
        db.commit()
        print("  ✅ Data deleted successfully.")
        
        # 2. SEED Suppliers
        print("  Seeding Suppliers...")
        suppliers = []
        supplier_data = [
            ("SUP001", "Apollo Distributors", "Mumbai", "Contact Person 1", "9876543210"),
            ("SUP002", "MedPlus Agencies", "Delhi", "Contact Person 2", "9876543211"),
            ("SUP003", "Global Pharma Supply", "Bangalore", "Contact Person 3", "9876543212")
        ]
        
        for code, name, city, contact, phone in supplier_data:
            sup = SupplierMaster(
                code=code, name=name, city=city, 
                contact_person=contact, phone=phone,
                is_active=True
            )
            db.add(sup)
            suppliers.append(sup)
        
        db.commit()
        
        # 3. SEED Medicines (25 Items)
        print("  Seeding 25 Medicines...")
        
        # Helper to get or create Manufacturer/Brand
        def get_or_create_manufacturer(name):
            m = db.query(ManufacturerMaster).filter_by(name=name).first()
            if not m:
                m = ManufacturerMaster(name=name, code=name[:3].upper() + str(random.randint(100,999)), is_active=True)
                db.add(m)
                db.flush()
            return m.name

        def get_or_create_brand(name):
            b = db.query(BrandMaster).filter_by(name=name).first()
            if not b:
                b = BrandMaster(name=name, code=name[:3].upper() + str(random.randint(100,999)), is_active=True)
                db.add(b)
                db.flush()
            return b.name

        medicine_list = [
            # Name, Generic, Brand, Manufacturer, MRP, PurchasePrice, GST
            ("Dolo 650", "Paracetamol", "Dolo", "Micro Labs", 30.0, 18.0, 12.0),
            ("Crocin Advance", "Paracetamol", "Crocin", "GSK", 20.0, 12.0, 12.0),
            ("Augmentin 625 Duo", "Amoxicillin + Clavulanic Acid", "Augmentin", "GSK", 240.0, 180.0, 12.0),
            ("Azithral 500", "Azithromycin", "Azithral", "Alembic", 120.0, 85.0, 12.0),
            ("Pan 40", "Pantoprazole", "Pan", "Alkem", 150.0, 95.0, 12.0),
            ("Omez", "Omeprazole", "Omez", "Dr. Reddy's", 60.0, 35.0, 12.0),
            ("Rantac 150", "Ranitidine", "Rantac", "JB Chemicals", 40.0, 22.0, 12.0),
            ("Allegra 120", "Fexofenadine", "Allegra", "Sanofi", 190.0, 130.0, 12.0),
            ("Ascoril LS", "Ambroxol + Levosalbutamol", "Ascoril", "Glenmark", 110.0, 70.0, 12.0),
            ("Benadryl", "Diphenhydramine", "Benadryl", "Johnson & Johnson", 120.0, 80.0, 12.0),
            ("Shelcal 500", "Calcium + Vitamin D3", "Shelcal", "Torrent", 130.0, 85.0, 12.0),
            ("Neurobion Forte", "Vitamin B Complex", "Neurobion", "Procter & Gamble", 45.0, 28.0, 12.0),
            ("Becosules", "Vitamin B Complex", "Becosules", "Pfizer", 45.0, 30.0, 12.0),
            ("Limcee", "Vitamin C", "Limcee", "Abbott", 25.0, 15.0, 12.0),
            ("Volini Gel", "Diclofenac", "Volini", "Sun Pharma", 80.0, 50.0, 12.0),
            ("Combiflam", "Ibuprofen + Paracetamol", "Combiflam", "Sanofi", 45.0, 28.0, 12.0),
            ("Disprin", "Aspirin", "Disprin", "Reckitt Benckiser", 12.0, 8.0, 12.0),
            ("Glycomet 500", "Metformin", "Glycomet", "USV", 35.0, 20.0, 12.0),
            ("Galvus Met", "Vildagliptin + Metformin", "Galvus", "Novartis", 320.0, 240.0, 12.0),
            ("Telma 40", "Telmisartan", "Telma", "Glenmark", 220.0, 150.0, 12.0),
            ("Amlong 5", "Amlodipine", "Amlong", "Micro Labs", 60.0, 35.0, 12.0),
            ("Thyronorm 50", "Thyroxine", "Thyronorm", "Abbott", 180.0, 120.0, 12.0),
            ("Manforce 50", "Sildenafil", "Manforce", "Mankind", 30.0, 10.0, 12.0),
            ("Unwanted 72", "Levonorgestrel", "Unwanted", "Mankind", 100.0, 60.0, 12.0),
            ("Gelusil", "Antacid", "Gelusil", "Pfizer", 140.0, 95.0, 12.0)
        ]

        for name, generic, brand, mfr, mrp, pp, gst in medicine_list:
            manuf = get_or_create_manufacturer(mfr)
            brand_name = get_or_create_brand(brand)
            
            # Create Medicine
            med = Medicine(
                name=name, generic_name=generic, brand=brand_name, manufacturer=manuf,
                mrp=mrp, purchase_price=pp, gst_rate=gst,
                selling_price=mrp, # Default selling price to MRP
                pack_size=10, unit="strip", is_active=True
            )
            db.add(med)
            db.flush() # Get ID
            
            # Create a Batch for this medicine
            batch = Batch(
                medicine_id=med.id,
                batch_number=f"B{random.randint(1000,9999)}",
                expiry_date=date.today() + timedelta(days=365*2),
                quantity=random.randint(50, 500), # Random stock between 50-500 units
                purchase_price=pp,
                mrp=mrp,
                supplier=suppliers[0].name # Assign to first supplier for reference
            )
            db.add(batch)
        
        db.commit()
        print("✅ Reset and Seed Complete. Added 25 medicines.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error during reset/seed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed_catalog()
