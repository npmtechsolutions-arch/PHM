"""
Notifications API Routes - Database Connected
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.models.common import APIResponse
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import Notification

router = APIRouter()


class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    priority: Optional[str] = "medium"
    user_id: Optional[str] = None
    shop_id: Optional[str] = None


@router.get("")
def list_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all notifications for the current user or their shop"""
    from sqlalchemy import or_
    
    # Filter by User OR Shop
    user_id = current_user.get("user_id")
    shop_id = current_user.get("shop_id")
    
    query = db.query(Notification)
    
    # User can see:
    # 1. Notifications explicitly for them (user_id)
    # 2. Notifications for their shop (shop_id) - e.g. "Low Stock" for shop
    # 3. Global notifications? (Maybe user_id=None and shop_id=None? Unsafe unless specified)
    
    filters = [Notification.user_id == user_id]
    if shop_id:
        filters.append(Notification.shop_id == shop_id)
        
    query = query.filter(or_(*filters))

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    if notification_type:
        query = query.filter(Notification.type == notification_type)
    
    # Calculate unread count specifically for this user context
    unread_query = db.query(Notification).filter(or_(*filters)).filter(Notification.is_read == False)
    unread_count = unread_query.count()
    
    query = query.order_by(Notification.created_at.desc())
    total = query.count()
    notifications = query.offset((page - 1) * size).limit(size).all()
    
    return {
        "notifications": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "priority": n.priority,
                "is_read": n.is_read,
                "created_at": n.created_at
            }
            for n in notifications
        ],
        "total": total,
        "page": page,
        "size": size,
        "unread_count": unread_count
    }


@router.post("")
def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new notification (Internal use or Admin)"""
    # Ideally should limit who can create notifications, but assumed internal/admin for now
    
    notification = Notification(
        type=notification_data.type,
        title=notification_data.title,
        message=notification_data.message,
        priority=notification_data.priority or "medium",
        user_id=notification_data.user_id,
        shop_id=notification_data.shop_id,
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return APIResponse(message="Notification created", data={"id": notification.id})


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    from sqlalchemy import or_
    user_id = current_user.get("user_id")
    shop_id = current_user.get("shop_id")
    
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Verify ownership
    has_access = False
    if notification.user_id == user_id:
        has_access = True
    elif shop_id and notification.shop_id == shop_id:
        has_access = True
        
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this notification")
    
    notification.is_read = True
    db.commit()
    
    return APIResponse(message="Notification marked as read")


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read for current user"""
    from sqlalchemy import or_
    user_id = current_user.get("user_id")
    shop_id = current_user.get("shop_id")
    
    filters = [Notification.user_id == user_id]
    if shop_id:
        filters.append(Notification.shop_id == shop_id)
    
    db.query(Notification).filter(or_(*filters)).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    
    return APIResponse(message="All notifications marked as read")


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification"""
    from sqlalchemy import or_
    user_id = current_user.get("user_id")
    shop_id = current_user.get("shop_id")

    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Verify ownership
    has_access = False
    if notification.user_id == user_id:
        has_access = True
    elif shop_id and notification.shop_id == shop_id:
        has_access = True
        
    if not has_access:
         raise HTTPException(status_code=403, detail="Access denied to this notification")

    db.delete(notification)
    db.commit()
    
    return APIResponse(message="Notification deleted")
