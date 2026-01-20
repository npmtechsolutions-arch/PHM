"""
Purchase Request API Routes - Database Connected
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from app.models.order import (
    PurchaseRequestCreate, PurchaseRequestResponse, PurchaseRequestListResponse,
    PurchaseRequestApproval, PurchaseRequestStatus
)
from app.models.common import APIResponse
from app.core.security import get_current_user, require_role, AuthContext, get_auth_context
from app.db.database import get_db
from app.db.models import (
    PurchaseRequest, PurchaseRequestItem, Medicine, MedicalShop, Warehouse,
    PurchaseRequestStatus as PRStatus
)

router = APIRouter()


def generate_pr_number(db: Session) -> str:
    """Generate unique purchase request number"""
    count = db.query(func.count(PurchaseRequest.id)).scalar() or 0
    return f"PR-{datetime.now().year}-{count + 1:06d}"


@router.get("")
def list_purchase_requests(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    status: Optional[str] = None,
    shop_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all purchase requests"""
    query = db.query(PurchaseRequest).order_by(PurchaseRequest.created_at.desc())
    
    # ENTITY ISOLATION ENFORCEMENT
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    user_warehouse_id = current_user.get("warehouse_id")
    
    # Super Admin bypasses all entity isolation
    if user_role != "super_admin":
        # 1. Shop Context: Shop Owner/Employee can ONLY see their shop's requests
        shop_roles = ["shop_owner", "pharmacist", "cashier", "pharmacy_admin", "pharmacy_employee"]
        if user_role in shop_roles or (user_role and user_shop_id):
            # Force filter by assigned shop
            if user_shop_id:
                shop_id = user_shop_id 
            # (If user has role but no shop_id, they see nothing or error? 
            # For now, let's assume they might be setup incorrectly, but we shouldn't show ALL data.
            # But if shop_id is overridden here, it protects the data.)
            
            # If they tried to request another shop's data (search param), it gets overridden or we can error.
            # Overriding is safer/simpler: they just see their data.
            query = query.filter(PurchaseRequest.shop_id == user_shop_id)
            
        # 2. Warehouse Context: Warehouse Admin can ONLY see their warehouse's requests
        if user_role == "warehouse_admin" or (user_role and user_warehouse_id):
             if user_warehouse_id:
                warehouse_id = user_warehouse_id
             query = query.filter(PurchaseRequest.warehouse_id == user_warehouse_id)
    
    # Standard filters (from query params)
    # Note: If shop_id/warehouse_id were set above by auth logic, they are effectively enforced.
    # But we should apply the filter ONLY if it wasn't already applied or if we want to allow 
    # Super Admin to filter.
    
    if status:
        query = query.filter(PurchaseRequest.status == status)
    
    # Apply shop_id filter if set (either by param OR by auth enforcement)
    if shop_id:
        query = query.filter(PurchaseRequest.shop_id == shop_id)
    
    # Apply warehouse_id filter if set (either by param OR by auth enforcement)
    if warehouse_id:
        query = query.filter(PurchaseRequest.warehouse_id == warehouse_id)
    
    total = query.count()
    requests = query.offset((page - 1) * size).limit(size).all()
    
    items = []
    for pr in requests:
        shop = db.query(MedicalShop).filter(MedicalShop.id == pr.shop_id).first()
        warehouse = db.query(Warehouse).filter(Warehouse.id == pr.warehouse_id).first()
        item_count = db.query(func.count(PurchaseRequestItem.id)).filter(
            PurchaseRequestItem.purchase_request_id == pr.id
        ).scalar()
        
        items.append({
            "id": pr.id,
            "request_number": pr.request_number,
            "shop_id": pr.shop_id,
            "shop_name": shop.name if shop else None,
            "warehouse_id": pr.warehouse_id,
            "warehouse_name": warehouse.name if warehouse else None,
            "urgency": pr.urgency,
            "status": pr.status.value if pr.status else "pending",
            "total_items": item_count,
            "requested_by": pr.requested_by,
            "created_at": pr.created_at
        })
    
    return {"items": items, "total": total, "page": page, "size": size}


@router.post("")
def create_purchase_request(
    request_data: PurchaseRequestCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_role(["shop_owner", "pharmacist", "pharmacy_employee", "pharmacy_admin", "super_admin"]))
):
    """Create a new purchase request"""
    # Validate shop and warehouse
    shop = db.query(MedicalShop).filter(MedicalShop.id == request_data.shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    warehouse = db.query(Warehouse).filter(Warehouse.id == request_data.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    pr_number = generate_pr_number(db)
    
    # Create purchase request
    pr = PurchaseRequest(
        request_number=pr_number,
        shop_id=request_data.shop_id,
        warehouse_id=request_data.warehouse_id,
        urgency=request_data.urgency or "normal",
        notes=request_data.notes,
        status=PRStatus.PENDING,
        requested_by=auth.user_id
    )
    db.add(pr)
    db.flush()
    
    # Add items
    for item_data in request_data.items:
        medicine = db.query(Medicine).filter(Medicine.id == item_data.medicine_id).first()
        if not medicine:
            raise HTTPException(status_code=400, detail=f"Medicine {item_data.medicine_id} not found")
        
        item = PurchaseRequestItem(
            purchase_request_id=pr.id,
            medicine_id=item_data.medicine_id,
            quantity_requested=item_data.quantity_requested,
            notes=item_data.notes
        )
        db.add(item)
    
    db.commit()
    
    return APIResponse(
        message="Purchase request created successfully",
        data={"id": pr.id, "request_number": pr_number}
    )


@router.get("/{request_id}")
def get_purchase_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get purchase request by ID"""
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # ENTITY ACCESS CONTROL
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    user_warehouse_id = current_user.get("warehouse_id")
    
    # Super Admin bypasses all entity access control
    if user_role != "super_admin":
        shop_roles = ["shop_owner", "pharmacist", "cashier", "pharmacy_admin", "pharmacy_employee"]
        
        if user_role in shop_roles:
            if pr.shop_id != user_shop_id:
                raise HTTPException(status_code=403, detail="Access denied to this purchase request")
                
        if user_role == "warehouse_admin":
            if pr.warehouse_id != user_warehouse_id:
                 raise HTTPException(status_code=403, detail="Access denied to this purchase request")

    shop = db.query(MedicalShop).filter(MedicalShop.id == pr.shop_id).first()
    warehouse = db.query(Warehouse).filter(Warehouse.id == pr.warehouse_id).first()
    
    items = db.query(PurchaseRequestItem).filter(
        PurchaseRequestItem.purchase_request_id == request_id
    ).all()
    
    item_list = []
    for item in items:
        medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        item_list.append({
            "id": item.id,
            "medicine_id": item.medicine_id,
            "medicine_name": medicine.name if medicine else "Unknown",
            "quantity_requested": item.quantity_requested,
            "quantity_approved": item.quantity_approved,
            "quantity_dispatched": item.quantity_dispatched,
            "notes": item.notes
        })
    
    return {
        "id": pr.id,
        "request_number": pr.request_number,
        "shop_id": pr.shop_id,
        "shop_name": shop.name if shop else None,
        "warehouse_id": pr.warehouse_id,
        "warehouse_name": warehouse.name if warehouse else None,
        "urgency": pr.urgency,
        "status": pr.status.value if pr.status else "pending",
        "items": item_list,
        "notes": pr.notes,
        "approval_notes": pr.approval_notes,
        "requested_by": pr.requested_by,
        "approved_by": pr.approved_by,
        "created_at": pr.created_at,
        "updated_at": pr.updated_at
    }


@router.put("/{request_id}/approve")
def approve_purchase_request(
    request_id: str,
    approval: PurchaseRequestApproval,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_role(["super_admin", "warehouse_admin", "warehouse_employee"]))
):
    """Approve purchase request"""
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    if pr.status != PRStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Update item quantities
    if not approval.items:
        # Quick Approve: Approve all items with requested quantity
        items = db.query(PurchaseRequestItem).filter(
            PurchaseRequestItem.purchase_request_id == request_id
        ).all()
        for item in items:
            item.quantity_approved = item.quantity_requested
    else:
        # Partial/Specific Approve
        for item_approval in approval.items:
            item = db.query(PurchaseRequestItem).filter(
                PurchaseRequestItem.id == item_approval.get("item_id")
            ).first()
            if item:
                item.quantity_approved = item_approval.get("quantity_approved", 0)
    
    pr.status = PRStatus.APPROVED
    pr.approved_by = auth.user_id
    pr.approval_notes = approval.notes
    
    db.commit()
    
    return APIResponse(message="Purchase request approved")


@router.put("/{request_id}/reject")
def reject_purchase_request(
    request_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_role(["super_admin", "warehouse_admin", "warehouse_employee"]))
):
    """Reject purchase request"""
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    if pr.status != PRStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request already processed")
    
    pr.status = PRStatus.REJECTED
    db.commit()
    
    return APIResponse(message="Purchase request rejected")
