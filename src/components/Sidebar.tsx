import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { getRoleName } from '../utils/rbac';

interface SubItem {
    path: string;
    label: string;
    icon: string;
    roles?: string[];
}

interface NavItemType {
    path: string;
    label: string;
    icon: string;
    badge?: number | string;
    roles?: string[];
    children?: SubItem[];
}

// Navigation with expandable groups for key entities
const navigationItems: NavItemType[] = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    {
        path: '/warehouses',
        label: 'Warehouses',
        icon: 'warehouse',
        roles: ['super_admin'],
        children: [
            { path: '/warehouses', label: 'View All', icon: 'list', roles: ['super_admin'] },
            { path: '/warehouses/add', label: 'Add New', icon: 'add', roles: ['super_admin'] },
        ]
    },
    {
        path: '/shops',
        label: 'Medical Shops',
        icon: 'storefront',
        roles: ['super_admin', 'warehouse_admin'],
        children: [
            { path: '/shops', label: 'View All', icon: 'list', roles: ['super_admin', 'warehouse_admin'] },
            { path: '/shops/add', label: 'Add New', icon: 'add', roles: ['super_admin', 'warehouse_admin'] },
        ]
    },
    {
        path: '/medicines',
        label: 'Medicines',
        icon: 'medication',
        roles: ['super_admin', 'warehouse_admin'],
        children: [
            { path: '/medicines', label: 'View All', icon: 'list', roles: ['super_admin', 'warehouse_admin'] },
            { path: '/medicines/add', label: 'Add New', icon: 'add', roles: ['super_admin', 'warehouse_admin'] },
        ]
    },
    { path: '/inventory', label: 'Inventory', icon: 'inventory_2', roles: ['super_admin', 'warehouse_admin'] },
    { path: '/warehouses/stock', label: 'Stock Entry', icon: 'add_box', roles: ['super_admin', 'warehouse_admin'] },
    { path: '/dispatches', label: 'Dispatches', icon: 'local_shipping', roles: ['super_admin', 'warehouse_admin'] },
    { path: '/purchase-requests', label: 'Purchase Requests', icon: 'shopping_cart', roles: ['super_admin', 'warehouse_admin', 'shop_owner'] },
    { path: '/sales/pos', label: 'POS Billing', icon: 'point_of_sale', roles: ['super_admin', 'shop_owner', 'sales_staff'] },
    { path: '/sales/invoices', label: 'Invoices', icon: 'receipt_long', roles: ['super_admin', 'shop_owner'] },
    { path: '/sales/returns', label: 'Returns & Refunds', icon: 'assignment_return', roles: ['super_admin', 'shop_owner'] },
    { path: '/customers', label: 'Customers', icon: 'people', roles: ['super_admin', 'shop_owner', 'sales_staff'] },
    { path: '/employees', label: 'Employees', icon: 'badge', roles: ['super_admin'] },
    { path: '/employees/attendance', label: 'Attendance', icon: 'event_available', roles: ['super_admin'] },
    { path: '/employees/salary', label: 'Salary', icon: 'payments', roles: ['super_admin'] },
    { path: '/reports/sales', label: 'Sales Reports', icon: 'bar_chart', roles: ['super_admin', 'shop_owner'] },
    { path: '/reports/expiry', label: 'Expiry Reports', icon: 'warning', roles: ['super_admin', 'warehouse_admin'] },
    { path: '/reports/tax', label: 'Tax Reports', icon: 'receipt', roles: ['super_admin', 'shop_owner'] },
];

const systemItems: NavItemType[] = [
    { path: '/users', label: 'User Management', icon: 'manage_accounts', roles: ['super_admin'] },
    { path: '/notifications', label: 'Notifications', icon: 'notifications', badge: 3 },
    { path: '/settings/application', label: 'App Settings', icon: 'settings', roles: ['super_admin'] },
    { path: '/settings/system', label: 'System Config', icon: 'tune', roles: ['super_admin'] },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    const userRole = user?.role || 'user';

    // Auto-expand groups based on current path
    useEffect(() => {
        navigationItems.forEach(item => {
            if (item.children && location.pathname.startsWith(item.path)) {
                setExpandedGroups(prev =>
                    prev.includes(item.path) ? prev : [...prev, item.path]
                );
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
            return item.children.some(child => location.pathname === child.path);
        }
        return location.pathname === item.path;
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
                    <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <span className="material-symbols-outlined">local_pharmacy</span>
                    </div>
                    {!isCollapsed && (
                        <div className="animate-fadeIn">
                            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">PharmaEC</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Management System</p>
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
                {navigationItems
                    .filter(item => !item.roles || item.roles.includes(userRole))
                    .map((item, index) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedGroups.includes(item.path);
                        const isActive = isGroupActive(item);

                        if (hasChildren && !isCollapsed) {
                            // Expandable group
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

                                    {/* Child items */}
                                    {isExpanded && (
                                        <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
                                            {item.children!
                                                .filter(child => !child.roles || child.roles.includes(userRole))
                                                .map((child) => (
                                                    <NavLink
                                                        key={child.path}
                                                        to={child.path}
                                                        end={child.path === item.path}
                                                        className={({ isActive }) =>
                                                            `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                                                        ${isActive
                                                                ? 'bg-primary text-white shadow-md shadow-primary/30'
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

                        // Regular nav item (no children or collapsed)
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                                    ${isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }
                                    ${isCollapsed ? 'justify-center' : ''}
                                    animate-fadeIn`
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
                    })}

                {/* System Items */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                    {systemItems
                        .filter(item => !item.roles || item.roles.includes(userRole))
                        .map((item, index) => (
                            <NavLink
                                key={item.path}
                                to={item.path!}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                                    ${isActive
                                        ? 'bg-primary/10 text-primary dark:text-blue-400'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }
                                    ${isCollapsed ? 'justify-center' : ''}`
                                }
                                style={{ animationDelay: `${index * 30}ms` }}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <span className="material-symbols-outlined text-[22px] transition-transform group-hover:scale-110">
                                    {item.icon}
                                </span>
                                {!isCollapsed && (
                                    <>
                                        <span className="text-sm font-medium flex-1">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                </div>
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {!isCollapsed ? (
                    <div className="flex items-center gap-3 animate-fadeIn">
                        <div className="relative">
                            <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {userRole === 'super_admin' ? 'SA' : 'A'}
                            </div>
                            <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.full_name || 'User'}</p>
                            <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded capitalize">
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
                            <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {userRole === 'super_admin' ? 'SA' : 'A'}
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
