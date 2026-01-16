"""
Medical Shop schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class ShopStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class ShopType(str, Enum):
    RETAIL = "retail"
    WHOLESALE = "wholesale"
    HOSPITAL = "hospital"
    CLINIC = "clinic"


class MedicalShopBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=20)
    shop_type: ShopType = ShopType.RETAIL
    license_number: str
    gst_number: Optional[str] = None
    address: str
    city: str
    state: str
    country: str = "India"
    pincode: str
    phone: str
    email: Optional[EmailStr] = None
    owner_id: Optional[str] = None
    manager_id: Optional[str] = None
    status: ShopStatus = ShopStatus.ACTIVE


class MedicalShopCreate(MedicalShopBase):
    warehouse_id: Optional[str] = None


class MedicalShopUpdate(BaseModel):
    name: Optional[str] = None
    shop_type: Optional[ShopType] = None
    license_number: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    owner_id: Optional[str] = None
    manager_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    status: Optional[ShopStatus] = None


class MedicalShopResponse(MedicalShopBase):
    id: str
    warehouse_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_medicines: int = 0
    total_stock_value: float = 0.0

    class Config:
        from_attributes = True


class MedicalShopListResponse(BaseModel):
    items: list[MedicalShopResponse]
    total: int
    page: int
    size: int


class ShopSettings(BaseModel):
    shop_id: str
    tax_rate: float = 12.0
    low_stock_threshold: int = 10
    enable_notifications: bool = True
    auto_reorder: bool = False
    receipt_header: Optional[str] = None
    receipt_footer: Optional[str] = None
