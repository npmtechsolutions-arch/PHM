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
    warehouse_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None


@router.get("")
def list_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all notifications for the current user or their shop/warehouse"""
    from sqlalchemy import or_
    
    # Filter by User OR Shop OR Warehouse
    user_id = current_user.get("user_id")
    shop_id = current_user.get("shop_id")
    warehouse_id = current_user.get("warehouse_id")
    
    query = db.query(Notification)
    
    # User can see:
    # 1. Notifications explicitly for them (user_id)
    # 2. Notifications for their shop (shop_id) - e.g. "Low Stock" for shop
    # 3. Notifications for their warehouse (reference_type='warehouse' and reference_id=warehouse_id)
    
    filters = [Notification.user_id == user_id]
    if shop_id:
        filters.append(Notification.shop_id == shop_id)
    if warehouse_id:
        filters.append(
            and_(
                Notification.reference_type == 'warehouse',
                Notification.reference_id == warehouse_id
            )
        )
        
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
        reference_type=notification_data.reference_type,
        reference_id=notification_data.reference_id or notification_data.warehouse_id,
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
    from sqlalchemy import or_, and_
    user_id = current_user.get("user_id")
    shop_id = current_user.get("shop_id")
    warehouse_id = current_user.get("warehouse_id")
    
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Verify ownership
    has_access = False
    if notification.user_id == user_id:
        has_access = True
    elif shop_id and notification.shop_id == shop_id:
        has_access = True
    elif warehouse_id and notification.reference_type == 'warehouse' and notification.reference_id == warehouse_id:
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
    from sqlalchemy import or_, and_
    user_id = current_user.get("user_id")
    shop_id = current_user.get("shop_id")
    warehouse_id = current_user.get("warehouse_id")
    
    filters = [Notification.user_id == user_id]
    if shop_id:
        filters.append(Notification.shop_id == shop_id)
    if warehouse_id:
        filters.append(
            and_(
                Notification.reference_type == 'warehouse',
                Notification.reference_id == warehouse_id
            )
        )
    
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
    from sqlalchemy import or_, and_
    user_id = current_user.get("user_id")
    shop_id = current_user.get("shop_id")
    warehouse_id = current_user.get("warehouse_id")

    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Verify ownership
    has_access = False
    if notification.user_id == user_id:
        has_access = True
    elif shop_id and notification.shop_id == shop_id:
        has_access = True
    elif warehouse_id and notification.reference_type == 'warehouse' and notification.reference_id == warehouse_id:
        has_access = True
        
    if not has_access:
         raise HTTPException(status_code=403, detail="Access denied to this notification")

    db.delete(notification)
    db.commit()
    
    return APIResponse(message="Notification deleted")


@router.post("/generate-from-alerts")
def generate_notifications_from_alerts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate notifications from low stock alerts for both shops and warehouses"""
    from app.core.security import get_auth_context
    from app.db.models import MedicalShop, Warehouse, User, Medicine
    from sqlalchemy import func
    
    auth = get_auth_context(current_user, db)
    created_count = 0
    
    # Get all shops and warehouses the user has access to
    shops = []
    warehouses = []
    
    if current_user.get("role") == "super_admin":
        # Super admin can see all
        shops = db.query(MedicalShop).all()
        warehouses = db.query(Warehouse).all()
    else:
        # Get user's assigned shop/warehouse
        user = db.query(User).filter(User.id == current_user.get("user_id")).first()
        if user and user.assigned_shop_id:
            shop = db.query(MedicalShop).filter(MedicalShop.id == user.assigned_shop_id).first()
            if shop:
                shops.append(shop)
        if user and user.assigned_warehouse_id:
            warehouse = db.query(Warehouse).filter(Warehouse.id == user.assigned_warehouse_id).first()
            if warehouse:
                warehouses.append(warehouse)
    
    # Helper function to get low stock alerts
    def get_low_stock_for_location(shop_id=None, warehouse_id=None):
        from app.db.models import ShopStock, WarehouseStock
        alerts = []
        threshold_multiplier = 1.0
        
        if shop_id:
            stock_query = db.query(
                ShopStock.medicine_id,
                func.sum(ShopStock.quantity).label('total_quantity')
            ).filter(
                ShopStock.shop_id == shop_id
            ).group_by(ShopStock.medicine_id)
            
            for stock_record in stock_query.all():
                medicine = db.query(Medicine).filter(Medicine.id == stock_record.medicine_id).first()
                if medicine:
                    threshold = medicine.reorder_level * threshold_multiplier
                    if stock_record.total_quantity < threshold:
                        alerts.append({
                            "medicine_name": medicine.name,
                            "current_stock": stock_record.total_quantity,
                            "reorder_level": medicine.reorder_level,
                            "severity": "critical" if stock_record.total_quantity < threshold * 0.5 else "warning"
                        })
        
        elif warehouse_id:
            stock_query = db.query(
                WarehouseStock.medicine_id,
                func.sum(WarehouseStock.quantity).label('total_quantity')
            ).filter(
                WarehouseStock.warehouse_id == warehouse_id
            ).group_by(WarehouseStock.medicine_id)
            
            for stock_record in stock_query.all():
                medicine = db.query(Medicine).filter(Medicine.id == stock_record.medicine_id).first()
                if medicine:
                    threshold = medicine.reorder_level * threshold_multiplier
                    if stock_record.total_quantity < threshold:
                        alerts.append({
                            "medicine_name": medicine.name,
                            "current_stock": stock_record.total_quantity,
                            "reorder_level": medicine.reorder_level,
                            "severity": "critical" if stock_record.total_quantity < threshold * 0.5 else "warning"
                        })
        
        return alerts
    
    # Generate notifications for shops
    for shop in shops:
        alerts = get_low_stock_for_location(shop_id=shop.id)
        critical_alerts = [a for a in alerts if a.get("severity") == "critical"]
        
        if critical_alerts:
            # Create aggregated notification for critical low stock
            count = len(critical_alerts)
            medicine_names = ", ".join([a["medicine_name"] for a in critical_alerts[:3]])
            if count > 3:
                medicine_names += f" and {count - 3} more"
            
            notification = Notification(
                type="low_stock",
                title=f"Critical Low Stock Alert - {shop.name}",
                message=f"{count} medicine(s) have critical low stock: {medicine_names}. Current stock is below 50% of reorder level.",
                priority="high",
                shop_id=shop.id,
                reference_type="shop",
                reference_id=shop.id,
                is_read=False
            )
            db.add(notification)
            created_count += 1
    
    # Generate notifications for warehouses
    for warehouse in warehouses:
        alerts = get_low_stock_for_location(warehouse_id=warehouse.id)
        critical_alerts = [a for a in alerts if a.get("severity") == "critical"]
        
        if critical_alerts:
            count = len(critical_alerts)
            medicine_names = ", ".join([a["medicine_name"] for a in critical_alerts[:3]])
            if count > 3:
                medicine_names += f" and {count - 3} more"
            
            notification = Notification(
                type="low_stock",
                title=f"Critical Low Stock Alert - {warehouse.name}",
                message=f"{count} medicine(s) have critical low stock: {medicine_names}. Current stock is below 50% of reorder level.",
                priority="high",
                reference_type="warehouse",
                reference_id=warehouse.id,
                is_read=False
            )
            db.add(notification)
            created_count += 1
    
    db.commit()
    
    return APIResponse(
        message=f"Generated {created_count} low stock notifications",
        data={"created_count": created_count}
    )
