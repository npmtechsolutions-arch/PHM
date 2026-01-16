"""
Inventory & Stock API Routes - Database Connected
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta
from pydantic import BaseModel

from app.models.common import APIResponse
from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.db.models import Batch, Medicine

router = APIRouter()


class StockAdjustment(BaseModel):
    medicine_id: str
    batch_id: str
    adjustment_type: str  # increase, decrease
    quantity: int
    reason: str


@router.get("/movements")
def get_stock_movements(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
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
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin"]))
):
    """Adjust stock quantity for a batch"""
    batch = db.query(Batch).filter(Batch.id == adjustment.batch_id).first()
    if not batch:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if adjustment.adjustment_type == "increase":
        batch.quantity = (batch.quantity or 0) + adjustment.quantity
    elif adjustment.adjustment_type == "decrease":
        new_qty = (batch.quantity or 0) - adjustment.quantity
        if new_qty < 0:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Cannot reduce stock below zero")
        batch.quantity = new_qty
    
    db.commit()
    
    return APIResponse(message="Stock adjusted successfully", data={"new_quantity": batch.quantity})


# Stock Entry - creates batch implicitly
class StockEntry(BaseModel):
    warehouse_id: str
    medicine_id: str
    batch_number: str  # Batch is created implicitly here
    expiry_date: str   # Batch expiry date (YYYY-MM-DD)
    quantity: int
    rack_name: Optional[str] = None  # Physical storage - e.g., "Painkillers Box"
    rack_number: Optional[str] = None  # Physical rack - e.g., "R-01"


@router.post("/entry")
def create_stock_entry(
    entry: StockEntry,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["super_admin", "warehouse_admin"]))
):
    """
    Add stock entry to warehouse.
    Batch is created implicitly - NOT a separate master.
    
    ENTITY CONTEXT RESOLUTION:
    - Super Admin: can specify any warehouse (explicit selection)
    - Warehouse Admin: MUST use their assigned warehouse (server enforces)
    """
    from fastapi import HTTPException
    from datetime import datetime
    from app.db.models import WarehouseStock, Warehouse
    
    # ENTITY CONTEXT ENFORCEMENT
    user_role = current_user.role
    assigned_warehouse_id = current_user.warehouse_id
    
    if user_role != "super_admin":
        # Non-Super Admin: MUST use their assigned warehouse
        if not assigned_warehouse_id:
            raise HTTPException(status_code=403, detail="User not assigned to any warehouse")
        if entry.warehouse_id != assigned_warehouse_id:
            raise HTTPException(
                status_code=403, 
                detail="Cannot add stock to another warehouse. You can only operate on your assigned warehouse."
            )
    
    # Validate warehouse
    warehouse = db.query(Warehouse).filter(Warehouse.id == entry.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Validate medicine
    medicine = db.query(Medicine).filter(Medicine.id == entry.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
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
            purchase_price=medicine.purchase_price
        )
        db.add(batch)
        db.flush()  # Get batch ID
    
    # Create or update warehouse stock
    wh_stock = db.query(WarehouseStock).filter(
        WarehouseStock.warehouse_id == entry.warehouse_id,
        WarehouseStock.batch_id == batch.id
    ).first()
    
    if wh_stock:
        wh_stock.quantity = (wh_stock.quantity or 0) + entry.quantity
        if entry.rack_name:
            wh_stock.rack_name = entry.rack_name
        if entry.rack_number:
            wh_stock.rack_number = entry.rack_number
    else:
        wh_stock = WarehouseStock(
            warehouse_id=entry.warehouse_id,
            medicine_id=entry.medicine_id,  # Required field
            batch_id=batch.id,
            quantity=entry.quantity,
            rack_name=entry.rack_name,
            rack_number=entry.rack_number
        )
        db.add(wh_stock)
    
    db.commit()
    
    return APIResponse(
        message="Stock entry added successfully",
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
    today = date.today()
    expiry_warning_days = 60
    low_stock_threshold = 50
    
    alerts = []
    
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
