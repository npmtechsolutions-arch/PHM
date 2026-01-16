"""
Warehouses API Routes - Database Connected
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.models.common import APIResponse
from app.models.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseResponse
from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.db.models import Warehouse, MedicalShop, WarehouseStatus, WarehouseStock, Rack

router = APIRouter()


@router.get("")
async def list_warehouses(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin"]))
):
    """List all warehouses with pagination"""
    query = db.query(Warehouse)
    
    if search:
        query = query.filter(
            (Warehouse.name.ilike(f"%{search}%")) |
            (Warehouse.code.ilike(f"%{search}%")) |
            (Warehouse.city.ilike(f"%{search}%"))
        )
    
    if status:
        query = query.filter(Warehouse.status == status)
    
    total = query.count()
    warehouses = query.offset((page - 1) * size).limit(size).all()
    
    # Add shop count for each warehouse
    items = []
    for wh in warehouses:
        shop_count = db.query(func.count(MedicalShop.id)).filter(MedicalShop.warehouse_id == wh.id).scalar()
        items.append({
            "id": wh.id,
            "name": wh.name,
            "code": wh.code,
            "address": wh.address,
            "city": wh.city,
            "state": wh.state,
            "country": wh.country,
            "pincode": wh.pincode,
            "phone": wh.phone,
            "email": wh.email,
            "status": wh.status.value if wh.status else "active",
            "capacity": wh.capacity,
            "created_at": wh.created_at,
            "shop_count": shop_count
        })
    
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/{warehouse_id}")
async def get_warehouse(
    warehouse_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin"]))
):
    """Get warehouse by ID"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    shop_count = db.query(func.count(MedicalShop.id)).filter(MedicalShop.warehouse_id == warehouse_id).scalar()
    
    return {
        "id": warehouse.id,
        "name": warehouse.name,
        "code": warehouse.code,
        "address": warehouse.address,
        "city": warehouse.city,
        "state": warehouse.state,
        "country": warehouse.country,
        "pincode": warehouse.pincode,
        "phone": warehouse.phone,
        "email": warehouse.email,
        "status": warehouse.status.value if warehouse.status else "active",
        "capacity": warehouse.capacity,
        "created_at": warehouse.created_at,
        "updated_at": warehouse.updated_at,
        "shop_count": shop_count
    }


@router.post("")
async def create_warehouse(
    warehouse_data: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin"]))
):
    """Create a new warehouse"""
    # Check if code already exists
    existing = db.query(Warehouse).filter(Warehouse.code == warehouse_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse code already exists")
    
    warehouse = Warehouse(
        name=warehouse_data.name,
        code=warehouse_data.code,
        address=warehouse_data.address,
        city=warehouse_data.city,
        state=warehouse_data.state,
        country=warehouse_data.country or "India",
        pincode=warehouse_data.pincode,
        phone=warehouse_data.phone,
        email=warehouse_data.email,
        capacity=warehouse_data.capacity,
        status=WarehouseStatus.ACTIVE
    )
    
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    
    return APIResponse(message="Warehouse created successfully", data={"id": warehouse.id})


@router.put("/{warehouse_id}")
async def update_warehouse(
    warehouse_id: str,
    warehouse_data: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "warehouse_admin"]))
):
    """Update warehouse"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    update_data = warehouse_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(warehouse, field, value)
    
    db.commit()
    db.refresh(warehouse)
    
    return APIResponse(message="Warehouse updated successfully")


@router.delete("/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Delete warehouse"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Check if warehouse has shops
    # CASCADE DELETE LOGIC
    # 1. Delete all stock associated with this warehouse
    db.query(WarehouseStock).filter(WarehouseStock.warehouse_id == warehouse_id).delete()
    
    # 1.2 Delete Racks
    db.query(Rack).filter(Rack.warehouse_id == warehouse_id).delete()
    
    # 1.1 Delete Dispatches and Purchase Requests (Non-nullable FKs)
    from app.db.models import Dispatch, PurchaseRequest, DispatchItem, PurchaseRequestItem
    
    # Needs to delete items first if cascade not set in DB
    # Deleting Dispatches
    db.query(Dispatch).filter(Dispatch.warehouse_id == warehouse_id).delete()
    
    # Deleting Purchase Requests
    db.query(PurchaseRequest).filter(PurchaseRequest.warehouse_id == warehouse_id).delete()
    
    # 2. Unlink all shops (set warehouse_id = null)
    shops = db.query(MedicalShop).filter(MedicalShop.warehouse_id == warehouse_id).all()
    for shop in shops:
        shop.warehouse_id = None
        
    # 3. Unlink all users (set assigned_warehouse_id = null)
    # Note: We need to import User model inside function or at top to avoid circular deps if any
    from app.db.models import User, Employee
    
    users = db.query(User).filter(User.assigned_warehouse_id == warehouse_id).all()
    for user in users:
        user.assigned_warehouse_id = None
        
    # 4. Unlink all employees
    employees = db.query(Employee).filter(Employee.warehouse_id == warehouse_id).all()
    for emp in employees:
        emp.warehouse_id = None
    
    db.flush() # Appply updates before deleting parent
    
    db.delete(warehouse)
    db.commit()
    
    return APIResponse(message="Warehouse deleted successfully")


@router.get("/{warehouse_id}/shops")
async def get_warehouse_shops(
    warehouse_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all shops linked to a warehouse"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    shops = db.query(MedicalShop).filter(MedicalShop.warehouse_id == warehouse_id).all()
    
    return {
        "warehouse_id": warehouse_id,
        "shops": [
            {
                "id": shop.id,
                "name": shop.name,
                "code": shop.code,
                "city": shop.city,
                "status": shop.status.value if shop.status else "active"
            }
            for shop in shops
        ]
    }
