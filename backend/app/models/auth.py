"""
Authentication and User schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


class RoleType(str, Enum):
    SUPER_ADMIN = "super_admin"
    WAREHOUSE_ADMIN = "warehouse_admin"
    SHOP_OWNER = "shop_owner"
    PHARMACIST = "pharmacist"
    CASHIER = "cashier"
    HR_MANAGER = "hr_manager"
    ACCOUNTANT = "accountant"


# Auth Schemas
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


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)
    role: RoleType = RoleType.PHARMACIST
    assigned_warehouse_id: Optional[str] = None
    assigned_shop_id: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: str
    role: RoleType
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    size: int


# Role Schemas
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: list[str] = []


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class AssignRoleRequest(BaseModel):
    role_id: str
