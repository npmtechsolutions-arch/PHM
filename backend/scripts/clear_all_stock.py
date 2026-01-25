"""
Clear All Inventory Stock
This script clears all stock from both warehouses and shops (pharmacies).
Use with caution - this action cannot be undone!
"""

import sys
import os

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import (
    WarehouseStock, ShopStock, StockMovement, StockAdjustment,
    DispatchItem, PurchaseRequestItem, InvoiceItem, ReturnItem
)

def clear_all_stock():
    """Clear all inventory stock from warehouses and shops"""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("WARNING: CLEARING ALL INVENTORY STOCK")
        print("=" * 60)
        print()
        
        # Count records before deletion
        warehouse_stock_count = db.query(WarehouseStock).count()
        shop_stock_count = db.query(ShopStock).count()
        stock_movement_count = db.query(StockMovement).count()
        stock_adjustment_count = db.query(StockAdjustment).count()
        
        print(f"Current Stock Records:")
        print(f"   - Warehouse Stock: {warehouse_stock_count} records")
        print(f"   - Shop Stock: {shop_stock_count} records")
        print(f"   - Stock Movements: {stock_movement_count} records")
        print(f"   - Stock Adjustments: {stock_adjustment_count} records")
        print()
        
        if warehouse_stock_count == 0 and shop_stock_count == 0:
            print("SUCCESS: No stock records found. Nothing to clear.")
            return
        
        # Confirm deletion
        print("WARNING: This will delete ALL stock records!")
        print("   This includes:")
        print("   - All warehouse stock")
        print("   - All shop/pharmacy stock")
        print("   - All stock movements (history)")
        print("   - All stock adjustments")
        print()
        
        # Delete in order of dependencies (child -> parent)
        print("Deleting stock records...")
        
        # 1. Delete related transaction items first (if they reference stock)
        # Note: These might have foreign keys, so we delete items first
        print("   - Deleting dispatch items...")
        db.query(DispatchItem).delete()
        
        print("   - Deleting purchase request items...")
        db.query(PurchaseRequestItem).delete()
        
        print("   - Deleting invoice items...")
        db.query(InvoiceItem).delete()
        
        print("   - Deleting return items...")
        db.query(ReturnItem).delete()
        
        # 2. Delete stock movements (history)
        print("   - Deleting stock movements...")
        db.query(StockMovement).delete()
        
        # 3. Delete stock adjustments
        print("   - Deleting stock adjustments...")
        db.query(StockAdjustment).delete()
        
        # 4. Delete warehouse stock
        print("   - Deleting warehouse stock...")
        deleted_warehouse = db.query(WarehouseStock).delete()
        
        # 5. Delete shop stock
        print("   - Deleting shop stock...")
        deleted_shop = db.query(ShopStock).delete()
        
        # Commit all deletions
        db.commit()
        
        print()
        print("=" * 60)
        print("SUCCESS: STOCK CLEARED SUCCESSFULLY")
        print("=" * 60)
        print(f"   - Warehouse Stock: {deleted_warehouse} records deleted")
        print(f"   - Shop Stock: {deleted_shop} records deleted")
        print()
        print("Note: Medicines and Batches are NOT deleted.")
        print("   Only stock quantities have been cleared.")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print()
        print("ERROR: Failed to clear stock")
        print(f"   Error: {str(e)}")
        print()
        print("Rolling back changes...")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    try:
        clear_all_stock()
    except KeyboardInterrupt:
        print("\n\nWARNING: Operation cancelled by user")
    except Exception as e:
        print(f"\n\nERROR: Fatal error: {str(e)}")
        sys.exit(1)
