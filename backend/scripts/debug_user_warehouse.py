import sys
sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db.models import User, Warehouse, WarehouseStock

def debug_user_warehouse():
    db = SessionLocal()
    try:
        print("=== Debug User Warehouse Assignment ===")
        # 1. Find the user 'warehouse@pharmaec.com' (This is the default seeded warehouse admin)
        # OR let's list all warehouse admins
        users = db.query(User).filter(User.email.like('%warehouse%')).all()
        for u in users:
            print(f"User: {u.email} (ID: {u.id})")
            print(f"  - Role: {u.role}")
            print(f"  - Assigned Warehouse ID: {u.assigned_warehouse_id}")
            if u.assigned_warehouse_id:
                wh = db.query(Warehouse).filter(Warehouse.id == u.assigned_warehouse_id).first()
                if wh:
                    print(f"  - Warehouse Name: {wh.name}")
        
        # 2. Check where the stock is
        stock_counts = {}
        all_stock = db.query(WarehouseStock).all()
        for s in all_stock:
            if s.warehouse_id not in stock_counts:
                stock_counts[s.warehouse_id] = 0
            stock_counts[s.warehouse_id] += 1
        
        print("\n=== Stock Distribution ===")
        for wh_id, count in stock_counts.items():
            wh = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
            name = wh.name if wh else "Unknown"
            print(f"Warehouse: {name} ({wh_id}) -> {count} items")
            
        # 3. List all warehouses
        print("\n=== All Warehouses ===")
        warehouses = db.query(Warehouse).all()
        for w in warehouses:
             print(f" - {w.name} ({w.id})")

    finally:
        db.close()

if __name__ == "__main__":
    debug_user_warehouse()
