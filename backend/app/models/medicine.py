"""
Medicine and Batch schemas
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class MedicineType(str, Enum):
    TABLET = "tablet"
    CAPSULE = "capsule"
    SYRUP = "syrup"
    INJECTION = "injection"
    CREAM = "cream"
    OINTMENT = "ointment"
    DROPS = "drops"
    POWDER = "powder"
    OTHER = "other"


class MedicineCategory(str, Enum):
    ANTIBIOTICS = "antibiotics"
    PAINKILLERS = "painkillers"
    ANTIHISTAMINES = "antihistamines"
    SUPPLEMENTS = "supplements"
    CARDIAC = "cardiac"
    DIABETES = "diabetes"
    RESPIRATORY = "respiratory"
    GASTRO = "gastro"
    DERMA = "derma"
    OTHER = "other"


class MedicineBase(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    generic_name: str
    brand: Optional[str] = None
    manufacturer: str
    medicine_type: MedicineType = MedicineType.TABLET
    category: MedicineCategory = MedicineCategory.OTHER
    composition: Optional[str] = None
    strength: Optional[str] = None
    unit: str = "strip"
    pack_size: int = 10
    hsn_code: Optional[str] = None
    gst_rate: float = 12.0
    mrp: float = Field(gt=0)
    purchase_price: float = Field(gt=0)
    is_prescription_required: bool = False
    is_controlled: bool = False
    storage_conditions: Optional[str] = None
    is_active: bool = True
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    rack_number: Optional[str] = None
    rack_name: Optional[str] = None


class MedicineCreate(MedicineBase):
    pass


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    manufacturer: Optional[str] = None
    medicine_type: Optional[MedicineType] = None
    category: Optional[MedicineCategory] = None
    composition: Optional[str] = None
    strength: Optional[str] = None
    unit: Optional[str] = None
    pack_size: Optional[int] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    mrp: Optional[float] = None
    purchase_price: Optional[float] = None
    is_prescription_required: Optional[bool] = None
    is_controlled: Optional[bool] = None
    storage_conditions: Optional[str] = None
    is_active: Optional[bool] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    rack_number: Optional[str] = None
    rack_name: Optional[str] = None


class MedicineResponse(MedicineBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MedicineListResponse(BaseModel):
    items: list[MedicineResponse]
    total: int
    page: int
    size: int


# Batch schemas
class BatchBase(BaseModel):
    batch_number: str
    manufacturing_date: Optional[date] = None
    expiry_date: date
    quantity: int = Field(ge=0)
    purchase_price: Optional[float] = None
    mrp: Optional[float] = None


class BatchCreate(BaseModel):
    batch_number: str
    manufacturing_date: Optional[date] = None
    expiry_date: date
    quantity: int = Field(ge=1)
    purchase_price: Optional[float] = Field(None, gt=0)
    mrp: Optional[float] = Field(None, gt=0)


class BatchUpdate(BaseModel):
    quantity: Optional[int] = None
    purchase_price: Optional[float] = None
    mrp: Optional[float] = None


class BatchResponse(BatchBase):
    id: str
    medicine_id: str
    medicine_name: Optional[str] = None
    is_expired: bool = False
    days_to_expiry: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class MedicineImportRequest(BaseModel):
    file_url: str
    format: str = "csv"
