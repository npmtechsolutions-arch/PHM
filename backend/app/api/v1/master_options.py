"""
Master Options API - Configurable option lists for dropdowns
Replaces hardcoded enums with database-driven options
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import MasterOption
from app.core.security import get_auth_context, require_permission, AuthContext

router = APIRouter(prefix="/master-options", tags=["Master Options"])


# ==================== SCHEMAS ====================

class MasterOptionBase(BaseModel):
    category: str
    code: str
    label: str
    description: Optional[str] = None
    display_order: int = 0
    color: Optional[str] = None
    icon: Optional[str] = None


class MasterOptionCreate(MasterOptionBase):
    pass


class MasterOptionUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class MasterOptionResponse(MasterOptionBase):
    id: str
    is_active: bool
    is_system: bool

    class Config:
        from_attributes = True


class MasterOptionListResponse(BaseModel):
    items: List[MasterOptionResponse]
    total: int


class CategoryListResponse(BaseModel):
    categories: List[str]


# ==================== ENDPOINTS ====================

@router.get("", response_model=MasterOptionListResponse)
def list_master_options(
    category: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all master options, optionally filtered by category.
    By default, only active options are returned.
    """
    query = db.query(MasterOption)
    
    if category:
        query = query.filter(MasterOption.category == category)
    
    if not include_inactive:
        query = query.filter(MasterOption.is_active == True)
    
    query = query.order_by(MasterOption.category, MasterOption.display_order, MasterOption.label)
    
    options = query.all()
    
    return MasterOptionListResponse(
        items=[MasterOptionResponse.model_validate(opt) for opt in options],
        total=len(options)
    )


@router.get("/categories", response_model=CategoryListResponse)
def list_categories(db: Session = Depends(get_db)):
    """List all unique option categories"""
    categories = db.query(MasterOption.category).distinct().order_by(MasterOption.category).all()
    return CategoryListResponse(categories=[c[0] for c in categories])


@router.get("/by-category/{category}", response_model=List[MasterOptionResponse])
def get_options_by_category(
    category: str,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """Get all options for a specific category (optimized endpoint for dropdowns)"""
    query = db.query(MasterOption).filter(MasterOption.category == category)
    
    if not include_inactive:
        query = query.filter(MasterOption.is_active == True)
    
    options = query.order_by(MasterOption.display_order, MasterOption.label).all()
    
    return [MasterOptionResponse.model_validate(opt) for opt in options]


@router.get("/{option_id}", response_model=MasterOptionResponse)
def get_master_option(option_id: str, db: Session = Depends(get_db)):
    """Get a single master option by ID"""
    option = db.query(MasterOption).filter(MasterOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    return MasterOptionResponse.model_validate(option)


@router.post("", response_model=MasterOptionResponse, dependencies=[Depends(require_permission(["settings.manage"]))])
def create_master_option(
    data: MasterOptionCreate,
    db: Session = Depends(get_db)
):
    """Create a new master option (requires settings.manage permission)"""
    # Check for duplicate
    existing = db.query(MasterOption).filter(
        MasterOption.category == data.category,
        MasterOption.code == data.code
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Option with code '{data.code}' already exists in category '{data.category}'")
    
    option = MasterOption(
        category=data.category,
        code=data.code,
        label=data.label,
        description=data.description,
        display_order=data.display_order,
        color=data.color,
        icon=data.icon,
        is_active=True,
        is_system=False
    )
    
    db.add(option)
    db.commit()
    db.refresh(option)
    
    return MasterOptionResponse.model_validate(option)


@router.put("/{option_id}", response_model=MasterOptionResponse, dependencies=[Depends(require_permission(["settings.manage"]))])
def update_master_option(
    option_id: str,
    data: MasterOptionUpdate,
    db: Session = Depends(get_db)
):
    """Update a master option (requires settings.manage permission)"""
    option = db.query(MasterOption).filter(MasterOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    
    # System options can only have limited fields updated
    if option.is_system:
        if data.label is not None:
            option.label = data.label
        if data.description is not None:
            option.description = data.description
        if data.display_order is not None:
            option.display_order = data.display_order
        if data.color is not None:
            option.color = data.color
        if data.icon is not None:
            option.icon = data.icon
        # Cannot deactivate system options
    else:
        if data.label is not None:
            option.label = data.label
        if data.description is not None:
            option.description = data.description
        if data.display_order is not None:
            option.display_order = data.display_order
        if data.color is not None:
            option.color = data.color
        if data.icon is not None:
            option.icon = data.icon
        if data.is_active is not None:
            option.is_active = data.is_active
    
    db.commit()
    db.refresh(option)
    
    return MasterOptionResponse.model_validate(option)


@router.delete("/{option_id}", dependencies=[Depends(require_permission(["settings.manage"]))])
def delete_master_option(option_id: str, db: Session = Depends(get_db)):
    """Delete a master option (requires settings.manage permission). System options cannot be deleted."""
    option = db.query(MasterOption).filter(MasterOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    
    if option.is_system:
        raise HTTPException(status_code=403, detail="System options cannot be deleted")
    
    db.delete(option)
    db.commit()
    
    return {"message": "Option deleted successfully"}
