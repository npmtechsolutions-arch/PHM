"""
Reports API Routes - Database Connected
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import Invoice, InvoiceItem, Batch, Medicine, MedicalShop

router = APIRouter()


@router.get("/sales")
def get_sales_report(
    shop_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get overall sales report"""
    # ENTITY ISOLATION
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    
    # Shop roles must filter by their shop
    if user_role in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin"] or (user_role and user_shop_id):
        if user_shop_id:
            shop_id = user_shop_id
        if not shop_id:
            raise HTTPException(status_code=403, detail="No shop assigned to user")
            
    query = db.query(Invoice).filter(Invoice.status == "completed")
    
    # Enforce shop_id filter
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
        # If user tried to request another shop, this filter (or overriding shop_id above) handles it.
        # But if they are shop owner and pass standard query param diff shop_id, filtering twice with diff IDs returns empty, which is safe.
        # But let's check explicitly if we want to be nice:
        if user_shop_id and shop_id != user_shop_id:
             raise HTTPException(status_code=403, detail="Access denied to this shop's data")

    if date_from:
        query = query.filter(Invoice.created_at >= date_from)
    if date_to:
        query = query.filter(Invoice.created_at <= date_to)
    
    total_invoices = query.count()
    
    # Sum total from the filtered invoices
    # Note: Using python sum on query is slow for reports, prefer SQL sum.
    # But filtering the query first, then summing column:
    total_sales = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == "completed"
    )
    if shop_id:
        total_sales = total_sales.filter(Invoice.shop_id == shop_id)
    if date_from:
        total_sales = total_sales.filter(Invoice.created_at >= date_from)
    if date_to:
        total_sales = total_sales.filter(Invoice.created_at <= date_to)
        
    total_sales_val = total_sales.scalar() or 0
    
    avg_order = total_sales_val / total_invoices if total_invoices > 0 else 0
    
    return {
        "period": {"from": date_from, "to": date_to},
        "total_sales": float(total_sales_val),
        "total_invoices": total_invoices,
        "average_order_value": float(avg_order),
        "top_products": []
    }


@router.get("/sales/daily")
def get_daily_sales(
    shop_id: Optional[str] = None,
    report_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get daily sales report"""
    # ENTITY ISOLATION
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    if user_role in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin"] or (user_role and user_shop_id):
        if user_shop_id:
            shop_id = user_shop_id

    target_date = date.fromisoformat(report_date) if report_date else date.today()
    
    query = db.query(Invoice).filter(
        Invoice.status == "completed",
        func.date(Invoice.created_at) == target_date
    )
    
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
    
    invoices = query.all()
    total_sales = sum(inv.total_amount or 0 for inv in invoices)
    total_tax = sum(inv.tax_amount or 0 for inv in invoices)
    
    return {
        "date": target_date.isoformat(),
        "shop_id": shop_id,
        "total_sales": float(total_sales),
        "total_invoices": len(invoices),
        "total_tax_collected": float(total_tax),
        "payment_breakdown": {
            "cash": float(sum(inv.total_amount or 0 for inv in invoices if inv.payment_method == "cash")),
            "card": float(sum(inv.total_amount or 0 for inv in invoices if inv.payment_method == "card")),
            "upi": float(sum(inv.total_amount or 0 for inv in invoices if inv.payment_method == "upi"))
        }
    }


@router.get("/sales/monthly")
def get_monthly_sales(
    shop_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get monthly sales report"""
    # ENTITY ISOLATION
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    if user_role in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin"] or (user_role and user_shop_id):
        if user_shop_id:
            shop_id = user_shop_id

    today = date.today()
    target_month = month or today.month
    target_year = year or today.year
    
    query = db.query(Invoice).filter(
        Invoice.status == "completed",
        func.extract('month', Invoice.created_at) == target_month,
        func.extract('year', Invoice.created_at) == target_year
    )
    
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
    
    invoices = query.all()
    total_sales = sum(inv.total_amount or 0 for inv in invoices)
    
    return {
        "month": target_month,
        "year": target_year,
        "shop_id": shop_id,
        "total_sales": float(total_sales),
        "total_invoices": len(invoices),
        "average_daily_sales": float(total_sales / 30) if total_sales > 0 else 0
    }


@router.get("/inventory")
def get_inventory_report(
    warehouse_id: Optional[str] = None,
    shop_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get inventory report"""
    # Import necessary models
    from app.db.models import WarehouseStock, ShopStock
    
    # ENTITY ISOLATION
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    user_warehouse_id = current_user.get("warehouse_id")
    
    # Calculate stock based on Entity
    
    # 1. Shop Context
    if user_role in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin"] or (user_role and user_shop_id):
        if user_shop_id:
            shop_id = user_shop_id
        
        # Calculate from ShopStock
        stocks = db.query(ShopStock).filter(ShopStock.shop_id == shop_id).all()
        total_items = sum(s.quantity for s in stocks)
        total_batches_count = len(stocks)
        # Value = quantity * batch.purchase_price
        total_val = 0
        for s in stocks:
            batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
            if batch:
                total_val += s.quantity * (batch.purchase_price or 0)
        
        return {
            "warehouse_id": None,
            "shop_id": shop_id,
            "total_medicines": db.query(func.count(Medicine.id)).filter(Medicine.is_active == True).scalar(), # Medicines are global definitions
            "total_batches": total_batches_count,
            "total_stock_units": total_items,
            "total_stock_value": float(total_val)
        }
    
    # 2. Warehouse Context
    elif user_role == "warehouse_admin" or (user_role and user_warehouse_id):
        if user_warehouse_id:
            warehouse_id = user_warehouse_id
            
        # Calculate from WarehouseStock
        stocks = db.query(WarehouseStock).filter(WarehouseStock.warehouse_id == warehouse_id).all()
        total_items = sum(s.quantity for s in stocks)
        total_batches_count = len(stocks)
        total_val = 0
        for s in stocks:
            batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
            if batch:
                total_val += s.quantity * (batch.purchase_price or 0)

        return {
            "warehouse_id": warehouse_id,
            "shop_id": None,
            "total_medicines": db.query(func.count(Medicine.id)).filter(Medicine.is_active == True).scalar(),
            "total_batches": total_batches_count,
            "total_stock_units": total_items,
            "total_stock_value": float(total_val)
        }
            
    # 3. Super Admin (Global)
    else:
        # Default behavior (Global Batches)
        total_medicines = db.query(func.count(Medicine.id)).filter(Medicine.is_active == True).scalar() or 0
        total_batches = db.query(func.count(Batch.id)).scalar() or 0
        total_stock = db.query(func.sum(Batch.quantity)).scalar() or 0
        
        # Calculate total stock value
        batches = db.query(Batch).all()
        total_value = sum((b.quantity or 0) * (b.purchase_price or 0) for b in batches)
        
        return {
            "warehouse_id": warehouse_id,
            "shop_id": shop_id,
            "total_medicines": total_medicines,
            "total_batches": total_batches,
            "total_stock_units": total_stock,
            "total_stock_value": float(total_value)
        }


@router.get("/profit-loss")
def get_profit_loss_report(
    shop_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get profit/loss report"""
    # ENTITY ISOLATION
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    if user_role in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin"] or (user_role and user_shop_id):
        if user_shop_id:
            shop_id = user_shop_id
            
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year
    
    query = db.query(Invoice).filter(
        Invoice.status == "completed",
        func.extract('month', Invoice.created_at) == target_month,
        func.extract('year', Invoice.created_at) == target_year
    )
    
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
    
    invoices = query.all()
    total_revenue = sum(inv.total_amount or 0 for inv in invoices)
    total_tax = sum(inv.tax_amount or 0 for inv in invoices)
    
    # Estimate COGS (this would need actual purchase data in production)
    estimated_cogs = total_revenue * 0.65  # Assuming 35% margin
    gross_profit = total_revenue - estimated_cogs
    
    return {
        "month": target_month,
        "year": target_year,
        "shop_id": shop_id,
        "total_revenue": float(total_revenue),
        "cost_of_goods_sold": float(estimated_cogs),
        "gross_profit": float(gross_profit),
        "tax_collected": float(total_tax),
        "profit_margin": round((gross_profit / total_revenue * 100), 2) if total_revenue > 0 else 0
    }


@router.get("/expiry")
def get_expiry_report(
    warehouse_id: Optional[str] = None,
    shop_id: Optional[str] = None,
    days_ahead: int = Query(60, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get expiry report for medicines"""
    # Import necessary models
    from app.db.models import WarehouseStock, ShopStock
    
    # ENTITY ISOLATION
    user_role = current_user.get("role")
    user_shop_id = current_user.get("shop_id")
    user_warehouse_id = current_user.get("warehouse_id")
    
    today = date.today()
    future_date = today + timedelta(days=days_ahead)
    
    items = []
    total_loss = 0
    expired_count = 0
    expiring_count = 0
    
    # Strategy Pattern
    
    # 1. Shop Context
    if user_role in ["shop_owner", "pharmacist", "cashier", "pharmacy_admin"] or (user_role and user_shop_id):
        if user_shop_id:
            shop_id = user_shop_id
            
        stocks = db.query(ShopStock).filter(ShopStock.shop_id == shop_id, ShopStock.quantity > 0).all()
        for s in stocks:
            batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
            if not batch: continue
            
            # Check expiry
            if batch.expiry_date < today:
                status = "expired"
                expired_count += 1
            elif batch.expiry_date <= future_date:
                status = "expiring"
                expiring_count += 1
            else:
                continue
                
            medicine = db.query(Medicine).filter(Medicine.id == s.medicine_id).first()
            loss = (s.quantity) * (batch.purchase_price or 0)
            total_loss += loss
            
            items.append({
                "medicine_id": s.medicine_id,
                "name": medicine.name if medicine else "Unknown",
                "brand": medicine.brand if medicine else None,
                "batch_number": batch.batch_number,
                "expiry_date": batch.expiry_date.isoformat(),
                "quantity": s.quantity,
                "unit_cost": float(batch.purchase_price or 0),
                "total_loss": float(loss),
                "status": status
            })

    # 2. Warehouse Context
    elif user_role == "warehouse_admin" or (user_role and user_warehouse_id):
        if user_warehouse_id:
            warehouse_id = user_warehouse_id
            
        stocks = db.query(WarehouseStock).filter(WarehouseStock.warehouse_id == warehouse_id, WarehouseStock.quantity > 0).all()
        for s in stocks:
            batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
            if not batch: continue
            
            # Check expiry
            if batch.expiry_date < today:
                status = "expired"
                expired_count += 1
            elif batch.expiry_date <= future_date:
                status = "expiring"
                expiring_count += 1
            else:
                continue
                
            medicine = db.query(Medicine).filter(Medicine.id == s.medicine_id).first()
            loss = (s.quantity) * (batch.purchase_price or 0)
            total_loss += loss
            
            items.append({
                "medicine_id": s.medicine_id,
                "name": medicine.name if medicine else "Unknown",
                "brand": medicine.brand if medicine else None,
                "batch_number": batch.batch_number,
                "expiry_date": batch.expiry_date.isoformat(),
                "quantity": s.quantity,
                "unit_cost": float(batch.purchase_price or 0),
                "total_loss": float(loss),
                "status": status
            })

    # 3. Super Admin (Global - use Batches)
    else:
        # Get expired items
        expired_query = db.query(Batch).join(Medicine).filter(
            Batch.expiry_date < today,
            Batch.quantity > 0
        )
        
        # Get expiring items
        expiring_query = db.query(Batch).join(Medicine).filter(
            Batch.expiry_date >= today,
            Batch.expiry_date <= future_date,
            Batch.quantity > 0
        )
        
        expired_batches = expired_query.all()
        expiring_batches = expiring_query.all()
        expired_count = len(expired_batches)
        expiring_count = len(expiring_batches)
        
        for batch in expired_batches:
            medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
            loss = (batch.quantity or 0) * (batch.purchase_price or 0)
            total_loss += loss
            items.append({
                "medicine_id": batch.medicine_id,
                "name": medicine.name if medicine else "Unknown",
                "brand": medicine.brand if medicine else None,
                "batch_number": batch.batch_number,
                "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None,
                "quantity": batch.quantity,
                "unit_cost": float(batch.purchase_price or 0),
                "total_loss": float(loss),
                "status": "expired"
            })
        
        for batch in expiring_batches:
            medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
            loss = (batch.quantity or 0) * (batch.purchase_price or 0)
            items.append({
                "medicine_id": batch.medicine_id,
                "name": medicine.name if medicine else "Unknown",
                "brand": medicine.brand if medicine else None,
                "batch_number": batch.batch_number,
                "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None,
                "quantity": batch.quantity,
                "unit_cost": float(batch.purchase_price or 0),
                "total_loss": float(loss),
                "status": "expiring"
            })
    
    return {
        "days_ahead": days_ahead,
        "total_expiring_items": expiring_count,
        "total_expired_items": expired_count,
        "total_loss_value": float(total_loss),
        "items": items
    }
