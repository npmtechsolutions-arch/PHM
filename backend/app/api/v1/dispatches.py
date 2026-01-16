"""
Dispatch API Routes - Database Connected
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from app.models.order import (
    DispatchCreate, DispatchResponse, DispatchListResponse,
    DispatchStatusUpdate, DispatchStatus
)
from app.models.common import APIResponse
from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.db.models import (
    Dispatch, DispatchItem, DispatchStatusHistory, Medicine, Batch, 
    MedicalShop, Warehouse, PurchaseRequest, StockMovement, 
    WarehouseStock, ShopStock, MovementType, DispatchStatus as DStatus
)

router = APIRouter()


def generate_dispatch_number(db: Session) -> str:
    """Generate unique dispatch number"""
    count = db.query(func.count(Dispatch.id)).scalar() or 0
    return f"DSP-{datetime.now().year}-{count + 1:06d}"


@router.get("")
def list_dispatches(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    shop_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all dispatches"""
    query = db.query(Dispatch).order_by(Dispatch.created_at.desc())
    
    if status:
        query = query.filter(Dispatch.status == status)
    
    if warehouse_id:
        query = query.filter(Dispatch.warehouse_id == warehouse_id)
    
    if shop_id:
        query = query.filter(Dispatch.shop_id == shop_id)
    
    total = query.count()
    dispatches = query.offset((page - 1) * size).limit(size).all()
    
    items = []
    for d in dispatches:
        shop = db.query(MedicalShop).filter(MedicalShop.id == d.shop_id).first()
        warehouse = db.query(Warehouse).filter(Warehouse.id == d.warehouse_id).first()
        item_count = db.query(func.count(DispatchItem.id)).filter(
            DispatchItem.dispatch_id == d.id
        ).scalar()
        
        items.append({
            "id": d.id,
            "dispatch_number": d.dispatch_number,
            "warehouse_id": d.warehouse_id,
            "warehouse_name": warehouse.name if warehouse else None,
            "shop_id": d.shop_id,
            "shop_name": shop.name if shop else None,
            "status": d.status.value if d.status else "created",
            "total_items": item_count,
            "dispatched_at": d.dispatched_at,
            "delivered_at": d.delivered_at,
            "created_at": d.created_at
        })
    
    return {"items": items, "total": total, "page": page, "size": size}


@router.post("")
def create_dispatch(
    dispatch_data: DispatchCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin"]))
):
    """Create a new dispatch"""
    # Validate warehouse and shop
    warehouse = db.query(Warehouse).filter(Warehouse.id == dispatch_data.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    shop = db.query(MedicalShop).filter(MedicalShop.id == dispatch_data.shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    dispatch_number = generate_dispatch_number(db)
    
    # Create dispatch
    dispatch = Dispatch(
        dispatch_number=dispatch_number,
        warehouse_id=dispatch_data.warehouse_id,
        shop_id=dispatch_data.shop_id,
        purchase_request_id=dispatch_data.purchase_request_id,
        notes=dispatch_data.notes,
        status=DStatus.CREATED,
        dispatched_by=current_user.user_id
    )
    db.add(dispatch)
    db.flush()
    
    # Add items
    for item_data in dispatch_data.items:
        medicine = db.query(Medicine).filter(Medicine.id == item_data.medicine_id).first()
        if not medicine:
            raise HTTPException(status_code=400, detail=f"Medicine {item_data.medicine_id} not found")
        
        batch = db.query(Batch).filter(Batch.id == item_data.batch_id).first()
        if not batch:
            raise HTTPException(status_code=400, detail=f"Batch {item_data.batch_id} not found")
        
        # Check warehouse stock
        wh_stock = db.query(WarehouseStock).filter(
            WarehouseStock.warehouse_id == dispatch_data.warehouse_id,
            WarehouseStock.batch_id == item_data.batch_id
        ).first()
        
        available = wh_stock.quantity if wh_stock else batch.quantity
        if item_data.quantity > available:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient warehouse stock for {medicine.name}. Available: {available}"
            )
        
        item = DispatchItem(
            dispatch_id=dispatch.id,
            medicine_id=item_data.medicine_id,
            batch_id=item_data.batch_id,
            quantity=item_data.quantity
        )
        db.add(item)
    
    # Add initial status history
    history = DispatchStatusHistory(
        dispatch_id=dispatch.id,
        status=DStatus.CREATED,
        updated_by=current_user.user_id
    )
    db.add(history)
    
    db.commit()
    
    return APIResponse(
        message="Dispatch created successfully",
        data={"id": dispatch.id, "dispatch_number": dispatch_number}
    )


@router.get("/{dispatch_id}")
def get_dispatch(
    dispatch_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get dispatch by ID"""
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    
    shop = db.query(MedicalShop).filter(MedicalShop.id == dispatch.shop_id).first()
    warehouse = db.query(Warehouse).filter(Warehouse.id == dispatch.warehouse_id).first()
    
    items = db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch_id).all()
    history = db.query(DispatchStatusHistory).filter(
        DispatchStatusHistory.dispatch_id == dispatch_id
    ).order_by(DispatchStatusHistory.created_at.desc()).all()
    
    item_list = []
    for item in items:
        medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
        item_list.append({
            "id": item.id,
            "medicine_id": item.medicine_id,
            "medicine_name": medicine.name if medicine else "Unknown",
            "batch_id": item.batch_id,
            "batch_number": batch.batch_number if batch else "Unknown",
            "expiry_date": batch.expiry_date.isoformat() if batch and batch.expiry_date else None,
            "quantity": item.quantity
        })
    
    return {
        "id": dispatch.id,
        "dispatch_number": dispatch.dispatch_number,
        "warehouse_id": dispatch.warehouse_id,
        "warehouse_name": warehouse.name if warehouse else None,
        "shop_id": dispatch.shop_id,
        "shop_name": shop.name if shop else None,
        "purchase_request_id": dispatch.purchase_request_id,
        "status": dispatch.status.value if dispatch.status else "created",
        "items": item_list,
        "status_history": [
            {
                "status": h.status.value if h.status else None,
                "notes": h.notes,
                "updated_by": h.updated_by,
                "created_at": h.created_at
            }
            for h in history
        ],
        "notes": dispatch.notes,
        "dispatched_by": dispatch.dispatched_by,
        "dispatched_at": dispatch.dispatched_at,
        "delivered_at": dispatch.delivered_at,
        "created_at": dispatch.created_at
    }


@router.put("/{dispatch_id}/status")
def update_dispatch_status(
    dispatch_id: str,
    status_update: DispatchStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update dispatch status"""
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    
    new_status = DStatus(status_update.status.value)
    dispatch.status = new_status
    
    if new_status == DStatus.DISPATCHED:
        dispatch.dispatched_at = datetime.utcnow()
        
        # Deduct from warehouse stock on dispatch
        items = db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch_id).all()
        for item in items:
            # Record movement
            movement = StockMovement(
                movement_type=MovementType.TRANSFER,
                source_type="warehouse",
                source_id=dispatch.warehouse_id,
                destination_type="shop",
                destination_id=dispatch.shop_id,
                medicine_id=item.medicine_id,
                batch_id=item.batch_id,
                quantity=item.quantity,
                reference_type="dispatch",
                reference_id=dispatch.id,
                created_by=current_user.get("user_id")
            )
            db.add(movement)
            
            # Deduct from warehouse
            wh_stock = db.query(WarehouseStock).filter(
                WarehouseStock.warehouse_id == dispatch.warehouse_id,
                WarehouseStock.batch_id == item.batch_id
            ).first()
            if wh_stock:
                wh_stock.quantity -= item.quantity
            else:
                batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
                if batch:
                    batch.quantity -= item.quantity
    
    elif new_status == DStatus.DELIVERED:
        dispatch.delivered_at = datetime.utcnow()
        dispatch.received_by = current_user.get("user_id")
        
        # Add to shop stock on delivery
        items = db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch_id).all()
        for item in items:
            shop_stock = db.query(ShopStock).filter(
                ShopStock.shop_id == dispatch.shop_id,
                ShopStock.batch_id == item.batch_id
            ).first()
            
            if shop_stock:
                shop_stock.quantity += item.quantity
            else:
                # Create new shop stock entry
                new_stock = ShopStock(
                    shop_id=dispatch.shop_id,
                    medicine_id=item.medicine_id,
                    batch_id=item.batch_id,
                    quantity=item.quantity
                )
                db.add(new_stock)
    
    # Add status history
    history = DispatchStatusHistory(
        dispatch_id=dispatch.id,
        status=new_status,
        notes=status_update.notes,
        updated_by=current_user.get("user_id")
    )
    db.add(history)
    
    db.commit()
    
    return APIResponse(message=f"Dispatch status updated to {new_status.value}")
