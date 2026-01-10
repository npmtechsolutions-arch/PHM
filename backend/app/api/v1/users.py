"""
Users API Routes - Database Connected
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

from app.models.auth import (
    UserCreate, UserUpdate, UserResponse, UserListResponse,
    RoleCreate, RoleResponse, AssignRoleRequest, RoleType
)
from app.models.common import APIResponse
from app.core.security import get_current_user, require_role, get_password_hash
from app.db.database import get_db
from app.db.models import User, Role, UserRole

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = Query(True, description="Filter by active status. Default is True (active users only)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all users with pagination"""
    query = db.query(User)
    
    # Default: only show active users unless explicitly requested
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    total = query.count()
    users = query.offset((page - 1) * size).limit(size).all()
    
    return {
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "phone": u.phone,
                "role": u.role.value if u.role else None,
                "is_active": u.is_active,
                "last_login": u.last_login,
                "created_at": u.created_at,
                "assigned_warehouse_id": u.assigned_warehouse_id,
                "assigned_shop_id": u.assigned_shop_id
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "size": size
    }


@router.post("")
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Create a new user"""
    logger.info(f"Creating user with data: {user_data.model_dump()}")
    
    # SECURITY: Block super_admin creation from API
    if user_data.role == RoleType.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Super Admin cannot be created through the API. Contact system administrator."
        )
    
    # Validate entity assignment based on role
    if user_data.role == RoleType.WAREHOUSE_ADMIN:
        if not user_data.assigned_warehouse_id:
            raise HTTPException(
                status_code=400,
                detail="Warehouse Admin must be assigned to a warehouse"
            )
    elif user_data.role in [RoleType.SHOP_OWNER, RoleType.PHARMACIST, RoleType.CASHIER, RoleType.HR_MANAGER, RoleType.ACCOUNTANT]:
        if not user_data.assigned_shop_id:
            raise HTTPException(
                status_code=400,
                detail=f"{user_data.role.value} must be assigned to a medical shop"
            )
    
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role,
        # Convert empty strings to None for foreign key fields
        assigned_warehouse_id=user_data.assigned_warehouse_id if user_data.assigned_warehouse_id else None,
        assigned_shop_id=user_data.assigned_shop_id if user_data.assigned_shop_id else None,
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return APIResponse(
        message="User created successfully",
        data={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value
        }
    )


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value if user.role else None,
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "last_login": user.last_login,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "assigned_warehouse_id": user.assigned_warehouse_id,
        "assigned_shop_id": user.assigned_shop_id
    }


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only super_admin can update other users
    if current_user["user_id"] != user_id and current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            setattr(user, "password_hash", get_password_hash(value))
        elif field != "password":
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return APIResponse(message="User updated successfully")


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Delete (deactivate) user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Soft delete
    user.is_active = False
    db.commit()
    
    return APIResponse(message="User deleted successfully")


# ==================== ROLE ENDPOINTS ====================

@router.get("/roles/list")
async def list_roles(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all roles"""
    roles = db.query(Role).all()
    
    return {
        "roles": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "permissions": r.permissions,
                "is_system": r.is_system,
                "created_at": r.created_at
            }
            for r in roles
        ]
    }


@router.post("/roles")
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Create a new role"""
    existing = db.query(Role).filter(Role.name == role_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    
    role = Role(
        name=role_data.name,
        description=role_data.description,
        permissions=",".join(role_data.permissions) if role_data.permissions else ""
    )
    
    db.add(role)
    db.commit()
    db.refresh(role)
    
    return APIResponse(message="Role created successfully", data={"id": role.id})


@router.post("/{user_id}/roles")
async def assign_role(
    user_id: str,
    request: AssignRoleRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Assign role to user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    role = db.query(Role).filter(Role.id == request.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Check if already assigned
    existing = db.query(UserRole).filter(
        UserRole.user_id == user_id,
        UserRole.role_id == request.role_id
    ).first()
    
    if not existing:
        user_role = UserRole(user_id=user_id, role_id=request.role_id)
        db.add(user_role)
        db.commit()
    
    return APIResponse(message="Role assigned successfully")
