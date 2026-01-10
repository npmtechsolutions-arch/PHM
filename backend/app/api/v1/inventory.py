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
async def get_stock_movements(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    location_type: Optional[str] = None,
    location_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get stock movements history"""
    # For now, return empty since we don't have a movements table yet
    return {
        "movements": [],
        "total": 0,
        "page": page,
        "size": size
    }


@router.post("/adjust")
async def adjust_stock(
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
async def create_stock_entry(
    entry: StockEntry,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin"]))
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
    user_role = current_user.get("role")
    assigned_warehouse_id = current_user.get("assigned_warehouse_id")
    
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
async def get_stock_alerts(
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
