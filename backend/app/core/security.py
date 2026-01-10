"""
Security utilities for authentication and authorization
Production-grade Role-Based Entity Authorization
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from dataclasses import dataclass
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # Truncate to 72 bytes to match bcrypt limit
    truncated_password = plain_password[:72]
    return pwd_context.verify(truncated_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Truncate to 72 bytes to avoid bcrypt error
    truncated_password = password[:72]
    return pwd_context.hash(truncated_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==================== AUTH CONTEXT ====================

@dataclass
class AuthContext:
    """
    Authentication context containing user identity and entity scope.
    This is the source of truth for authorization decisions.
    """
    user_id: str
    email: str
    role: str
    warehouse_id: Optional[str] = None
    shop_id: Optional[str] = None
    
    @property
    def is_super_admin(self) -> bool:
        """Check if user is super admin (global access)"""
        return self.role == "super_admin"
    
    @property
    def is_warehouse_admin(self) -> bool:
        """Check if user is warehouse admin"""
        return self.role == "warehouse_admin"
    
    @property
    def is_shop_level(self) -> bool:
        """Check if user is shop-level (shop_owner, pharmacist, cashier)"""
        return self.role in ["shop_owner", "pharmacist", "cashier"]
    
    def can_access_warehouse(self, warehouse_id: str) -> bool:
        """Check if user can access a specific warehouse"""
        if self.is_super_admin:
            return True
        if self.is_warehouse_admin:
            return self.warehouse_id == warehouse_id
        # Shop-level users access their shop's warehouse
        # This should be validated at the API level with DB lookup
        return False
    
    def can_access_shop(self, shop_id: str) -> bool:
        """Check if user can access a specific shop"""
        if self.is_super_admin:
            return True
        if self.is_shop_level:
            return self.shop_id == shop_id
        # Warehouse admin can access all shops in their warehouse
        # This should be validated at the API level with DB lookup
        return False
    
    def can_perform_operation(self, operation: str) -> bool:
        """Check if user can perform a specific operation"""
        # Super Admin restrictions
        if self.is_super_admin:
            blocked_ops = ["billing", "pos", "stock_adjust", "dispatch_create"]
            return operation not in blocked_ops
        return True


async def get_auth_context(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthContext:
    """Get authentication context from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    return AuthContext(
        user_id=user_id,
        email=payload.get("sub", ""),
        role=payload.get("role", "user"),
        warehouse_id=payload.get("warehouse_id"),
        shop_id=payload.get("shop_id")
    )


# Legacy function for backward compatibility
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Get current authenticated user from JWT token (legacy)"""
    auth = await get_auth_context(credentials)
    return {
        "user_id": auth.user_id,
        "email": auth.email,
        "role": auth.role,
        "warehouse_id": auth.warehouse_id,
        "shop_id": auth.shop_id
    }


# ==================== AUTHORIZATION DECORATORS ====================

def require_role(required_roles: List[str]):
    """Dependency to require specific roles"""
    async def role_checker(auth: AuthContext = Depends(get_auth_context)):
        if auth.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return auth
    return role_checker


def require_super_admin():
    """Dependency to require super_admin role"""
    async def checker(auth: AuthContext = Depends(get_auth_context)):
        if not auth.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin access required"
            )
        return auth
    return checker


def require_warehouse_access():
    """
    Dependency factory for warehouse access validation.
    Use with path parameter 'warehouse_id'.
    """
    async def checker(
        warehouse_id: str,
        auth: AuthContext = Depends(get_auth_context)
    ):
        if not auth.can_access_warehouse(warehouse_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this warehouse"
            )
        return auth
    return checker


def require_shop_access():
    """
    Dependency factory for shop access validation.
    Use with path parameter 'shop_id'.
    """
    async def checker(
        shop_id: str,
        auth: AuthContext = Depends(get_auth_context)
    ):
        if not auth.can_access_shop(shop_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this shop"
            )
        return auth
    return checker


def block_super_admin():
    """Dependency to block super_admin from operational endpoints"""
    async def checker(auth: AuthContext = Depends(get_auth_context)):
        if auth.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin cannot perform operational actions"
            )
        return auth
    return checker
