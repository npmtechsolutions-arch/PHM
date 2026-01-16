"""
Permissions Management API Routes - CRUD for permissions (Super Admin only)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.db.models import Permission, RolePermission
from app.models.auth import (
    PermissionCreate, PermissionResponse, PermissionListResponse
)
from app.core.security import require_permission, get_auth_context, AuthContext

router = APIRouter()


@router.get("", response_model=PermissionListResponse)
def list_permissions(
    module: str = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """List all permissions (filterable by module)"""
    query = db.query(Permission)
    
    if module:
        query = query.filter(Permission.module == module)
    
    permissions = query.order_by(Permission.module, Permission.action).all()
    
    return PermissionListResponse(
        items=[
            PermissionResponse(
                id=p.id,
                code=p.code,
                module=p.module,
                action=p.action,
                scope=p.scope,
                description=p.description,
                created_at=p.created_at
            ) for p in permissions
        ],
        total=len(permissions)
    )


@router.get("/modules")
def list_permission_modules(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Get list of unique permission modules"""
    modules = db.query(Permission.module).distinct().all()
    return {"modules": [m[0] for m in modules]}


@router.get("/my")
def get_my_permissions(
    auth: AuthContext = Depends(get_auth_context)
):
    """Get current user's permissions"""
    return {
        "permissions": auth.permissions,
        "role": auth.role,
        "role_id": auth.role_id
    }


@router.post("", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
def create_permission(
    permission_data: PermissionCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Create a new permission (Super Admin only)"""
    # Check if permission code already exists
    existing = db.query(Permission).filter(Permission.code == permission_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Permission with code '{permission_data.code}' already exists"
        )
    
    permission = Permission(
        code=permission_data.code,
        module=permission_data.module,
        action=permission_data.action,
        scope=permission_data.scope,
        description=permission_data.description
    )
    
    db.add(permission)
    db.commit()
    db.refresh(permission)
    
    return PermissionResponse(
        id=permission.id,
        code=permission.code,
        module=permission.module,
        action=permission.action,
        scope=permission.scope,
        description=permission.description,
        created_at=permission.created_at
    )


@router.get("/{permission_id}", response_model=PermissionResponse)
def get_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Get a permission by ID"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    return PermissionResponse(
        id=permission.id,
        code=permission.code,
        module=permission.module,
        action=permission.action,
        scope=permission.scope,
        description=permission.description,
        created_at=permission.created_at
    )


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permission(
    permission_id: str,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_permission(["roles.manage"]))
):
    """Delete a permission (Super Admin only)"""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    # Check if permission is assigned to any roles
    assignments = db.query(RolePermission).filter(RolePermission.permission_id == permission_id).count()
    if assignments > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete permission. It is assigned to {assignments} role(s). Remove from roles first."
        )
    
    db.delete(permission)
    db.commit()
