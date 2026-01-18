"""
Audit Logs API Routes - Read-only for Super Admin
"""
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AuditLog, User
from app.api.v1.auth import get_current_user

router = APIRouter()


# ==================== SCHEMAS ====================

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    size: int


# ==================== ENDPOINTS ====================

@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List audit logs with pagination and filters (Super Admin only)"""
    # Only super_admin should access this
    if current_user.get("role") != "super_admin":
        return AuditLogListResponse(items=[], total=0, page=page, size=size)
    
    query = db.query(AuditLog)
    
    if action:
        query = query.filter(AuditLog.action == action.upper())
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if date_from:
        query = query.filter(AuditLog.created_at >= datetime.combine(date_from, datetime.min.time()))
    
    if date_to:
        query = query.filter(AuditLog.created_at <= datetime.combine(date_to, datetime.max.time()))
    
    total = query.count()
    skip = (page - 1) * size
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(size).all()
    
    # Enrich with user info
    items = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "entity_name": None,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
            "user_name": None,
            "user_role": None
        }
        
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                log_dict["user_name"] = user.full_name
                log_dict["user_role"] = user.role.value if hasattr(user.role, 'value') else (str(user.role) if user.role else None)
        
        items.append(AuditLogResponse(**log_dict))
    
    return AuditLogListResponse(items=items, total=total, page=page, size=size)


@router.get("/stats")
def get_audit_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get audit log statistics"""
    if current_user.get("role") != "super_admin":
        return {"total": 0, "creates": 0, "updates": 0, "deletes": 0}
    
    from sqlalchemy import func
    
    total = db.query(func.count(AuditLog.id)).scalar()
    creates = db.query(func.count(AuditLog.id)).filter(AuditLog.action == "CREATE").scalar()
    updates = db.query(func.count(AuditLog.id)).filter(AuditLog.action == "UPDATE").scalar()
    deletes = db.query(func.count(AuditLog.id)).filter(AuditLog.action == "DELETE").scalar()
    
    return {
        "total": total or 0,
        "creates": creates or 0,
        "updates": updates or 0,
        "deletes": deletes or 0
    }
