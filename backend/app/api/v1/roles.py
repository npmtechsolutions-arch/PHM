"""
Roles Management API Routes - Permission-based authorization
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import Role, User, UserRole, Permission, RolePermission
from app.models.auth import (
    RoleCreate, RoleResponse, RoleUpdate, RoleListResponse,
    PermissionResponse
)
from app.core.security import require_permission, get_auth_context, AuthContext

router = APIRouter()


def role_to_response(role: Role) -> RoleResponse:
    """Convert Role model to RoleResponse schema"""
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        entity_type=role.entity_type,
        is_system=role.is_system,
        is_creatable=role.is_creatable,
        permissions=[
            PermissionResponse(
                id=p.id,
                code=p.code,
                module=p.module,
                action=p.action,
                scope=p.scope,
                description=p.description,
                created_at=p.created_at
            ) for p in role.permissions
        ],
        created_at=role.created_at
    )


@router.get("", response_model=RoleListResponse)
def list_roles(
    include_system: bool = True,
    creatable_only: bool = False,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.view", "roles.manage"]))
):
    """
    List all roles.
    - include_system: If false, exclude system roles like super_admin
    - creatable_only: If true, only return roles that can be assigned to users
    """
    query = db.query(Role)
    
    if not include_system:
        query = query.filter(Role.is_system == False)
    
    if creatable_only:
        query = query.filter(Role.is_creatable == True)
    
    roles = query.order_by(Role.name).all()
    
    return RoleListResponse(
        items=[role_to_response(role) for role in roles],
        total=len(roles)
    )


@router.get("/assignable")
def list_assignable_roles(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["users.create", "users.edit"]))
):
    """
    Get list of roles that can be assigned to users via the UI.
    Excludes super_admin and other non-creatable roles.
    """
    roles = db.query(Role).filter(
        Role.is_creatable == True
    ).order_by(Role.name).all()
    
    return {
        "roles": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "entity_type": r.entity_type
            } for r in roles
        ]
    }


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Create a new role with permissions"""
    # Check if role name already exists
    existing = db.query(Role).filter(Role.name == role_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with name '{role_data.name}' already exists"
        )
    
    # Create the role
    role = Role(
        name=role_data.name,
        description=role_data.description,
        entity_type=role_data.entity_type,
        is_system=False,
        is_creatable=True
    )
    
    db.add(role)
    db.flush()  # Get the role ID
    
    # Assign permissions if provided
    if role_data.permission_ids:
        permissions = db.query(Permission).filter(
            Permission.id.in_(role_data.permission_ids)
        ).all()
        role.permissions = permissions
    
    db.commit()
    db.refresh(role)
    
    return role_to_response(role)


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.view", "roles.manage"]))
):
    """Get a role by ID with all its permissions"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    return role_to_response(role)


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: str,
    update_data: RoleUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Update a role and its permissions"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Prevent modification of super_admin
    if role.name == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify super_admin role"
        )
    
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system roles"
        )
    
    # Update basic fields
    if update_data.name is not None:
        # Check name uniqueness
        existing = db.query(Role).filter(
            Role.name == update_data.name,
            Role.id != role_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with name '{update_data.name}' already exists"
            )
        role.name = update_data.name
    
    if update_data.description is not None:
        role.description = update_data.description
    
    # Update permissions if provided
    if update_data.permission_ids is not None:
        permissions = db.query(Permission).filter(
            Permission.id.in_(update_data.permission_ids)
        ).all()
        role.permissions = permissions
    
    db.commit()
    db.refresh(role)
    
    return role_to_response(role)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Delete a role"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system roles"
        )
    
    # Check if role is assigned to any users via role_id FK
    users_with_role = db.query(User).filter(User.role_id == role_id).count()
    if users_with_role > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role. It is assigned to {users_with_role} user(s)"
        )
    
    # Also check legacy UserRole table
    user_roles = db.query(UserRole).filter(UserRole.role_id == role_id).count()
    if user_roles > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role. It is assigned to {user_roles} user(s)"
        )
    
    db.delete(role)
    db.commit()


@router.post("/{role_id}/permissions/{permission_id}", status_code=status.HTTP_201_CREATED)
def add_permission_to_role(
    role_id: str,
    permission_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Add a single permission to a role"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.name == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot modify super_admin permissions")
    
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    # Check if already assigned
    if permission in role.permissions:
        return {"message": "Permission already assigned"}
    
    role.permissions.append(permission)
    db.commit()
    
    return {"message": "Permission added successfully"}


@router.delete("/{role_id}/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_permission_from_role(
    role_id: str,
    permission_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Remove a single permission from a role"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.name == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot modify super_admin permissions")
    
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    if permission in role.permissions:
        role.permissions.remove(permission)
        db.commit()


@router.post("/{role_id}/users/{user_id}", status_code=status.HTTP_201_CREATED)
def assign_role_to_user(
    role_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["users.edit"]))
):
    """Assign a role to a user (sets user.role_id)"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if not role.is_creatable:
        raise HTTPException(
            status_code=400,
            detail="This role cannot be assigned to users"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role_id = role_id
    db.commit()
    
    return {"message": "Role assigned successfully"}


@router.delete("/{role_id}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_role_from_user(
    role_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["users.edit"]))
):
    """Remove a role from a user (clears user.role_id)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role_id == role_id:
        user.role_id = None
        db.commit()
