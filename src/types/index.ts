// Common types
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
}

export interface APIResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

// Auth types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

// Warehouse types
export interface Warehouse {
    id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    phone?: string;
    email?: string;
    manager_id?: string;
    capacity?: number;
    status: 'active' | 'inactive' | 'maintenance';
    created_at: string;
    updated_at?: string;
    shop_count: number;
    total_stock_value: number;
}

// Shop types
export interface MedicalShop {
    id: string;
    name: string;
    code: string;
    shop_type: 'retail' | 'wholesale' | 'hospital' | 'clinic';
    license_number: string;
    gst_number?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    phone: string;
    email?: string;
    owner_id?: string;
    manager_id?: string;
    warehouse_id?: string;
    status: 'active' | 'inactive' | 'suspended';
    created_at: string;
    updated_at?: string;
    total_medicines: number;
    total_stock_value: number;
}

// Medicine types
export interface Medicine {
    id: string;
    name: string;
    generic_name: string;
    brand?: string;
    manufacturer: string;
    medicine_type: string;
    category: string;
    composition?: string;
    strength?: string;
    unit: string;
    pack_size: number;
    hsn_code?: string;
    gst_rate: number;
    mrp: number;
    purchase_price: number;
    is_prescription_required: boolean;
    is_controlled: boolean;
    storage_conditions?: string;
    rack_name?: string;
    rack_number?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface Batch {
    id: string;
    medicine_id: string;
    batch_number: string;
    manufacturing_date: string;
    expiry_date: string;
    quantity: number;
    purchase_price: number;
    mrp: number;
    medicine_name?: string;
    is_expired: boolean;
    days_to_expiry: number;
    created_at: string;
}

// Customer types
export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    city?: string;
    pincode?: string;
    customer_type: 'regular' | 'vip' | 'corporate' | 'insurance';
    shop_id: string;
    total_purchases: number;
    total_spent: number;
    loyalty_points: number;
    last_visit?: string;
    created_at: string;
}

// Invoice types
export interface InvoiceItem {
    id: string;
    medicine_id: string;
    medicine_name?: string;
    batch_id: string;
    batch_number?: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    tax_percent: number;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    shop_id: string;
    customer_id?: string;
    payment_method: 'cash' | 'card' | 'upi' | 'wallet' | 'credit' | 'insurance';
    status: 'draft' | 'completed' | 'cancelled' | 'returned';
    items: InvoiceItem[];
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    payment_status: 'pending' | 'completed' | 'partial' | 'refunded' | 'failed';
    customer_name?: string;
    billed_by?: string;
    created_at: string;
}

// Employee types
export interface Employee {
    id: string;
    employee_code: string;
    name: string;
    email: string;
    phone: string;
    designation: string;
    department: string;
    employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
    date_of_joining: string;
    basic_salary: number;
    shop_id?: string;
    warehouse_id?: string;
    status: 'active' | 'on_leave' | 'terminated';
    created_at: string;
}

// Notification types
export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    is_read: boolean;
    user_id?: string;
    shop_id?: string;
    created_at: string;
}

// Alert types
export interface StockAlert {
    id: string;
    type: 'low_stock' | 'expiring' | 'expired';
    medicine_id: string;
    medicine_name: string;
    location_type?: string;
    location_id?: string;
    location_name?: string;
    current_quantity?: number;
    threshold?: number;
    batch_number?: string;
    expiry_date?: string;
    days_to_expiry?: number;
    quantity?: number;
    created_at: string;
}

// Report types
export interface SalesReport {
    period?: { from?: string; to?: string };
    total_sales: number;
    total_invoices: number;
    average_order_value: number;
    top_products: { medicine_id: string; name: string; quantity_sold: number; revenue: number }[];
}

export interface ExpiryItem {
    medicine_id: string;
    name: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    unit_cost: number;
    total_loss: number;
    status: 'expiring' | 'expired';
}

export interface ExpiryReport {
    days_ahead: number;
    total_expiring_items: number;
    total_expired_items: number;
    total_loss_value: number;
    items: ExpiryItem[];
}
