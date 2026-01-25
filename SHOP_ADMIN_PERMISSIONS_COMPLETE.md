# Shop Admin (Pharmacy Admin) - Complete Permissions & Sidebar Configuration

## ✅ All Modules Configured

### Sidebar Modules (14 Total):

1. **📊 Dashboard** - `/`
   - Permission: `dashboard.view`
   - ✅ Configured

2. **📁 Master Data** - `/master-data`
   - Permissions: All master data view, create, edit, manage
   - ✅ Configured
   - 11 sub-modules (GST, HSN, Categories, Units, Brands, Manufacturers, Medicine Types, Racks, Adjustment Reasons, Suppliers, Payment Methods)

3. **💊 Medicine Master** - `/medicines`
   - Permissions: `medicines.view`, `medicines.create`
   - ✅ Configured

4. **📊 Reports** - `/reports`
   - Permissions: `reports.view.shop`, `reports.view.global`, `reports.export`
   - ✅ Configured

5. **📦 Inventory** - `/inventory`
   - Permissions: `inventory.view.shop`, `inventory.adjust.shop`
   - ✅ Configured

6. **🚚 Incoming Shipments** - `/dispatches`
   - Permissions: `dispatches.view.shop`
   - ✅ Configured
   - **Note:** Label dynamically shows as "Incoming Shipments" for shop users

7. **📝 Purchase Requests** - `/purchase-requests`
   - Permissions: `purchase_requests.view.shop`, `purchase_requests.create.shop`
   - ✅ Configured

8. **👥 Employees** - `/employees`
   - Permissions: `employees.view.shop`, `employees.manage.shop`
   - ✅ Configured

9. **📋 Attendance** - `/employees/attendance`
   - Permissions: `attendance.manage.shop`
   - ✅ Configured

10. **💰 Salary** - `/employees/salary`
    - Permissions: `salary.manage.shop`
    - ✅ Configured

11. **💳 POS Billing** - `/sales/pos`
    - Permissions: `billing.create.shop`
    - ✅ Configured

12. **📄 Invoices** - `/sales/invoices`
    - Permissions: `billing.view.shop`
    - ✅ Configured

13. **🔄 Returns & Refunds** - `/sales/returns`
    - Permissions: `returns.view.shop`, `returns.create.shop`
    - ✅ Configured

14. **👤 Customers** - `/customers`
    - Permissions: `customers.view.shop`, `customers.manage.shop`
    - ✅ Configured

## 📋 Complete Permission List

### Core Operations (14 permissions):
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

### Master Data (44 permissions - 11 modules × 4 permissions each):
- **Categories:** `view`, `create`, `edit`, `manage`
- **Units:** `view`, `create`, `edit`, `manage`
- **Brands:** `view`, `create`, `edit`, `manage`
- **Manufacturers:** `view`, `create`, `edit`, `manage`
- **Medicine Types:** `view`, `create`, `edit`, `manage`
- **HSN Codes:** `view`, `create`, `edit`, `manage`
- **GST Slabs:** `view`, `create`, `edit`, `manage`
- **Suppliers:** `view`, `create`, `edit`, `manage`
- **Payment Methods:** `view`, `create`, `edit`, `manage`
- **Adjustment Reasons:** `view`, `create`, `edit`, `manage`
- **Racks:** `view`, `create`, `edit`, `manage`

**Total: ~58 permissions**

## 🔧 Backend Script

The `grant_pharmacy_admin_permissions.py` script has been updated to include:
- ✅ All master data permissions (view, create, edit, manage)
- ✅ All operational permissions
- ✅ Reports with global view for sidebar visibility
- ✅ Medicine Master permissions

## ✅ Sidebar Configuration

The sidebar is already correctly configured:
- ✅ All modules have proper permissions
- ✅ Shop-specific modules are excluded from warehouse admin
- ✅ "Incoming Shipments" label is dynamic based on user permissions
- ✅ Master Data is visible to all roles with proper permissions

## 🚀 Next Steps

1. **Create missing permissions** (if any):
   ```bash
   cd backend
   python scripts/create_missing_permissions.py
   ```

2. **Grant permissions to pharmacy admin**:
   ```bash
   python scripts/grant_pharmacy_admin_permissions.py
   ```

3. **Verify sidebar**:
   - Login as pharmacy_admin user
   - Check all 14 modules are visible
   - Verify "Incoming Shipments" label appears
   - Confirm master data has CREATE/UPDATE buttons (no DELETE)

## 📊 Summary

**Shop Admin has access to:**
- ✅ 14 main modules
- ✅ 11 master data sub-modules
- ✅ All shop-scoped operations
- ✅ Full master data management (CRU - no Delete)
- ✅ Complete sales & billing operations

**Total:** 25 modules (14 main + 11 master data)
