"""
Login Activity API Routes - Read-only for Super Admin
"""
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import LoginAuditLog, User
from app.api.v1.auth import get_current_user

router = APIRouter()


# ==================== SCHEMAS ====================

class LoginActivityResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_email: str
    user_role: Optional[str] = None
    action: str  # login_success, login_failed, logout
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoginActivityListResponse(BaseModel):
    items: List[LoginActivityResponse]
    total: int
    page: int
    size: int


# ==================== ENDPOINTS ====================

@router.get("", response_model=LoginActivityListResponse)
def list_login_activity(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[str] = None,  # success, failed
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List login activity with pagination and filters (Super Admin only)"""
    # Only super_admin should access this
    if current_user.get("role") != "super_admin":
        return LoginActivityListResponse(items=[], total=0, page=page, size=size)
    
    query = db.query(LoginAuditLog)
    
    if action:
        query = query.filter(LoginAuditLog.action == action)
    
    if status:
        if status == "success":
            query = query.filter(LoginAuditLog.action == "login_success")
        elif status == "failed":
            query = query.filter(LoginAuditLog.action == "login_failed")
    
    if user_id:
        query = query.filter(LoginAuditLog.user_id == user_id)
    
    if date_from:
        query = query.filter(LoginAuditLog.created_at >= datetime.combine(date_from, datetime.min.time()))
    
    if date_to:
        query = query.filter(LoginAuditLog.created_at <= datetime.combine(date_to, datetime.max.time()))
    
    total = query.count()
    skip = (page - 1) * size
    logs = query.order_by(LoginAuditLog.created_at.desc()).offset(skip).limit(size).all()
    
    # Enrich with user info
    items = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "user_email": log.email,
            "action": log.action,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at,
            "user_name": None,
            "user_role": None
        }
        
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                log_dict["user_name"] = user.full_name
                log_dict["user_role"] = user.role.value if hasattr(user.role, 'value') else (str(user.role) if user.role else None)
        
        items.append(LoginActivityResponse(**log_dict))
    
    return LoginActivityListResponse(items=items, total=total, page=page, size=size)


@router.get("/stats")
def get_login_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get login activity statistics"""
    if current_user.get("role") != "super_admin":
        return {"total": 0, "successful": 0, "failed": 0}
    
    from sqlalchemy import func
    
    total = db.query(func.count(LoginAuditLog.id)).scalar()
    successful = db.query(func.count(LoginAuditLog.id)).filter(LoginAuditLog.action == "login_success").scalar()
    failed = db.query(func.count(LoginAuditLog.id)).filter(LoginAuditLog.action == "login_failed").scalar()
    
    return {
        "total": total or 0,
        "successful": successful or 0,
        "failed": failed or 0
    }
