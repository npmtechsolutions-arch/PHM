/**
 * Permission types and utilities for frontend permission-based authorization
 */

export interface Permission {
    id: string;
    code: string;
    module: string;
    action: string;
    scope: 'global' | 'warehouse' | 'shop';
    description?: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    entity_type: 'warehouse' | 'shop' | null;
    is_system: boolean;
    is_creatable: boolean;
    permissions: Permission[];
}

export interface UserWithPermissions {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role: string;
    role_id?: string;
    permissions: string[];
    is_active: boolean;
    warehouse_id?: string;
    shop_id?: string;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(permissions: string[], permissionCode: string): boolean {
    return permissions.includes(permissionCode);
}

/**
 * Check if user has ANY of the listed permissions
 */
export function hasAnyPermission(permissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(p => permissions.includes(p));
}

/**
 * Check if user has ALL of the listed permissions
 */
export function hasAllPermissions(permissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(p => permissions.includes(p));
}

/**
 * Check if user has any permission in a module
 * Useful for sidebar visibility
 */
export function hasModuleAccess(permissions: string[], module: string): boolean {
    return permissions.some(p => p.startsWith(`${module}.`));
}

/**
 * Get the scope the user has for a permission prefix
 * e.g., getScopeForPermission(perms, "inventory.view") => "global" | "warehouse" | "shop" | null
 */
export function getScopeForPermission(permissions: string[], permissionPrefix: string): string | null {
    for (const perm of permissions) {
        if (perm.startsWith(permissionPrefix)) {
            const parts = perm.split('.');
            if (parts.length >= 3) {
                return parts[2];
            }
        }
    }
    return null;
}

/**
 * Permission constants for use in components
 */
export const PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',

    // Users
    USERS_VIEW: 'users.view',
    USERS_VIEW_WAREHOUSE: 'users.view.warehouse',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',

    // Roles
    ROLES_VIEW: 'roles.view',
    ROLES_MANAGE: 'roles.manage',

    // Warehouses
    WAREHOUSES_VIEW: 'warehouses.view',
    WAREHOUSES_CREATE: 'warehouses.create',
    WAREHOUSES_EDIT: 'warehouses.edit',
    WAREHOUSES_DELETE: 'warehouses.delete',

    // Shops
    SHOPS_VIEW: 'shops.view',
    SHOPS_CREATE: 'shops.create',
    SHOPS_EDIT: 'shops.edit',
    SHOPS_DELETE: 'shops.delete',

    // Medicines
    MEDICINES_VIEW: 'medicines.view',
    MEDICINES_CREATE: 'medicines.create',
    MEDICINES_EDIT: 'medicines.edit',
    MEDICINES_DELETE: 'medicines.delete',

    // Categories/Units/HSN/GST
    CATEGORIES_VIEW: 'categories.view',
    CATEGORIES_CREATE: 'categories.create',
    CATEGORIES_EDIT: 'categories.edit',
    CATEGORIES_DELETE: 'categories.delete',
    CATEGORIES_MANAGE: 'categories.manage',
    UNITS_VIEW: 'units.view',
    UNITS_CREATE: 'units.create',
    UNITS_EDIT: 'units.edit',
    UNITS_DELETE: 'units.delete',
    UNITS_MANAGE: 'units.manage',
    HSN_VIEW: 'hsn.view',
    HSN_CREATE: 'hsn.create',
    HSN_EDIT: 'hsn.edit',
    HSN_DELETE: 'hsn.delete',
    HSN_MANAGE: 'hsn.manage',
    GST_VIEW: 'gst.view',
    GST_CREATE: 'gst.create',
    GST_EDIT: 'gst.edit',
    GST_DELETE: 'gst.delete',
    GST_MANAGE: 'gst.manage',

    // Inventory
    INVENTORY_VIEW_GLOBAL: 'inventory.view.global',
    INVENTORY_VIEW_WAREHOUSE: 'inventory.view.warehouse',
    INVENTORY_VIEW_SHOP: 'inventory.view.shop',
    INVENTORY_OVERSIGHT: 'inventory.oversight',
    INVENTORY_ADJUST_WAREHOUSE: 'inventory.adjust.warehouse',
    INVENTORY_ADJUST_SHOP: 'inventory.adjust.shop',
    INVENTORY_ENTRY_WAREHOUSE: 'inventory.entry.warehouse',
    INVENTORY_ENTRY_SHOP: 'inventory.entry.shop',

    // Racks
    RACKS_VIEW: 'racks.view',
    RACKS_CREATE: 'racks.create',
    RACKS_EDIT: 'racks.edit',  // Backend also accepts 'racks.update' as alias
    RACKS_DELETE: 'racks.delete',
    RACKS_MANAGE_WAREHOUSE: 'racks.manage.warehouse',

    // Purchase Requests
    PURCHASE_REQUESTS_VIEW_GLOBAL: 'purchase_requests.view.global',
    PURCHASE_REQUESTS_VIEW_WAREHOUSE: 'purchase_requests.view.warehouse',
    PURCHASE_REQUESTS_VIEW_SHOP: 'purchase_requests.view.shop',
    PURCHASE_REQUESTS_CREATE_SHOP: 'purchase_requests.create.shop',
    PURCHASE_REQUESTS_APPROVE_WAREHOUSE: 'purchase_requests.approve.warehouse',

    // Dispatches
    DISPATCHES_VIEW_GLOBAL: 'dispatches.view.global',
    DISPATCHES_VIEW_WAREHOUSE: 'dispatches.view.warehouse',
    DISPATCHES_VIEW_SHOP: 'dispatches.view.shop',
    DISPATCHES_CREATE_WAREHOUSE: 'dispatches.create.warehouse',

    // Billing
    BILLING_VIEW_SHOP: 'billing.view.shop',
    BILLING_CREATE_SHOP: 'billing.create.shop',
    BILLING_VOID_SHOP: 'billing.void.shop',

    // Returns
    RETURNS_VIEW_SHOP: 'returns.view.shop',
    RETURNS_CREATE_SHOP: 'returns.create.shop',

    // Customers
    CUSTOMERS_VIEW: 'customers.view',
    CUSTOMERS_VIEW_SHOP: 'customers.view.shop',
    CUSTOMERS_MANAGE_SHOP: 'customers.manage.shop',

    // Employees
    EMPLOYEES_VIEW_GLOBAL: 'employees.view.global',
    EMPLOYEES_VIEW_WAREHOUSE: 'employees.view.warehouse',
    EMPLOYEES_VIEW_SHOP: 'employees.view.shop',
    EMPLOYEES_MANAGE_WAREHOUSE: 'employees.manage.warehouse',
    EMPLOYEES_MANAGE_SHOP: 'employees.manage.shop',
    ATTENDANCE_VIEW_WAREHOUSE: 'attendance.view.warehouse',
    ATTENDANCE_MANAGE_WAREHOUSE: 'attendance.manage.warehouse',
    ATTENDANCE_MANAGE_SHOP: 'attendance.manage.shop',
    SALARY_MANAGE_WAREHOUSE: 'salary.manage.warehouse',
    SALARY_MANAGE_SHOP: 'salary.manage.shop',

    // Reports
    REPORTS_VIEW_GLOBAL: 'reports.view.global',
    REPORTS_VIEW_WAREHOUSE: 'reports.view.warehouse',
    REPORTS_VIEW_SHOP: 'reports.view.shop',
    REPORTS_EXPORT: 'reports.export',

    // Settings
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_MANAGE: 'settings.manage',

    // Audit
    AUDIT_VIEW: 'audit.view',
    LOGIN_ACTIVITY_VIEW: 'login_activity.view',

    // Notifications
    NOTIFICATIONS_VIEW: 'notifications.view',

    // Master Data - Brands
    BRANDS_VIEW: 'brands.view',
    BRANDS_CREATE: 'brands.create',
    BRANDS_EDIT: 'brands.edit',
    BRANDS_DELETE: 'brands.delete',
    BRANDS_MANAGE: 'brands.manage',

    // Master Data - Manufacturers
    MANUFACTURERS_VIEW: 'manufacturers.view',
    MANUFACTURERS_CREATE: 'manufacturers.create',
    MANUFACTURERS_EDIT: 'manufacturers.edit',
    MANUFACTURERS_DELETE: 'manufacturers.delete',
    MANUFACTURERS_MANAGE: 'manufacturers.manage',

    // Master Data - Medicine Types
    MEDICINE_TYPES_VIEW: 'medicine_types.view',
    MEDICINE_TYPES_CREATE: 'medicine_types.create',
    MEDICINE_TYPES_EDIT: 'medicine_types.edit',
    MEDICINE_TYPES_DELETE: 'medicine_types.delete',
    MEDICINE_TYPES_MANAGE: 'medicine_types.manage',

    // Master Data - Suppliers
    SUPPLIERS_VIEW: 'suppliers.view',
    SUPPLIERS_CREATE: 'suppliers.create',
    SUPPLIERS_EDIT: 'suppliers.edit',
    SUPPLIERS_DELETE: 'suppliers.delete',
    SUPPLIERS_MANAGE: 'suppliers.manage',

    // Master Data - Adjustment Reasons
    ADJUSTMENT_REASONS_VIEW: 'adjustment_reasons.view',
    ADJUSTMENT_REASONS_CREATE: 'adjustment_reasons.create',
    ADJUSTMENT_REASONS_EDIT: 'adjustment_reasons.edit',
    ADJUSTMENT_REASONS_DELETE: 'adjustment_reasons.delete',
    ADJUSTMENT_REASONS_MANAGE: 'adjustment_reasons.manage',

    // Master Data - Payment Methods
    PAYMENT_METHODS_VIEW: 'payment_methods.view',
    PAYMENT_METHODS_CREATE: 'payment_methods.create',
    PAYMENT_METHODS_EDIT: 'payment_methods.edit',
    PAYMENT_METHODS_DELETE: 'payment_methods.delete',
    PAYMENT_METHODS_MANAGE: 'payment_methods.manage',

    // Master Data - Shop Types
    SHOP_TYPES_VIEW: 'shop_types.view',
    SHOP_TYPES_CREATE: 'shop_types.create',
    SHOP_TYPES_EDIT: 'shop_types.edit',
    SHOP_TYPES_DELETE: 'shop_types.delete',

    // Master Data - Customer Types
    CUSTOMER_TYPES_VIEW: 'customer_types.view',
    CUSTOMER_TYPES_CREATE: 'customer_types.create',
    CUSTOMER_TYPES_EDIT: 'customer_types.edit',
    CUSTOMER_TYPES_DELETE: 'customer_types.delete',

    // Master Data - Genders
    GENDERS_VIEW: 'genders.view',
    GENDERS_MANAGE: 'genders.manage',

    // Master Data - Employment Types
    EMPLOYMENT_TYPES_VIEW: 'employment_types.view',
    EMPLOYMENT_TYPES_MANAGE: 'employment_types.manage',

    // Master Data - Urgency Levels
    URGENCY_LEVELS_VIEW: 'urgency_levels.view',
    URGENCY_LEVELS_MANAGE: 'urgency_levels.manage',

    // Master Data - Statuses
    STATUSES_VIEW: 'statuses.view',
    STATUSES_MANAGE: 'statuses.manage',

    // Master Data - Designations
    DESIGNATIONS_VIEW: 'designations.view',
    DESIGNATIONS_CREATE: 'designations.create',
    DESIGNATIONS_EDIT: 'designations.edit',
    DESIGNATIONS_DELETE: 'designations.delete',

    // Master Data - Departments
    DEPARTMENTS_VIEW: 'departments.view',
    DEPARTMENTS_CREATE: 'departments.create',
    DEPARTMENTS_EDIT: 'departments.edit',
    DEPARTMENTS_DELETE: 'departments.delete',
} as const;
