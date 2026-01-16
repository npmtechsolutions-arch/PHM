"""
Settings API Routes - Database Connected
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.models.common import APIResponse
from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.db.models import Setting

router = APIRouter()


class SettingsUpdateRequest(BaseModel):
    app_name: Optional[str] = None
    session_timeout_minutes: Optional[int] = None
    default_tax_rate: Optional[float] = None
    maintenance_mode: Optional[bool] = None
    global_inventory_search: Optional[bool] = None
    auto_approve_low_risk: Optional[bool] = None
    support_email: Optional[str] = None
    support_url: Optional[str] = None
    low_stock_threshold: Optional[int] = None
    expiry_warning_days: Optional[int] = None


def get_setting(db: Session, key: str, default=None):
    """Helper to get a setting value"""
    setting = db.query(Setting).filter(Setting.key == key).first()
    return setting.value if setting else default


def set_setting(db: Session, key: str, value: str, description: str = None):
    """Helper to set a setting value"""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = Setting(key=key, value=value, description=description)
        db.add(setting)
    db.commit()


@router.get("")
async def get_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all application settings"""
    settings = db.query(Setting).all()
    settings_dict = {s.key: s.value for s in settings}
    
    return {
        "settings": {
            "app_name": settings_dict.get("app_name", "PharmaEC Management"),
            "session_timeout_minutes": int(settings_dict.get("session_timeout_minutes", "30")),
            "default_tax_rate": float(settings_dict.get("default_tax_rate", "12.0")),
            "maintenance_mode": settings_dict.get("maintenance_mode", "false") == "true",
            "global_inventory_search": settings_dict.get("global_inventory_search", "true") == "true",
            "auto_approve_low_risk": settings_dict.get("auto_approve_low_risk", "false") == "true",
            "support_email": settings_dict.get("support_email", "support@pharmaec.com"),
            "support_url": settings_dict.get("support_url", ""),
            "low_stock_threshold": int(settings_dict.get("low_stock_threshold", "15")),
            "expiry_warning_days": int(settings_dict.get("expiry_warning_days", "60"))
        }
    }


@router.put("")
def update_settings(
    settings_data: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Update application settings"""
    update_data = settings_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            str_value = str(value).lower() if isinstance(value, bool) else str(value)
            set_setting(db, key, str_value)
    
    return APIResponse(message="Settings updated successfully")


@router.get("/tax")
def get_tax_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get tax configuration settings"""
    return {
        "default_gst_rate": float(get_setting(db, "default_tax_rate", "12.0")),
        "gst_enabled": get_setting(db, "gst_enabled", "true") == "true",
        "tax_inclusive_pricing": get_setting(db, "tax_inclusive_pricing", "false") == "true",
        "hsn_code_required": get_setting(db, "hsn_code_required", "true") == "true"
    }


@router.put("/tax")
def update_tax_settings(
    tax_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin"]))
):
    """Update tax configuration settings"""
    if "default_gst_rate" in tax_data:
        set_setting(db, "default_tax_rate", str(tax_data["default_gst_rate"]))
    if "gst_enabled" in tax_data:
        set_setting(db, "gst_enabled", str(tax_data["gst_enabled"]).lower())
    if "tax_inclusive_pricing" in tax_data:
        set_setting(db, "tax_inclusive_pricing", str(tax_data["tax_inclusive_pricing"]).lower())
    
    return APIResponse(message="Tax settings updated successfully")


@router.get("/tax/summary")
def get_tax_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get tax summary for a period"""
    from datetime import date
    from app.db.models import Invoice
    from sqlalchemy import func
    
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year
    
    total_tax = db.query(func.sum(Invoice.tax_amount)).filter(
        Invoice.status == "completed",
        func.extract('month', Invoice.created_at) == target_month,
        func.extract('year', Invoice.created_at) == target_year
    ).scalar() or 0
    
    total_sales = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == "completed",
        func.extract('month', Invoice.created_at) == target_month,
        func.extract('year', Invoice.created_at) == target_year
    ).scalar() or 0
    
    return {
        "month": target_month,
        "year": target_year,
        "total_tax_collected": float(total_tax),
        "total_taxable_sales": float(total_sales),
        "cgst": float(total_tax / 2),
        "sgst": float(total_tax / 2)
    }


@router.get("/tax/gst")
def get_gst_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get GST report for filing"""
    from datetime import date
    from app.db.models import Invoice
    from sqlalchemy import func
    
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year
    
    total_sales = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == "completed",
        func.extract('month', Invoice.created_at) == target_month,
        func.extract('year', Invoice.created_at) == target_year
    ).scalar() or 0
    
    total_tax = db.query(func.sum(Invoice.tax_amount)).filter(
        Invoice.status == "completed",
        func.extract('month', Invoice.created_at) == target_month,
        func.extract('year', Invoice.created_at) == target_year
    ).scalar() or 0
    
    return {
        "period": f"{target_month:02d}/{target_year}",
        "total_outward_supplies": float(total_sales),
        "total_tax_liability": float(total_tax),
        "cgst_liability": float(total_tax / 2),
        "sgst_liability": float(total_tax / 2),
        "igst_liability": 0,
        "cess_liability": 0
    }
