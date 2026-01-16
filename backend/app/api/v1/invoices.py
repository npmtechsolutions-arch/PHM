"""
Invoice and Billing API Routes - Database Connected
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from app.models.billing import (
    InvoiceCreate, InvoiceResponse, InvoiceListResponse,
    ReturnCreate, ReturnResponse, PaymentStatus, InvoiceStatus
)
from app.models.common import APIResponse
from app.core.security import get_current_user, require_role
from app.db.database import get_db
from app.db.models import (
    Invoice, InvoiceItem, Customer, Medicine, Batch, MedicalShop,
    Return, ReturnItem, StockMovement, ShopStock, MovementType
)

router = APIRouter()


def generate_invoice_number(db: Session) -> str:
    """Generate unique invoice number"""
    count = db.query(func.count(Invoice.id)).scalar() or 0
    return f"INV-{datetime.now().year}-{count + 1:06d}"


def generate_return_number(db: Session) -> str:
    """Generate unique return number"""
    count = db.query(func.count(Return.id)).scalar() or 0
    return f"RET-{datetime.now().year}-{count + 1:06d}"


@router.get("")
def list_invoices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    shop_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all invoices"""
    query = db.query(Invoice).order_by(Invoice.created_at.desc())
    
    if shop_id:
        query = query.filter(Invoice.shop_id == shop_id)
    
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    
    if status:
        query = query.filter(Invoice.status == status)
    
    if date_from:
        query = query.filter(Invoice.created_at >= date_from)
    if date_to:
        query = query.filter(Invoice.created_at <= date_to)
    
    total = query.count()
    invoices = query.offset((page - 1) * size).limit(size).all()
    
    items = []
    for inv in invoices:
        customer = db.query(Customer).filter(Customer.id == inv.customer_id).first() if inv.customer_id else None
        items.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "shop_id": inv.shop_id,
            "customer_id": inv.customer_id,
            "customer_name": customer.name if customer else "Walk-in Customer",
            "payment_method": inv.payment_method,
            "subtotal": inv.subtotal,
            "discount_amount": inv.discount_amount,
            "tax_amount": inv.tax_amount,
            "total_amount": inv.total_amount,
            "status": inv.status.value if inv.status else "completed",
            "payment_status": inv.payment_status.value if inv.payment_status else "completed",
            "created_at": inv.created_at
        })
    
    return {"items": items, "total": total, "page": page, "size": size}


@router.post("")
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["shop_owner", "pharmacist", "cashier"]))
):
    """Create a new invoice (POS billing)"""
    # Validate shop
    shop = db.query(MedicalShop).filter(MedicalShop.id == invoice_data.shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    invoice_number = generate_invoice_number(db)
    
    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        shop_id=invoice_data.shop_id,
        customer_id=invoice_data.customer_id,
        payment_method=invoice_data.payment_method.value if invoice_data.payment_method else "cash",
        notes=invoice_data.notes,
        billed_by=current_user.get("user_id")
    )
    db.add(invoice)
    db.flush()  # Get ID
    
    # Process items
    subtotal = 0
    total_tax = 0
    total_discount = 0
    
    for item_data in invoice_data.items:
        # Validate medicine and batch
        medicine = db.query(Medicine).filter(Medicine.id == item_data.medicine_id).first()
        if not medicine:
            raise HTTPException(status_code=400, detail=f"Medicine {item_data.medicine_id} not found")
        
        batch = db.query(Batch).filter(Batch.id == item_data.batch_id).first()
        if not batch:
            raise HTTPException(status_code=400, detail=f"Batch {item_data.batch_id} not found")
        
        # Check stock availability
        shop_stock = db.query(ShopStock).filter(
            ShopStock.shop_id == invoice_data.shop_id,
            ShopStock.batch_id == item_data.batch_id
        ).first()
        
        available = shop_stock.quantity if shop_stock else batch.quantity
        if item_data.quantity > available:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {medicine.name}. Available: {available}"
            )
        
        # Calculate item totals
        item_subtotal = item_data.quantity * item_data.unit_price
        item_discount = item_subtotal * (item_data.discount_percent / 100)
        taxable = item_subtotal - item_discount
        item_tax = taxable * (item_data.tax_percent / 100)
        item_total = taxable + item_tax
        
        # Create invoice item
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            medicine_id=item_data.medicine_id,
            batch_id=item_data.batch_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount_percent=item_data.discount_percent,
            tax_percent=item_data.tax_percent,
            subtotal=item_subtotal,
            discount_amount=item_discount,
            tax_amount=item_tax,
            total=item_total
        )
        db.add(inv_item)
        
        # Record stock movement (OUT)
        movement = StockMovement(
            movement_type=MovementType.OUT,
            source_type="shop",
            source_id=invoice_data.shop_id,
            destination_type="customer",
            destination_id=invoice_data.customer_id,
            medicine_id=item_data.medicine_id,
            batch_id=item_data.batch_id,
            quantity=item_data.quantity,
            reference_type="sale",
            reference_id=invoice.id,
            created_by=current_user.get("user_id")
        )
        db.add(movement)
        
        # Deduct from shop stock
        if shop_stock:
            shop_stock.quantity -= item_data.quantity
        else:
            # Deduct from batch directly (legacy)
            batch.quantity -= item_data.quantity
        
        subtotal += item_subtotal
        total_tax += item_tax
        total_discount += item_discount
    
    # Apply invoice-level discount
    invoice_discount = subtotal * (invoice_data.discount_percent / 100)
    total_discount += invoice_discount
    total_amount = subtotal - total_discount + total_tax
    balance = total_amount - invoice_data.paid_amount
    
    # Update invoice totals
    invoice.subtotal = subtotal
    invoice.discount_amount = total_discount
    invoice.discount_percent = invoice_data.discount_percent
    invoice.tax_amount = total_tax
    invoice.total_amount = total_amount
    invoice.paid_amount = invoice_data.paid_amount
    invoice.balance_amount = balance
    invoice.status = "completed" if balance <= 0 else "draft"
    invoice.payment_status = "completed" if balance <= 0 else ("partial" if invoice_data.paid_amount > 0 else "pending")
    
    # Update customer stats
    if invoice_data.customer_id:
        customer = db.query(Customer).filter(Customer.id == invoice_data.customer_id).first()
        if customer:
            customer.total_purchases = (customer.total_purchases or 0) + 1
            customer.total_spent = (customer.total_spent or 0) + total_amount
            customer.loyalty_points = (customer.loyalty_points or 0) + int(total_amount / 100)
            customer.last_visit = datetime.utcnow()
    
    db.commit()
    
    return APIResponse(
        message="Invoice created successfully",
        data={
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "total_amount": total_amount
        }
    )


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get invoice by ID"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first() if invoice.customer_id else None
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).all()
    
    item_list = []
    for item in items:
        medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
        item_list.append({
            "id": item.id,
            "medicine_id": item.medicine_id,
            "medicine_name": medicine.name if medicine else "Unknown",
            "batch_id": item.batch_id,
            "batch_number": batch.batch_number if batch else "Unknown",
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "discount_percent": item.discount_percent,
            "tax_percent": item.tax_percent,
            "subtotal": item.subtotal,
            "discount_amount": item.discount_amount,
            "tax_amount": item.tax_amount,
            "total": item.total
        })
    
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "shop_id": invoice.shop_id,
        "customer_id": invoice.customer_id,
        "customer_name": customer.name if customer else "Walk-in Customer",
        "customer_phone": customer.phone if customer else None,
        "payment_method": invoice.payment_method,
        "items": item_list,
        "subtotal": invoice.subtotal,
        "discount_amount": invoice.discount_amount,
        "tax_amount": invoice.tax_amount,
        "total_amount": invoice.total_amount,
        "paid_amount": invoice.paid_amount,
        "balance_amount": invoice.balance_amount,
        "status": invoice.status.value if invoice.status else "completed",
        "payment_status": invoice.payment_status.value if invoice.payment_status else "completed",
        "notes": invoice.notes,
        "billed_by": invoice.billed_by,
        "created_at": invoice.created_at
    }


@router.get("/{invoice_id}/items")
def get_invoice_items(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get invoice items"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).all()
    
    return {
        "invoice_id": invoice_id,
        "items": [
            {
                "id": item.id,
                "medicine_id": item.medicine_id,
                "batch_id": item.batch_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item.total
            }
            for item in items
        ]
    }


@router.post("/{invoice_id}/returns")
def process_return(
    invoice_id: str,
    return_data: ReturnCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["shop_owner", "pharmacist"]))
):
    """Process a return for an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return_number = generate_return_number(db)
    
    # Create return record
    return_record = Return(
        return_number=return_number,
        invoice_id=invoice_id,
        shop_id=invoice.shop_id,
        customer_id=invoice.customer_id,
        refund_method=return_data.refund_method.value if return_data.refund_method else "cash",
        processed_by=current_user.get("user_id")
    )
    db.add(return_record)
    db.flush()
    
    total_refund = 0
    
    for item_data in return_data.items:
        # Find original invoice item
        inv_item = db.query(InvoiceItem).filter(InvoiceItem.id == item_data.invoice_item_id).first()
        if not inv_item:
            continue
        
        unit_refund = inv_item.total / inv_item.quantity
        item_refund = unit_refund * item_data.quantity
        
        # Create return item
        return_item = ReturnItem(
            return_id=return_record.id,
            invoice_item_id=item_data.invoice_item_id,
            medicine_id=inv_item.medicine_id,
            batch_id=inv_item.batch_id,
            quantity=item_data.quantity,
            refund_amount=item_refund,
            reason=item_data.reason
        )
        db.add(return_item)
        
        # Reverse stock movement (IN)
        movement = StockMovement(
            movement_type=MovementType.IN,
            source_type="customer",
            source_id=invoice.customer_id,
            destination_type="shop",
            destination_id=invoice.shop_id,
            medicine_id=inv_item.medicine_id,
            batch_id=inv_item.batch_id,
            quantity=item_data.quantity,
            reference_type="return",
            reference_id=return_record.id,
            notes=item_data.reason,
            created_by=current_user.get("user_id")
        )
        db.add(movement)
        
        # Add back to shop stock
        shop_stock = db.query(ShopStock).filter(
            ShopStock.shop_id == invoice.shop_id,
            ShopStock.batch_id == inv_item.batch_id
        ).first()
        
        if shop_stock:
            shop_stock.quantity += item_data.quantity
        else:
            # Add to batch directly
            batch = db.query(Batch).filter(Batch.id == inv_item.batch_id).first()
            if batch:
                batch.quantity += item_data.quantity
        
        total_refund += item_refund
    
    return_record.total_refund = total_refund
    invoice.status = "returned"
    
    db.commit()
    
    return APIResponse(
        message="Return processed successfully",
        data={
            "id": return_record.id,
            "return_number": return_number,
            "total_refund": total_refund
        }
    )
