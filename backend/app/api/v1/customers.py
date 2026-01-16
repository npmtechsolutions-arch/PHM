"""
Customer API Routes - Database Connected
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.models.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerListResponse,
    FollowupCreate, FollowupResponse, PrescriptionCreate, PrescriptionResponse
)
from app.models.common import APIResponse
from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.db.models import Customer, CustomerFollowup, CustomerPrescription

router = APIRouter()


@router.get("")
def list_customers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    shop_id: Optional[str] = None,
    customer_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all customers"""
    query = db.query(Customer)
    
    if search:
        query = query.filter(
            (Customer.name.ilike(f"%{search}%")) |
            (Customer.phone.ilike(f"%{search}%")) |
            (Customer.email.ilike(f"%{search}%"))
        )
    
    if shop_id:
        query = query.filter(Customer.shop_id == shop_id)
    
    if customer_type:
        query = query.filter(Customer.customer_type == customer_type)
    
    total = query.count()
    customers = query.offset((page - 1) * size).limit(size).all()
    
    return {
        "items": [
            {
                "id": c.id,
                "name": c.name,
                "phone": c.phone,
                "email": c.email,
                "customer_type": c.customer_type,
                "city": c.city,
                "shop_id": c.shop_id,
                "total_purchases": c.total_purchases,
                "total_spent": c.total_spent,
                "loyalty_points": c.loyalty_points,
                "last_visit": c.last_visit,
                "created_at": c.created_at
            }
            for c in customers
        ],
        "total": total,
        "page": page,
        "size": size
    }


@router.post("")
def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new customer"""
    # Check if phone already exists for shop
    existing = db.query(Customer).filter(
        Customer.phone == customer_data.phone,
        Customer.shop_id == customer_data.shop_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this phone already exists")
    
    customer = Customer(
        name=customer_data.name,
        phone=customer_data.phone,
        email=customer_data.email,
        date_of_birth=customer_data.date_of_birth,
        gender=customer_data.gender,
        address=customer_data.address,
        city=customer_data.city,
        pincode=customer_data.pincode,
        customer_type=customer_data.customer_type or "regular",
        shop_id=customer_data.shop_id,
        notes=customer_data.notes
    )
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    return APIResponse(
        message="Customer created successfully",
        data={"id": customer.id}
    )


@router.get("/{customer_id}")
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get customer by ID"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "date_of_birth": customer.date_of_birth.isoformat() if customer.date_of_birth else None,
        "gender": customer.gender,
        "address": customer.address,
        "city": customer.city,
        "pincode": customer.pincode,
        "customer_type": customer.customer_type,
        "shop_id": customer.shop_id,
        "total_purchases": customer.total_purchases,
        "total_spent": customer.total_spent,
        "loyalty_points": customer.loyalty_points,
        "last_visit": customer.last_visit,
        "notes": customer.notes,
        "created_at": customer.created_at
    }


@router.put("/{customer_id}")
def update_customer(
    customer_id: str,
    update_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update customer"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(customer, field, value)
    
    db.commit()
    
    return APIResponse(message="Customer updated successfully")


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["super_admin", "shop_owner"]))
):
    """Delete customer"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(customer)
    db.commit()
    
    return APIResponse(message="Customer deleted successfully")


# ==================== FOLLOW-UP ENDPOINTS ====================

@router.get("/{customer_id}/followups")
def list_customer_followups(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get customer follow-ups"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    followups = db.query(CustomerFollowup).filter(
        CustomerFollowup.customer_id == customer_id
    ).order_by(CustomerFollowup.scheduled_date.desc()).all()
    
    return {
        "customer_id": customer_id,
        "followups": [
            {
                "id": f.id,
                "followup_type": f.followup_type,
                "scheduled_date": f.scheduled_date.isoformat() if f.scheduled_date else None,
                "status": f.status,
                "notes": f.notes,
                "completed_at": f.completed_at,
                "created_at": f.created_at
            }
            for f in followups
        ]
    }


@router.post("/{customer_id}/followups")
def create_followup(
    customer_id: str,
    followup_data: FollowupCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a follow-up for customer"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    followup = CustomerFollowup(
        customer_id=customer_id,
        followup_type=followup_data.followup_type,
        scheduled_date=followup_data.scheduled_date,
        notes=followup_data.notes,
        created_by=current_user.get("user_id")
    )
    
    db.add(followup)
    db.commit()
    db.refresh(followup)
    
    return APIResponse(
        message="Follow-up created successfully",
        data={"id": followup.id}
    )


@router.put("/{customer_id}/followups/{followup_id}/complete")
def complete_followup(
    customer_id: str,
    followup_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark follow-up as completed"""
    followup = db.query(CustomerFollowup).filter(
        CustomerFollowup.id == followup_id,
        CustomerFollowup.customer_id == customer_id
    ).first()
    
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    followup.status = "completed"
    followup.completed_at = datetime.utcnow()
    db.commit()
    
    return APIResponse(message="Follow-up completed")


# ==================== PRESCRIPTION ENDPOINTS ====================

@router.get("/{customer_id}/prescriptions")
def list_customer_prescriptions(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get customer prescriptions"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    prescriptions = db.query(CustomerPrescription).filter(
        CustomerPrescription.customer_id == customer_id
    ).order_by(CustomerPrescription.created_at.desc()).all()
    
    return {
        "customer_id": customer_id,
        "prescriptions": [
            {
                "id": p.id,
                "doctor_name": p.doctor_name,
                "hospital": p.hospital,
                "prescription_date": p.prescription_date.isoformat() if p.prescription_date else None,
                "notes": p.notes,
                "file_path": p.file_path,
                "created_at": p.created_at
            }
            for p in prescriptions
        ]
    }


@router.post("/{customer_id}/prescriptions")
def create_prescription(
    customer_id: str,
    prescription_data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Upload prescription for customer"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    prescription = CustomerPrescription(
        customer_id=customer_id,
        doctor_name=prescription_data.doctor_name,
        hospital=prescription_data.hospital,
        prescription_date=prescription_data.prescription_date,
        notes=prescription_data.notes
    )
    
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    
    return APIResponse(
        message="Prescription saved successfully",
        data={"id": prescription.id}
    )
