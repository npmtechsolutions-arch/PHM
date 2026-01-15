import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';


interface SubItem {
    path: string;
    label: string;
    icon: string;
    permissions?: string[];
    divider?: boolean;  // Visual separator before this item
    excludeFromWarehouseAdmin?: boolean;
}

interface NavItemType {
    path: string;
    label: string;
    icon: string;
    badge?: number | string;
    permissions?: string[];
    children?: SubItem[];
    excludeFromSuperAdmin?: boolean;
    excludeFromWarehouseAdmin?: boolean;
}

// ============================================================================
// SUPER ADMIN SIDEBAR STRUCTURE (CLEAN & FINAL)
// Role Intent: Structure, Masters, Access, and Global Visibility
// Super Admin does NOT do day-to-day warehouse or pharmacy operations
// ============================================================================

const superAdminItems: NavItemType[] = [
    // ─────────────────────────────────────────────────────────────────────────
    // 1️⃣ DASHBOARD - Read-only system overview
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/',
        label: 'Dashboard',
        icon: 'dashboard',
        permissions: ['dashboard.view']
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 2️⃣ WAREHOUSES - Physical inventory entities
    // Define warehouse identity (name, code, location)
    // Control whether a warehouse is active in the system
    // 🚫 No stock, no batch, no GST here - just entity definition
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/warehouses',
        label: 'Warehouses',
        icon: 'warehouse',
        permissions: ['warehouses.view', 'warehouses.create'],
        children: [
            { path: '/warehouses', label: 'View All Warehouses', icon: 'list', permissions: ['warehouses.view'] },
            { path: '/warehouses/add', label: 'Add Warehouse', icon: 'add_circle', permissions: ['warehouses.create'] },
        ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3️⃣ MEDICAL SHOPS - Retail entities
    // Warehouse selection happens during shop creation (mapping saved once)
    // ❌ No separate "warehouse mapping" sidebar
    // ❌ No inventory here - just entity definition + linkage
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/shops',
        label: 'Medical Shops',
        icon: 'storefront',
        permissions: ['shops.view', 'shops.create'],
        children: [
            { path: '/shops', label: 'View All Shops', icon: 'list', permissions: ['shops.view'] },
            { path: '/shops/add', label: 'Add Shop', icon: 'add_circle', permissions: ['shops.create'] },
        ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 4️⃣ USERS & ACCESS - Security & control
    // Create users, assign roles, assign permissions, bind entity if required
    // Super Admin role: Exists by system seed - cannot be created or assigned
    // Sidebar visibility everywhere is driven by permissions
    // Available to Super Admin (global) and Warehouse Admin (warehouse-scoped)
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/users-access',
        label: 'Users & Access',
        icon: 'manage_accounts',
        permissions: ['users.view', 'users.view.warehouse', 'roles.view', 'login_activity.view'],
        excludeFromWarehouseAdmin: true,
        children: [
            { path: '/users', label: 'Users', icon: 'people', permissions: ['users.view', 'users.view.warehouse'] },
            { path: '/roles', label: 'Roles & Permissions', icon: 'admin_panel_settings', permissions: ['roles.view', 'roles.manage'] },
            { path: '/login-activity', label: 'Login Activity', icon: 'history', permissions: ['login_activity.view'] },
        ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5️⃣ MASTER DATA - MOST IMPORTANT SECTION (SSOT)
    // If something appears in a dropdown anywhere → it is created here
    // Available to all roles based on permissions (not Super Admin exclusive)
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/master-data',
        label: 'Master Data',
        icon: 'dataset',
        permissions: [
            'gst.manage', 'hsn.manage', 'categories.manage', 'units.manage', 'suppliers.manage',
            'brands.manage', 'manufacturers.manage', 'medicine_types.manage',
            'adjustment_reasons.manage', 'payment_methods.manage', 'racks.manage',
            'gst.view', 'hsn.view', 'categories.view', 'units.view', 'suppliers.view',
            'brands.view', 'manufacturers.view', 'medicine_types.view',
            'adjustment_reasons.view', 'payment_methods.view', 'racks.view'
        ],
        children: [
            // ═══════════════════════════════════════════════════════════════
            // 5.1 TAX MASTER - GST/VAT Slabs
            // Create: GST 0%, 5%, 12%, 18%, 28%, etc.
            // Each slab: Slab name, Total %, CGST/SGST/IGST, Active flag
            // Used by: HSN, Medicine, Billing, Reports
            // 🚫 GST % is never typed elsewhere
            // ═══════════════════════════════════════════════════════════════
            { path: '/gst-slabs', label: 'GST / VAT Slabs', icon: 'percent', permissions: ['gst.manage', 'gst.view'] },

            // ═══════════════════════════════════════════════════════════════
            // 5.2 HSN MASTER
            // Create: HSN code, Description, GST slab (selected from GST Master)
            // ❌ Cannot create HSN without GST slab - GST is derived, not entered
            // ═══════════════════════════════════════════════════════════════
            { path: '/hsn', label: 'HSN Codes', icon: 'tag', permissions: ['hsn.manage', 'hsn.view'], divider: true },

            // ═══════════════════════════════════════════════════════════════
            // 5.3 MEDICINE REFERENCE MASTERS
            // Create: Categories, Types, Brands, Manufacturers, Units/Packaging
            // Used by: Medicine Master, Inventory, Billing, Reports
            // 🚫 These are not medicines, only definitions
            // ═══════════════════════════════════════════════════════════════
            { path: '/categories', label: 'Medicine Categories', icon: 'category', permissions: ['categories.manage', 'categories.view'], divider: true },
            { path: '/medicine-types', label: 'Medicine Types', icon: 'medication', permissions: ['medicine_types.manage', 'medicine_types.view'] },
            { path: '/brands', label: 'Brands', icon: 'label', permissions: ['brands.manage', 'brands.view'] },
            { path: '/manufacturers', label: 'Manufacturers', icon: 'factory', permissions: ['manufacturers.manage', 'manufacturers.view'] },
            { path: '/units', label: 'Units / Packaging', icon: 'straighten', permissions: ['units.manage', 'units.view'] },

            // ═══════════════════════════════════════════════════════════════
            // 5.4 INVENTORY REFERENCE MASTERS
            // Create: Rack Name/Number, Stock adjustment reasons, Stock status types
            // Used by: Stock entry, Inventory logs, Audit trails
            // ═══════════════════════════════════════════════════════════════
            { path: '/racks', label: 'Rack Master', icon: 'shelves', permissions: ['racks.manage', 'racks.manage.warehouse', 'racks.view', 'racks.view.warehouse'], divider: true },
            { path: '/adjustment-reasons', label: 'Adjustment Reasons', icon: 'edit_note', permissions: ['adjustment_reasons.manage', 'adjustment_reasons.view'] },

            // ═══════════════════════════════════════════════════════════════
            // 5.5 BUSINESS REFERENCE MASTERS
            // Create: Suppliers, Payment Methods, Discount Types
            // Used by: Purchase, POS billing, Reports
            // ═══════════════════════════════════════════════════════════════
            { path: '/suppliers', label: 'Suppliers', icon: 'local_shipping', permissions: ['suppliers.manage', 'suppliers.view'], divider: true },
            { path: '/payment-methods', label: 'Payment Methods', icon: 'payments', permissions: ['payment_methods.manage', 'payment_methods.view'] },
        ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6️⃣ MEDICINE MASTER - Global medicine definition
    // Medicine form is gated by masters:
    // Category → Category Master, Type → Type Master, Brand → Brand Master
    // Manufacturer → Manufacturer Master, Unit → Unit Master
    // HSN → HSN Master, GST → auto-derived from HSN
    // 🚫 No batch, 🚫 No expiry, 🚫 No quantity
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/medicines',
        label: 'Medicine Master',
        icon: 'medication',
        permissions: ['medicines.view', 'medicines.create'],
        children: [
            { path: '/medicines', label: 'View Medicines', icon: 'list', permissions: ['medicines.view'] },
            { path: '/medicines/add', label: 'Add Medicine', icon: 'add_circle', permissions: ['medicines.create'] },
        ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 7️⃣ INVENTORY OVERSIGHT - Global monitoring, NOT operations
    // Monitor: Warehouse stock (aggregated), Shop stock (aggregated)
    // Monitor: Expiry monitoring, Dead stock
    // What you do: Monitor health, Identify risks, Drill down to reports
    // 🚫 No stock entry, 🚫 No batch creation
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/inventory-oversight',
        label: 'Inventory Oversight',
        icon: 'inventory_2',
        permissions: ['inventory.view.global'],
        children: [
            { path: '/inventory-oversight', label: 'Overview', icon: 'analytics', permissions: ['inventory.view.global'] },
            { path: '/inventory-oversight/expiry', label: 'Expiry Monitoring', icon: 'event_busy', permissions: ['inventory.view.global'] },
            { path: '/inventory-oversight/dead-stock', label: 'Dead Stock', icon: 'warning', permissions: ['inventory.view.global'] },
        ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 8️⃣ REPORTS - System-wide analytics
    // Sales (all shops), Inventory aging, Tax (GST/VAT) reports, Compliance
    // Filters: Warehouse, Shop, Medicine/Category (all from masters)
    // Available to all roles based on permissions
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/reports',
        label: 'Reports',
        icon: 'assessment',
        permissions: ['reports.view.global', 'reports.view.warehouse', 'reports.view.shop'],
        children: [
            { path: '/reports/sales', label: 'Sales Reports', icon: 'bar_chart', permissions: ['reports.view.global', 'reports.view.shop'] },
            { path: '/reports/inventory', label: 'Inventory Reports', icon: 'inventory', permissions: ['reports.view.global', 'reports.view.warehouse'] },
            { path: '/reports/tax', label: 'Tax Reports', icon: 'receipt', permissions: ['reports.view.global', 'reports.view.shop'] },
            { path: '/reports/expiry', label: 'Expiry Reports', icon: 'event_busy', permissions: ['reports.view.global', 'reports.view.warehouse', 'reports.view.shop'] },
        ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 🔟 SYSTEM - Integrity & audit
    // Audit logs, Error logs, Activity history, Backup/restore
    // 🚫 Read-only, 🚫 Super Admin only
    // ─────────────────────────────────────────────────────────────────────────
    {
        path: '/system',
        label: 'System',
        icon: 'settings',
        permissions: ['audit.view', 'settings.manage'],
        children: [
            { path: '/audit-logs', label: 'Audit Logs', icon: 'history', permissions: ['audit.view'] },
            { path: '/system/settings', label: 'System Settings', icon: 'tune', permissions: ['settings.manage'] },
        ]
    },
];

// ============================================================================
// OPERATIONAL ITEMS - For Warehouse Admin, Pharmacy Admin ONLY
// Super Admin does NOT see these - they are excluded
// Warehouse Admin: Dashboard, Warehouses, Master Data, Medicine Master, 
// Inventory Oversight, Reports, Stock Entry, Inventory, 
// Stock Adjustment, Dispatches, Purchase Requests, Employees, Attendance, Salary
// ============================================================================
const operationalItems: NavItemType[] = [
    // 1. Dashboard (shared with Super Admin items)

    // 2. Warehouses (shared with Super Admin items)

    // 3. Master Data (shared with Super Admin items)

    // 4. Medicine Master (shared with Super Admin items)

    // 5. Inventory Oversight (shared with Super Admin items)

    // 6. Reports (shared with Super Admin items)

    // 8. Stock Entry - Warehouse operational
    {
        path: '/warehouses/stock',
        label: 'Stock Entry',
        icon: 'add_box',
        permissions: ['inventory.entry.warehouse', 'stock.entry.warehouse'],
        excludeFromSuperAdmin: true
    },

    // 9. Inventory - Warehouse operational
    {
        path: '/inventory',
        label: 'Inventory',
        icon: 'inventory_2',
        permissions: ['inventory.view.warehouse', 'inventory.view.shop'],
        excludeFromSuperAdmin: true
    },

    // 10. Stock Adjustment - Warehouse operational
    {
        path: '/inventory/adjust',
        label: 'Stock Adjustment',
        icon: 'tune',
        permissions: ['inventory.adjust.warehouse', 'stock.adjust.warehouse'],
        excludeFromSuperAdmin: true
    },

    // 11. Dispatches - Warehouse operational
    {
        path: '/dispatches',
        label: 'Dispatches',
        icon: 'local_shipping',
        permissions: ['dispatches.view.warehouse', 'dispatches.view.shop', 'dispatches.manage.warehouse'],
        excludeFromSuperAdmin: true
    },

    // 12. Purchase Requests - Warehouse operational
    {
        path: '/purchase-requests',
        label: 'Purchase Requests',
        icon: 'shopping_cart',
        permissions: ['purchase_requests.view.warehouse', 'purchase_requests.view.shop', 'purchase_requests.create.shop', 'purchase_requests.approve'],
        excludeFromSuperAdmin: true
    },

    // 13. Employees - Warehouse operational
    {
        path: '/employees',
        label: 'Employees',
        icon: 'badge',
        permissions: ['employees.view.warehouse', 'employees.view.shop', 'employees.create.warehouse', 'employees.view'],
        excludeFromSuperAdmin: true
    },

    // 14. Attendance - Warehouse operational
    {
        path: '/employees/attendance',
        label: 'Attendance',
        icon: 'event_available',
        permissions: ['attendance.manage.warehouse', 'attendance.manage.shop', 'attendance.view.warehouse'],
        excludeFromSuperAdmin: true,
        children: [
            {
                path: '/employees/attendance',
                label: 'Attendance Marker',
                icon: 'edit_calendar',
                permissions: ['attendance.manage.warehouse', 'attendance.manage.shop']
            },
            {
                path: '/employees/attendance/report',
                label: 'Attendance Report',
                icon: 'summarize',
                permissions: ['attendance.view.warehouse', 'attendance.manage.warehouse']
            },
        ]
    },

    // 15. Salary - Warehouse operational
    {
        path: '/employees/salary',
        label: 'Salary',
        icon: 'payments',
        permissions: ['salary.manage.warehouse', 'salary.manage.shop', 'payroll.view.warehouse', 'payroll.process.warehouse'],
        excludeFromSuperAdmin: true
    },

    // Shop Operations (Pharmacy Admin only - excluded from Warehouse Admin)
    {
        path: '/sales/pos',
        label: 'POS Billing',
        icon: 'point_of_sale',
        permissions: ['billing.create.shop'],
        excludeFromSuperAdmin: true,
        excludeFromWarehouseAdmin: true
    },
    {
        path: '/sales/invoices',
        label: 'Invoices',
        icon: 'receipt_long',
        permissions: ['billing.view.shop'],
        excludeFromSuperAdmin: true,
        excludeFromWarehouseAdmin: true
    },
    {
        path: '/sales/returns',
        label: 'Returns & Refunds',
        icon: 'assignment_return',
        permissions: ['returns.view.shop', 'returns.create.shop'],
        excludeFromSuperAdmin: true,
        excludeFromWarehouseAdmin: true
    },
    {
        path: '/customers',
        label: 'Customers',
        icon: 'people',
        permissions: ['customers.view.shop'],
        excludeFromSuperAdmin: true,
        excludeFromWarehouseAdmin: true
    },

];

export default function Sidebar() {

    const location = useLocation();
    const { user } = useUser();
    const { hasAnyPermission } = usePermissions();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    const userRole = user?.role || 'user';
    const isSuperAdmin = userRole === 'super_admin';

    // Check if user can see an item based on permissions
    const canSeeItem = (item: NavItemType | SubItem): boolean => {
        // Super Admin CANNOT see operational items (excludeFromSuperAdmin items)
        if (isSuperAdmin && 'excludeFromSuperAdmin' in item && item.excludeFromSuperAdmin) {
            return false;
        }

        // Warehouse Admin CANNOT see items marked for exclusion
        if (userRole === 'warehouse_admin' && 'excludeFromWarehouseAdmin' in item && item.excludeFromWarehouseAdmin) {
            return false;
        }

        // ✅ Super Admin sees ALL Super Admin items without permission checks
        // Super Admin is the platform owner with full access to structure, masters, and visibility
        if (isSuperAdmin) {
            return true;
        }

        // For non-Super Admin: If permissions are specified, check them
        if (item.permissions && item.permissions.length > 0) {
            return hasAnyPermission(item.permissions);
        }

        // No restrictions = visible to all
        return true;
    };

    // Auto-expand groups based on current path
    useEffect(() => {
        const allItems = isSuperAdmin ? superAdminItems : [...superAdminItems, ...operationalItems];
        allItems.forEach(item => {
            if (item.children) {
                const isChildActive = item.children.some(child =>
                    location.pathname === child.path || location.pathname.startsWith(child.path + '/')
                );
                if (isChildActive && !expandedGroups.includes(item.path)) {
                    setExpandedGroups(prev => [...prev, item.path]);
                }
            }
        });
    }, [location.pathname, isSuperAdmin]);

    useEffect(() => {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState) {
            setIsCollapsed(savedState === 'true');
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', String(newState));
    };

    const toggleGroup = (path: string) => {
        setExpandedGroups(prev =>
            prev.includes(path)
                ? prev.filter(p => p !== path)
                : [...prev, path]
        );
    };

    const isGroupActive = (item: NavItemType) => {
        if (item.children) {
            return item.children.some(child =>
                location.pathname === child.path || location.pathname.startsWith(child.path + '/')
            );
        }
        return location.pathname === item.path;
    };

    const renderNavItem = (item: NavItemType, index: number) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedGroups.includes(item.path);
        const isActive = isGroupActive(item);

        if (hasChildren && !isCollapsed) {
            return (
                <div key={item.path} className="animate-fadeIn" style={{ animationDelay: `${index * 20}ms` }}>
                    <button
                        onClick={() => toggleGroup(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                            ${isActive
                                ? 'bg-primary/10 text-primary dark:text-blue-400'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[22px] transition-transform group-hover:scale-110">
                            {item.icon}
                        </span>
                        <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                        <span className={`material-symbols-outlined text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </button>

                    {isExpanded && (
                        <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5">
                            {item.children!
                                .filter(child => canSeeItem(child))
                                .map((child) => (
                                    <div key={child.path}>
                                        {child.divider && (
                                            <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>
                                        )}
                                        <NavLink
                                            to={child.path}
                                            end={child.path === item.path}
                                            className={({ isActive }) =>
                                                `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm
                                                ${isActive
                                                    ? 'bg-primary text-white'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                                }`
                                            }
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {child.icon}
                                            </span>
                                            <span className="font-medium">{child.label}</span>
                                        </NavLink>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
                    ${isActive
                        ? 'bg-primary text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}`
                }
                style={{ animationDelay: `${index * 20}ms` }}
                title={isCollapsed ? item.label : undefined}
            >
                <span className="material-symbols-outlined text-[22px] transition-transform group-hover:scale-110">
                    {item.icon}
                </span>
                {!isCollapsed && (
                    <>
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        {item.badge && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                {item.badge}
                            </span>
                        )}
                    </>
                )}
            </NavLink>
        );
    };

    // Get visible items based on role
    const getVisibleItems = (): NavItemType[] => {
        if (isSuperAdmin) {
            // Super Admin sees ONLY the Super Admin items
            return superAdminItems.filter(item => canSeeItem(item));
        } else {
            // Other roles see all items (superAdmin + operational) filtered by permissions
            const allItems = [...superAdminItems, ...operationalItems];
            return allItems.filter(item => canSeeItem(item));
        }
    };

    return (
        <aside
            className={`
                flex flex-col border-r border-slate-200 dark:border-slate-800 
                bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out
                ${isCollapsed ? 'w-20' : 'w-64'}
            `}
        >
            {/* Logo Section */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-slate-800">
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>local_pharmacy</span>
                    </div>
                    {!isCollapsed && (
                        <div className="animate-fadeIn">
                            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">PharmaEC</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {isSuperAdmin ? 'Super Admin' : 'Management System'}
                            </p>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Collapse sidebar"
                    >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                )}
            </div>

            {/* Collapse toggle for collapsed state */}
            {isCollapsed && (
                <button
                    onClick={toggleSidebar}
                    className="mx-auto mt-3 p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Expand sidebar"
                >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
                {getVisibleItems().map((item, index) => renderNavItem(item, index))}
            </nav>

        </aside>
    );
}
