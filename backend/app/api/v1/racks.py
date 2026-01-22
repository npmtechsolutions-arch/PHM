"""
Rack Master API Routes
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Rack, Warehouse, MedicalShop
from app.api.v1.auth import get_current_user
from app.core.security import require_permission, AuthContext

router = APIRouter()


# ==================== SCHEMAS ====================

class RackBase(BaseModel):
    rack_name: str = Field(min_length=1, max_length=100)
    rack_number: str = Field(min_length=1, max_length=50)
    description: Optional[str] = None
    warehouse_id: Optional[str] = None
    shop_id: Optional[str] = None
    floor: Optional[str] = None
    section: Optional[str] = None
    capacity: Optional[int] = None


class RackCreate(RackBase):
    pass


class RackUpdate(BaseModel):
    rack_name: Optional[str] = None
    description: Optional[str] = None
    floor: Optional[str] = None
    section: Optional[str] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None


class RackResponse(RackBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    warehouse_name: Optional[str] = None
    shop_name: Optional[str] = None

    class Config:
        from_attributes = True


class RackListResponse(BaseModel):
    items: List[RackResponse]
    total: int
    page: int
    size: int


# ==================== ENDPOINTS ====================

@router.get("", response_model=RackListResponse)
def list_racks(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    shop_id: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["racks.view"]))
):
    """List all racks with pagination and filters"""
    query = db.query(Rack)
    
    if is_active is not None:
        query = query.filter(Rack.is_active == is_active)
    
    if warehouse_id:
        query = query.filter(Rack.warehouse_id == warehouse_id)
    
    if shop_id:
        query = query.filter(Rack.shop_id == shop_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Rack.rack_name.ilike(search_term)) |
            (Rack.rack_number.ilike(search_term))
        )
    
    total = query.count()
    skip = (page - 1) * size
    racks = query.order_by(Rack.created_at.desc()).offset(skip).limit(size).all()
    
    # Enrich with location names
    items = []
    for rack in racks:
        rack_dict = {
            "id": rack.id,
            "rack_name": rack.rack_name,
            "rack_number": rack.rack_number,
            "description": rack.description,
            "warehouse_id": rack.warehouse_id,
            "shop_id": rack.shop_id,
            "floor": rack.floor,
            "section": rack.section,
            "capacity": rack.capacity,
            "is_active": rack.is_active,
            "created_at": rack.created_at,
            "updated_at": rack.updated_at,
            "warehouse_name": None,
            "shop_name": None
        }
        
        if rack.warehouse_id:
            warehouse = db.query(Warehouse).filter(Warehouse.id == rack.warehouse_id).first()
            if warehouse:
                rack_dict["warehouse_name"] = warehouse.name
        
        if rack.shop_id:
            shop = db.query(MedicalShop).filter(MedicalShop.id == rack.shop_id).first()
            if shop:
                rack_dict["shop_name"] = shop.name
        
        items.append(RackResponse(**rack_dict))
    
    return RackListResponse(items=items, total=total, page=page, size=size)


@router.get("/{rack_id}", response_model=RackResponse)
def get_rack(
    rack_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["racks.view"]))
):
    """Get a single rack by ID"""
    rack = db.query(Rack).filter(Rack.id == rack_id).first()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")
    
    rack_dict = {
        "id": rack.id,
        "rack_name": rack.rack_name,
        "rack_number": rack.rack_number,
        "description": rack.description,
        "warehouse_id": rack.warehouse_id,
        "shop_id": rack.shop_id,
        "floor": rack.floor,
        "section": rack.section,
        "capacity": rack.capacity,
        "is_active": rack.is_active,
        "created_at": rack.created_at,
        "updated_at": rack.updated_at,
        "warehouse_name": None,
        "shop_name": None
    }
    
    if rack.warehouse_id:
        warehouse = db.query(Warehouse).filter(Warehouse.id == rack.warehouse_id).first()
        if warehouse:
            rack_dict["warehouse_name"] = warehouse.name
    
    if rack.shop_id:
        shop = db.query(MedicalShop).filter(MedicalShop.id == rack.shop_id).first()
        if shop:
            rack_dict["shop_name"] = shop.name
    
    return RackResponse(**rack_dict)


@router.post("", response_model=RackResponse)
def create_rack(
    rack_data: RackCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["racks.create"]))
):
    """Create a new rack"""
    # Check for duplicate rack number
    existing = db.query(Rack).filter(Rack.rack_number == rack_data.rack_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rack number already exists")
    
    # Validate warehouse/shop if provided
    if rack_data.warehouse_id:
        warehouse = db.query(Warehouse).filter(Warehouse.id == rack_data.warehouse_id).first()
        if not warehouse:
            raise HTTPException(status_code=400, detail="Warehouse not found")
    
    if rack_data.shop_id:
        shop = db.query(MedicalShop).filter(MedicalShop.id == rack_data.shop_id).first()
        if not shop:
            raise HTTPException(status_code=400, detail="Shop not found")
    
    rack = Rack(
        rack_name=rack_data.rack_name,
        rack_number=rack_data.rack_number.upper(),
        description=rack_data.description,
        warehouse_id=rack_data.warehouse_id,
        shop_id=rack_data.shop_id,
        floor=rack_data.floor,
        section=rack_data.section,
        capacity=rack_data.capacity
    )
    
    db.add(rack)
    db.commit()
    db.refresh(rack)
    
    rack_dict = {
        "id": rack.id,
        "rack_name": rack.rack_name,
        "rack_number": rack.rack_number,
        "description": rack.description,
        "warehouse_id": rack.warehouse_id,
        "shop_id": rack.shop_id,
        "floor": rack.floor,
        "section": rack.section,
        "capacity": rack.capacity,
        "is_active": rack.is_active,
        "created_at": rack.created_at,
        "updated_at": rack.updated_at,
        "warehouse_name": None,
        "shop_name": None
    }
    
    return RackResponse(**rack_dict)


@router.put("/{rack_id}", response_model=RackResponse)
def update_rack(
    rack_id: str,
    rack_data: RackUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["racks.update", "racks.edit"]))
):
    """Update a rack"""
    rack = db.query(Rack).filter(Rack.id == rack_id).first()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")
    
    update_data = rack_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rack, key, value)
    
    db.commit()
    db.refresh(rack)
    
    rack_dict = {
        "id": rack.id,
        "rack_name": rack.rack_name,
        "rack_number": rack.rack_number,
        "description": rack.description,
        "warehouse_id": rack.warehouse_id,
        "shop_id": rack.shop_id,
        "floor": rack.floor,
        "section": rack.section,
        "capacity": rack.capacity,
        "is_active": rack.is_active,
        "created_at": rack.created_at,
        "updated_at": rack.updated_at,
        "warehouse_name": None,
        "shop_name": None
    }
    
    return RackResponse(**rack_dict)


@router.delete("/{rack_id}")
def delete_rack(
    rack_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["racks.delete"]))
):
    """Delete a rack (soft delete by setting is_active=False)"""
    rack = db.query(Rack).filter(Rack.id == rack_id).first()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")
    
    rack.is_active = False
    db.commit()
    
    return {"message": "Rack deleted successfully"}
