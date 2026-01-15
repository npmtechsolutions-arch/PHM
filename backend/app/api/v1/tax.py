"""
Tax & Accounting API Routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel

from app.db.database import get_db
from app.core.security import get_current_user
from app.db.models import Invoice, InvoiceItem, Setting

router = APIRouter()


class TaxSummary(BaseModel):
    total_sales: float
    total_tax_collected: float
    gst_amount: float
    vat_amount: float
    net_taxable_value: float
    period_start: Optional[date] = None
    period_end: Optional[date] = None


class GSTReport(BaseModel):
    total_taxable_value: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_gst: float
    invoice_count: int
    period: str


class VATReport(BaseModel):
    total_taxable_value: float
    vat_amount: float
    invoice_count: int
    period: str


class TaxBreakdown(BaseModel):
    hsn_code: Optional[str]
    description: str
    taxable_value: float
    tax_rate: float
    tax_amount: float
    quantity: int


class DetailedTaxReport(BaseModel):
    summary: TaxSummary
    breakdowns: list[TaxBreakdown]


@router.get("/summary", response_model=TaxSummary)
async def get_tax_summary(
    shop_id: Optional[str] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get tax summary for a period"""
    query = db.query(Invoice).filter(Invoice.status == "completed")
    
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
    
    if month and year:
        query = query.filter(
            extract('month', Invoice.created_at) == month,
            extract('year', Invoice.created_at) == year
        )
    elif year:
        query = query.filter(extract('year', Invoice.created_at) == year)
    
    invoices = query.all()
    
    total_sales = sum(inv.total_amount for inv in invoices)
    total_tax = sum(inv.tax_amount for inv in invoices)
    net_taxable = sum(inv.subtotal for inv in invoices)
    
    # Calculate tax components based on real data
    # Currently assuming all tax is GST (CGST + SGST) as VAT is legacy/specific
    gst_amount = total_tax 
    vat_amount = 0.0
    
    period_start = None
    period_end = None
    if month and year:
        period_start = date(year, month, 1)
        if month == 12:
            period_end = date(year + 1, 1, 1)
        else:
            period_end = date(year, month + 1, 1)
    
    return TaxSummary(
        total_sales=total_sales,
        total_tax_collected=total_tax,
        gst_amount=gst_amount,
        vat_amount=vat_amount,
        net_taxable_value=net_taxable,
        period_start=period_start,
        period_end=period_end
    )


@router.get("/gst", response_model=GSTReport)
async def get_gst_report(
    shop_id: Optional[str] = None,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get GST report for a specific month"""
    query = db.query(Invoice).filter(
        Invoice.status == "completed",
        extract('month', Invoice.created_at) == month,
        extract('year', Invoice.created_at) == year
    )
    
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
    
    invoices = query.all()
    
    total_taxable = sum(inv.subtotal for inv in invoices)
    total_gst = sum(inv.tax_amount for inv in invoices)
    
    # Split GST into CGST and SGST (intra-state) or IGST (inter-state)
    # Simplified: assuming all intra-state transactions
    cgst = total_gst / 2
    sgst = total_gst / 2
    igst = 0.0
    
    return GSTReport(
        total_taxable_value=total_taxable,
        cgst_amount=cgst,
        sgst_amount=sgst,
        igst_amount=igst,
        total_gst=total_gst,
        invoice_count=len(invoices),
        period=f"{year}-{month:02d}"
    )


@router.get("/vat", response_model=VATReport)
async def get_vat_report(
    shop_id: Optional[str] = None,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get VAT report for a specific month"""
    query = db.query(Invoice).filter(
        Invoice.status == "completed",
        extract('month', Invoice.created_at) == month,
        extract('year', Invoice.created_at) == year
    )
    
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
    
    invoices = query.all()
    
    # For medicines, VAT is typically not applicable (GST applies)
    # This is a placeholder for non-medicine items
    total_taxable = 0.0
    total_vat = 0.0
    
    return VATReport(
        total_taxable_value=total_taxable,
        vat_amount=total_vat,
        invoice_count=0,
        period=f"{year}-{month:02d}"
    )


@router.get("/period/{year}/{month}", response_model=DetailedTaxReport)
async def get_period_tax_report(
    year: int,
    month: int,
    shop_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed tax report for a specific period"""
    # Get summary
    summary = await get_tax_summary(shop_id, month, year, db)
    
    # Get breakdowns by HSN code
    query = db.query(
        InvoiceItem.tax_percent,
        func.sum(InvoiceItem.subtotal).label('taxable_value'),
        func.sum(InvoiceItem.tax_amount).label('tax_amount'),
        func.sum(InvoiceItem.quantity).label('quantity')
    ).join(Invoice).filter(
        Invoice.status == "completed",
        extract('month', Invoice.created_at) == month,
        extract('year', Invoice.created_at) == year
    )
    
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
    
    results = query.group_by(InvoiceItem.tax_percent).all()
    
    breakdowns = []
    for row in results:
        breakdowns.append(TaxBreakdown(
            hsn_code=None,
            description=f"Items at {row.tax_percent}% tax",
            taxable_value=row.taxable_value or 0,
            tax_rate=row.tax_percent,
            tax_amount=row.tax_amount or 0,
            quantity=row.quantity or 0
        ))
    
    return DetailedTaxReport(summary=summary, breakdowns=breakdowns)


@router.get("/settings")
async def get_tax_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get tax configuration settings"""
    settings = db.query(Setting).filter(
        Setting.category == "tax"
    ).all()
    
    result = {}
    for setting in settings:
        result[setting.key] = setting.value
    
    # Default values if not set
    defaults = {
        "default_gst_rate": "12",
        "gst_state_code": "27",
        "gstin": "",
        "enable_igst": "false",
        "tax_inclusive_pricing": "false"
    }
    
    for key, value in defaults.items():
        if key not in result:
            result[key] = value
    
    return result


@router.put("/settings")
async def update_tax_settings(
    settings: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update tax configuration settings"""
    for key, value in settings.items():
        existing = db.query(Setting).filter(
            Setting.key == key,
            Setting.category == "tax"
        ).first()
        
        if existing:
            existing.value = str(value)
        else:
            new_setting = Setting(
                key=key,
                value=str(value),
                category="tax",
                description=f"Tax setting: {key}"
            )
            db.add(new_setting)
    
    db.commit()
    return {"message": "Tax settings updated successfully"}
