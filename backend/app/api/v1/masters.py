"""
Masters API Routes - Categories, Units, HSN codes
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    MedicineCategory, UnitMaster, HSNMaster, GSTSlabMaster, MedicineTypeMaster, 
    BrandMaster, ManufacturerMaster, PaymentMethodMaster, SupplierMaster, AdjustmentReasonMaster
)
from app.api.v1.auth import get_current_user
from app.core.security import require_permission, AuthContext

router = APIRouter()


# ==================== CATEGORY SCHEMAS ====================

class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    is_active: Optional[bool] = None


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


class UnitUpdate(UnitBase):
    is_active: Optional[bool] = None


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


class HSNUpdate(HSNBase):
    is_active: Optional[bool] = None


class HSNResponse(HSNBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== CATEGORY ENDPOINTS ====================

@router.get("/categories")
def list_categories(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["categories.view"]))
):
    """List all medicine categories with pagination"""
    query = db.query(MedicineCategory)
    if is_active is not None:
        query = query.filter(MedicineCategory.is_active == is_active)
    if search:
        query = query.filter(MedicineCategory.name.ilike(f"%{search}%"))
    
    total = query.count()
    items = query.order_by(MedicineCategory.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/categories", response_model=CategoryResponse)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["categories.create"]))
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
def update_category(
    category_id: str,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["categories.update", "categories.edit"]))
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
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["categories.delete"]))
):
    """Soft delete a category"""
    category = db.query(MedicineCategory).filter(MedicineCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category.is_active = False
    db.commit()
    return {"message": "Category deleted"}


# ==================== UNIT ENDPOINTS ====================

@router.get("/units")
def list_units(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["units.view"]))
):
    """List all units of measurement with pagination"""
    query = db.query(UnitMaster)
    if is_active is not None:
        query = query.filter(UnitMaster.is_active == is_active)
    if search:
        query = query.filter(UnitMaster.name.ilike(f"%{search}%"))
    
    total = query.count()
    items = query.order_by(UnitMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/units", response_model=UnitResponse)
def create_unit(
    data: UnitCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["units.create"]))
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
def update_unit(
    unit_id: str,
    data: UnitUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["units.update", "units.edit"]))
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
def delete_unit(
    unit_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["units.delete"]))
):
    """Soft delete a unit"""
    unit = db.query(UnitMaster).filter(UnitMaster.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    unit.is_active = False
    db.commit()
    return {"message": "Unit deleted"}


# ==================== HSN ENDPOINTS ====================

@router.get("/hsn")
def list_hsn_codes(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["hsn.view"]))
):
    """List all HSN codes with pagination"""
    query = db.query(HSNMaster)
    if is_active is not None:
        query = query.filter(HSNMaster.is_active == is_active)
    if search:
        query = query.filter(
            (HSNMaster.hsn_code.ilike(f"%{search}%")) | 
            (HSNMaster.description.ilike(f"%{search}%"))
        )
    
    total = query.count()
    items = query.order_by(HSNMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/hsn", response_model=HSNResponse)
def create_hsn_code(
    data: HSNCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["hsn.create"]))
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
def update_hsn_code(
    hsn_id: str,
    data: HSNUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["hsn.update", "hsn.edit"]))
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
def delete_hsn_code(
    hsn_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["hsn.delete"]))
):
    """Soft delete an HSN code"""
    hsn = db.query(HSNMaster).filter(HSNMaster.id == hsn_id).first()
    if not hsn:
        raise HTTPException(status_code=404, detail="HSN code not found")
    
    hsn.is_active = False
    db.commit()
    return {"message": "HSN code deleted"}


# ==================== GST SLAB SCHEMAS ====================

class GSTSlabBase(BaseModel):
    rate: float = Field(ge=0, le=100)
    description: Optional[str] = None


class GSTSlabCreate(GSTSlabBase):
    pass


class GSTSlabUpdate(GSTSlabBase):
    is_active: Optional[bool] = None


class GSTSlabResponse(GSTSlabBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== GST SLAB ENDPOINTS ====================

@router.get("/gst-slabs")
def list_gst_slabs(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["gst.view"]))
):
    """List all GST slabs with pagination"""
    query = db.query(GSTSlabMaster)
    if is_active is not None:
        query = query.filter(GSTSlabMaster.is_active == is_active)
    
    total = query.count()
    items = query.order_by(GSTSlabMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/gst-slabs", response_model=GSTSlabResponse)
def create_gst_slab(
    data: GSTSlabCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["gst.create"]))
):
    """Create a new GST slab"""
    existing = db.query(GSTSlabMaster).filter(GSTSlabMaster.rate == data.rate).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"GST slab with rate {data.rate}% already exists")
    
    # Calculate CGST, SGST, IGST from total rate
    slab = GSTSlabMaster(
        rate=data.rate,
        description=data.description,
        cgst_rate=data.rate / 2,
        sgst_rate=data.rate / 2,
        igst_rate=data.rate
    )
    db.add(slab)
    db.commit()
    db.refresh(slab)
    return slab


@router.put("/gst-slabs/{slab_id}", response_model=GSTSlabResponse)
def update_gst_slab(
    slab_id: str,
    data: GSTSlabUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["gst.update", "gst.edit"]))
):
    """Update a GST slab"""
    slab = db.query(GSTSlabMaster).filter(GSTSlabMaster.id == slab_id).first()
    if not slab:
        raise HTTPException(status_code=404, detail="GST slab not found")
    
    # Check if new rate conflicts with existing
    if data.rate != slab.rate:
        existing = db.query(GSTSlabMaster).filter(
            GSTSlabMaster.rate == data.rate,
            GSTSlabMaster.id != slab_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"GST slab with rate {data.rate}% already exists")
    
    # Update fields and recalculate derived rates
    slab.rate = data.rate
    slab.description = data.description
    slab.cgst_rate = data.rate / 2
    slab.sgst_rate = data.rate / 2
    slab.igst_rate = data.rate
    
    db.commit()
    db.refresh(slab)
    return slab


@router.delete("/gst-slabs/{slab_id}")
def delete_gst_slab(
    slab_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["gst.delete"]))
):
    """Soft delete a GST slab"""
    slab = db.query(GSTSlabMaster).filter(GSTSlabMaster.id == slab_id).first()
    if not slab:
        raise HTTPException(status_code=404, detail="GST slab not found")
    
    # Check if slab is in use by any HSN code
    # (In production, you'd check if any HSN codes reference this slab)
    
    slab.is_active = False
    db.commit()
    return {"message": "GST slab deleted"}


# ==================== MEDICINE TYPE SCHEMAS ====================

class MedicineTypeBase(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=50)
    description: Optional[str] = None
    sort_order: int = 0


class MedicineTypeCreate(MedicineTypeBase):
    pass


class MedicineTypeUpdate(MedicineTypeBase):
    is_active: Optional[bool] = None


class MedicineTypeResponse(MedicineTypeBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== MEDICINE TYPE ENDPOINTS ====================

@router.get("/medicine-types")
def list_medicine_types(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["medicine_types.view"]))
):
    """List all medicine types with pagination"""
    query = db.query(MedicineTypeMaster)
    if is_active is not None:
        query = query.filter(MedicineTypeMaster.is_active == is_active)
    if search:
        query = query.filter(MedicineTypeMaster.name.ilike(f"%{search}%"))
    
    total = query.count()
    items = query.order_by(MedicineTypeMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/medicine-types", response_model=MedicineTypeResponse)
def create_medicine_type(
    data: MedicineTypeCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["medicine_types.create"]))
):
    """Create a new medicine type"""
    existing = db.query(MedicineTypeMaster).filter(MedicineTypeMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Medicine type code already exists")
    
    medicine_type = MedicineTypeMaster(**data.dict())
    db.add(medicine_type)
    db.commit()
    db.refresh(medicine_type)
    return medicine_type


@router.put("/medicine-types/{type_id}", response_model=MedicineTypeResponse)
def update_medicine_type(
    type_id: str,
    data: MedicineTypeUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["medicine_types.update", "medicine_types.edit"]))
):
    """Update a medicine type"""
    medicine_type = db.query(MedicineTypeMaster).filter(MedicineTypeMaster.id == type_id).first()
    if not medicine_type:
        raise HTTPException(status_code=404, detail="Medicine type not found")
    
    # Check for duplicate code if changing
    if data.code != medicine_type.code:
        existing = db.query(MedicineTypeMaster).filter(
            MedicineTypeMaster.code == data.code,
            MedicineTypeMaster.id != type_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Medicine type code already exists")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(medicine_type, key, value)
    
    db.commit()
    db.refresh(medicine_type)
    return medicine_type


@router.delete("/medicine-types/{type_id}")
def delete_medicine_type(
    type_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["medicine_types.delete"]))
):
    """Soft delete a medicine type"""
    medicine_type = db.query(MedicineTypeMaster).filter(MedicineTypeMaster.id == type_id).first()
    if not medicine_type:
        raise HTTPException(status_code=404, detail="Medicine type not found")
    
    medicine_type.is_active = False
    db.commit()
    return {"message": "Medicine type deleted"}


# ==================== BRAND SCHEMAS ====================

class BrandBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    sort_order: int = 0


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BrandBase):
    is_active: Optional[bool] = None


class BrandResponse(BrandBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== BRAND ENDPOINTS ====================

@router.get("/brands")
def list_brands(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["brands.view"]))
):
    """List all brands with pagination"""
    query = db.query(BrandMaster)
    if is_active is not None:
        query = query.filter(BrandMaster.is_active == is_active)
    if search:
        query = query.filter(BrandMaster.name.ilike(f"%{search}%"))
    
    total = query.count()
    items = query.order_by(BrandMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/brands", response_model=BrandResponse)
def create_brand(
    data: BrandCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["brands.create"]))
):
    """Create a new brand"""
    existing = db.query(BrandMaster).filter(BrandMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Brand code already exists")
    
    brand = BrandMaster(**data.dict())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.put("/brands/{brand_id}", response_model=BrandResponse)
def update_brand(
    brand_id: str,
    data: BrandUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["brands.update", "brands.edit"]))
):
    """Update a brand"""
    brand = db.query(BrandMaster).filter(BrandMaster.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Check for duplicate code if changing
    if data.code != brand.code:
        existing = db.query(BrandMaster).filter(
            BrandMaster.code == data.code,
            BrandMaster.id != brand_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Brand code already exists")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(brand, key, value)
    
    db.commit()
    db.refresh(brand)
    return brand


@router.delete("/brands/{brand_id}")
def delete_brand(
    brand_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["brands.delete"]))
):
    """Soft delete a brand"""
    brand = db.query(BrandMaster).filter(BrandMaster.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    brand.is_active = False
    db.commit()
    return {"message": "Brand deleted"}


# ==================== MANUFACTURER SCHEMAS ====================

class ManufacturerBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    sort_order: int = 0


class ManufacturerCreate(ManufacturerBase):
    pass


class ManufacturerUpdate(ManufacturerBase):
    is_active: Optional[bool] = None


class ManufacturerResponse(ManufacturerBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== MANUFACTURER ENDPOINTS ====================

@router.get("/manufacturers")
def list_manufacturers(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["manufacturers.view"]))
):
    """List all manufacturers with pagination"""
    query = db.query(ManufacturerMaster)
    if is_active is not None:
        query = query.filter(ManufacturerMaster.is_active == is_active)
    if search:
        query = query.filter(ManufacturerMaster.name.ilike(f"%{search}%"))
    
    total = query.count()
    items = query.order_by(ManufacturerMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/manufacturers", response_model=ManufacturerResponse)
def create_manufacturer(
    data: ManufacturerCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["manufacturers.create"]))
):
    """Create a new manufacturer"""
    existing = db.query(ManufacturerMaster).filter(ManufacturerMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Manufacturer code already exists")
    
    manufacturer = ManufacturerMaster(**data.dict())
    db.add(manufacturer)
    db.commit()
    db.refresh(manufacturer)
    return manufacturer


@router.put("/manufacturers/{manufacturer_id}", response_model=ManufacturerResponse)
def update_manufacturer(
    manufacturer_id: str,
    data: ManufacturerUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["manufacturers.update", "manufacturers.edit"]))
):
    """Update a manufacturer"""
    manufacturer = db.query(ManufacturerMaster).filter(ManufacturerMaster.id == manufacturer_id).first()
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    
    # Check for duplicate code if changing
    if data.code != manufacturer.code:
        existing = db.query(ManufacturerMaster).filter(
            ManufacturerMaster.code == data.code,
            ManufacturerMaster.id != manufacturer_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Manufacturer code already exists")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(manufacturer, key, value)
    
    db.commit()
    db.refresh(manufacturer)
    return manufacturer


@router.delete("/manufacturers/{manufacturer_id}")
def delete_manufacturer(
    manufacturer_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["manufacturers.delete"]))
):
    """Soft delete a manufacturer"""
    manufacturer = db.query(ManufacturerMaster).filter(ManufacturerMaster.id == manufacturer_id).first()
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    
    manufacturer.is_active = False
    db.commit()
    return {"message": "Manufacturer deleted"}


# ==================== PAYMENT METHOD SCHEMAS ====================

class PaymentMethodBase(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=50)
    icon: Optional[str] = None
    sort_order: int = 0


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodResponse(PaymentMethodBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== PAYMENT METHOD ENDPOINTS ====================

@router.get("/payment-methods")
def list_payment_methods(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["payment_methods.view"]))
):
    """List all payment methods with pagination"""
    query = db.query(PaymentMethodMaster)
    if is_active is not None:
        query = query.filter(PaymentMethodMaster.is_active == is_active)
    if search:
        query = query.filter(PaymentMethodMaster.name.ilike(f"%{search}%"))
    
    total = query.count()
    items = query.order_by(PaymentMethodMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/payment-methods", response_model=PaymentMethodResponse)
def create_payment_method(
    data: PaymentMethodCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["payment_methods.create"]))
):
    """Create a new payment method"""
    existing = db.query(PaymentMethodMaster).filter(PaymentMethodMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment method code already exists")
    
    payment_method = PaymentMethodMaster(**data.dict())
    db.add(payment_method)
    db.commit()
    db.refresh(payment_method)
    return payment_method


@router.put("/payment-methods/{method_id}", response_model=PaymentMethodResponse)
def update_payment_method(
    method_id: str,
    data: PaymentMethodBase,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["payment_methods.update", "payment_methods.edit"]))
):
    """Update a payment method"""
    payment_method = db.query(PaymentMethodMaster).filter(PaymentMethodMaster.id == method_id).first()
    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    if data.code != payment_method.code:
        existing = db.query(PaymentMethodMaster).filter(
            PaymentMethodMaster.code == data.code,
            PaymentMethodMaster.id != method_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Payment method code already exists")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(payment_method, key, value)
    
    db.commit()
    db.refresh(payment_method)
    return payment_method


@router.delete("/payment-methods/{method_id}")
def delete_payment_method(
    method_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["payment_methods.delete"]))
):
    """Soft delete a payment method"""
    payment_method = db.query(PaymentMethodMaster).filter(PaymentMethodMaster.id == method_id).first()
    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    payment_method.is_active = False
    db.commit()
    return {"message": "Payment method deleted"}


# ==================== SUPPLIER SCHEMAS ====================

class SupplierBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    drug_license: Optional[str] = None
    credit_days: int = 0
    sort_order: int = 0


class SupplierCreate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== SUPPLIER ENDPOINTS ====================

@router.get("/suppliers")
def list_suppliers(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["suppliers.view"]))
):
    """List all suppliers with pagination"""
    query = db.query(SupplierMaster)
    if is_active is not None:
        query = query.filter(SupplierMaster.is_active == is_active)
    if search:
        query = query.filter(
            (SupplierMaster.name.ilike(f"%{search}%")) |
            (SupplierMaster.code.ilike(f"%{search}%"))
        )
    
    total = query.count()
    items = query.order_by(SupplierMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["suppliers.create"]))
):
    """Create a new supplier"""
    existing = db.query(SupplierMaster).filter(SupplierMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier code already exists")
    
    supplier = SupplierMaster(**data.dict())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: str,
    data: SupplierBase,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["suppliers.update", "suppliers.edit"]))
):
    """Update a supplier"""
    supplier = db.query(SupplierMaster).filter(SupplierMaster.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    if data.code != supplier.code:
        existing = db.query(SupplierMaster).filter(
            SupplierMaster.code == data.code,
            SupplierMaster.id != supplier_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Supplier code already exists")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(supplier, key, value)
    
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["suppliers.delete"]))
):
    """Soft delete a supplier"""
    supplier = db.query(SupplierMaster).filter(SupplierMaster.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    supplier.is_active = False
    db.commit()
    return {"message": "Supplier deleted"}


# ==================== ADJUSTMENT REASON SCHEMAS ====================

class AdjustmentReasonBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    adjustment_type: str = Field(min_length=1, max_length=20)  # "increase" or "decrease"
    description: Optional[str] = None
    sort_order: int = 0


class AdjustmentReasonCreate(AdjustmentReasonBase):
    pass


class AdjustmentReasonResponse(AdjustmentReasonBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== ADJUSTMENT REASON ENDPOINTS ====================

@router.get("/adjustment-reasons")
def list_adjustment_reasons(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    adjustment_type: Optional[str] = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["adjustment_reasons.view"]))
):
    """List all adjustment reasons with pagination"""
    query = db.query(AdjustmentReasonMaster)
    if is_active is not None:
        query = query.filter(AdjustmentReasonMaster.is_active == is_active)
    if adjustment_type:
        query = query.filter(AdjustmentReasonMaster.adjustment_type == adjustment_type)
    if search:
        query = query.filter(AdjustmentReasonMaster.name.ilike(f"%{search}%"))
    
    total = query.count()
    items = query.order_by(AdjustmentReasonMaster.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if size > 0 else 0
    }


@router.post("/adjustment-reasons", response_model=AdjustmentReasonResponse)
def create_adjustment_reason(
    data: AdjustmentReasonCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["adjustment_reasons.create"]))
):
    """Create a new adjustment reason"""
    # Validate adjustment_type
    if data.adjustment_type not in ["increase", "decrease"]:
        raise HTTPException(status_code=400, detail="adjustment_type must be 'increase' or 'decrease'")
    
    existing = db.query(AdjustmentReasonMaster).filter(AdjustmentReasonMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Adjustment reason code already exists")
    
    reason = AdjustmentReasonMaster(**data.dict())
    db.add(reason)
    db.commit()
    db.refresh(reason)
    return reason


@router.put("/adjustment-reasons/{reason_id}", response_model=AdjustmentReasonResponse)
def update_adjustment_reason(
    reason_id: str,
    data: AdjustmentReasonBase,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["adjustment_reasons.update", "adjustment_reasons.edit"]))
):
    """Update an adjustment reason"""
    if data.adjustment_type not in ["increase", "decrease"]:
        raise HTTPException(status_code=400, detail="adjustment_type must be 'increase' or 'decrease'")
    
    reason = db.query(AdjustmentReasonMaster).filter(AdjustmentReasonMaster.id == reason_id).first()
    if not reason:
        raise HTTPException(status_code=404, detail="Adjustment reason not found")
    
    if data.code != reason.code:
        existing = db.query(AdjustmentReasonMaster).filter(
            AdjustmentReasonMaster.code == data.code,
            AdjustmentReasonMaster.id != reason_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Adjustment reason code already exists")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(reason, key, value)
    
    db.commit()
    db.refresh(reason)
    return reason


@router.delete("/adjustment-reasons/{reason_id}")
def delete_adjustment_reason(
    reason_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["adjustment_reasons.delete"]))
):
    """Soft delete an adjustment reason"""
    reason = db.query(AdjustmentReasonMaster).filter(AdjustmentReasonMaster.id == reason_id).first()
    if not reason:
        raise HTTPException(status_code=404, detail="Adjustment reason not found")
    
    reason.is_active = False
    db.commit()
    return {"message": "Adjustment reason deleted"}
