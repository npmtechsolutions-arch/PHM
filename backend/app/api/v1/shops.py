"""
Medical Shops API Routes - Database Connected
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.models.common import APIResponse
from app.models.shop import MedicalShopCreate as ShopCreate, MedicalShopUpdate as ShopUpdate, MedicalShopResponse as ShopResponse
from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.db.models import MedicalShop, Warehouse, ShopStatus

router = APIRouter()


@router.get("")
def list_shops(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all medical shops with pagination"""
    query = db.query(MedicalShop)
    
    if search:
        query = query.filter(
            (MedicalShop.name.ilike(f"%{search}%")) |
            (MedicalShop.code.ilike(f"%{search}%")) |
            (MedicalShop.city.ilike(f"%{search}%"))
        )
    
    if status:
        query = query.filter(MedicalShop.status == status)
    
    if warehouse_id:
        query = query.filter(MedicalShop.warehouse_id == warehouse_id)
    
    total = query.count()
    shops = query.offset((page - 1) * size).limit(size).all()
    
    items = [
        {
            "id": shop.id,
            "name": shop.name,
            "code": shop.code,
            "shop_type": shop.shop_type,
            "license_number": shop.license_number,
            "gst_number": shop.gst_number,
            "address": shop.address,
            "city": shop.city,
            "state": shop.state,
            "phone": shop.phone,
            "email": shop.email,
            "status": shop.status.value if shop.status else "active",
            "warehouse_id": shop.warehouse_id,
            "warehouse_name": shop.warehouse.name if shop.warehouse else None,
            "created_at": shop.created_at
        }
        for shop in shops
    ]
    
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/{shop_id}")
def get_shop(
    shop_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get shop by ID"""
    shop = db.query(MedicalShop).filter(MedicalShop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    return {
        "id": shop.id,
        "name": shop.name,
        "code": shop.code,
        "shop_type": shop.shop_type,
        "license_number": shop.license_number,
        "gst_number": shop.gst_number,
        "address": shop.address,
        "city": shop.city,
        "state": shop.state,
        "country": shop.country,
        "pincode": shop.pincode,
        "phone": shop.phone,
        "email": shop.email,
        "status": shop.status.value if shop.status else "active",
        "warehouse_id": shop.warehouse_id,
        "owner_id": shop.owner_id,
        "manager_id": shop.manager_id,
        "created_at": shop.created_at,
        "updated_at": shop.updated_at
    }


@router.post("")
def create_shop(
    shop_data: ShopCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin"]))
):
    """Create a new medical shop"""
    # Check if code already exists
    existing = db.query(MedicalShop).filter(MedicalShop.code == shop_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Shop code already exists")
    
    # Verify warehouse exists if provided
    if shop_data.warehouse_id:
        warehouse = db.query(Warehouse).filter(Warehouse.id == shop_data.warehouse_id).first()
        if not warehouse:
            raise HTTPException(status_code=400, detail="Warehouse not found")
    
    shop = MedicalShop(
        name=shop_data.name,
        code=shop_data.code,
        shop_type=shop_data.shop_type or "retail",
        license_number=shop_data.license_number,
        gst_number=shop_data.gst_number,
        address=shop_data.address,
        city=shop_data.city,
        state=shop_data.state,
        country=shop_data.country or "India",
        pincode=shop_data.pincode,
        phone=shop_data.phone,
        email=shop_data.email,
        warehouse_id=shop_data.warehouse_id,
        status=ShopStatus.ACTIVE
    )
    
    db.add(shop)
    db.commit()
    db.refresh(shop)
    
    return APIResponse(message="Shop created successfully", data={"id": shop.id})


@router.put("/{shop_id}")
def update_shop(
    shop_id: str,
    shop_data: ShopUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin", "shop_owner"]))
):
    """Update shop"""
    shop = db.query(MedicalShop).filter(MedicalShop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    update_data = shop_data.model_dump(exclude_unset=True)
    
    # Handle empty string as None (unassign)
    if "warehouse_id" in update_data and update_data["warehouse_id"] == "":
        update_data["warehouse_id"] = None
    
    # Verify warehouse exists if provided in update and not None
    if "warehouse_id" in update_data and update_data["warehouse_id"] is not None:
        warehouse = db.query(Warehouse).filter(Warehouse.id == update_data["warehouse_id"]).first()
        if not warehouse:
            raise HTTPException(status_code=400, detail="Warehouse not found")

    for field, value in update_data.items():
        setattr(shop, field, value)
    
    db.commit()
    db.refresh(shop)
    
    return APIResponse(message="Shop updated successfully")


@router.delete("/{shop_id}")
def delete_shop(
    shop_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Delete shop"""
    shop = db.query(MedicalShop).filter(MedicalShop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    # CASCADE DELETE LOGIC
    from app.db.models import ShopStock, User, Employee, Customer, Invoice, Return
    
    # 1. Delete all Returns linked to this shop (must be before Invoices due to FK)
    # Returns have a direct shop_id FK OR indirect via Invoice. 
    # Model check: Return has shop_id.
    db.query(Return).filter(Return.shop_id == shop_id).delete()

    # 2. Delete all Invoices linked to this shop
    # This will cascade delete InvoiceItems if configured, but let's trust the ORM or DB constraints
    db.query(Invoice).filter(Invoice.shop_id == shop_id).delete()
    
    # 3. Delete all Stock
    db.query(ShopStock).filter(ShopStock.shop_id == shop_id).delete()
    
    # 3.1 Delete Dispatches and Purchase Requests (Non-nullable FKs)
    from app.db.models import Dispatch, PurchaseRequest
    db.query(Dispatch).filter(Dispatch.shop_id == shop_id).delete()
    db.query(PurchaseRequest).filter(PurchaseRequest.shop_id == shop_id).delete()
    
    # 4. Unlink Users
    users = db.query(User).filter(User.assigned_shop_id == shop_id).all()
    for user in users:
        user.assigned_shop_id = None
        
    # 5. Unlink Employees
    employees = db.query(Employee).filter(Employee.shop_id == shop_id).all()
    for emp in employees:
        emp.shop_id = None
        
    # 6. Unlink Customers
    customers = db.query(Customer).filter(Customer.shop_id == shop_id).all()
    for cust in customers:
        cust.shop_id = None
        
    db.flush()
    
    db.delete(shop)
    db.commit()
    
    return APIResponse(message="Shop deleted successfully")
