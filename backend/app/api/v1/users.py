"""
Users API Routes - Permission-based authorization
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import logging

from app.models.auth import (
    UserCreate, UserUpdate, UserResponse, UserListResponse,
    RoleCreate, RoleResponse, AssignRoleRequest, RoleType
)
from app.models.common import APIResponse
from app.core.security import (
    get_current_user, require_role, require_permission, get_password_hash
)
from app.db.database import get_db
from app.db.models import User, Role, UserRole, Permission

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_permissions(db: Session, user: User) -> List[str]:
    """Get permission codes for a user based on their role"""
    permissions = []
    if user.role_id:
        role = db.query(Role).filter(Role.id == user.role_id).first()
        if role:
            permissions = [p.code for p in role.permissions]
    elif user.role:
        role_name = user.role.value if hasattr(user.role, 'value') else str(user.role)
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            permissions = [p.code for p in role.permissions]
    return permissions


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
    """List all users with pagination - scoped by user's permissions"""
    query = db.query(User)
    
    # Apply warehouse scope filtering for Warehouse Admin
    user_role = current_user.get("role")
    if user_role == "warehouse_admin":
        # Warehouse Admin can only see users from their warehouse
        warehouse_id = current_user.get("warehouse_id")
        if warehouse_id:
            query = query.filter(User.assigned_warehouse_id == warehouse_id)
        else:
            # If no warehouse assigned, return empty list
            return {
                "items": [],
                "total": 0,
                "page": page,
                "size": size
            }
    # Super Admin sees all users (no filter applied)
    
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
    current_user: dict = Depends(require_permission(["users.create"]))
):
    """Create a new user with permission-based role assignment"""
    try:
        print(f"=== USER CREATION START ===")
        print(f"User data received: {user_data.model_dump()}")
        print(f"Current user: {current_user}")
        
        # Get current user's role and warehouse
        user_role = current_user.get("role") if isinstance(current_user, dict) else current_user.role
        user_warehouse_id = current_user.get("warehouse_id") if isinstance(current_user, dict) else current_user.warehouse_id
        
        print(f"User role: {user_role}, Warehouse ID: {user_warehouse_id}")
    
        # Determine the role to assign
        role = None
        if user_data.role_id:
            # New permission-based approach: use role_id
            role = db.query(Role).filter(Role.id == user_data.role_id).first()
            if not role:
                raise HTTPException(status_code=400, detail="Invalid role_id")
            if not role.is_creatable:
                raise HTTPException(
                    status_code=403,
                    detail=f"Role '{role.name}' cannot be assigned via API. Contact system administrator."
                )
            
            # Warehouse Admin restrictions
            if user_role == "warehouse_admin":
                # Cannot assign warehouse_admin or super_admin roles
                if role.name in ["warehouse_admin", "super_admin"]:
                    raise HTTPException(
                        status_code=403,
                        detail=f"You cannot assign '{role.name}' role. Contact Super Admin."
                    )
                # Cannot assign shop-level roles
                if role.entity_type == "shop":
                    raise HTTPException(
                        status_code=403,
                        detail=f"Warehouse Admin cannot assign shop-level roles. Contact Super Admin."
                    )
                    
        elif user_data.role:
            # Legacy approach: role sent as string name
            role_name = user_data.role
            
            # Validate against RoleType enum values
            valid_roles = [r.value for r in RoleType]
            if role_name not in valid_roles:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
                )
            
            # Prevent super_admin creation via API
            if role_name == RoleType.SUPER_ADMIN.value:
                raise HTTPException(
                    status_code=403,
                    detail="Super Admin cannot be created through the API. Contact system administrator."
                )
            
            # Find the role in database
            role = db.query(Role).filter(Role.name == role_name).first()
            
            # Convert string to RoleType enum for database storage
            try:
                role_enum = RoleType(role_name)
            except ValueError:
                role_enum = None
        
        # Warehouse Admin must assign users to their own warehouse
        if user_role == "warehouse_admin":
            if not user_warehouse_id:
                raise HTTPException(
                    status_code=400,
                    detail="Warehouse Admin must be assigned to a warehouse"
                )
            # Force the new user to be assigned to the same warehouse
            user_data.assigned_warehouse_id = user_warehouse_id
        
        # Validate entity assignment based on role entity_type
        if role and role.entity_type == "warehouse":
            if not user_data.assigned_warehouse_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Role '{role.name}' requires assignment to a warehouse"
                )
        elif role and role.entity_type == "shop":
            if not user_data.assigned_shop_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Role '{role.name}' requires assignment to a medical shop"
                )
        
        # Check if email exists
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Determine the role enum value for legacy field
        role_enum_value = None
        if user_data.role:
            # role_enum was set in the elif block above
            role_enum_value = role_enum if 'role_enum' in locals() else None
        
        user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            phone=user_data.phone,
            role=role_enum_value,  # Legacy enum field
            role_id=role.id if role else None,  # New FK
            assigned_warehouse_id=user_data.assigned_warehouse_id if user_data.assigned_warehouse_id else None,
            assigned_shop_id=user_data.assigned_shop_id if user_data.assigned_shop_id else None,
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"User created successfully: {user.id}")
        
        return APIResponse(
            message="User created successfully",
            data={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": role.name if role else None,
                "role_id": user.role_id
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
    
    # Handle role_id update with validation
    if "role_id" in update_data and update_data["role_id"]:
        new_role = db.query(Role).filter(Role.id == update_data["role_id"]).first()
        if not new_role:
            raise HTTPException(status_code=400, detail="Invalid role_id")
        if not new_role.is_creatable:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{new_role.name}' cannot be assigned via API. Contact system administrator."
            )
        # Update the role_id
        user.role_id = update_data["role_id"]
        # Also update legacy role field if it exists
        if hasattr(user, 'role'):
            try:
                user.role = RoleType(new_role.name)
            except ValueError:
                # If role name doesn't match enum, leave it as is
                pass
    
    # Update other fields
    for field, value in update_data.items():
        if field == "password" and value:
            setattr(user, "password_hash", get_password_hash(value))
        elif field not in ["password", "role_id"]:  # role_id already handled above
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
    
    if user_id == current_user.user_id:
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
