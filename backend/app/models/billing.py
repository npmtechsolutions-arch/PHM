"""
Billing, Invoice, and Payment schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    UPI = "upi"
    WALLET = "wallet"
    CREDIT = "credit"
    INSURANCE = "insurance"
    CHEQUE = "cheque"
    NET_BANKING = "net_banking"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    PARTIAL = "partial"
    REFUNDED = "refunded"
    FAILED = "failed"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RETURNED = "returned"


# Invoice Item
class InvoiceItemBase(BaseModel):
    medicine_id: str
    batch_id: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    discount_percent: float = 0.0
    tax_percent: float = 12.0


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: str
    medicine_name: Optional[str] = None
    batch_number: Optional[str] = None
    subtotal: float = 0.0
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0

    class Config:
        from_attributes = True


# Invoice
class InvoiceBase(BaseModel):
    shop_id: str
    customer_id: Optional[str] = None
    payment_method: PaymentMethod = PaymentMethod.CASH
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    items: list[InvoiceItemCreate]
    discount_percent: float = 0.0
    paid_amount: float = 0.0
    payment_reference: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[str] = None
    due_date: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    id: str
    invoice_number: str
    status: InvoiceStatus
    items: list[InvoiceItemResponse] = []
    subtotal: float = 0.0
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0
    paid_amount: float = 0.0
    balance_amount: float = 0.0
    payment_status: PaymentStatus
    customer_name: Optional[str] = None
    billed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
    page: int
    size: int


# Return schemas
class ReturnItemBase(BaseModel):
    invoice_item_id: str
    medicine_id: str
    batch_id: str
    quantity: int = Field(gt=0)
    reason: str
    restock: bool = False


class ReturnCreate(BaseModel):
    invoice_id: str
    items: list[ReturnItemBase]
    refund_method: PaymentMethod = PaymentMethod.CASH
    notes: Optional[str] = None


class ReturnResponse(BaseModel):
    id: str
    return_number: str
    invoice_id: str
    invoice_number: Optional[str] = None
    items: list[ReturnItemBase] = []
    total_refund: float = 0.0
    refund_method: PaymentMethod
    processed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
