"""
Purchase Request and Dispatch schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class PurchaseRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PARTIAL = "partial"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class DispatchStatus(str, Enum):
    CREATED = "created"
    PACKED = "packed"
    DISPATCHED = "dispatched"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# Purchase Request
class PurchaseRequestItemBase(BaseModel):
    medicine_id: str
    quantity_requested: int = Field(gt=0)
    notes: Optional[str] = None


class PurchaseRequestItemResponse(PurchaseRequestItemBase):
    id: str
    medicine_name: Optional[str] = None
    quantity_approved: int = 0
    quantity_dispatched: int = 0

    class Config:
        from_attributes = True


class PurchaseRequestBase(BaseModel):
    shop_id: str
    warehouse_id: str
    urgency: str = "normal"  # low, normal, high, critical
    notes: Optional[str] = None


class PurchaseRequestCreate(PurchaseRequestBase):
    items: list[PurchaseRequestItemBase]


class PurchaseRequestApproval(BaseModel):
    items: list[dict] = []  # [{"item_id": "xxx", "quantity_approved": 10}]
    notes: Optional[str] = None


class PurchaseRequestResponse(PurchaseRequestBase):
    id: str
    request_number: str
    status: PurchaseRequestStatus
    requested_by: Optional[str] = None
    approved_by: Optional[str] = None
    items: list[PurchaseRequestItemResponse] = []
    total_items: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PurchaseRequestListResponse(BaseModel):
    items: list[PurchaseRequestResponse]
    total: int
    page: int
    size: int


# Dispatch
class DispatchItemBase(BaseModel):
    medicine_id: str
    batch_id: str
    quantity: int = Field(gt=0)


class DispatchItemResponse(DispatchItemBase):
    id: str
    medicine_name: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class DispatchBase(BaseModel):
    warehouse_id: str
    shop_id: str
    purchase_request_id: Optional[str] = None
    notes: Optional[str] = None


class DispatchCreate(DispatchBase):
    items: list[DispatchItemBase]


class DispatchStatusUpdate(BaseModel):
    status: DispatchStatus
    notes: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None


class DispatchResponse(DispatchBase):
    id: str
    dispatch_number: str
    status: DispatchStatus
    items: list[DispatchItemResponse] = []
    total_items: int = 0
    dispatched_by: Optional[str] = None
    received_by: Optional[str] = None
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DispatchListResponse(BaseModel):
    items: list[DispatchResponse]
    total: int
    page: int
    size: int
