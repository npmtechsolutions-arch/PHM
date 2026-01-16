from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import Warehouse, WarehouseStock, Medicine, Batch

def check_db():
    db = SessionLocal()
    try:
        print("=== Checking DB State ===")
        warehouses = db.query(Warehouse).all()
        print(f"Warehouses found: {len(warehouses)}")
        for w in warehouses:
            print(f" - {w.name} ({w.id})")

        medicines = db.query(Medicine).all()
        print(f"Medicines found: {len(medicines)}")

        batches = db.query(Batch).all()
        print(f"Batches found: {len(batches)}")

        stocks = db.query(WarehouseStock).all()
        print(f"WarehouseStock records found: {len(stocks)}")
        
        for stock in stocks:
             print(f" - Stock: WH={stock.warehouse_id} Med={stock.medicine_id} Batch={stock.batch_id} Qty={stock.quantity}")

        if len(stocks) == 0 and len(batches) > 0:
            print("\nWARNING: Batches exist but WarehouseStock is empty. Seeding might be incomplete.")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
