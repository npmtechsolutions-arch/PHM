"""
SQLAlchemy ORM Models for PharmaEC Management System - Complete Production Version
"""
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


# ==================== ENUMS ====================

class RoleType(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    WAREHOUSE_ADMIN = "warehouse_admin"
    SHOP_OWNER = "shop_owner"
    PHARMACIST = "pharmacist"
    CASHIER = "cashier"
    HR_MANAGER = "hr_manager"
    ACCOUNTANT = "accountant"


class WarehouseStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class ShopStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class MedicineType(str, enum.Enum):
    TABLET = "tablet"
    CAPSULE = "capsule"
    SYRUP = "syrup"
    INJECTION = "injection"
    CREAM = "cream"
    OINTMENT = "ointment"
    DROPS = "drops"
    POWDER = "powder"
    OTHER = "other"


class MovementType(str, enum.Enum):
    IN = "in"
    OUT = "out"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    COMPLETED = "completed"
    REFUNDED = "refunded"


class PurchaseRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PARTIAL = "partial"
    REJECTED = "rejected"
    COMPLETED = "completed"


class DispatchStatus(str, enum.Enum):
    CREATED = "created"
    PACKED = "packed"
    DISPATCHED = "dispatched"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    LEAVE = "leave"


# ==================== AUTH MODELS ====================

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    role = Column(SQLEnum(RoleType), default=RoleType.PHARMACIST)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    permissions = Column(Text)  # JSON string of permissions
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(String(500), nullable=False)
    device_info = Column(String(255))
    ip_address = Column(String(45))
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LoginAuditLog(Base):
    __tablename__ = "login_audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    email = Column(String(255), nullable=False)
    action = Column(String(50), nullable=False)  # login_success, login_failed, logout
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== ORGANIZATION MODELS ====================

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(50), nullable=False)
    state = Column(String(50), nullable=False)
    country = Column(String(50), default="India")
    pincode = Column(String(10), nullable=False)
    phone = Column(String(20))
    email = Column(String(255))
    manager_id = Column(String(36), ForeignKey("users.id"))
    capacity = Column(Integer)
    status = Column(SQLEnum(WarehouseStatus), default=WarehouseStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    shops = relationship("MedicalShop", back_populates="warehouse")
    stock = relationship("WarehouseStock", back_populates="warehouse")


class MedicalShop(Base):
    __tablename__ = "medical_shops"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    shop_type = Column(String(20), default="retail")
    license_number = Column(String(50), nullable=False)
    license_expiry = Column(Date)
    gst_number = Column(String(20))
    address = Column(Text, nullable=False)
    city = Column(String(50), nullable=False)
    state = Column(String(50), nullable=False)
    country = Column(String(50), default="India")
    pincode = Column(String(10), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255))
    owner_id = Column(String(36), ForeignKey("users.id"))
    manager_id = Column(String(36), ForeignKey("users.id"))
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"))
    status = Column(SQLEnum(ShopStatus), default=ShopStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    warehouse = relationship("Warehouse", back_populates="shops")
    stock = relationship("ShopStock", back_populates="shop")


# ==================== MEDICINE MODELS ====================

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False, index=True)
    generic_name = Column(String(200), nullable=False)
    brand = Column(String(100))
    manufacturer = Column(String(200), nullable=False)
    medicine_type = Column(SQLEnum(MedicineType), default=MedicineType.TABLET)
    category = Column(String(50))
    composition = Column(Text)
    strength = Column(String(50))
    unit = Column(String(20), default="strip")
    pack_size = Column(Integer, default=10)
    hsn_code = Column(String(20))
    gst_rate = Column(Float, default=12.0)
    mrp = Column(Float, nullable=False)
    purchase_price = Column(Float, nullable=False)
    is_prescription_required = Column(Boolean, default=False)
    is_controlled = Column(Boolean, default=False)
    storage_conditions = Column(Text)
    reorder_level = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    rack_number = Column(String(50))
    rack_name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    batches = relationship("Batch", back_populates="medicine")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_number = Column(String(50), nullable=False, index=True)
    manufacturing_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    quantity = Column(Integer, default=0)
    purchase_price = Column(Float, nullable=False)
    mrp = Column(Float, nullable=False)
    supplier = Column(String(200))
    received_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="batches")

    __table_args__ = (Index('idx_batch_expiry', 'expiry_date'),)


# ==================== STOCK MODELS (CRITICAL) ====================

class WarehouseStock(Base):
    """Stock quantity per medicine/batch at warehouse level"""
    __tablename__ = "warehouse_stock"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    reserved_quantity = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    warehouse = relationship("Warehouse", back_populates="stock")

    __table_args__ = (
        Index('idx_wh_stock_lookup', 'warehouse_id', 'medicine_id', 'batch_id'),
    )


class ShopStock(Base):
    """Stock quantity per medicine/batch at shop level"""
    __tablename__ = "shop_stock"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    reserved_quantity = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shop = relationship("MedicalShop", back_populates="stock")

    __table_args__ = (
        Index('idx_shop_stock_lookup', 'shop_id', 'medicine_id', 'batch_id'),
    )


class StockMovement(Base):
    """ALL stock changes MUST go through this table"""
    __tablename__ = "stock_movements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    movement_type = Column(SQLEnum(MovementType), nullable=False)
    
    # Source location
    source_type = Column(String(20))  # warehouse, shop, supplier
    source_id = Column(String(36))
    
    # Destination location
    destination_type = Column(String(20))  # warehouse, shop, customer
    destination_id = Column(String(36))
    
    # Item details
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    
    # Reference
    reference_type = Column(String(50))  # purchase, sale, dispatch, adjustment, return
    reference_id = Column(String(36))
    
    # Audit
    notes = Column(Text)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_movement_ref', 'reference_type', 'reference_id'),
        Index('idx_movement_date', 'created_at'),
    )


# ==================== INVOICE & BILLING MODELS ====================

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(255))
    date_of_birth = Column(Date)
    gender = Column(String(10))
    address = Column(Text)
    city = Column(String(50))
    pincode = Column(String(10))
    customer_type = Column(String(20), default="regular")
    shop_id = Column(String(36), ForeignKey("medical_shops.id"))
    total_purchases = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    loyalty_points = Column(Integer, default=0)
    last_visit = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"))
    payment_method = Column(String(20), default="cash")
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    discount_percent = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    balance_amount = Column(Float, default=0.0)
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.COMPLETED)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.COMPLETED)
    billed_by = Column(String(36), ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0)
    tax_percent = Column(Float, default=12.0)
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    invoice = relationship("Invoice", back_populates="items")


class Return(Base):
    __tablename__ = "returns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    return_number = Column(String(50), unique=True, nullable=False)
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=False)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"))
    total_refund = Column(Float, default=0.0)
    refund_method = Column(String(20), default="cash")
    reason = Column(Text)
    processed_by = Column(String(36), ForeignKey("users.id"))
    status = Column(String(20), default="completed")
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("ReturnItem", back_populates="return_record", cascade="all, delete-orphan")


class ReturnItem(Base):
    __tablename__ = "return_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    return_id = Column(String(36), ForeignKey("returns.id", ondelete="CASCADE"), nullable=False)
    invoice_item_id = Column(String(36), ForeignKey("invoice_items.id"))
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    refund_amount = Column(Float, nullable=False)
    reason = Column(Text)

    return_record = relationship("Return", back_populates="items")


# ==================== PURCHASE & DISPATCH MODELS ====================

class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_number = Column(String(50), unique=True, nullable=False, index=True)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"), nullable=False)
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"), nullable=False)
    urgency = Column(String(20), default="normal")
    status = Column(SQLEnum(PurchaseRequestStatus), default=PurchaseRequestStatus.PENDING)
    requested_by = Column(String(36), ForeignKey("users.id"))
    approved_by = Column(String(36), ForeignKey("users.id"))
    approval_notes = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    items = relationship("PurchaseRequestItem", back_populates="purchase_request", cascade="all, delete-orphan")


class PurchaseRequestItem(Base):
    __tablename__ = "purchase_request_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_request_id = Column(String(36), ForeignKey("purchase_requests.id", ondelete="CASCADE"), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    quantity_requested = Column(Integer, nullable=False)
    quantity_approved = Column(Integer, default=0)
    quantity_dispatched = Column(Integer, default=0)
    notes = Column(Text)

    purchase_request = relationship("PurchaseRequest", back_populates="items")


class Dispatch(Base):
    __tablename__ = "dispatches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dispatch_number = Column(String(50), unique=True, nullable=False, index=True)
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"), nullable=False)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"), nullable=False)
    purchase_request_id = Column(String(36), ForeignKey("purchase_requests.id"))
    status = Column(SQLEnum(DispatchStatus), default=DispatchStatus.CREATED)
    dispatched_by = Column(String(36), ForeignKey("users.id"))
    received_by = Column(String(36), ForeignKey("users.id"))
    dispatched_at = Column(DateTime)
    delivered_at = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("DispatchItem", back_populates="dispatch", cascade="all, delete-orphan")
    status_history = relationship("DispatchStatusHistory", back_populates="dispatch", cascade="all, delete-orphan")


class DispatchItem(Base):
    __tablename__ = "dispatch_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dispatch_id = Column(String(36), ForeignKey("dispatches.id", ondelete="CASCADE"), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    dispatch = relationship("Dispatch", back_populates="items")


class DispatchStatusHistory(Base):
    __tablename__ = "dispatch_status_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dispatch_id = Column(String(36), ForeignKey("dispatches.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(DispatchStatus), nullable=False)
    notes = Column(Text)
    updated_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    dispatch = relationship("Dispatch", back_populates="status_history")


# ==================== HR MODELS ====================

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_code = Column(String(20), unique=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"))
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    designation = Column(String(50), nullable=False)
    department = Column(String(50), nullable=False)
    employment_type = Column(String(20), default="full_time")
    date_of_joining = Column(Date, nullable=False)
    date_of_birth = Column(Date)
    gender = Column(String(10))
    address = Column(Text)
    city = Column(String(50))
    emergency_contact = Column(String(20))
    bank_account = Column(String(50))
    pan_number = Column(String(20))
    pf_number = Column(String(30))
    esi_number = Column(String(30))
    basic_salary = Column(Float, nullable=False)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"))
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"))
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    salary_records = relationship("SalaryRecord", back_populates="employee", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(SQLEnum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    working_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_records")

    __table_args__ = (Index('idx_attendance_date', 'employee_id', 'date'),)


class SalaryRecord(Base):
    __tablename__ = "salary_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    basic_salary = Column(Float, nullable=False)
    hra = Column(Float, default=0.0)
    allowances = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    pf_deduction = Column(Float, default=0.0)
    esi_deduction = Column(Float, default=0.0)
    tax_deduction = Column(Float, default=0.0)
    bonus = Column(Float, default=0.0)
    gross_salary = Column(Float, nullable=False)
    net_salary = Column(Float, nullable=False)
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime)
    payment_ref = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="salary_records")


# ==================== CRM MODELS ====================

class CustomerFollowup(Base):
    __tablename__ = "customer_followups"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    followup_type = Column(String(50), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    status = Column(String(20), default="pending")
    notes = Column(Text)
    completed_at = Column(DateTime)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


class CustomerPrescription(Base):
    __tablename__ = "customer_prescriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    doctor_name = Column(String(100))
    hospital = Column(String(200))
    prescription_date = Column(Date)
    notes = Column(Text)
    file_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== NOTIFICATION & SETTINGS ====================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")
    is_read = Column(Boolean, default=False)
    user_id = Column(String(36), ForeignKey("users.id"))
    shop_id = Column(String(36), ForeignKey("medical_shops.id"))
    reference_type = Column(String(50))
    reference_id = Column(String(36))
    created_at = Column(DateTime, default=datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    description = Column(Text)
    category = Column(String(50))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36))
    old_values = Column(Text)  # JSON
    new_values = Column(Text)  # JSON
    ip_address = Column(String(45))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index('idx_audit_entity', 'entity_type', 'entity_id'),)


# ==================== ORGANIZATION EXTENDED MODELS ====================

class WarehouseShopMap(Base):
    """Many-to-many mapping between warehouses and shops"""
    __tablename__ = "warehouse_shop_map"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    warehouse_id = Column(String(36), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    shop_id = Column(String(36), ForeignKey("medical_shops.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index('idx_wh_shop_map', 'warehouse_id', 'shop_id', unique=True),)


class WarehouseSettings(Base):
    """Warehouse-specific configuration"""
    __tablename__ = "warehouse_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    warehouse_id = Column(String(36), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, unique=True)
    auto_dispatch = Column(Boolean, default=False)
    low_stock_threshold = Column(Integer, default=100)
    expiry_alert_days = Column(Integer, default=90)
    working_hours_start = Column(String(10))
    working_hours_end = Column(String(10))
    settings_json = Column(Text)  # Additional JSON settings
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShopSettings(Base):
    """Shop-specific configuration"""
    __tablename__ = "shop_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shop_id = Column(String(36), ForeignKey("medical_shops.id", ondelete="CASCADE"), nullable=False, unique=True)
    invoice_prefix = Column(String(20), default="INV")
    invoice_start_number = Column(Integer, default=1)
    tax_inclusive = Column(Boolean, default=True)
    allow_credit_sales = Column(Boolean, default=False)
    max_credit_limit = Column(Float, default=0.0)
    receipt_footer = Column(Text)
    working_hours_start = Column(String(10))
    working_hours_end = Column(String(10))
    settings_json = Column(Text)  # Additional JSON settings
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==================== CATALOG EXTENDED MODELS ====================

class MedicineCategory(Base):
    """Medicine category master"""
    __tablename__ = "medicine_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    parent_id = Column(String(36), ForeignKey("medicine_categories.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class MedicinePricingHistory(Base):
    """Track medicine price changes"""
    __tablename__ = "medicine_pricing_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    old_mrp = Column(Float, nullable=False)
    new_mrp = Column(Float, nullable=False)
    old_purchase_price = Column(Float, nullable=False)
    new_purchase_price = Column(Float, nullable=False)
    changed_by = Column(String(36), ForeignKey("users.id"))
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class UnitMaster(Base):
    """Units of measurement master (strip, bottle, box, bulk)"""
    __tablename__ = "unit_master"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, nullable=False)
    short_name = Column(String(10), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class HSNMaster(Base):
    """HSN codes for GST compliance"""
    __tablename__ = "hsn_master"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    hsn_code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    gst_rate = Column(Float, default=12.0)
    cgst_rate = Column(Float, default=6.0)
    sgst_rate = Column(Float, default=6.0)
    igst_rate = Column(Float, default=12.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== INVENTORY EXTENDED MODELS ====================

class StockAdjustment(Base):
    """Manual stock adjustments with audit trail"""
    __tablename__ = "stock_adjustments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    adjustment_number = Column(String(50), unique=True, nullable=False)
    location_type = Column(String(20), nullable=False)  # warehouse, shop
    location_id = Column(String(36), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    adjustment_type = Column(String(20), nullable=False)  # increase, decrease, damage, expired
    quantity = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    adjusted_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    approved_by = Column(String(36), ForeignKey("users.id"))
    status = Column(String(20), default="pending")  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)


class StockThreshold(Base):
    """Low stock thresholds per item per location"""
    __tablename__ = "stock_thresholds"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    location_type = Column(String(20), nullable=False)  # warehouse, shop
    location_id = Column(String(36), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    min_quantity = Column(Integer, default=10)
    reorder_quantity = Column(Integer, default=50)
    max_quantity = Column(Integer, default=500)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index('idx_stock_threshold', 'location_type', 'location_id', 'medicine_id'),)


class ExpiryAlert(Base):
    """Expiry warning logs"""
    __tablename__ = "expiry_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    location_type = Column(String(20), nullable=False)  # warehouse, shop
    location_id = Column(String(36), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False)
    days_to_expiry = Column(Integer, nullable=False)
    alert_type = Column(String(20), nullable=False)  # warning, critical, expired
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(36), ForeignKey("users.id"))
    acknowledged_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== BILLING EXTENDED MODELS ====================

class PaymentTransaction(Base):
    """Payment records for invoices"""
    __tablename__ = "payment_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    transaction_number = Column(String(50), unique=True, nullable=False)
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=False)
    payment_method = Column(String(20), nullable=False)  # cash, card, upi, credit
    amount = Column(Float, nullable=False)
    reference_number = Column(String(100))  # Card/UPI reference
    status = Column(String(20), default="completed")  # pending, completed, failed, refunded
    processed_by = Column(String(36), ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class BillingSequence(Base):
    """Invoice number sequences per shop"""
    __tablename__ = "billing_sequences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shop_id = Column(String(36), ForeignKey("medical_shops.id", ondelete="CASCADE"), nullable=False)
    sequence_type = Column(String(20), nullable=False)  # invoice, return, purchase_request
    prefix = Column(String(20), nullable=False)
    current_number = Column(Integer, default=0)
    fiscal_year = Column(String(10))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index('idx_billing_seq', 'shop_id', 'sequence_type', 'fiscal_year', unique=True),)


# ==================== TAX & ACCOUNTING MODELS ====================

class TaxRecord(Base):
    """GST/VAT transaction records"""
    __tablename__ = "tax_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id"))
    return_id = Column(String(36), ForeignKey("returns.id"))
    shop_id = Column(String(36), ForeignKey("medical_shops.id"), nullable=False)
    transaction_type = Column(String(20), nullable=False)  # sale, return, purchase
    hsn_code = Column(String(20))
    taxable_amount = Column(Float, nullable=False)
    cgst_rate = Column(Float, default=0.0)
    cgst_amount = Column(Float, default=0.0)
    sgst_rate = Column(Float, default=0.0)
    sgst_amount = Column(Float, default=0.0)
    igst_rate = Column(Float, default=0.0)
    igst_amount = Column(Float, default=0.0)
    total_tax = Column(Float, nullable=False)
    transaction_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class TaxSetting(Base):
    """Tax configuration"""
    __tablename__ = "tax_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shop_id = Column(String(36), ForeignKey("medical_shops.id", ondelete="CASCADE"))
    tax_type = Column(String(20), nullable=False)  # gst, vat
    is_registered = Column(Boolean, default=True)
    registration_number = Column(String(50))
    default_rate = Column(Float, default=12.0)
    is_tax_inclusive = Column(Boolean, default=True)
    settings_json = Column(Text)  # Additional tax settings
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GSTReport(Base):
    """GST filing summaries"""
    __tablename__ = "gst_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"), nullable=False)
    report_type = Column(String(20), nullable=False)  # GSTR1, GSTR3B
    period_month = Column(Integer, nullable=False)
    period_year = Column(Integer, nullable=False)
    total_taxable = Column(Float, default=0.0)
    total_cgst = Column(Float, default=0.0)
    total_sgst = Column(Float, default=0.0)
    total_igst = Column(Float, default=0.0)
    total_tax = Column(Float, default=0.0)
    status = Column(String(20), default="draft")  # draft, filed, acknowledged
    filed_at = Column(DateTime)
    arn_number = Column(String(50))
    report_data = Column(Text)  # JSON
    created_at = Column(DateTime, default=datetime.utcnow)


class VATReport(Base):
    """VAT filing summaries"""
    __tablename__ = "vat_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"), nullable=False)
    period_month = Column(Integer, nullable=False)
    period_year = Column(Integer, nullable=False)
    total_sales = Column(Float, default=0.0)
    total_purchases = Column(Float, default=0.0)
    output_vat = Column(Float, default=0.0)
    input_vat = Column(Float, default=0.0)
    net_vat = Column(Float, default=0.0)
    status = Column(String(20), default="draft")
    filed_at = Column(DateTime)
    report_data = Column(Text)  # JSON
    created_at = Column(DateTime, default=datetime.utcnow)


class IncomeExpense(Base):
    """Income/expense tracking"""
    __tablename__ = "income_expense"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"))
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"))
    entry_type = Column(String(20), nullable=False)  # income, expense
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(20))
    reference_number = Column(String(100))
    entry_date = Column(Date, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


class LedgerEntry(Base):
    """Accounting ledger entries"""
    __tablename__ = "ledger_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shop_id = Column(String(36), ForeignKey("medical_shops.id"))
    account_type = Column(String(50), nullable=False)  # sales, purchase, expense, asset, liability
    account_name = Column(String(100), nullable=False)
    debit_amount = Column(Float, default=0.0)
    credit_amount = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    reference_type = Column(String(50))  # invoice, return, payment, adjustment
    reference_id = Column(String(36))
    description = Column(Text)
    entry_date = Column(Date, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index('idx_ledger_date', 'shop_id', 'entry_date'),)


# ==================== CRM EXTENDED MODELS ====================

class CustomerAddress(Base):
    """Multiple addresses per customer"""
    __tablename__ = "customer_addresses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    address_type = Column(String(20), default="home")  # home, office, other
    address_line1 = Column(Text, nullable=False)
    address_line2 = Column(Text)
    city = Column(String(50), nullable=False)
    state = Column(String(50))
    pincode = Column(String(10), nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CustomerActivityLog(Base):
    """Customer interaction history"""
    __tablename__ = "customer_activity_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(50), nullable=False)  # purchase, return, inquiry, complaint, followup
    description = Column(Text)
    reference_type = Column(String(50))
    reference_id = Column(String(36))
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== HR EXTENDED MODELS ====================

class PFRecord(Base):
    """PF contribution records"""
    __tablename__ = "pf_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    basic_wages = Column(Float, nullable=False)
    employee_contribution = Column(Float, nullable=False)
    employer_contribution = Column(Float, nullable=False)
    total_contribution = Column(Float, nullable=False)
    status = Column(String(20), default="pending")  # pending, deposited
    deposited_at = Column(DateTime)
    challan_number = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index('idx_pf_period', 'employee_id', 'year', 'month'),)


class ESIRecord(Base):
    """ESI contribution records"""
    __tablename__ = "esi_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    gross_wages = Column(Float, nullable=False)
    employee_contribution = Column(Float, nullable=False)
    employer_contribution = Column(Float, nullable=False)
    total_contribution = Column(Float, nullable=False)
    status = Column(String(20), default="pending")  # pending, deposited
    deposited_at = Column(DateTime)
    challan_number = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index('idx_esi_period', 'employee_id', 'year', 'month'),)


class PaySlip(Base):
    """Generated payslips"""
    __tablename__ = "pay_slips"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    salary_record_id = Column(String(36), ForeignKey("salary_records.id"), nullable=False)
    slip_number = Column(String(50), unique=True, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    earnings_json = Column(Text)  # JSON breakdown of earnings
    deductions_json = Column(Text)  # JSON breakdown of deductions
    net_amount = Column(Float, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    downloaded_at = Column(DateTime)
    file_path = Column(String(500))


class SalesPerformance(Base):
    """Sales staff KPIs"""
    __tablename__ = "sales_performance"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    period_month = Column(Integer, nullable=False)
    period_year = Column(Integer, nullable=False)
    total_sales = Column(Float, default=0.0)
    total_invoices = Column(Integer, default=0)
    total_customers = Column(Integer, default=0)
    average_invoice_value = Column(Float, default=0.0)
    target_amount = Column(Float, default=0.0)
    achievement_percent = Column(Float, default=0.0)
    incentive_earned = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index('idx_sales_perf', 'employee_id', 'period_year', 'period_month'),)


# ==================== NOTIFICATION EXTENDED MODELS ====================

class NotificationTemplate(Base):
    """Message templates for notifications"""
    __tablename__ = "notification_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(50), nullable=False)  # low_stock, expiry, order_status, etc.
    channel = Column(String(20), nullable=False)  # email, sms, push, in_app
    subject = Column(String(200))
    body = Column(Text, nullable=False)
    variables = Column(Text)  # JSON list of template variables
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)


class NotificationLog(Base):
    """Notification delivery logs"""
    __tablename__ = "notification_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    notification_id = Column(String(36), ForeignKey("notifications.id"))
    template_id = Column(String(36), ForeignKey("notification_templates.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    channel = Column(String(20), nullable=False)  # email, sms, push, in_app
    recipient = Column(String(255))  # email/phone
    subject = Column(String(200))
    body = Column(Text)
    status = Column(String(20), default="pending")  # pending, sent, delivered, failed
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== SETTINGS EXTENDED MODELS ====================

class ApplicationSetting(Base):
    """Global application configuration"""
    __tablename__ = "application_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    value_type = Column(String(20), default="string")  # string, number, boolean, json
    category = Column(String(50), nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=False)
    updated_by = Column(String(36), ForeignKey("users.id"))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeatureFlag(Base):
    """Feature toggles"""
    __tablename__ = "feature_flags"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_enabled = Column(Boolean, default=False)
    enabled_for = Column(Text)  # JSON: specific users, roles, or shops
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    updated_by = Column(String(36), ForeignKey("users.id"))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FileUpload(Base):
    """Uploaded file records"""
    __tablename__ = "file_uploads"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    original_name = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50))  # image, document, csv
    mime_type = Column(String(100))
    file_size = Column(Integer)  # bytes
    entity_type = Column(String(50))  # customer, prescription, medicine, etc.
    entity_id = Column(String(36))
    uploaded_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index('idx_file_entity', 'entity_type', 'entity_id'),)
