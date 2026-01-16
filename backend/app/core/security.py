"""
Security utilities for authentication and authorization
Production-grade Permission-Based Entity Authorization
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from dataclasses import dataclass, field
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
    """Create JWT access token with permissions"""
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
    Authentication context containing user identity, permissions, and entity scope.
    This is the source of truth for all authorization decisions.
    
    Permissions are the PRIMARY mechanism for access control.
    Role names are kept for backward compatibility but should not be used for new code.
    """
    user_id: str
    email: str
    role: str  # Role name (for backward compatibility)
    role_id: Optional[str] = None
    permissions: List[str] = field(default_factory=list)  # Permission codes
    warehouse_id: Optional[str] = None
    shop_id: Optional[str] = None
    
    # ==================== PERMISSION-BASED CHECKS (PRIMARY) ====================
    
    def has_permission(self, permission_code: str) -> bool:
        """
        Check if user has a specific permission.
        This is the PRIMARY method for authorization checks.
        Super Admin always has all permissions.
        """
        # Super Admin bypasses all permission checks
        if self.role == "super_admin":
            return True
        return permission_code in self.permissions
    
    def has_any_permission(self, permission_codes: List[str]) -> bool:
        """
        Check if user has ANY of the listed permissions.
        Useful for routes that can be accessed by multiple permission types.
        Super Admin always has all permissions.
        """
        # Super Admin bypasses all permission checks
        if self.role == "super_admin":
            return True
        return any(p in self.permissions for p in permission_codes)
    
    def has_all_permissions(self, permission_codes: List[str]) -> bool:
        """
        Check if user has ALL of the listed permissions.
        Useful for routes that require multiple permissions.
        Super Admin always has all permissions.
        """
        # Super Admin bypasses all permission checks
        if self.role == "super_admin":
            return True
        return all(p in self.permissions for p in permission_codes)
    
    def has_module_access(self, module: str) -> bool:
        """
        Check if user has any permission in a module.
        Useful for sidebar visibility checks.
        Super Admin always has access to all modules.
        """
        # Super Admin bypasses all permission checks
        if self.role == "super_admin":
            return True
        return any(p.startswith(f"{module}.") for p in self.permissions)
    
    def get_scope_for_permission(self, permission_prefix: str) -> Optional[str]:
        """
        Get the scope for a permission prefix.
        e.g., for prefix "inventory.view", returns "global", "warehouse", or "shop"
        based on which permission the user has.
        Super Admin always has global scope.
        """
        # Super Admin has global scope for everything
        if self.role == "super_admin":
            return "global"
        for perm in self.permissions:
            if perm.startswith(permission_prefix):
                parts = perm.split(".")
                if len(parts) >= 3:
                    return parts[2]
        return None
    
    # ==================== ROLE-BASED CHECKS (LEGACY - for backward compatibility) ====================
    
    @property
    def is_super_admin(self) -> bool:
        """Check if user is super admin (has all permissions)"""
        return self.role == "super_admin"
    
    @property
    def is_warehouse_admin(self) -> bool:
        """Check if user is warehouse admin"""
        return self.role == "warehouse_admin"
    
    @property
    def is_shop_level(self) -> bool:
        """Check if user is shop-level role"""
        return self.role in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin", "pharmacy_employee"]
    
    # ==================== ENTITY ACCESS CHECKS ====================
    
    def can_access_warehouse(self, warehouse_id: str) -> bool:
        """Check if user can access a specific warehouse"""
        if self.is_super_admin:
            return True
        # Check if user has warehouse-scoped permissions and is assigned to this warehouse
        if self.warehouse_id == warehouse_id:
            return True
        return False
    
    def can_access_shop(self, shop_id: str) -> bool:
        """Check if user can access a specific shop"""
        if self.is_super_admin:
            return True
        # Check if user has shop-scoped permissions and is assigned to this shop
        if self.shop_id == shop_id:
            return True
        return False
    
    def can_perform_operation(self, operation: str) -> bool:
        """Check if user can perform a specific operation (legacy)"""
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
        role_id=payload.get("role_id"),
        permissions=payload.get("permissions", []),
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
        "role_id": auth.role_id,
        "permissions": auth.permissions,
        "warehouse_id": auth.warehouse_id,
        "shop_id": auth.shop_id
    }


# ==================== PERMISSION-BASED AUTHORIZATION ====================

def require_permission(required_permissions: List[str]):
    """
    Dependency to require specific permissions.
    User must have AT LEAST ONE of the listed permissions.
    
    Usage:
        @router.get("/inventory", dependencies=[Depends(require_permission(["inventory.view.global", "inventory.view.warehouse"]))])
    """
    async def permission_checker(auth: AuthContext = Depends(get_auth_context)):
        if not auth.has_any_permission(required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {', '.join(required_permissions)}"
            )
        return auth
    return permission_checker


def require_all_permissions(required_permissions: List[str]):
    """
    Dependency to require ALL specified permissions.
    User must have ALL of the listed permissions.
    """
    async def permission_checker(auth: AuthContext = Depends(get_auth_context)):
        if not auth.has_all_permissions(required_permissions):
            missing = [p for p in required_permissions if p not in auth.permissions]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {', '.join(missing)}"
            )
        return auth
    return permission_checker


# ==================== LEGACY AUTHORIZATION DECORATORS ====================

def require_role(required_roles: List[str]):
    """Dependency to require specific roles (legacy - prefer require_permission)"""
    def role_checker(auth: AuthContext = Depends(get_auth_context)):
        if auth.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return auth
    return role_checker


def require_super_admin():
    """Dependency to require super_admin role (legacy - prefer require_permission)"""
    def checker(auth: AuthContext = Depends(get_auth_context)):
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

