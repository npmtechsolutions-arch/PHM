"""
Authentication and User schemas with Permission-based authorization
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


# Legacy RoleType enum - kept for backward compatibility during migration
class RoleType(str, Enum):
    SUPER_ADMIN = "super_admin"
    WAREHOUSE_ADMIN = "warehouse_admin"
    SHOP_OWNER = "shop_owner"
    PHARMACIST = "pharmacist"
    CASHIER = "cashier"
    HR_MANAGER = "hr_manager"
    ACCOUNTANT = "accountant"
    EMPLOYEE = "employee"
    WAREHOUSE_EMPLOYEE = "warehouse_employee"
    PHARMACY_EMPLOYEE = "pharmacy_employee"


# ==================== PERMISSION SCHEMAS ====================

class PermissionBase(BaseModel):
    code: str
    module: str
    action: str
    scope: str  # "global" | "warehouse" | "shop"
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PermissionListResponse(BaseModel):
    items: List[PermissionResponse]
    total: int


# ==================== AUTH SCHEMAS ====================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


# Aliases for compatibility
TokenResponse = Token
RefreshTokenRequest = TokenRefreshRequest
ForgotPasswordRequest = PasswordResetRequest
ResetPasswordRequest = PasswordResetConfirm


# ==================== USER SCHEMAS ====================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)
    # Support both legacy role string and new role_id FK
    role: Optional[str] = None  # Accept role name as string (e.g., "warehouse_admin")
    role_id: Optional[str] = None     # New - FK to roles table (preferred)
    assigned_warehouse_id: Optional[str] = None
    assigned_shop_id: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    role_id: Optional[str] = None
    assigned_warehouse_id: Optional[str] = None
    assigned_shop_id: Optional[str] = None


class UserResponse(UserBase):
    id: str
    role: Optional[str] = None  # Role name (from either legacy enum or new FK)
    role_id: Optional[str] = None
    permissions: List[str] = []  # Resolved permission codes
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    warehouse_id: Optional[str] = None  # Assigned warehouse
    shop_id: Optional[str] = None       # Assigned shop

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    size: int


# ==================== ROLE SCHEMAS ====================

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    entity_type: Optional[str] = None  # "warehouse" | "shop" | null


class RoleCreate(RoleBase):
    permission_ids: List[str] = []  # Permission IDs to assign


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[str]] = None


class RoleResponse(RoleBase):
    id: str
    is_system: bool
    is_creatable: bool
    permissions: List[PermissionResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    items: List[RoleResponse]
    total: int


class AssignRoleRequest(BaseModel):
    role_id: str

