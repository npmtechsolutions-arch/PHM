"""
Inventory Alerts API - Low Stock and Expiry Warnings
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional
from datetime import datetime, timedelta

from app.core.security import get_current_user, get_auth_context, AuthContext
from app.db.database import get_db
from app.db.models import (
    Medicine, Batch, ShopStock, WarehouseStock, MedicalShop, Warehouse
)

router = APIRouter()


@router.get("/low-stock")
def get_low_stock_alerts(
    shop_id: Optional[str] = None,
   warehouse_id: Optional[str] = None,
    threshold_multiplier: float = Query(1.0, description="Multiplier for reorder_level (1.0 = at reorder level, 0.5 = 50% of reorder level)"),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(get_auth_context)
):
    """Get medicines with low stock based on reorder level"""
    alerts = []
    
    # Shop-level low stock
    if shop_id or auth.shop_id:
        target_shop_id = shop_id or auth.shop_id
        shop = db.query(MedicalShop).filter(MedicalShop.id == target_shop_id).first()
        
        # Get all medicines with stock in this shop
        stock_query = db.query(
            ShopStock.medicine_id,
            func.sum(ShopStock.quantity).label('total_quantity')
        ).filter(
            ShopStock.shop_id == target_shop_id
        ).group_by(ShopStock.medicine_id)
        
        for stock_record in stock_query.all():
            medicine = db.query(Medicine).filter(Medicine.id == stock_record.medicine_id).first()
            if medicine:
                threshold = medicine.reorder_level * threshold_multiplier
                if stock_record.total_quantity < threshold:
                    alerts.append({
                        "medicine_id": medicine.id,
                        "medicine_name": medicine.name,
                        "brand": medicine.brand,
                        "generic_name": medicine.generic_name,
                        "current_stock": stock_record.total_quantity,
                        "reorder_level": medicine.reorder_level,
                        "location_type": "shop",
                        "location_id": target_shop_id,
                        "location_name": shop.name if shop else "Unknown",
                        "severity": "critical" if stock_record.total_quantity < threshold * 0.5 else "warning"
                    })
    
    # Warehouse-level low stock
    elif warehouse_id or auth.warehouse_id:
        target_warehouse_id = warehouse_id or auth.warehouse_id
        warehouse = db.query(Warehouse).filter(Warehouse.id == target_warehouse_id).first()
        
        stock_query = db.query(
            WarehouseStock.medicine_id,
            func.sum(WarehouseStock.quantity).label('total_quantity')
        ).filter(
            WarehouseStock.warehouse_id == target_warehouse_id
        ).group_by(WarehouseStock.medicine_id)
        
        for stock_record in stock_query.all():
            medicine = db.query(Medicine).filter(Medicine.id == stock_record.medicine_id).first()
            if medicine:
                threshold = medicine.reorder_level * threshold_multiplier
                if stock_record.total_quantity < threshold:
                    alerts.append({
                        "medicine_id": medicine.id,
                        "medicine_name": medicine.name,
                        "brand": medicine.brand,
                        "generic_name": medicine.generic_name,
                        "current_stock": stock_record.total_quantity,
                        "reorder_level": medicine.reorder_level,
                        "location_type": "warehouse",
                        "location_id": target_warehouse_id,
                        "location_name": warehouse.name if warehouse else "Unknown",
                        "severity": "critical" if stock_record.total_quantity < threshold * 0.5 else "warning"
                    })
    
    return {
        "total_alerts": len(alerts),
        "critical_count": len([a for a in alerts if a["severity"] == "critical"]),
        "warning_count": len([a for a in alerts if a["severity"] == "warning"]),
        "alerts": sorted(alerts, key=lambda x: x["current_stock"])
    }


@router.get("/expiry-alerts")
def get_expiry_alerts(
    shop_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    days_threshold: int = Query(90, description="Alert for batches expiring within N days"),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(get_auth_context)
):
    """Get medicines with batches approaching expiry"""
    alerts = []
    today = datetime.now().date()
    alert_date = today + timedelta(days=days_threshold)
    
    # Shop-level expiry alerts
    if shop_id or auth.shop_id:
        target_shop_id = shop_id or auth.shop_id
        shop = db.query(MedicalShop).filter(MedicalShop.id == target_shop_id).first()
        
        # Get all batches in shop stock
        stock_query = db.query(ShopStock).filter(
            ShopStock.shop_id == target_shop_id,
            ShopStock.quantity > 0
        ).all()
        
        for stock in stock_query:
            batch = db.query(Batch).filter(Batch.id == stock.batch_id).first()
            if batch and batch.expiry_date:
                days_to_expiry = (batch.expiry_date - today).days
                
                if batch.expiry_date <= alert_date:
                    medicine = db.query(Medicine).filter(Medicine.id == stock.medicine_id).first()
                    
                    # Determine severity
                    if days_to_expiry < 0:
                        severity = "expired"
                    elif days_to_expiry <= 30:
                        severity = "critical"
                    elif days_to_expiry <= 60:
                        severity = "warning"
                    else:
                        severity = "notice"
                    
                    alerts.append({
                        "medicine_id": medicine.id if medicine else None,
                        "medicine_name": medicine.name if medicine else "Unknown",
                        "brand": medicine.brand if medicine else None,
                        "batch_id": batch.id,
                        "batch_number": batch.batch_number,
                        "expiry_date": batch.expiry_date.isoformat(),
                        "days_to_expiry": days_to_expiry,
                        "quantity": stock.quantity,
                        "location_type": "shop",
                        "location_id": target_shop_id,
                        "location_name": shop.name if shop else "Unknown",
                        "severity": severity
                    })
    
    # Warehouse-level expiry alerts
    elif warehouse_id or auth.warehouse_id:
        target_warehouse_id = warehouse_id or auth.warehouse_id
        warehouse = db.query(Warehouse).filter(Warehouse.id == target_warehouse_id).first()
        
        stock_query = db.query(WarehouseStock).filter(
            WarehouseStock.warehouse_id == target_warehouse_id,
            WarehouseStock.quantity > 0
        ).all()
        
        for stock in stock_query:
            batch = db.query(Batch).filter(Batch.id == stock.batch_id).first()
            if batch and batch.expiry_date:
                days_to_expiry = (batch.expiry_date - today).days
                
                if batch.expiry_date <= alert_date:
                    medicine = db.query(Medicine).filter(Medicine.id == stock.medicine_id).first()
                    
                    if days_to_expiry < 0:
                        severity = "expired"
                    elif days_to_expiry <= 30:
                        severity = "critical"
                    elif days_to_expiry <= 60:
                        severity = "warning"
                    else:
                        severity = "notice"
                    
                    alerts.append({
                        "medicine_id": medicine.id if medicine else None,
                        "medicine_name": medicine.name if medicine else "Unknown",
                        "brand": medicine.brand if medicine else None,
                        "batch_id": batch.id,
                        "batch_number": batch.batch_number,
                        "expiry_date": batch.expiry_date.isoformat(),
                        "days_to_expiry": days_to_expiry,
                        "quantity": stock.quantity,
                        "location_type": "warehouse",
                        "location_id": target_warehouse_id,
                        "location_name": warehouse.name if warehouse else "Unknown",
                        "severity": severity
                    })
    
    return {
        "total_alerts": len(alerts),
        "expired_count": len([a for a in alerts if a["severity"] == "expired"]),
        "critical_count": len([a for a in alerts if a["severity"] == "critical"]),
        "warning_count": len([a for a in alerts if a["severity"] == "warning"]),
        "alerts": sorted(alerts, key=lambda x: x["days_to_expiry"])
    }


@router.get("/dashboard-summary")
def get_dashboard_summary(
    shop_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(get_auth_context)
):
    """Get combined summary for dashboard widget"""
    # Get low stock count
    low_stock_response = get_low_stock_alerts(
        shop_id=shop_id,
        warehouse_id=warehouse_id,
        threshold_multiplier=1.0,
        db=db,
        auth=auth
    )
    
    # Get expiry alerts count
    expiry_response = get_expiry_alerts(
        shop_id=shop_id,
        warehouse_id=warehouse_id,
        days_threshold=90,
        db=db,
        auth=auth
    )
    
    return {
        "low_stock": {
            "total": low_stock_response["total_alerts"],
            "critical": low_stock_response["critical_count"]
        },
        "expiry": {
            "total": expiry_response["total_alerts"],
            "expired": expiry_response["expired_count"],
            "critical": expiry_response["critical_count"]
        }
    }
