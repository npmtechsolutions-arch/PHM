# All Modules Permissions for Warehouse Admin

## ✅ Complete Module List

### 1. 📊 Dashboard
- `dashboard.view`

### 2. 🏢 Warehouses
- `warehouses.view`

### 3. 💊 Medicine Master
- `medicines.view`
- `medicines.create`

### 4. 📦 Inventory Oversight
- `inventory.view.global` ✅ **ADDED**
- `inventory.view.warehouse`

### 5. 📊 Reports
- `reports.view.global`
- `reports.view.warehouse`
- `reports.view.shop`

### 6. 📥 Stock Entry
- `inventory.entry.warehouse`
- `inventory.adjust.shop`

### 7. 📦 Inventory
- `inventory.view.warehouse`
- `inventory.view.shop`
- `inventory.adjust.warehouse`
- `inventory.adjust.shop`

### 8. 🔧 Stock Adjustment
- `inventory.adjust.warehouse`
- `inventory.adjust.shop`

### 9. 🚚 Dispatches
- `dispatches.view.warehouse`
- `dispatches.view.shop`
- `dispatches.create.warehouse`

### 10. 📝 Purchase Requests
- `purchase_requests.view.warehouse`
- `purchase_requests.view.shop`
- `purchase_requests.create.shop`
- `purchase_requests.approve.warehouse`

### 11. 👥 Employees
- `employees.view.warehouse`
- `employees.view.shop`
- `employees.view.global`
- `employees.manage.warehouse`
- `employees.manage.shop`

### 12. 📋 Attendance
- `attendance.manage.warehouse`
- `attendance.manage.shop`

### 13. 💰 Salary
- `salary.manage.warehouse`
- `salary.manage.shop`

### 14. 🔔 Notifications
- `notifications.view`

## 📁 Master Data Modules

All master data modules need **view**, **create**, **edit**, and **manage** permissions:

### Categories
- `categories.view`
- `categories.create`
- `categories.edit` ✅ **WILL BE CREATED**
- `categories.manage`

### Units
- `units.view`
- `units.create`
- `units.edit` ✅ **WILL BE CREATED**
- `units.manage`

### Brands
- `brands.view`
- `brands.create`
- `brands.edit` ✅ **WILL BE CREATED**
- `brands.manage` ✅ **WILL BE CREATED**

### Manufacturers
- `manufacturers.view`
- `manufacturers.create`
- `manufacturers.edit` ✅ **WILL BE CREATED**
- `manufacturers.manage` ✅ **WILL BE CREATED**

### Medicine Types
- `medicine_types.view`
- `medicine_types.create`
- `medicine_types.edit` ✅ **WILL BE CREATED**
- `medicine_types.manage` ✅ **WILL BE CREATED**

### HSN Codes
- `hsn.view`
- `hsn.create`
- `hsn.edit` ✅ **WILL BE CREATED**
- `hsn.manage`

### GST Slabs
- `gst.view`
- `gst.create`
- `gst.edit` ✅ **WILL BE CREATED**
- `gst.manage`

### Suppliers
- `suppliers.view`
- `suppliers.create`
- `suppliers.edit` ✅ **WILL BE CREATED**
- `suppliers.manage` ✅ **WILL BE CREATED**

### Payment Methods
- `payment_methods.view`
- `payment_methods.create`
- `payment_methods.edit` ✅ **WILL BE CREATED**
- `payment_methods.manage` ✅ **WILL BE CREATED**

### Adjustment Reasons
- `adjustment_reasons.view`
- `adjustment_reasons.create`
- `adjustment_reasons.edit` ✅ **WILL BE CREATED**
- `adjustment_reasons.manage` ✅ **WILL BE CREATED**

### Racks
- `racks.view`
- `racks.create`
- `racks.edit` ✅ **WILL BE CREATED**
- `racks.manage` ✅ **WILL BE CREATED**
- `racks.manage.warehouse`

## 🔐 User Management (Warehouse-Scoped)
- `users.view.warehouse`
- `users.create.warehouse`
- `users.update.warehouse`
- `users.delete.warehouse`

## 📊 Summary

**Total Modules:** 14 main modules + 11 master data modules = **25 modules**

**Permission Types:**
- ✅ View permissions
- ✅ Create permissions
- ✅ Edit permissions (will be created)
- ✅ Manage permissions (will be created for some modules)
- ❌ Delete permissions (NOT granted to warehouse admin)

## 🔧 Next Steps

1. Run `create_missing_permissions.py` to create:
   - All `edit` permissions for master data
   - All `manage` permissions for master data modules

2. Run `grant_warehouse_admin_permissions.py` to grant all permissions

3. Verify all 25 modules are accessible in sidebar
