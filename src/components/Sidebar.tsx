import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useOperationalContext } from '../contexts/OperationalContext';
import { getRoleName } from '../utils/rbac';

interface SubItem {
    path: string;
    label: string;
    icon: string;
    roles?: string[];  // Legacy: role-based filtering
    permissions?: string[];  // New: permission-based filtering (any match)
}

interface NavItemType {
    path: string;
    label: string;
    icon: string;
    badge?: number | string;
    roles?: string[];  // Legacy: role-based filtering
    permissions?: string[];  // New: permission-based filtering (any match)
    children?: SubItem[];
}

// PLATFORM MANAGEMENT NAVIGATION (Super Admin + Permitted Users)
const platformManagementItems: NavItemType[] = [
    // Dashboard for ALL roles
    { path: '/', label: 'Dashboard', icon: 'dashboard', permissions: ['dashboard.view'] },

    // Warehouse Management
    {
        path: '/warehouses',
        label: 'Warehouse Management',
        icon: 'warehouse',
        permissions: ['warehouses.view', 'warehouses.create'],
        children: [
            { path: '/warehouses', label: 'View All Warehouses', icon: 'list', permissions: ['warehouses.view'] },
            { path: '/warehouses/add', label: 'Add Warehouse', icon: 'add', permissions: ['warehouses.create'] },
        ]
    },

    // Medical Shop Management
    {
        path: '/shops',
        label: 'Medical Shop Management',
        icon: 'storefront',
        permissions: ['shops.view', 'shops.create'],
        children: [
            { path: '/shops', label: 'View All Shops', icon: 'list', permissions: ['shops.view'] },
            { path: '/shops/add', label: 'Add Shop', icon: 'add', permissions: ['shops.create'] },
        ]
    },

    // Users & Access Control
    {
        path: '/users',
        label: 'Users & Access',
        icon: 'manage_accounts',
        permissions: ['users.view', 'roles.view'],
        children: [
            { path: '/users', label: 'Users', icon: 'people', permissions: ['users.view'] },
            { path: '/roles', label: 'Roles & Permissions', icon: 'admin_panel_settings', permissions: ['roles.view', 'roles.manage'] },
            { path: '/login-activity', label: 'Login Activity', icon: 'history', permissions: ['login_activity.view'] },
        ]
    },

    // Master Data Management (Super Admin only)
    {
        path: '/master-data',
        label: 'Master Data Management',
        icon: 'dataset',
        permissions: ['categories.manage', 'units.manage', 'hsn.manage', 'gst.manage'],
        children: [
            // Medicine Reference Masters
            { path: '/categories', label: '💊 Medicine Categories', icon: 'category', permissions: ['categories.manage'] },
            { path: '/medicine-types', label: '💊 Medicine Types', icon: 'medication', permissions: ['medicine_types.manage'] },
            { path: '/brands', label: '💊 Brands', icon: 'label', permissions: ['brands.manage'] },
            { path: '/manufacturers', label: '💊 Manufacturers', icon: 'factory', permissions: ['manufacturers.manage'] },
            { path: '/units', label: '💊 Units / Packaging', icon: 'straighten', permissions: ['units.manage'] },
            { path: '/hsn', label: '💊 HSN Codes', icon: 'tag', permissions: ['hsn.manage'] },

            // Tax & Finance Masters
            { path: '/gst', label: '💰 GST / VAT Slabs', icon: 'percent', permissions: ['gst.manage'] },
            { path: '/tax-groups', label: '💰 Tax Groups', icon: 'account_balance', permissions: ['tax_groups.manage'] },

            // Inventory Reference Masters
            { path: '/racks', label: '🗄 Rack Master', icon: 'shelves', permissions: ['racks.manage'] },
            { path: '/adjustment-reasons', label: '🗄 Stock Adjustment Reasons', icon: 'edit_note', permissions: ['adjustment_reasons.manage'] },
            { path: '/stock-statuses', label: '🗄 Stock Status Types', icon: 'inventory', permissions: ['stock_statuses.manage'] },

            // Billing Reference Masters
            { path: '/payment-methods', label: '🧾 Payment Methods', icon: 'payments', permissions: ['payment_methods.manage'] },
            { path: '/discount-types', label: '🧾 Discount Types', icon: 'local_offer', permissions: ['discount_types.manage'] },

            // Business Reference Masters
            { path: '/suppliers', label: '🤝 Suppliers', icon: 'local_shipping', permissions: ['suppliers.manage'] },
            { path: '/customer-types', label: '🤝 Customer Types', icon: 'group', permissions: ['customer_types.manage'] },
        ]
    },

    // Medicine Master (Global definition only - no batch/quantity)
    {
        path: '/medicines',
        label: 'Medicine Master',
        icon: 'medication',
        permissions: ['medicines.view'],
        children: [
            { path: '/medicines', label: 'Medicines', icon: 'medication', permissions: ['medicines.view'] },
            { path: '/medicines/add', label: 'Add Medicine', icon: 'add', permissions: ['medicines.create'] },
        ]
    },

    // Global Inventory Oversight (READ-ONLY for Super Admin)
    {
        path: '/inventory-oversight',
        label: 'Inventory Oversight',
        icon: 'inventory',
        permissions: ['inventory.view.global'],
        children: [
            { path: '/inventory-oversight/warehouse', label: 'Warehouse Stock', icon: 'warehouse', permissions: ['inventory.view.global'] },
            { path: '/inventory-oversight/shop', label: 'Shop Stock', icon: 'storefront', permissions: ['inventory.view.global'] },
            { path: '/inventory-oversight/expiry', label: 'Expiry Monitoring', icon: 'event', permissions: ['inventory.view.global'] },
            { path: '/inventory-oversight/dead-stock', label: 'Dead Stock Analytics', icon: 'warning', permissions: ['inventory.view.global'] },
        ]
    },

    // Orders & Supply Chain (Global View - Super Admin oversight)
    {
        path: '/supply-chain',
        label: 'Orders & Supply Chain',
        icon: 'local_shipping',
        permissions: ['supply_chain.view.global'],
        children: [
            { path: '/supply-chain/purchase-requests', label: 'Shop Purchase Requests', icon: 'shopping_cart', permissions: ['purchase_requests.view.global'] },
            { path: '/supply-chain/dispatch-analytics', label: 'Dispatch Analytics', icon: 'insights', permissions: ['dispatches.view.global'] },
            { path: '/supply-chain/transfers', label: 'Inter-Warehouse Transfers', icon: 'swap_horiz', permissions: ['transfers.view.global'] },
        ]
    },

    // Finance & Tax Control (Platform Level)
    {
        path: '/finance',
        label: 'Finance & Tax Control',
        icon: 'account_balance',
        permissions: ['finance.view.global'],
        children: [
            { path: '/finance/gst-reports', label: 'Platform GST Reports', icon: 'receipt', permissions: ['finance.view.global'] },
            { path: '/finance/vat-reports', label: 'Consolidated VAT Reports', icon: 'description', permissions: ['finance.view.global'] },
            { path: '/finance/revenue', label: 'Revenue Dashboards', icon: 'trending_up', permissions: ['finance.view.global'] },
            { path: '/finance/saas-billing', label: 'SaaS Billing / Commission', icon: 'credit_card', permissions: ['finance.view.global'] },
        ]
    },
];

// OPERATIONAL ITEMS (Warehouse Admin, Pharmacy Admin ONLY - EXCLUDED from Super Admin)
interface OperationalNavItem extends NavItemType {
    excludeFromSuperAdmin?: boolean;  // If true, Super Admin cannot see this
}

const operationalItems: OperationalNavItem[] = [
    // ❌ WAREHOUSE OPERATIONS (Super Admin should NOT see these)
    { path: '/racks', label: 'Rack Master', icon: 'shelves', permissions: ['racks.view', 'racks.manage.warehouse'], excludeFromSuperAdmin: true },
    { path: '/warehouses/stock', label: 'Stock Entry', icon: 'add_box', permissions: ['inventory.entry.warehouse'], excludeFromSuperAdmin: true },
    { path: '/inventory', label: 'Inventory', icon: 'inventory_2', permissions: ['inventory.view.warehouse', 'inventory.view.shop'], excludeFromSuperAdmin: true },
    { path: '/inventory/adjust', label: 'Stock Adjustment', icon: 'tune', permissions: ['inventory.adjust.warehouse'], excludeFromSuperAdmin: true },
    { path: '/dispatches', label: 'Dispatches', icon: 'local_shipping', permissions: ['dispatches.view.warehouse', 'dispatches.view.shop'], excludeFromSuperAdmin: true },
    { path: '/purchase-requests', label: 'Purchase Requests', icon: 'shopping_cart', permissions: ['purchase_requests.view.warehouse', 'purchase_requests.view.shop', 'purchase_requests.create.shop'], excludeFromSuperAdmin: true },

    // ❌ SHOP OPERATIONS (Super Admin should NOT see these)
    { path: '/sales/pos', label: 'POS Billing', icon: 'point_of_sale', permissions: ['billing.create.shop'], excludeFromSuperAdmin: true },
    { path: '/sales/invoices', label: 'Invoices', icon: 'receipt_long', permissions: ['billing.view.shop'], excludeFromSuperAdmin: true },
    { path: '/sales/returns', label: 'Returns & Refunds', icon: 'assignment_return', permissions: ['returns.view.shop', 'returns.create.shop'], excludeFromSuperAdmin: true },
    { path: '/customers', label: 'Customers', icon: 'people', permissions: ['customers.view.shop'], excludeFromSuperAdmin: true },

    // ❌ HR OPERATIONS (Super Admin should NOT see these)
    { path: '/employees', label: 'Employees', icon: 'badge', permissions: ['employees.view.warehouse', 'employees.view.shop'], excludeFromSuperAdmin: true },
    { path: '/employees/attendance', label: 'Attendance', icon: 'event_available', permissions: ['attendance.manage.warehouse', 'attendance.manage.shop'], excludeFromSuperAdmin: true },
    { path: '/employees/salary', label: 'Salary', icon: 'payments', permissions: ['salary.manage.warehouse', 'salary.manage.shop'], excludeFromSuperAdmin: true },

    // ✅ REPORTS (Allowed for Super Admin with global permissions)
    {
        path: '/reports',
        label: 'Reports',
        icon: 'assessment',
        permissions: ['reports.view.global', 'reports.view.warehouse', 'reports.view.shop'],
        children: [
            { path: '/reports/sales', label: 'Sales Reports', icon: 'bar_chart', permissions: ['reports.view.global', 'reports.view.shop'] },
            { path: '/reports/expiry', label: 'Expiry Reports', icon: 'warning', permissions: ['reports.view.global', 'reports.view.warehouse', 'reports.view.shop'] },
            { path: '/reports/tax', label: 'Tax Reports', icon: 'receipt', permissions: ['reports.view.global', 'reports.view.shop'] },
        ]
    },
];

// SYSTEM ITEMS (Super Admin + System Managers)
const systemItems: NavItemType[] = [
    { path: '/notifications', label: 'Notifications', icon: 'notifications', badge: 3, permissions: ['notifications.view'] },
    {
        path: '/system',
        label: 'System & Audit',
        icon: 'settings',
        permissions: ['settings.view', 'settings.manage', 'audit.view'],
        children: [
            // Platform Settings
            { path: '/feature-flags', label: 'Feature Toggles', icon: 'toggle_on', permissions: ['settings.manage'] },
            { path: '/settings/application', label: 'Platform Settings', icon: 'tune', permissions: ['settings.manage'] },
            { path: '/settings/license', label: 'License & Subscription', icon: 'verified', permissions: ['settings.manage'] },

            // Audit & Monitoring
            { path: '/audit-logs', label: 'Audit Logs', icon: 'history', permissions: ['audit.view'] },
            { path: '/error-monitoring', label: 'Error Monitoring', icon: 'bug_report', permissions: ['audit.view'] },
            { path: '/api-usage', label: 'API Usage Logs', icon: 'analytics', permissions: ['audit.view'] },

            // Backup & Data Management
            { path: '/backup-restore', label: 'Backup & Restore', icon: 'backup', permissions: ['settings.manage'] },
        ]
    },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const { hasAnyPermission } = usePermissions();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    const userRole = user?.role || 'user';
    const isSuperAdmin = userRole === 'super_admin';
    useOperationalContext();

    // Check if user can see an item based on permissions or roles
    const canSeeItem = (item: NavItemType | SubItem | OperationalNavItem): boolean => {
        // ❌ Super Admin CANNOT see operational items (Stock Entry, POS, Billing, etc.)
        if (isSuperAdmin && 'excludeFromSuperAdmin' in item && item.excludeFromSuperAdmin) {
            return false;
        }

        // ✅ If permissions are specified, check them (permission-based access)
        if (item.permissions && item.permissions.length > 0) {
            return hasAnyPermission(item.permissions);
        }
        // Fallback to role-based check (legacy)
        if (item.roles && item.roles.length > 0) {
            return item.roles.includes(userRole);
        }
        // No restrictions = visible to all
        return true;
    };

    // Auto-expand groups based on current path
    useEffect(() => {
        const allItems = [...platformManagementItems, ...operationalItems, ...systemItems];
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
    }, [location.pathname]);

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

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_role');
        navigate('/login');
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
                        <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
                            {item.children!
                                .filter(child => canSeeItem(child))
                                .map((child) => (
                                    <NavLink
                                        key={child.path}
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

    // Get items based on permissions and role: Properly filter for Super Admin vs others
    const getVisibleItems = () => {
        // Start with platform management items (visible to all based on permissions)
        const items = platformManagementItems.filter(item => canSeeItem(item));

        // Add operational items ONLY if user has permissions AND is NOT Super Admin
        const visibleOps = operationalItems.filter(item => canSeeItem(item));
        items.push(...visibleOps);

        // Note: System items are rendered separately in nav section, not here
        return items;
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

                {/* System Items */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                    {!isCollapsed && (
                        <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            System
                        </p>
                    )}
                    {systemItems
                        .filter(item => canSeeItem(item))
                        .map((item, index) => renderNavItem(item, index))}
                </div>
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {!isCollapsed ? (
                    <div className="flex items-center gap-3 animate-fadeIn">
                        <div className="relative">
                            <div className="size-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm">
                                {userRole === 'super_admin' ? 'SA' : userRole === 'warehouse_admin' ? 'WA' : 'U'}
                            </div>
                            <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.full_name || 'User'}</p>
                            <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded capitalize ${isSuperAdmin
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                    : 'bg-primary/10 text-primary'
                                    }`}>
                                    {getRoleName(userRole)}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Logout"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <div className="size-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm">
                                {userRole === 'super_admin' ? 'SA' : userRole === 'warehouse_admin' ? 'WA' : 'U'}
                            </div>
                            <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Logout"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
