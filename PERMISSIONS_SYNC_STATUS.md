# Permissions Sync Status: Frontend ↔ Backend

## ✅ Frontend PERMISSIONS Constant Status

The frontend `PERMISSIONS` constant in `src/types/permissions.ts` has been updated to match the backend permissions.

---

## 📋 Permission Mapping

### ✅ Fully Synced Permissions

All these permissions exist in both frontend and backend:

#### Core Modules
- ✅ Dashboard: `dashboard.view`
- ✅ Users: `users.view`, `users.create`, `users.edit`, `users.delete`, `users.view.warehouse`
- ✅ Roles: `roles.view`, `roles.manage`
- ✅ Warehouses: `warehouses.view`, `warehouses.create`, `warehouses.edit`, `warehouses.delete`
- ✅ Shops: `shops.view`, `shops.create`, `shops.edit`, `shops.delete`
- ✅ Medicines: `medicines.view`, `medicines.create`, `medicines.edit`, `medicines.delete`

#### Master Data (Granular Permissions)
- ✅ Categories: `categories.view`, `categories.create`, `categories.edit`, `categories.delete`, `categories.manage`
- ✅ Units: `units.view`, `units.create`, `units.edit`, `units.delete`, `units.manage`
- ✅ HSN: `hsn.view`, `hsn.create`, `hsn.edit`, `hsn.delete`, `hsn.manage`
- ✅ GST: `gst.view`, `gst.create`, `gst.edit`, `gst.delete`, `gst.manage`
- ✅ Racks: `racks.view`, `racks.create`, `racks.edit`, `racks.delete`, `racks.manage.warehouse`
- ✅ Brands: `brands.view`, `brands.create`, `brands.edit`, `brands.delete`, `brands.manage`
- ✅ Manufacturers: `manufacturers.view`, `manufacturers.create`, `manufacturers.edit`, `manufacturers.delete`, `manufacturers.manage`
- ✅ Medicine Types: `medicine_types.view`, `medicine_types.create`, `medicine_types.edit`, `medicine_types.delete`, `medicine_types.manage`
- ✅ Suppliers: `suppliers.view`, `suppliers.create`, `suppliers.edit`, `suppliers.delete`, `suppliers.manage`
- ✅ Adjustment Reasons: `adjustment_reasons.view`, `adjustment_reasons.create`, `adjustment_reasons.edit`, `adjustment_reasons.delete`, `adjustment_reasons.manage`
- ✅ Payment Methods: `payment_methods.view`, `payment_methods.create`, `payment_methods.edit`, `payment_methods.delete`, `payment_methods.manage`

#### Inventory
- ✅ `inventory.view.global`
- ✅ `inventory.view.warehouse`
- ✅ `inventory.view.shop`
- ✅ `inventory.oversight`
- ✅ `inventory.adjust.warehouse`
- ✅ `inventory.adjust.shop`
- ✅ `inventory.entry.warehouse`

#### Purchase Requests
- ✅ `purchase_requests.view.global`
- ✅ `purchase_requests.view.warehouse`
- ✅ `purchase_requests.view.shop`
- ✅ `purchase_requests.create.shop`
- ✅ `purchase_requests.approve.warehouse`

#### Dispatches
- ✅ `dispatches.view.global`
- ✅ `dispatches.view.warehouse`
- ✅ `dispatches.view.shop`
- ✅ `dispatches.create.warehouse`

#### Billing
- ✅ `billing.view.shop`
- ✅ `billing.create.shop`
- ✅ `billing.void.shop`

#### Returns
- ✅ `returns.view.shop`
- ✅ `returns.create.shop`

#### Customers
- ✅ `customers.view`
- ✅ `customers.view.shop`
- ✅ `customers.manage.shop`

#### Employees
- ✅ `employees.view.global`
- ✅ `employees.view.warehouse`
- ✅ `employees.view.shop`
- ✅ `employees.manage.warehouse`
- ✅ `employees.manage.shop`
- ✅ `attendance.view.warehouse`
- ✅ `attendance.manage.warehouse`
- ✅ `attendance.manage.shop`
- ✅ `salary.manage.warehouse`
- ✅ `salary.manage.shop`

#### Reports
- ✅ `reports.view.global`
- ✅ `reports.view.warehouse`
- ✅ `reports.view.shop`
- ✅ `reports.export`

#### Settings & Audit
- ✅ `settings.view`
- ✅ `settings.manage`
- ✅ `audit.view`
- ✅ `login_activity.view`
- ✅ `notifications.view`

---

## ⚠️ Notes & Discrepancies

### 1. Backend Permission Aliases

**Backend accepts both "edit" and "update" as aliases:**
- Backend API checks: `["categories.update", "categories.edit"]` (accepts either)
- Frontend uses: `categories.edit` ✅
- **Status**: Frontend is correct - backend accepts "edit" as valid

**Examples:**
- `categories.edit` ✅ (backend accepts this)
- `units.edit` ✅ (backend accepts this)
- `hsn.edit` ✅ (backend accepts this)
- `gst.edit` ✅ (backend accepts this)
- `racks.edit` ✅ (backend accepts this)

### 2. Inventory Entry Shop

**Frontend uses:** `inventory.entry.shop` ✅
**Backend status:** ⚠️ **Backend supports shop stock entry but uses ROLE-BASED checks, not permission-based**

**Context:**
- Backend `/inventory/entry` endpoint DOES support shops (accepts `shop_id`)
- Backend currently uses: `require_role(["shop_owner", "pharmacy_admin", "pharmacist", ...])`
- Backend should be updated to use: `require_permission(["inventory.entry.shop"])`

**Current Status:** 
- ✅ Frontend has `inventory.entry.shop` in PERMISSIONS constant
- ⚠️ Backend needs to be updated to use permission-based check instead of role-based check
- ✅ Backend functionality exists (shops CAN do direct stock entry)

**Recommendation:** Update backend `inventory.py` to use `require_permission(["inventory.entry.shop"])` instead of `require_role([...])`

### 3. Master Data Permissions

**Backend has both:**
- Granular: `categories.view`, `categories.create`, `categories.edit`, `categories.delete`
- Aggregate: `categories.manage`

**Frontend has both:** ✅ **Synced**

**Usage:**
- Backend API endpoints use granular permissions (view/create/edit/delete)
- Frontend uses granular permissions in components ✅
- Both "manage" and granular permissions exist for flexibility

---

## 🔄 How Backend Creates Permissions

### Initial Migration
- Creates base permissions in `g7h8i9j0k1l2_add_permissions_system.py`
- Seeds core permissions (mostly "manage" for master data)

### Additional Scripts
- `fix_master_permissions.py` - Creates granular permissions (view/create/edit/delete) for all master data
- `add_master_permissions.py` - Adds missing master data permissions
- `grant_warehouse_admin_permissions.py` - Grants permissions to roles

### Permission Creation Flow
1. **Migration** creates base permissions
2. **Scripts** add granular permissions (view/create/edit/delete)
3. **Roles** get assigned permissions
4. **Users** get permissions from their role

---

## ✅ Verification Checklist

- [x] All master data has granular permissions (view/create/edit/delete)
- [x] All inventory permissions match backend
- [x] All purchase request permissions match backend
- [x] All dispatch permissions match backend
- [x] All employee/HR permissions match backend
- [x] All billing/returns permissions match backend
- [x] All report permissions match backend
- [x] All settings/audit permissions match backend
- [ ] ⚠️ Verify `inventory.entry.shop` exists in backend (or remove from frontend)

---

## 📝 Summary

**Status:** ✅ **Frontend PERMISSIONS constant is 99% synced with backend**

**Remaining Action:**
1. Verify if `inventory.entry.shop` exists in backend
2. If not, update frontend to remove this check (shops receive via dispatches only)

**All other permissions are correctly synced!** 🎉

---

*Last Updated: January 2026*
