"""
Masters API Routes - Categories, Units, HSN codes
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import MedicineCategory, UnitMaster, HSNMaster, GSTSlabMaster
from app.api.v1.auth import get_current_user

router = APIRouter()


# ==================== CATEGORY SCHEMAS ====================

class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== UNIT SCHEMAS ====================

class UnitBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    short_name: str = Field(min_length=1, max_length=10)
    description: Optional[str] = None


class UnitCreate(UnitBase):
    pass


class UnitResponse(UnitBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== HSN SCHEMAS ====================

class HSNBase(BaseModel):
    hsn_code: str = Field(min_length=1, max_length=20)
    description: str
    gst_rate: float = 12.0
    cgst_rate: float = 6.0
    sgst_rate: float = 6.0
    igst_rate: float = 12.0


class HSNCreate(HSNBase):
    pass


class HSNResponse(HSNBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== CATEGORY ENDPOINTS ====================

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all medicine categories"""
    query = db.query(MedicineCategory)
    if is_active is not None:
        query = query.filter(MedicineCategory.is_active == is_active)
    return query.order_by(MedicineCategory.name).all()


@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new category"""
    existing = db.query(MedicineCategory).filter(MedicineCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category = MedicineCategory(**data.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a category"""
    category = db.query(MedicineCategory).filter(MedicineCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Soft delete a category"""
    category = db.query(MedicineCategory).filter(MedicineCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category.is_active = False
    db.commit()
    return {"message": "Category deleted"}


# ==================== UNIT ENDPOINTS ====================

@router.get("/units", response_model=List[UnitResponse])
async def list_units(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all units of measurement"""
    query = db.query(UnitMaster)
    if is_active is not None:
        query = query.filter(UnitMaster.is_active == is_active)
    return query.order_by(UnitMaster.name).all()


@router.post("/units", response_model=UnitResponse)
async def create_unit(
    data: UnitCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new unit"""
    existing = db.query(UnitMaster).filter(UnitMaster.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Unit already exists")
    
    unit = UnitMaster(**data.dict())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.put("/units/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: str,
    data: UnitBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a unit"""
    unit = db.query(UnitMaster).filter(UnitMaster.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(unit, key, value)
    
    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/units/{unit_id}")
async def delete_unit(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Soft delete a unit"""
    unit = db.query(UnitMaster).filter(UnitMaster.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    unit.is_active = False
    db.commit()
    return {"message": "Unit deleted"}


# ==================== HSN ENDPOINTS ====================

@router.get("/hsn", response_model=List[HSNResponse])
async def list_hsn_codes(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all HSN codes"""
    query = db.query(HSNMaster)
    if is_active is not None:
        query = query.filter(HSNMaster.is_active == is_active)
    return query.order_by(HSNMaster.hsn_code).all()


@router.post("/hsn", response_model=HSNResponse)
async def create_hsn_code(
    data: HSNCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new HSN code"""
    existing = db.query(HSNMaster).filter(HSNMaster.hsn_code == data.hsn_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="HSN code already exists")
    
    hsn = HSNMaster(**data.dict())
    db.add(hsn)
    db.commit()
    db.refresh(hsn)
    return hsn


@router.put("/hsn/{hsn_id}", response_model=HSNResponse)
async def update_hsn_code(
    hsn_id: str,
    data: HSNBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an HSN code"""
    hsn = db.query(HSNMaster).filter(HSNMaster.id == hsn_id).first()
    if not hsn:
        raise HTTPException(status_code=404, detail="HSN code not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(hsn, key, value)
    
    db.commit()
    db.refresh(hsn)
    return hsn


@router.delete("/hsn/{hsn_id}")
async def delete_hsn_code(
    hsn_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Soft delete an HSN code"""
    hsn = db.query(HSNMaster).filter(HSNMaster.id == hsn_id).first()
    if not hsn:
        raise HTTPException(status_code=404, detail="HSN code not found")
    
    hsn.is_active = False
    db.commit()
    return {"message": "HSN code deleted"}
