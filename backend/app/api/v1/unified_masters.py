"""
Unified Masters API - Single Source of Truth endpoints
All master data is loaded from here - no hardcoding allowed in frontend.
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    MedicineCategory, UnitMaster, HSNMaster, Rack, Role, Warehouse, MedicalShop,
    PaymentMethodMaster, ShopTypeMaster, CustomerTypeMaster, MedicineTypeMaster,
    GSTSlabMaster, GenderMaster, EmploymentTypeMaster, UrgencyMaster,
    StatusMaster, DesignationMaster, DepartmentMaster, BrandMaster, ManufacturerMaster,
    SupplierMaster, AdjustmentReasonMaster
)
from app.api.v1.auth import get_current_user
from app.core.security import require_permission, AuthContext

router = APIRouter()


# ==================== RESPONSE SCHEMAS ====================

class MasterItemResponse(BaseModel):
    id: str
    code: str
    name: str
    is_active: bool
    sort_order: Optional[int] = 0

    class Config:
        from_attributes = True


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class UnitResponse(BaseModel):
    id: str
    name: str
    short_name: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class HSNResponse(BaseModel):
    id: str
    hsn_code: str
    description: str
    gst_rate: float
    cgst_rate: float
    sgst_rate: float
    igst_rate: float
    is_active: bool

    class Config:
        from_attributes = True


class GSTSlabResponse(BaseModel):
    id: str
    rate: float
    cgst_rate: float
    sgst_rate: float
    igst_rate: float
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class PaymentMethodResponse(BaseModel):
    id: str
    code: str
    name: str
    icon: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class ShopTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class CustomerTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    discount_percent: float
    credit_limit: float
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class MedicineTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class GenderResponse(BaseModel):
    id: str
    code: str
    name: str
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class EmploymentTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class UrgencyResponse(BaseModel):
    id: str
    code: str
    name: str
    color: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class StatusResponse(BaseModel):
    id: str
    entity_type: str
    code: str
    name: str
    color: Optional[str] = None
    is_terminal: bool
    is_default: bool
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class DesignationResponse(BaseModel):
    id: str
    code: str
    name: str
    level: int
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class DepartmentResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    entity_type: Optional[str] = None
    is_system: bool
    is_creatable: bool

    class Config:
        from_attributes = True


class WarehouseMinimalResponse(BaseModel):
    id: str
    name: str
    code: str
    status: str

    class Config:
        from_attributes = True


class ShopMinimalResponse(BaseModel):
    id: str
    name: str
    code: str
    status: str
    warehouse_id: Optional[str] = None

    class Config:
        from_attributes = True


class RackMinimalResponse(BaseModel):
    id: str
    rack_name: str
    rack_number: str
    warehouse_id: Optional[str] = None
    shop_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class BrandResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool
    sort_order: Optional[int] = 0

    class Config:
        from_attributes = True


class ManufacturerResponse(BaseModel):
    id: str
    code: str
    name: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: bool
    sort_order: Optional[int] = 0

    class Config:
        from_attributes = True


class SupplierResponse(BaseModel):
    id: str
    code: str
    name: str
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
    is_active: bool
    sort_order: Optional[int] = 0

    class Config:
        from_attributes = True


class AdjustmentReasonResponse(BaseModel):
    id: str
    code: str
    name: str
    adjustment_type: str
    description: Optional[str] = None
    is_active: bool
    sort_order: Optional[int] = 0

    class Config:
        from_attributes = True


class AllMastersResponse(BaseModel):
    """Complete master data for frontend caching"""
    categories: List[CategoryResponse]
    units: List[UnitResponse]
    hsn_codes: List[HSNResponse]
    medicine_types: List[MedicineTypeResponse]
    payment_methods: List[PaymentMethodResponse]
    shop_types: List[ShopTypeResponse]
    customer_types: List[CustomerTypeResponse]
    gst_slabs: List[GSTSlabResponse]
    genders: List[GenderResponse]
    employment_types: List[EmploymentTypeResponse]
    urgency_levels: List[UrgencyResponse]
    statuses: List[StatusResponse]
    designations: List[DesignationResponse]
    departments: List[DepartmentResponse]
    roles: List[RoleResponse]
    warehouses: List[WarehouseMinimalResponse]
    shops: List[ShopMinimalResponse]
    racks: List[RackMinimalResponse]
    brands: List[BrandResponse]
    manufacturers: List[ManufacturerResponse]
    suppliers: List[SupplierResponse]
    adjustment_reasons: List[AdjustmentReasonResponse]


# ==================== MAIN ENDPOINT ====================

@router.get("/all", response_model=AllMastersResponse, summary="Get all master data")
def get_all_masters(
    include_inactive: bool = Query(False, description="Include inactive master values"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns all active master data in a single response.
    Frontend should cache this and refresh periodically or on demand.
    
    This is the SINGLE SOURCE OF TRUTH for all dropdown/selection data.
    """
    active_filter = True if not include_inactive else None

    def filter_active(query, model):
        if active_filter and hasattr(model, 'is_active'):
            return query.filter(model.is_active == True)
        return query

    def order_by_sort(query, model):
        if hasattr(model, 'sort_order'):
            return query.order_by(model.sort_order)
        return query

    return AllMastersResponse(
        categories=filter_active(db.query(MedicineCategory), MedicineCategory).order_by(MedicineCategory.name).all(),
        units=filter_active(db.query(UnitMaster), UnitMaster).order_by(UnitMaster.name).all(),
        hsn_codes=filter_active(db.query(HSNMaster), HSNMaster).order_by(HSNMaster.hsn_code).all(),
        medicine_types=order_by_sort(filter_active(db.query(MedicineTypeMaster), MedicineTypeMaster), MedicineTypeMaster).all(),
        payment_methods=order_by_sort(filter_active(db.query(PaymentMethodMaster), PaymentMethodMaster), PaymentMethodMaster).all(),
        shop_types=order_by_sort(filter_active(db.query(ShopTypeMaster), ShopTypeMaster), ShopTypeMaster).all(),
        customer_types=order_by_sort(filter_active(db.query(CustomerTypeMaster), CustomerTypeMaster), CustomerTypeMaster).all(),
        gst_slabs=filter_active(db.query(GSTSlabMaster), GSTSlabMaster).order_by(GSTSlabMaster.rate).all(),
        genders=order_by_sort(filter_active(db.query(GenderMaster), GenderMaster), GenderMaster).all(),
        employment_types=order_by_sort(filter_active(db.query(EmploymentTypeMaster), EmploymentTypeMaster), EmploymentTypeMaster).all(),
        urgency_levels=order_by_sort(filter_active(db.query(UrgencyMaster), UrgencyMaster), UrgencyMaster).all(),
        statuses=order_by_sort(filter_active(db.query(StatusMaster), StatusMaster), StatusMaster).all(),
        designations=order_by_sort(filter_active(db.query(DesignationMaster), DesignationMaster), DesignationMaster).all(),
        departments=order_by_sort(filter_active(db.query(DepartmentMaster), DepartmentMaster), DepartmentMaster).all(),
        roles=db.query(Role).filter(Role.is_creatable == True).all(),
        warehouses=db.query(Warehouse).all(),  # Return all warehouses, frontend can filter if needed
        shops=db.query(MedicalShop).all(),  # Return all shops, frontend can filter if needed
        racks=filter_active(db.query(Rack), Rack).all(),
        brands=order_by_sort(filter_active(db.query(BrandMaster), BrandMaster), BrandMaster).all(),
        manufacturers=order_by_sort(filter_active(db.query(ManufacturerMaster), ManufacturerMaster), ManufacturerMaster).all(),
        suppliers=order_by_sort(filter_active(db.query(SupplierMaster), SupplierMaster), SupplierMaster).all(),
        adjustment_reasons=order_by_sort(filter_active(db.query(AdjustmentReasonMaster), AdjustmentReasonMaster), AdjustmentReasonMaster).all(),
    )


# ==================== INDIVIDUAL MASTER CRUD ====================

# --- Payment Methods ---
@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
def list_payment_methods(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["payment_methods.view"]))
):
    query = db.query(PaymentMethodMaster)
    if is_active is not None:
        query = query.filter(PaymentMethodMaster.is_active == is_active)
    return query.order_by(PaymentMethodMaster.sort_order).all()


class PaymentMethodCreate(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=50)
    icon: Optional[str] = None
    sort_order: int = 0


@router.post("/payment-methods", response_model=PaymentMethodResponse)
def create_payment_method(
    data: PaymentMethodCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["payment_methods.create"]))
):
    existing = db.query(PaymentMethodMaster).filter(PaymentMethodMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment method code already exists")
    
    item = PaymentMethodMaster(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/payment-methods/{item_id}", response_model=PaymentMethodResponse)
def update_payment_method(
    item_id: str,
    data: PaymentMethodCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["payment_methods.update", "payment_methods.edit"]))
):
    item = db.query(PaymentMethodMaster).filter(PaymentMethodMaster.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/payment-methods/{item_id}")
def delete_payment_method(
    item_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["payment_methods.delete"]))
):
    item = db.query(PaymentMethodMaster).filter(PaymentMethodMaster.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    item.is_active = False
    db.commit()
    return {"message": "Payment method deactivated"}


# --- Shop Types ---
@router.get("/shop-types", response_model=List[ShopTypeResponse])
def list_shop_types(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["shop_types.view"]))
):
    query = db.query(ShopTypeMaster)
    if is_active is not None:
        query = query.filter(ShopTypeMaster.is_active == is_active)
    return query.order_by(ShopTypeMaster.sort_order).all()


class ShopTypeCreate(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=50)
    description: Optional[str] = None
    sort_order: int = 0


@router.post("/shop-types", response_model=ShopTypeResponse)
def create_shop_type(
    data: ShopTypeCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["shop_types.create"]))
):
    existing = db.query(ShopTypeMaster).filter(ShopTypeMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Shop type code already exists")
    
    item = ShopTypeMaster(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/shop-types/{item_id}", response_model=ShopTypeResponse)
def update_shop_type(
    item_id: str,
    data: ShopTypeCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["shop_types.update", "shop_types.edit"]))
):
    item = db.query(ShopTypeMaster).filter(ShopTypeMaster.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Shop type not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/shop-types/{item_id}")
def delete_shop_type(
    item_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["shop_types.delete"]))
):
    item = db.query(ShopTypeMaster).filter(ShopTypeMaster.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Shop type not found")
    
    item.is_active = False
    db.commit()
    return {"message": "Shop type deactivated"}


# --- Customer Types ---
@router.get("/customer-types", response_model=List[CustomerTypeResponse])
def list_customer_types(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["customer_types.view"]))
):
    query = db.query(CustomerTypeMaster)
    if is_active is not None:
        query = query.filter(CustomerTypeMaster.is_active == is_active)
    return query.order_by(CustomerTypeMaster.sort_order).all()


class CustomerTypeCreate(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=50)
    discount_percent: float = 0.0
    credit_limit: float = 0.0
    sort_order: int = 0


@router.post("/customer-types", response_model=CustomerTypeResponse)
def create_customer_type(
    data: CustomerTypeCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["customer_types.create"]))
):
    existing = db.query(CustomerTypeMaster).filter(CustomerTypeMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer type code already exists")
    
    item = CustomerTypeMaster(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# --- Medicine Types ---
@router.get("/medicine-types", response_model=List[MedicineTypeResponse])
def list_medicine_types(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["medicine_types.view"]))
):
    query = db.query(MedicineTypeMaster)
    if is_active is not None:
        query = query.filter(MedicineTypeMaster.is_active == is_active)
    return query.order_by(MedicineTypeMaster.sort_order).all()


class MedicineTypeCreate(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=50)
    description: Optional[str] = None
    sort_order: int = 0


@router.post("/medicine-types", response_model=MedicineTypeResponse)
def create_medicine_type(
    data: MedicineTypeCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["medicine_types.create"]))
):
    existing = db.query(MedicineTypeMaster).filter(MedicineTypeMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Medicine type code already exists")
    
    item = MedicineTypeMaster(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# --- GST Slabs ---
@router.get("/gst-slabs", response_model=List[GSTSlabResponse])
def list_gst_slabs(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["gst.view"]))
):
    query = db.query(GSTSlabMaster)
    if is_active is not None:
        query = query.filter(GSTSlabMaster.is_active == is_active)
    return query.order_by(GSTSlabMaster.rate).all()


class GSTSlabCreate(BaseModel):
    rate: float
    description: Optional[str] = None


@router.post("/gst-slabs", response_model=GSTSlabResponse)
def create_gst_slab(
    data: GSTSlabCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["gst.create"]))
):
    existing = db.query(GSTSlabMaster).filter(GSTSlabMaster.rate == data.rate).first()
    if existing:
        raise HTTPException(status_code=400, detail="GST slab with this rate already exists")
    
    item = GSTSlabMaster(
        rate=data.rate,
        cgst_rate=data.rate / 2,
        sgst_rate=data.rate / 2,
        igst_rate=data.rate,
        description=data.description
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# --- Genders ---
@router.get("/genders", response_model=List[GenderResponse])
def list_genders(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["genders.view"]))
):
    query = db.query(GenderMaster)
    if is_active is not None:
        query = query.filter(GenderMaster.is_active == is_active)
    return query.order_by(GenderMaster.sort_order).all()


# --- Employment Types ---
@router.get("/employment-types", response_model=List[EmploymentTypeResponse])
def list_employment_types(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["employment_types.view"]))
):
    query = db.query(EmploymentTypeMaster)
    if is_active is not None:
        query = query.filter(EmploymentTypeMaster.is_active == is_active)
    return query.order_by(EmploymentTypeMaster.sort_order).all()


# --- Urgency Levels ---
@router.get("/urgency-levels", response_model=List[UrgencyResponse])
def list_urgency_levels(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["urgency_levels.view"]))
):
    query = db.query(UrgencyMaster)
    if is_active is not None:
        query = query.filter(UrgencyMaster.is_active == is_active)
    return query.order_by(UrgencyMaster.sort_order).all()


# --- Statuses ---
@router.get("/statuses", response_model=List[StatusResponse])
def list_statuses(
    entity_type: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["statuses.view"]))
):
    query = db.query(StatusMaster)
    if entity_type:
        query = query.filter(StatusMaster.entity_type == entity_type)
    if is_active is not None:
        query = query.filter(StatusMaster.is_active == is_active)
    return query.order_by(StatusMaster.entity_type, StatusMaster.sort_order).all()


# --- Designations ---
@router.get("/designations", response_model=List[DesignationResponse])
def list_designations(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["designations.view"]))
):
    query = db.query(DesignationMaster)
    if is_active is not None:
        query = query.filter(DesignationMaster.is_active == is_active)
    return query.order_by(DesignationMaster.sort_order).all()


class DesignationCreate(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=100)
    level: int = 1
    sort_order: int = 0


@router.post("/designations", response_model=DesignationResponse)
def create_designation(
    data: DesignationCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["designations.create"]))
):
    existing = db.query(DesignationMaster).filter(DesignationMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Designation code already exists")
    
    item = DesignationMaster(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# --- Departments ---
@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["departments.view"]))
):
    query = db.query(DepartmentMaster)
    if is_active is not None:
        query = query.filter(DepartmentMaster.is_active == is_active)
    return query.order_by(DepartmentMaster.sort_order).all()


class DepartmentCreate(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    sort_order: int = 0


@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["departments.create"]))
):
    existing = db.query(DepartmentMaster).filter(DepartmentMaster.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists")
    
    item = DepartmentMaster(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
