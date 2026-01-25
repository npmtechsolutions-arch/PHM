/**
 * Application Routes
 * Centralized route definitions for consistency
 */
export const ROUTES = {
    // Auth
    LOGIN: '/login',
    PLATFORM_HOME: '/platform',

    // Dashboard
    DASHBOARD: '/',

    // Master Data
    CATEGORIES: '/categories',
    UNITS: '/units',
    MANUFACTURERS: '/manufacturers',
    SUPPLIERS: '/suppliers',
    MEDICINE_TYPES: '/medicine-types',
    HSN_CODES: '/hsn-codes',
    GST_SLABS: '/gst-slabs',
    PAYMENT_METHODS: '/payment-methods',
    ADJUSTMENT_REASONS: '/adjustment-reasons',
    RACKS: '/racks',

    // Entities
    WAREHOUSES: '/warehouses',
    WAREHOUSE_ADD: '/warehouses/add',
    WAREHOUSE_EDIT: (id: string) => `/warehouses/${id}/edit`,
    SHOPS: '/shops',
    SHOP_ADD: '/shops/add',
    SHOP_EDIT: (id: string) => `/shops/${id}/edit`,

    // Medicines
    MEDICINES: '/medicines',
    MEDICINE_ADD: '/medicines/add',
    MEDICINE_EDIT: (id: string) => `/medicines/${id}/edit`,
    MEDICINE_DETAILS: (id: string) => `/medicines/${id}`,

    // Inventory
    INVENTORY: '/inventory',
    INVENTORY_OVERSIGHT: '/inventory/oversight',
    STOCK_ENTRY: '/stock-entry',
    STOCK_ADJUSTMENT: '/stock-adjustment',

    // Operations
    DISPATCHES: '/dispatches',
    DISPATCH_CREATE: '/dispatches/create',
    DISPATCH_DETAILS: (id: string) => `/dispatches/${id}`,
    PURCHASE_REQUESTS: '/purchase-requests',

    // Sales
    POS_BILLING: '/pos',
    INVOICES: '/invoices',
    RETURN_REFUND: '/returns',

    // Customers
    CUSTOMERS: '/customers',

    // HR
    EMPLOYEES: '/employees',
    ATTENDANCE: '/employees/attendance',
    ATTENDANCE_REPORT: '/employees/attendance/report',
    SALARY: '/employees/salary',

    // Users & Permissions
    USERS: '/users',
    ROLES_PERMISSIONS: '/roles-permissions',

    // Reports
    SALES_REPORTS: '/reports/sales',
    TAX_REPORTS: '/reports/tax',
    EXPIRY_LOSS_REPORT: '/reports/expiry-loss',

    // System
    NOTIFICATIONS: '/notifications',
    AUDIT_LOGS: '/audit-logs',
    LOGIN_ACTIVITY: '/login-activity',
    SYSTEM_SETTINGS: '/settings/system',
    APPLICATION_SETTINGS: '/settings/application',
    WAREHOUSE_SHOP_MAPPING: '/warehouse-shop-mapping',
} as const;
