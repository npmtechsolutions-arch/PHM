import sys
sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import Warehouse, WarehouseStock

def transfer_stock():
    db = SessionLocal()
    try:
        print("=== Transferring Stock to User Warehouse ===")
        
        # 1. Find the target warehouse "Dhilip Warehouse"
        # Since I can't interactively ask, I will look for any warehouse that is NOT blank
        # Ideally, I'd search by the name in the screenshot "Dhilip Warehouse"
        target_wh = db.query(Warehouse).filter(Warehouse.name.ilike("%Dhilip%")).first()
        
        if not target_wh:
            print("❌ 'Dhilip Warehouse' not found. Listing all warehouses:")
            for w in db.query(Warehouse).all():
                print(f" - {w.name} ({w.id})")
            return

        print(f"✅ Target Warehouse Found: {target_wh.name} ({target_wh.id})")

        # 2. Find where the stock currently is
        # We'll take ALL stock from other warehouses and move it here (or copy it?)
        # For a single-user dev setup, moving is fine.
        
        stocks = db.query(WarehouseStock).filter(WarehouseStock.warehouse_id != target_wh.id).all()
        print(f"found {len(stocks)} stock items in OTHER warehouses.")
        
        if len(stocks) == 0:
            print("No stock found in other warehouses to transfer.")
            return

        for stock in stocks:
            stock.warehouse_id = target_wh.id
            
        db.commit()
        print(f"✅ Successfully transferred {len(stocks)} stock items to {target_wh.name}")

    finally:
        db.close()

if __name__ == "__main__":
    transfer_stock()
