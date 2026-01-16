import sys
import random
from datetime import date, timedelta

sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import Warehouse, WarehouseStock, Medicine, Batch, MedicineType, RoleType, User

def force_seed():
    db = SessionLocal()
    try:
        print("=== Force Seeding Stock for Dhilip Warehouse ===")
        
        # 1. Find Warehouse
        # Try to find by name match
        wh = db.query(Warehouse).filter(Warehouse.name.ilike("%Dhilip%")).first()
        if not wh:
             print("⚠️ 'Dhilip Warehouse' not found by name. Checking for Warehouse Admin...")
             # Fallback: Find a user with warehouse_admin role and get their warehouse
             admin = db.query(User).filter(User.role == RoleType.WAREHOUSE_ADMIN).first()
             if admin and admin.assigned_warehouse_id:
                 wh = db.query(Warehouse).filter(Warehouse.id == admin.assigned_warehouse_id).first()
        
        if not wh:
            # Fallback 2: Just take the first warehouse
             wh = db.query(Warehouse).first()
             print(f"⚠️ defaulting to first warehouse found: {wh.name}")

        if not wh:
            print("❌ No warehouses found at all! Cannot seed.")
            return

        print(f"✅ Targeting Warehouse: {wh.name} ({wh.id})")

        # 2. Ensure Medicines exist
        medicines = db.query(Medicine).limit(5).all()
        if not medicines:
            print("Creating dummy medicines...")
            med = Medicine(
                name="Force Seeded Paracetamol",
                generic_name="Paracetamol",
                manufacturer="Test Pharma",
                mrp=20.0,
                purchase_price=10.0
            )
            db.add(med)
            db.commit()
            medicines = [med]

        # 3. Create Stock
        print(f"Seeding stock for {len(medicines)} medicines...")
        count = 0
        for med in medicines:
            # Create a clean new batch
            batch = Batch(
                medicine_id=med.id,
                batch_number=f"FS-{random.randint(1000,9999)}",
                manufacturing_date=date.today(),
                expiry_date=date.today() + timedelta(days=365),
                quantity=1000,
                purchase_price=med.purchase_price,
                mrp=med.mrp,
                supplier="Direct Seed"
            )
            db.add(batch)
            db.flush()

            # Add to WarehouseStock
            stock = WarehouseStock(
                warehouse_id=wh.id,
                medicine_id=med.id,
                batch_id=batch.id,
                quantity=1000,
                rack_name="Seed Rack",
                rack_number="A-01"
            )
            db.add(stock)
            count += 1
        
        db.commit()
        print(f"✅ Successfully added {count} stock records to {wh.name}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    force_seed()
