"""
Inventory & Stock API Routes - Database Connected
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta, datetime
from pydantic import BaseModel

from app.models.common import APIResponse
from app.core.security import get_current_user, require_role, get_auth_context
from app.db.database import get_db
from app.db.models import Batch, Medicine

router = APIRouter()




class StockAdjustment(BaseModel):
    medicine_id: str
    batch_id: str
    adjustment_type: str  # increase, decrease
    quantity: int
    reason: str
    warehouse_id: Optional[str] = None
    shop_id: Optional[str] = None


@router.get("/movements")
def get_stock_movements(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    location_type: Optional[str] = None,
    location_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get stock movements history"""
    from app.db.models import StockMovement, Medicine, User, Warehouse, MedicalShop

    query = db.query(StockMovement)

    # Filter by location type and ID
    if location_type == "warehouse" and location_id:
        # Movements involving this warehouse (either as source or destination)
        query = query.filter(
            ((StockMovement.source_type == "warehouse") & (StockMovement.source_id == location_id)) |
            ((StockMovement.destination_type == "warehouse") & (StockMovement.destination_id == location_id))
        )
    elif location_type == "shop" and location_id:
        # Movements involving this shop
        query = query.filter(
            ((StockMovement.source_type == "shop") & (StockMovement.source_id == location_id)) |
            ((StockMovement.destination_type == "shop") & (StockMovement.destination_id == location_id))
        )
    
    # Filter by permission scope if no specific location requested
    # (e.g. Warehouse Admin seeing all their warehouse moves)
    if current_user["role"] == "warehouse_admin" and current_user.get("warehouse_id"):
        wh_id = current_user["warehouse_id"]
        query = query.filter(
            ((StockMovement.source_type == "warehouse") & (StockMovement.source_id == wh_id)) |
            ((StockMovement.destination_type == "warehouse") & (StockMovement.destination_id == wh_id))
        )
        
    if current_user["role"] in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin"] and current_user.get("shop_id"):
        shop_id = current_user["shop_id"]
        query = query.filter(
            ((StockMovement.source_type == "shop") & (StockMovement.source_id == shop_id)) |
            ((StockMovement.destination_type == "shop") & (StockMovement.destination_id == shop_id))
        )

    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)

    # Order by newest first
    query = query.order_by(StockMovement.created_at.desc())
    
    total = query.count()
    movements = query.offset((page - 1) * size).limit(size).all()
    
    result = []
    for move in movements:
        # Fetch related data names manually or via relationships if eager loaded
        # Optimization: Could use joinedload in query, but simple lookup is fine for now
        medicine_name = db.query(Medicine.name).filter(Medicine.id == move.medicine_id).scalar() or "Unknown"
        
        # Determine location name based on context (source/dest)
        # Simplified for list view: showing the "other" side or just the relevant location
        
        # Get performer name
        performed_by = "System"
        if move.created_by:
            user = db.query(User).filter(User.id == move.created_by).first()
            if user:
                performed_by = user.full_name

        # Resolve warehouse/shop names (optional optimization: cache or map)
        wh_name = None
        shop_name = None
        
        if move.source_type == "warehouse":
             wh_name = db.query(Warehouse.name).filter(Warehouse.id == move.source_id).scalar()
        elif move.destination_type == "warehouse":
             wh_name = db.query(Warehouse.name).filter(Warehouse.id == move.destination_id).scalar()
             
        if move.source_type == "shop":
             shop_name = db.query(MedicalShop.name).filter(MedicalShop.id == move.source_id).scalar()
        elif move.destination_type == "shop":
             shop_name = db.query(MedicalShop.name).filter(MedicalShop.id == move.destination_id).scalar()

        result.append({
            "id": move.id,
            "medicine_name": medicine_name,
            "batch_number": "N/A", # Batch number would need a join with Batch table or stored on movement
            "quantity": move.quantity,
            "movement_type": move.movement_type,
            "reference_type": move.reference_type or "manual",
            "created_at": move.created_at.isoformat(),
            "performed_by": performed_by,
            "warehouse_name": wh_name,
            "shop_name": shop_name
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "size": size
    }


@router.post("/adjust")
def adjust_stock(
    adjustment: StockAdjustment,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin", "warehouse_employee", "shop_owner", "pharmacy_admin", "pharmacist", "pharmacy_employee"]))
):
    """
    Adjust stock quantity for warehouse OR shop.
    Updates WarehouseStock or ShopStock based on entity type.
    """
    from app.db.models import WarehouseStock, ShopStock, Warehouse, MedicalShop, StockMovement, MovementType
    
    # Validate batch exists
    batch = db.query(Batch).filter(Batch.id == adjustment.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # ENTITY CONTEXT ENFORCEMENT
    user_role = current_user.get("role")
    assigned_warehouse_id = current_user.get("warehouse_id")
    assigned_shop_id = current_user.get("shop_id")
    
    # Determine target type
    target_type = None  # "warehouse" or "shop"
    
    if adjustment.warehouse_id:
        target_type = "warehouse"
        if user_role != "super_admin":
            if user_role == "warehouse_admin" or user_role == "warehouse_employee":
                if assigned_warehouse_id and adjustment.warehouse_id != assigned_warehouse_id:
                    raise HTTPException(status_code=403, detail="Cannot adjust stock for another warehouse")
            else:
                raise HTTPException(status_code=403, detail="Warehouse stock adjustment not allowed for your role")
    elif adjustment.shop_id:
        target_type = "shop"
        if user_role != "super_admin":
            shop_roles = ["shop_owner", "pharmacist", "cashier", "pharmacy_admin", "pharmacy_employee"]
            if user_role in shop_roles:
                if assigned_shop_id and adjustment.shop_id != assigned_shop_id:
                    raise HTTPException(status_code=403, detail="Cannot adjust stock for another shop")
            else:
                raise HTTPException(status_code=403, detail="Shop stock adjustment not allowed for your role")
    else:
        raise HTTPException(status_code=400, detail="Must specify either warehouse_id or shop_id")
    
    # Verify entity exists
    if target_type == "warehouse":
        entity = db.query(Warehouse).filter(Warehouse.id == adjustment.warehouse_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Warehouse not found")
    else:
        entity = db.query(MedicalShop).filter(MedicalShop.id == adjustment.shop_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Shop not found")
    
    # Update the correct stock table
    stock_updated = False
    new_quantity = 0
    
    if target_type == "warehouse":
        # Update WarehouseStock
        wh_stock = db.query(WarehouseStock).filter(
            WarehouseStock.warehouse_id == adjustment.warehouse_id,
            WarehouseStock.batch_id == adjustment.batch_id
        ).first()
        
        if not wh_stock:
            raise HTTPException(status_code=404, detail="Stock record not found for this warehouse and batch")
        
        if adjustment.adjustment_type == "increase":
            wh_stock.quantity += adjustment.quantity
        elif adjustment.adjustment_type == "decrease":
            new_qty = wh_stock.quantity - adjustment.quantity
            if new_qty < 0:
                raise HTTPException(status_code=400, detail="Cannot reduce stock below zero")
            wh_stock.quantity = new_qty
        
        new_quantity = wh_stock.quantity
        stock_updated = True
        
    elif target_type == "shop":
        # Update ShopStock
        shop_stock = db.query(ShopStock).filter(
            ShopStock.shop_id == adjustment.shop_id,
            ShopStock.batch_id == adjustment.batch_id
        ).first()
        
        if not shop_stock:
            raise HTTPException(status_code=404, detail="Stock record not found for this shop and batch")
        
        if adjustment.adjustment_type == "increase":
            shop_stock.quantity += adjustment.quantity
        elif adjustment.adjustment_type == "decrease":
            new_qty = shop_stock.quantity - adjustment.quantity
            if new_qty < 0:
                raise HTTPException(status_code=400, detail="Cannot reduce stock below zero")
            shop_stock.quantity = new_qty
        
        new_quantity = shop_stock.quantity
        stock_updated = True
    
    if not stock_updated:
        raise HTTPException(status_code=400, detail="Failed to update stock")
    
    # Create stock movement record for audit trail
    movement = StockMovement(
        movement_type=MovementType.ADJUSTMENT,
        source_type=target_type,
        source_id=adjustment.warehouse_id if target_type == "warehouse" else adjustment.shop_id,
        medicine_id=adjustment.medicine_id,
        batch_id=adjustment.batch_id,
        quantity=adjustment.quantity if adjustment.adjustment_type == "increase" else -adjustment.quantity,
        reference_type="adjustment",
        notes=adjustment.reason,
        created_by=current_user.get("user_id")
    )
    db.add(movement)
    
    # Update Batch.quantity as sum of all WarehouseStock + ShopStock for this batch
    # This keeps Batch.quantity in sync with actual stock
    total_warehouse_stock = db.query(func.sum(WarehouseStock.quantity)).filter(
        WarehouseStock.batch_id == adjustment.batch_id
    ).scalar() or 0
    
    total_shop_stock = db.query(func.sum(ShopStock.quantity)).filter(
        ShopStock.batch_id == adjustment.batch_id
    ).scalar() or 0
    
    batch.quantity = total_warehouse_stock + total_shop_stock
    
    db.commit()
    
    return APIResponse(
        message=f"Stock adjusted successfully in {target_type}",
        data={
            "new_quantity": new_quantity,
            "batch_total_quantity": batch.quantity,
            "entity_type": target_type,
            "entity_id": adjustment.warehouse_id if target_type == "warehouse" else adjustment.shop_id
        }
    )


# Stock Entry - creates batch implicitly
class StockEntry(BaseModel):
    warehouse_id: Optional[str] = None
    shop_id: Optional[str] = None
    medicine_id: str
    batch_number: str  # Batch is created implicitly here
    expiry_date: str   # Batch expiry date (YYYY-MM-DD)
    quantity: int
    purchase_price: Optional[float] = 0.0 # Purchase price for batch
    selling_price: Optional[float] = 0.0 # Selling price for shop stock
    rack_name: Optional[str] = None  # Physical storage - e.g., "Painkillers Box"
    rack_number: Optional[str] = None  # Physical rack - e.g., "R-01"


@router.post("/entry")
def create_stock_entry(
    entry: StockEntry,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["super_admin", "warehouse_admin", "warehouse_employee", "shop_owner", "pharmacy_admin", "pharmacist", "pharmacy_employee"]))
):
    """
    Add stock entry to warehouse OR shop.
    Batch is created implicitly - NOT a separate master.
    
    ENTITY CONTEXT RESOLUTION:
    - Super Admin: can specify any warehouse/shop (explicit selection)
    - Warehouse Admin/Employee: MUST use assigned warehouse
    - Shop Roles: MUST use assigned shop
    """
    from fastapi import HTTPException
    from datetime import datetime
    from app.db.models import WarehouseStock, ShopStock, Warehouse, MedicalShop
    
    # ENTITY CONTEXT ENFORCEMENT
    user_role = current_user.role
    assigned_warehouse_id = current_user.warehouse_id
    assigned_shop_id = current_user.shop_id
    
    # Determine target type
    target_type = None # "warehouse" or "shop"
    
    if entry.warehouse_id:
        target_type = "warehouse"
    elif entry.shop_id:
        target_type = "shop"
    else:
        raise HTTPException(status_code=400, detail="Must specify either warehouse_id or shop_id")

    # Permission Check
    if user_role != "super_admin":
        if target_type == "warehouse":
            # Allow warehouse_admin and warehouse_employee
            allowed_wh_roles = ["warehouse_admin", "warehouse_employee"]
            if user_role not in allowed_wh_roles:
                raise HTTPException(status_code=403, detail="Only Warehouse staff can add stock to warehouses")
                
            if assigned_warehouse_id and entry.warehouse_id != assigned_warehouse_id:
                raise HTTPException(status_code=403, detail="Cannot operate on another warehouse")
        
        elif target_type == "shop":
            # Allow shop owners and employees
            if assigned_shop_id and entry.shop_id != assigned_shop_id:
                 raise HTTPException(status_code=403, detail="Cannot operate on another shop")

    
    # Validate medicine
    medicine = db.query(Medicine).filter(Medicine.id == entry.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
        
    # Validate Target Entity
    if target_type == "warehouse":
        entity = db.query(Warehouse).filter(Warehouse.id == entry.warehouse_id).first()
        if not entity: raise HTTPException(status_code=404, detail="Warehouse not found")
    else:
        entity = db.query(MedicalShop).filter(MedicalShop.id == entry.shop_id).first()
        if not entity: raise HTTPException(status_code=404, detail="Shop not found")
    
    # Parse expiry date
    try:
        expiry = datetime.strptime(entry.expiry_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid expiry date format. Use YYYY-MM-DD")
    
    # Check if batch already exists for this medicine
    existing_batch = db.query(Batch).filter(
        Batch.medicine_id == entry.medicine_id,
        Batch.batch_number == entry.batch_number
    ).first()
    
    if existing_batch:
        # Add quantity to existing batch
        existing_batch.quantity = (existing_batch.quantity or 0) + entry.quantity
        batch = existing_batch
    else:
        # Create new batch implicitly
        batch = Batch(
            medicine_id=entry.medicine_id,
            batch_number=entry.batch_number,
            expiry_date=expiry,
            quantity=entry.quantity,
            mrp=medicine.mrp,
            purchase_price=entry.purchase_price or medicine.purchase_price # Use provided purchase price or medicine default
        )
        db.add(batch)
        db.flush()  # Get batch ID
    
    # Create or update STOCK (Warhouse or Shop)
    if target_type == "warehouse":
        wh_stock = db.query(WarehouseStock).filter(
            WarehouseStock.warehouse_id == entry.warehouse_id,
            WarehouseStock.batch_id == batch.id
        ).first()
        
        if wh_stock:
            wh_stock.quantity = (wh_stock.quantity or 0) + entry.quantity
            if entry.rack_name: wh_stock.rack_name = entry.rack_name
            if entry.rack_number: wh_stock.rack_number = entry.rack_number
        else:
            wh_stock = WarehouseStock(
                warehouse_id=entry.warehouse_id,
                medicine_id=entry.medicine_id,
                batch_id=batch.id,
                quantity=entry.quantity,
                rack_name=entry.rack_name,
                rack_number=entry.rack_number
            )
            db.add(wh_stock)
            
    elif target_type == "shop":
        shop_stock = db.query(ShopStock).filter(
            ShopStock.shop_id == entry.shop_id,
            ShopStock.batch_id == batch.id
        ).first()
        
        if shop_stock:
            shop_stock.quantity = (shop_stock.quantity or 0) + entry.quantity
            if entry.rack_name: shop_stock.rack_name = entry.rack_name
            if entry.rack_number: shop_stock.rack_number = entry.rack_number
            if entry.selling_price: shop_stock.selling_price = entry.selling_price
        else:
            shop_stock = ShopStock(
                shop_id=entry.shop_id,
                medicine_id=entry.medicine_id,
                batch_id=batch.id,
                quantity=entry.quantity,
                rack_name=entry.rack_name,
                rack_number=entry.rack_number,
                selling_price=entry.selling_price or 0.0 
                # reserved_quantity=0
            ) 
            db.add(shop_stock)
    
    db.commit()
    
    return APIResponse(
        message=f"Stock added to {target_type} successfully",
        data={
            "batch_id": batch.id,
            "batch_number": batch.batch_number,
            "quantity_added": entry.quantity,
            "total_batch_quantity": batch.quantity
        }
    )


@router.get("/alerts")
def get_stock_alerts(
    alert_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get stock alerts (low stock, expiring, expired)"""
    # Import necessary models
    from app.db.models import WarehouseStock, ShopStock
    
    today = date.today()
    expiry_warning_days = 60
    low_stock_threshold = 50
    
    alerts = []
    user_role = current_user.get("role")
    
    # === STRATEGY SELECTION ===
    # 1. Shop Owner or Employee -> Check ShopStock
    if user_role in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin"]:
        shop_id = current_user.get("shop_id")
        if not shop_id:
             return {"alerts": [], "total": 0} # No assigned shop
             
        # Low Stock
        if not alert_type or alert_type == "low_stock":
             stocks = db.query(ShopStock).filter(
                 ShopStock.shop_id == shop_id,
                 ShopStock.quantity <= low_stock_threshold,
                 ShopStock.quantity > 0
             ).all()
             for s in stocks:
                 med = db.query(Medicine).filter(Medicine.id == s.medicine_id).first()
                 batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
                 if batch and batch.expiry_date > today:
                     alerts.append({
                         "id": f"low_{s.id}",
                         "type": "low_stock",
                         "medicine_name": med.name if med else "Unknown",
                         "batch_number": batch.batch_number if batch else "Unknown",
                         "current_quantity": s.quantity,
                         "threshold": low_stock_threshold,
                         "created_at": today # placeholder
                     })
                     
        # Expiring/Expired (Check Batch Dates linked to ShopStock)
        if not alert_type or alert_type in ["expiring", "expired"]:
             stocks = db.query(ShopStock).filter(ShopStock.shop_id == shop_id, ShopStock.quantity > 0).all()
             for s in stocks:
                 batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
                 if not batch: continue
                 
                 med = db.query(Medicine).filter(Medicine.id == s.medicine_id).first()
                 days_to_expiry = (batch.expiry_date - today).days
                 
                 is_expiring = 0 <= days_to_expiry <= expiry_warning_days
                 is_expired = days_to_expiry < 0
                 
                 if (alert_type == "expiring" or not alert_type) and is_expiring:
                      alerts.append({
                         "id": f"exp_{s.id}",
                         "type": "expiring",
                         "medicine_name": med.name if med else "Unknown",
                         "batch_number": batch.batch_number,
                         "expiry_date": batch.expiry_date.isoformat(),
                         "days_to_expiry": days_to_expiry,
                         "quantity": s.quantity,
                         "created_at": today
                     })
                 elif (alert_type == "expired" or not alert_type) and is_expired:
                      alerts.append({
                         "id": f"expd_{s.id}",
                         "type": "expired",
                         "medicine_name": med.name if med else "Unknown",
                         "batch_number": batch.batch_number,
                         "quantity": s.quantity,
                         "created_at": today
                     })

    # 2. Warehouse Admin -> Check WarehouseStock
    elif user_role == "warehouse_admin":
        wh_id = current_user.get("warehouse_id")
        if not wh_id:
             return {"alerts": [], "total": 0}
             
        # Low Stock
        if not alert_type or alert_type == "low_stock":
             stocks = db.query(WarehouseStock).filter(
                 WarehouseStock.warehouse_id == wh_id,
                 WarehouseStock.quantity <= low_stock_threshold,
                 WarehouseStock.quantity > 0
             ).all()
             for s in stocks:
                 med = db.query(Medicine).filter(Medicine.id == s.medicine_id).first()
                 batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
                 if batch and batch.expiry_date > today:
                     alerts.append({
                         "id": f"low_{s.id}",
                         "type": "low_stock",
                         "medicine_name": med.name if med else "Unknown",
                         "batch_number": batch.batch_number if batch else "Unknown",
                         "current_quantity": s.quantity,
                         "threshold": low_stock_threshold,
                         "created_at": today
                     })
                     
        # Expiring/Expired (Check Batch Dates linked to WarehouseStock)
        if not alert_type or alert_type in ["expiring", "expired"]:
             stocks = db.query(WarehouseStock).filter(WarehouseStock.warehouse_id == wh_id, WarehouseStock.quantity > 0).all()
             for s in stocks:
                 batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
                 if not batch: continue
                 
                 med = db.query(Medicine).filter(Medicine.id == s.medicine_id).first()
                 days_to_expiry = (batch.expiry_date - today).days
                 
                 is_expiring = 0 <= days_to_expiry <= expiry_warning_days
                 is_expired = days_to_expiry < 0
                 
                 if (alert_type == "expiring" or not alert_type) and is_expiring:
                      alerts.append({
                         "id": f"exp_{s.id}",
                         "type": "expiring",
                         "medicine_name": med.name if med else "Unknown",
                         "batch_number": batch.batch_number,
                         "expiry_date": batch.expiry_date.isoformat(),
                         "days_to_expiry": days_to_expiry,
                         "quantity": s.quantity,
                         "created_at": today
                     })
                 elif (alert_type == "expired" or not alert_type) and is_expired:
                      alerts.append({
                         "id": f"expd_{s.id}",
                         "type": "expired",
                         "medicine_name": med.name if med else "Unknown",
                         "batch_number": batch.batch_number,
                         "quantity": s.quantity,
                         "created_at": today
                     })

    # 3. Super Admin -> Global Check (fallback to Batch if desired, or check all WarehouseStock? 
    # Usually global Batch quantity is sufficient for Super Admin if it tracks total)
    else:
        # Get low stock items
        if not alert_type or alert_type == "low_stock":
            batches = db.query(Batch).join(Medicine).filter(
                Batch.quantity <= low_stock_threshold,
                Batch.quantity > 0,
                Batch.expiry_date > today
            ).all()
            
            for batch in batches:
                medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
                alerts.append({
                    "id": f"low_{batch.id}",
                    "type": "low_stock",
                    "medicine_id": batch.medicine_id,
                    "medicine_name": medicine.name if medicine else "Unknown",
                    "batch_number": batch.batch_number,
                    "current_quantity": batch.quantity,
                    "threshold": low_stock_threshold,
                    "created_at": batch.created_at
                })
        
        # Get expiring items
        if not alert_type or alert_type == "expiring":
            future_date = today + timedelta(days=expiry_warning_days)
            batches = db.query(Batch).join(Medicine).filter(
                Batch.expiry_date >= today,
                Batch.expiry_date <= future_date,
                Batch.quantity > 0
            ).all()
            
            for batch in batches:
                medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
                days_to_expiry = (batch.expiry_date - today).days if batch.expiry_date else 0
                alerts.append({
                    "id": f"exp_{batch.id}",
                    "type": "expiring",
                    "medicine_id": batch.medicine_id,
                    "medicine_name": medicine.name if medicine else "Unknown",
                    "batch_number": batch.batch_number,
                    "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None,
                    "days_to_expiry": days_to_expiry,
                    "quantity": batch.quantity,
                    "created_at": batch.created_at
                })
        
        # Get expired items
        if not alert_type or alert_type == "expired":
            batches = db.query(Batch).join(Medicine).filter(
                Batch.expiry_date < today,
                Batch.quantity > 0
            ).all()
            
            for batch in batches:
                medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
                alerts.append({
                    "id": f"expd_{batch.id}",
                    "type": "expired",
                    "medicine_id": batch.medicine_id,
                    "medicine_name": medicine.name if medicine else "Unknown",
                    "batch_number": batch.batch_number,
                    "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None,
                    "quantity": batch.quantity,
                    "created_at": batch.created_at
                })
    
    return {"alerts": alerts, "total": len(alerts)}
