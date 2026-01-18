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
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = Query(None, description="Filter by active status. Default is None (all users)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all users with pagination - scoped by user's permissions"""
    query = db.query(User)
    
    # ENTITY ISOLATION ENFORCEMENT
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    user_warehouse_id = current_user.get("warehouse_id")
    
    # Super Admin bypasses all entity isolation
    if user_role != "super_admin":
        # 1. Warehouse Admin Scope
        if user_role == "warehouse_admin":
            if not user_warehouse_id:
                return {"items": [], "total": 0, "page": page, "size": size}
            query = query.filter(
                (User.assigned_warehouse_id == user_warehouse_id) | 
                (User.assigned_warehouse_id == None)
            )
            
        # 2. Shop Scope (Owners/Managers)
        elif user_role in ["shop_owner", "pharmacist", "pharmacy_admin"]:
            if not user_shop_id:
                 return {"items": [], "total": 0, "page": page, "size": size}
            query = query.filter(User.assigned_shop_id == user_shop_id)
            
        # 3. Regular Employees (Can only see themselves? Or their shop?)
        # Usually regular employees shouldn't be listing users, but if they do, restrict to self or shop
        elif user_role in ["cashier", "pharmacy_employee"]:
            if user_shop_id:
                 query = query.filter(User.assigned_shop_id == user_shop_id)
            else:
                 query = query.filter(User.id == current_user.get("user_id"))

    # Only apply filter if explicitly provided
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    # Sort by creation date descending (newest first)
    query = query.order_by(User.created_at.desc())
    
    total = query.count()
    users = query.offset((page - 1) * size).limit(size).all()
    
    return {
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "phone": u.phone,
                "role": u.role.value if hasattr(u.role, 'value') else (str(u.role) if u.role else None),
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
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission(["users.create"]))
):
    """Create a new user with permission-based role assignment"""
    try:
        # Get current user's role and warehouse
        user_role = current_user.get("role") if isinstance(current_user, dict) else current_user.role
        user_warehouse_id = current_user.get("warehouse_id") if isinstance(current_user, dict) else current_user.warehouse_id
        user_shop_id = current_user.get("shop_id") if isinstance(current_user, dict) else current_user.shop_id
        
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
                if role.name in ["warehouse_admin", "super_admin"]:
                    raise HTTPException(status_code=403, detail=f"You cannot assign '{role.name}' role.")
                if role.entity_type == "shop":
                     # Maybe Warehouse Admin CAN create shop users? Usually not. Assuming strict.
                    raise HTTPException(status_code=403, detail="Warehouse Admin cannot assign shop-level roles.")
            
            # Shop Owner restrictions
            if user_role in ["shop_owner", "pharmacy_admin"]:
                 if role.entity_type != "shop":
                      raise HTTPException(status_code=403, detail="You can only create shop-level users")
        
        elif user_data.role:
            # Legacy approach
            role_name = user_data.role
            valid_roles = [r.value for r in RoleType]
            if role_name not in valid_roles:
                raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
            
            if role_name == RoleType.SUPER_ADMIN.value:
                raise HTTPException(status_code=403, detail="Super Admin cannot be created through the API.")
            
            role = db.query(Role).filter(Role.name == role_name).first()
            try:
                role_enum = RoleType(role_name)
            except ValueError:
                role_enum = None
        
        # Enforce Entity Assignment
        
        # Warehouse Admin must assign users to their own warehouse
        if user_role == "warehouse_admin":
            if not user_warehouse_id:
                raise HTTPException(status_code=400, detail="Warehouse Admin must be assigned to a warehouse")
            user_data.assigned_warehouse_id = user_warehouse_id
            
        # Shop Owner must assign users to their own shop
        if user_role in ["shop_owner", "pharmacy_admin"]:
            if not user_shop_id:
                raise HTTPException(status_code=400, detail="Shop Admin must be assigned to a shop")
            user_data.assigned_shop_id = user_shop_id
        
        # Validate entity assignment based on role entity_type (General check)
        if role and role.entity_type == "warehouse":
            if not user_data.assigned_warehouse_id:
                raise HTTPException(status_code=400, detail=f"Role '{role.name}' requires assignment to a warehouse")
        elif role and role.entity_type == "shop":
            if not user_data.assigned_shop_id:
                raise HTTPException(status_code=400, detail=f"Role '{role.name}' requires assignment to a medical shop")
        
        # Check if email exists
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Determine the role enum value for legacy field
        role_enum_value = None
        if user_data.role:
            role_enum_value = role_enum if 'role_enum' in locals() else None
        
        user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            phone=user_data.phone,
            role=role_enum_value,
            role_id=role.id if role else None,
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
                "role": role.name if role else None,
                "role_id": user.role_id
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error creating user: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{user_id}")
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # PERMISSION CHECK
    current_user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    user_warehouse_id = current_user.get("warehouse_id")
    
    # 1. Self Access (Always Allowed)
    if current_user_id == user_id:
        pass
    # 2. Super Admin (Always Allowed)
    elif user_role == "super_admin":
        pass
    # 3. Warehouse Admin (Allowed if user in same warehouse)
    elif user_role == "warehouse_admin":
        if user.assigned_warehouse_id != user_warehouse_id:
             raise HTTPException(status_code=403, detail="Access denied to users outside your warehouse")
    # 4. Shop Owner/Admin (Allowed if user in same shop)
    elif user_role in ["shop_owner", "pharmacy_admin", "pharmacist"]:
         if user.assigned_shop_id != user_shop_id:
             raise HTTPException(status_code=403, detail="Access denied to users outside your shop")
    # 5. Others (Denied)
    else:
        raise HTTPException(status_code=403, detail="Access denied to user details")
            
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, 'value') else (str(user.role) if user.role else None),
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "last_login": user.last_login,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "assigned_warehouse_id": user.assigned_warehouse_id,
        "assigned_shop_id": user.assigned_shop_id
    }


@router.put("/{user_id}")
def update_user(
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
            # Convert empty strings to None for foreign key fields to avoid constraint violations
            if field in ["assigned_warehouse_id", "assigned_shop_id"] and value == "":
                value = None
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return APIResponse(message="User updated successfully")


@router.delete("/{user_id}")
def delete_user(
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
def list_roles(
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
def create_role(
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
def assign_role(
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
