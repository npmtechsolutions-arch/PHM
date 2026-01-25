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
    MedicalShop, Warehouse, PurchaseRequest, PurchaseRequestItem, StockMovement, 
    WarehouseStock, ShopStock, MovementType, DispatchStatus as DStatus,
    PurchaseRequestStatus as PRStatus
)

router = APIRouter()


def generate_dispatch_number(db: Session) -> str:
    """Generate unique dispatch number"""
    count = db.query(func.count(Dispatch.id)).scalar() or 0
    return f"DSP-{datetime.now().year}-{count + 1:06d}"


@router.get("")
def list_dispatches(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    status: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    shop_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all dispatches"""
    query = db.query(Dispatch).order_by(Dispatch.created_at.desc())
    
    # ENTITY ISOLATION ENFORCEMENT
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    user_warehouse_id = current_user.get("warehouse_id")
    
    # 1. Shop Context: Shop Owner/Employee can ONLY see their shop's dispatches
    shop_roles = ["shop_owner", "pharmacist", "cashier", "pharmacy_admin", "pharmacy_employee"]
    if user_role in shop_roles or (user_role and user_shop_id):
        if user_shop_id:
            shop_id = user_shop_id 
        query = query.filter(Dispatch.shop_id == user_shop_id)
        
    # 2. Warehouse Context: Warehouse Admin can ONLY see their warehouse's dispatches
    if user_role == "warehouse_admin" or (user_role and user_warehouse_id):
         if user_warehouse_id:
            warehouse_id = user_warehouse_id
         query = query.filter(Dispatch.warehouse_id == user_warehouse_id)
    
    # Standard filters
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
    """
    Create a new dispatch from warehouse to shop.
    
    BUSINESS LOGIC:
    1. Only warehouse_admin or super_admin can create dispatches
    2. Stock is deducted from WarehouseStock immediately when dispatch is CREATED
    3. This prevents double-dispatching and reserves stock
    4. When pharmacy receives (status = DELIVERED), stock is added to ShopStock
    """
    # current_user is AuthContext object here
    user_role = current_user.role
    user_warehouse_id = current_user.warehouse_id
    
    # Enforce Warehouse Admin scope - Pharmacy CANNOT create dispatches
    if user_role == "warehouse_admin":
        if not user_warehouse_id:
            raise HTTPException(status_code=403, detail="User not assigned to any warehouse")
        if dispatch_data.warehouse_id != user_warehouse_id:
             raise HTTPException(status_code=403, detail="Cannot create dispatch from another warehouse")
    
    # CRITICAL: Pharmacy/Shop users CANNOT create dispatches
    shop_roles = ["shop_owner", "pharmacist", "cashier", "pharmacy_admin", "pharmacy_employee"]
    if user_role in shop_roles:
        raise HTTPException(
            status_code=403, 
            detail="Pharmacy users cannot create dispatches. Only warehouse can dispatch stock to shops."
        )

    # Validate warehouse and shop
    warehouse = db.query(Warehouse).filter(Warehouse.id == dispatch_data.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    shop = db.query(MedicalShop).filter(MedicalShop.id == dispatch_data.shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    # Validate shop is linked to warehouse (business rule)
    if shop.warehouse_id != dispatch_data.warehouse_id:
        raise HTTPException(
            status_code=400,
            detail=f"Shop '{shop.name}' is not linked to warehouse '{warehouse.name}'. Cannot dispatch to unlinked shop."
        )
    
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
    
    # Add items and update logic
    pr_fully_dispatched = True
    
    # Fetch Purchase Request if exists
    purchase_request = None
    if dispatch_data.purchase_request_id:
        purchase_request = db.query(PurchaseRequest).filter(PurchaseRequest.id == dispatch_data.purchase_request_id).first()

    for item_data in dispatch_data.items:
        medicine = db.query(Medicine).filter(Medicine.id == item_data.medicine_id).first()
        if not medicine:
            raise HTTPException(status_code=400, detail=f"Medicine {item_data.medicine_id} not found")
        
        batch = db.query(Batch).filter(Batch.id == item_data.batch_id).first()
        if not batch:
            raise HTTPException(status_code=400, detail=f"Batch {item_data.batch_id} not found")
        
        # Check warehouse stock availability and deduct immediately
        wh_stock = db.query(WarehouseStock).filter(
            WarehouseStock.warehouse_id == dispatch_data.warehouse_id,
            WarehouseStock.batch_id == item_data.batch_id
        ).first()
        
        # Validate stock availability
        available = wh_stock.quantity if wh_stock else (batch.quantity or 0)
        
        if item_data.quantity > available:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient warehouse stock for {medicine.name}. Available: {available}, Requested: {item_data.quantity}"
            )
        
        # Create dispatch item
        item = DispatchItem(
            dispatch_id=dispatch.id,
            medicine_id=item_data.medicine_id,
            batch_id=item_data.batch_id,
            quantity=item_data.quantity
        )
        db.add(item)

        # CRITICAL: Deduct from warehouse stock immediately when dispatch is CREATED
        # This reserves the stock and prevents double-dispatching
        if wh_stock:
            # Validate stock availability again (double-check before deduction)
            if wh_stock.quantity < item_data.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient warehouse stock for {medicine.name}. Available: {wh_stock.quantity}, Requested: {item_data.quantity}"
                )
            
            # Deduct from warehouse stock
            wh_stock.quantity -= item_data.quantity
            
            # CRITICAL: Ensure stock doesn't go negative (safety check)
            if wh_stock.quantity < 0:
                # Rollback the deduction
                wh_stock.quantity += item_data.quantity
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock deduction would result in negative quantity. Available: {wh_stock.quantity + item_data.quantity}, Requested: {item_data.quantity}"
                )
            
            # Create stock movement record for audit with purchase request link
            purchase_ref_note = ""
            if dispatch_data.purchase_request_id:
                purchase_ref_note = f" | PR: {dispatch_data.purchase_request_id}"
            
            movement = StockMovement(
                movement_type=MovementType.TRANSFER,
                source_type="warehouse",
                source_id=dispatch_data.warehouse_id,
                destination_type="shop",
                destination_id=dispatch_data.shop_id,
                medicine_id=item_data.medicine_id,
                batch_id=item_data.batch_id,
                quantity=item_data.quantity,
                reference_type="dispatch",
                reference_id=dispatch.id,
                notes=f"Dispatch created - stock deducted from warehouse{purchase_ref_note}",
                created_by=current_user.user_id
            )
            db.add(movement)
        else:
            # Fallback: if no WarehouseStock record, deduct from Batch (legacy behavior)
            if (batch.quantity or 0) < item_data.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient batch stock for {medicine.name}. Available: {batch.quantity or 0}, Requested: {item_data.quantity}"
                )
            batch.quantity = (batch.quantity or 0) - item_data.quantity
            
            # Ensure batch quantity doesn't go negative
            if batch.quantity < 0:
                batch.quantity += item_data.quantity
                raise HTTPException(
                    status_code=400,
                    detail=f"Batch stock deduction would result in negative quantity"
                )

        # Update Purchase Request Item if linked
        if purchase_request:
            pr_item = db.query(PurchaseRequestItem).filter(
                PurchaseRequestItem.purchase_request_id == purchase_request.id,
                PurchaseRequestItem.medicine_id == item_data.medicine_id
            ).first()
            
            if pr_item:
                pr_item.quantity_dispatched += item_data.quantity
                if pr_item.quantity_dispatched < pr_item.quantity_approved:
                    pr_fully_dispatched = False
            else:
                # If we are dispatching an item not in PR (extra item), it doesn't block "full dispatch" 
                # strictly speaking, but depends on business logic. 
                # Usually we only care about requested items being fulfilled.
                pass

    # Update Purchase Request Status
    if purchase_request:
        # Check if ALL items in PR are fully dispatched
        # We need to re-verify against all PR items, not just the ones in this dispatch
        all_pr_items = db.query(PurchaseRequestItem).filter(
            PurchaseRequestItem.purchase_request_id == purchase_request.id
        ).all()
        
        all_fulfilled = True
        for pi in all_pr_items:
            if pi.quantity_dispatched < pi.quantity_approved:
                all_fulfilled = False
                break
        
        if all_fulfilled:
            purchase_request.status = PRStatus.COMPLETED
        else:
            purchase_request.status = PRStatus.PARTIAL
    
    # Add initial status history
    history = DispatchStatusHistory(
        dispatch_id=dispatch.id,
        status=DStatus.CREATED,
        updated_by=current_user.user_id
    )
    db.add(history)
    
    # CRITICAL: Commit all changes (dispatch, items, stock deduction, movements)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create dispatch: {str(e)}"
        )
    
    return APIResponse(
        message="Dispatch created successfully. Stock deducted from warehouse.",
        data={
            "id": dispatch.id, 
            "dispatch_number": dispatch_number,
            "status": "created",
            "note": "Stock has been deducted from warehouse inventory"
        }
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
    
    # ENTITY ACCESS CONTROL
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    user_warehouse_id = current_user.get("warehouse_id")
    
    shop_roles = ["shop_owner", "pharmacist", "cashier", "pharmacy_admin", "pharmacy_employee"]
    
    if user_role in shop_roles:
        if dispatch.shop_id != user_shop_id:
            raise HTTPException(status_code=403, detail="Access denied to this dispatch")
            
    if user_role == "warehouse_admin":
        if dispatch.warehouse_id != user_warehouse_id:
             raise HTTPException(status_code=403, detail="Access denied to this dispatch")
    
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
            "manufacturer": medicine.manufacturer if medicine else "Unknown",
            "batch_id": item.batch_id,
            "batch_number": batch.batch_number if batch else "Unknown",
            "expiry_date": batch.expiry_date.isoformat() if batch and batch.expiry_date else None,
            "quantity": item.quantity,
            "purchase_price": batch.purchase_price if batch else 0,
            "mrp": batch.mrp if batch else 0,
            "selling_price": medicine.selling_price if medicine else 0
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
        # Note: Stock was already deducted when dispatch was CREATED
        # This status update just marks it as physically dispatched
    
    elif new_status == DStatus.DELIVERED:
        # CRITICAL: Only shop users or super admin can mark as delivered
        user_role = current_user.get("role")
        user_shop_id = current_user.get("shop_id")
        
        shop_roles = ["shop_owner", "pharmacist", "cashier", "pharmacy_admin", "pharmacy_employee"]
        if user_role not in ["super_admin"] + shop_roles:
            raise HTTPException(
                status_code=403,
                detail="Only pharmacy/shop users can receive dispatches. Warehouse cannot mark as delivered."
            )
        
        # Verify shop user can only receive dispatches for their shop
        if user_role in shop_roles:
            if not user_shop_id or user_shop_id != dispatch.shop_id:
                raise HTTPException(
                    status_code=403,
                    detail="You can only receive dispatches for your assigned shop"
                )
        
        dispatch.delivered_at = datetime.utcnow()
        dispatch.received_by = current_user.get("user_id")
        
        # Get rack/box info from status update (global or per-item)
        global_rack_number = status_update.global_rack_number
        global_rack_name = status_update.global_rack_name
        item_rack_map = {}
        if status_update.item_rack_info:
            for rack_info in status_update.item_rack_info:
                item_rack_map[rack_info.item_id] = {
                    "rack_number": rack_info.rack_number,
                    "rack_name": rack_info.rack_name
                }
        
        # Add to shop stock on delivery (automatic stock loading)
        items = db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch_id).all()
        for item in items:
            # Get rack/box info for this item (per-item overrides global)
            item_rack_info = item_rack_map.get(item.id, {})
            rack_number = item_rack_info.get("rack_number") or global_rack_number
            rack_name = item_rack_info.get("rack_name") or global_rack_name
            
            # Check if shop stock already exists for this batch
            shop_stock = db.query(ShopStock).filter(
                ShopStock.shop_id == dispatch.shop_id,
                ShopStock.batch_id == item.batch_id
            ).first()
            
            if shop_stock:
                # Update existing shop stock (auto-load into inventory)
                shop_stock.quantity += item.quantity
                # Update rack info if provided (only if not already set or if explicitly provided)
                if rack_number:
                    shop_stock.rack_number = rack_number
                if rack_name:
                    shop_stock.rack_name = rack_name
            else:
                # Create new shop stock entry (auto-load into inventory)
                batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
                medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
                
                if not batch:
                    raise HTTPException(status_code=404, detail=f"Batch {item.batch_id} not found")
                if not medicine:
                    raise HTTPException(status_code=404, detail=f"Medicine {item.medicine_id} not found")
                
                new_stock = ShopStock(
                    shop_id=dispatch.shop_id,
                    medicine_id=item.medicine_id,
                    batch_id=item.batch_id,
                    quantity=item.quantity,
                    selling_price=medicine.selling_price if medicine else 0.0,
                    rack_number=rack_number,
                    rack_name=rack_name
                )
                db.add(new_stock)
            
            # Update stock movement to mark as delivered and link to purchase request
            movement = db.query(StockMovement).filter(
                StockMovement.reference_type == "dispatch",
                StockMovement.reference_id == dispatch.id,
                StockMovement.batch_id == item.batch_id
            ).first()
            
            # Build notes with purchase request reference for purchase bill tracking
            purchase_ref = ""
            if dispatch.purchase_request_id:
                purchase_ref = f" | PR: {dispatch.purchase_request_id}"
            
            if movement:
                movement.notes = (movement.notes or "") + f" | Delivered and auto-loaded to shop stock{purchase_ref}"
            else:
                # Create movement if not found (shouldn't happen, but safety)
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
                    notes=f"Delivered and auto-loaded to shop stock{purchase_ref}",
                    created_by=current_user.get("user_id")
                )
                db.add(movement)
            
            # CRITICAL: Link stock to purchase request for purchase bill tracking
            # This allows tracking which stock came from which purchase request
            # The ShopStock entry is implicitly linked via the dispatch -> purchase_request relationship
    
    # Add status history
    history = DispatchStatusHistory(
        dispatch_id=dispatch.id,
        status=new_status,
        notes=status_update.notes,
        updated_by=current_user.get("user_id")
    )
    db.add(history)
    
    # CRITICAL: Commit all changes with error handling
    try:
        db.commit()
        
        # Return appropriate message based on status
        if new_status == DStatus.DELIVERED:
            return APIResponse(
                message="Dispatch received successfully. Stock automatically added to shop inventory.",
                data={
                    "status": "delivered",
                    "note": "Stock has been automatically loaded into shop inventory"
                }
            )
        else:
            return APIResponse(message=f"Dispatch status updated to {new_status.value}")
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update dispatch status: {str(e)}"
        )
