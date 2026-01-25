# Shop Admin (Pharmacy Admin) Sidebar Configuration - Complete

## ✅ Modules Configured for Shop Admin

### 1. 📊 Dashboard
- **Path:** `/`
- **Permissions:** `dashboard.view`
- **Status:** ✅ Configured

### 2. 📁 Master Data
- **Path:** `/master-data`
- **Permissions:** All master data view, create, edit, manage permissions
- **Status:** ✅ Configured
- **Sub-sections:**
  - GST / VAT Slabs
  - HSN Codes
  - Medicine Categories
  - Medicine Types
  - Brands
  - Manufacturers
  - Units / Packaging
  - Rack Master
  - Adjustment Reasons
  - Suppliers
  - Payment Methods

### 3. 💊 Medicine Master
- **Path:** `/medicines`
- **Permissions:** `medicines.view`, `medicines.create`
- **Status:** ✅ Configured
- **Sub-sections:**
  - View Medicines
  - Add Medicine

### 4. 📊 Reports
- **Path:** `/reports`
- **Permissions:** `reports.view.shop`, `reports.view.global`, `reports.export`
- **Status:** ✅ Configured
- **Sub-sections:**
  - Sales Reports
  - Inventory Reports
  - Tax Reports
  - Expiry Reports

### 5. 📦 Inventory
- **Path:** `/inventory`
- **Permissions:** `inventory.view.shop`, `inventory.adjust.shop`
- **Status:** ✅ Configured
- **Note:** Excluded from Super Admin

### 6. 🚚 Incoming Shipments (Dispatches)
- **Path:** `/dispatches`
- **Permissions:** `dispatches.view.shop`
- **Status:** ✅ Configured
- **Note:** Label dynamically shows as "Incoming Shipments" for shop users
- **Note:** Excluded from Super Admin

### 7. 📝 Purchase Requests
- **Path:** `/purchase-requests`
- **Permissions:** `purchase_requests.view.shop`, `purchase_requests.create.shop`
- **Status:** ✅ Configured
- **Note:** Excluded from Super Admin

### 8. 👥 Employees
- **Path:** `/employees`
- **Permissions:** `employees.view.shop`, `employees.manage.shop`
- **Status:** ✅ Configured
- **Note:** Excluded from Super Admin

### 9. 📋 Attendance
- **Path:** `/employees/attendance`
- **Permissions:** `attendance.manage.shop`
- **Status:** ✅ Configured
- **Sub-sections:**
  - Attendance Marker
  - Attendance Report
- **Note:** Excluded from Super Admin

### 10. 💰 Salary
- **Path:** `/employees/salary`
- **Permissions:** `salary.manage.shop`
- **Status:** ✅ Configured
- **Note:** Excluded from Super Admin

### 11. 💳 POS Billing
- **Path:** `/sales/pos`
- **Permissions:** `billing.create.shop`
- **Status:** ✅ Configured
- **Note:** Excluded from Super Admin and Warehouse Admin

### 12. 📄 Invoices
- **Path:** `/sales/invoices`
- **Permissions:** `billing.view.shop`
- **Status:** ✅ Configured
- **Note:** Excluded from Super Admin and Warehouse Admin

### 13. 🔄 Returns & Refunds
- **Path:** `/sales/returns`
- **Permissions:** `returns.view.shop`, `returns.create.shop`
- **Status:** ✅ Configured
- **Note:** Excluded from Super Admin and Warehouse Admin

### 14. 👤 Customers
- **Path:** `/customers`
- **Permissions:** `customers.view.shop`, `customers.manage.shop`
- **Status:** ✅ Configured
- **Note:** Excluded from Super Admin and Warehouse Admin

## 📁 Master Data Permissions Required

Shop Admin needs **view**, **create**, **edit**, and **manage** permissions for all master data:

- `categories.view`, `categories.create`, `categories.edit`, `categories.manage`
- `units.view`, `units.create`, `units.edit`, `units.manage`
- `brands.view`, `brands.create`, `brands.edit`, `brands.manage`
- `manufacturers.view`, `manufacturers.create`, `manufacturers.edit`, `manufacturers.manage`
- `medicine_types.view`, `medicine_types.create`, `medicine_types.edit`, `medicine_types.manage`
- `hsn.view`, `hsn.create`, `hsn.edit`, `hsn.manage`
- `gst.view`, `gst.create`, `gst.edit`, `gst.manage`
- `suppliers.view`, `suppliers.create`, `suppliers.edit`, `suppliers.manage`
- `payment_methods.view`, `payment_methods.create`, `payment_methods.edit`, `payment_methods.manage`
- `adjustment_reasons.view`, `adjustment_reasons.create`, `adjustment_reasons.edit`, `adjustment_reasons.manage`
- `racks.view`, `racks.create`, `racks.edit`, `racks.manage`

## 🔐 Complete Permission List

### Core Operations:
- `dashboard.view`
- `medicines.view`, `medicines.create`
- `reports.view.shop`, `reports.view.global`, `reports.export`
- `inventory.view.shop`, `inventory.adjust.shop`
- `dispatches.view.shop`
- `purchase_requests.view.shop`, `purchase_requests.create.shop`
- `employees.view.shop`, `employees.manage.shop`
- `attendance.manage.shop`
- `salary.manage.shop`
- `billing.view.shop`, `billing.create.shop`, `billing.void.shop`
- `returns.view.shop`, `returns.create.shop`
- `customers.view.shop`, `customers.manage.shop`
- `notifications.view`

### Master Data (All CRU permissions):
- All `view`, `create`, `edit`, `manage` permissions for 11 master data modules
- **NO DELETE** permissions

## ❌ Modules NOT Visible to Shop Admin

- **Warehouses** - Warehouse management (Super Admin only)
- **Inventory Oversight** - Global inventory monitoring (Super Admin only)
- **Stock Entry** - Warehouse stock entry (Warehouse Admin only)
- **Stock Adjustment** - Warehouse stock adjustment (Warehouse Admin only)
- **Users & Access** - Platform user management (Super Admin only)
- **System Settings** - Platform configuration (Super Admin only)
- **Audit Logs** - Full audit trail (Super Admin only)

## ✅ Verification

To verify shop admin has access to all required modules:

1. Login as pharmacy_admin user
2. Check sidebar visibility for all 14 modules listed above
3. Verify each module is accessible and data is filtered by shop_id
4. Confirm master data modules show CREATE/UPDATE buttons (no DELETE)
5. Verify operational modules (POS Billing, Invoices, etc.) are visible
6. Verify "Incoming Shipments" label appears instead of "Dispatches"

## 🔧 Backend Permission Script

Ensure pharmacy admin role has all required permissions. Run:
```bash
cd backend
python scripts/grant_pharmacy_admin_permissions.py
```

This script grants all shop-scoped permissions to the pharmacy_admin role.

## 📊 Summary

**Total Modules:** 14 modules
- 1 Dashboard
- 1 Master Data (with 11 sub-modules)
- 1 Medicine Master
- 1 Reports
- 9 Operational modules (Inventory, Incoming Shipments, Purchase Requests, Employees, Attendance, Salary, POS Billing, Invoices, Returns & Refunds, Customers)

**Permission Count:** ~80+ permissions covering all operations and master data management.
