import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useOperationalContext } from '../contexts/OperationalContext';
import { warehousesApi, shopsApi, reportsApi, inventoryApi, medicinesApi, invoicesApi, customersApi, employeesApi, purchaseRequestsApi, dispatchesApi } from '../services/api';

interface DashboardStats {
    warehouses: number;
    shops: number;
    medicines: number;
    invoices: number;
    customers: number;
    employees: number;
    revenue: number;
    lowStockItems: number;
    expiringItems: number;
    pendingRequests: number;
    dispatchedToday: number;
}

interface Alert {
    id: string;
    title: string;
    description: string;
    time: string;
    severity: 'critical' | 'warning' | 'info';
    type: string;
}

interface MonthlySale {
    month: string;
    amount: number;
}

interface TopMedicine {
    name: string;
    sales: number;
    quantity: number;
    color: string;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const { scope, activeEntity } = useOperationalContext();

    // Global Stats for Super Admin Landing handled by stats state directly

    const [stats, setStats] = useState<DashboardStats>({
        warehouses: 0, shops: 0, medicines: 0, invoices: 0,
        customers: 0, employees: 0, revenue: 0, lowStockItems: 0, expiringItems: 0,
        pendingRequests: 0, dispatchedToday: 0
    });
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [monthlySales, setMonthlySales] = useState<MonthlySale[]>([]);
    const [topMedicines, setTopMedicines] = useState<TopMedicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, [scope, activeEntity]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Params based on context
            const params: { [key: string]: any } = {};
            if (activeEntity?.type === 'warehouse') params['warehouse_id'] = activeEntity.id;
            if (activeEntity?.type === 'shop') params['shop_id'] = activeEntity.id;

            const [warehousesRes, shopsRes, medicinesRes, invoicesRes, customersRes, employeesRes, salesRes, alertsRes, prRes, dispRes] = await Promise.allSettled([
                warehousesApi.list({ page: 1, size: 1 }),
                shopsApi.list({ page: 1, size: 1 }),
                medicinesApi.list({ page: 1, size: 1 }),
                invoicesApi.list({ page: 1, size: 5, ...params }),
                customersApi.list({ page: 1, size: 1 }),
                employeesApi.list({ page: 1, size: 1, ...params }),
                reportsApi.getSales(),
                inventoryApi.getAlerts(),
                purchaseRequestsApi.list({ status: 'pending', size: 1, ...params }),
                dispatchesApi.list({ size: 500, ...params }) // Fetch recent dispatches for daily count
            ]);

            const getVal = (res: PromiseSettledResult<any>, key: string) =>
                res.status === 'fulfilled' ? (res.value.data?.[key] || res.value.data?.total || 0) : 0;

            const stockAlerts = alertsRes.status === 'fulfilled' ? (alertsRes.value.data?.alerts || []) : [];
            const lowStock = stockAlerts.filter((a: any) => a.type === 'low_stock').length;
            const expiring = stockAlerts.filter((a: any) => a.type === 'expiring' || a.type === 'expired').length;

            const pendingRequests = prRes.status === 'fulfilled' ? (prRes.value.data?.total || 0) : 0;

            // Calculate today's dispatches
            const today = new Date().toISOString().split('T')[0];
            const dispatches = dispRes.status === 'fulfilled' ? (dispRes.value.data?.items || dispRes.value.data || []) : [];
            const dispatchedToday = dispatches.filter((d: any) => d.dispatch_date && d.dispatch_date.startsWith(today)).length;

            setStats({
                warehouses: getVal(warehousesRes, 'total'),
                shops: getVal(shopsRes, 'total'),
                medicines: getVal(medicinesRes, 'total'),
                invoices: invoicesRes.status === 'fulfilled' ? (invoicesRes.value.data?.total || invoicesRes.value.data?.items?.length || 0) : 0,
                customers: getVal(customersRes, 'total'),
                employees: getVal(employeesRes, 'total'),
                revenue: salesRes.status === 'fulfilled' ? (salesRes.value.data?.total_sales || 0) : 0,
                lowStockItems: lowStock,
                expiringItems: expiring,
                pendingRequests: pendingRequests,
                dispatchedToday: dispatchedToday
            });

            if (invoicesRes.status === 'fulfilled') {
                setRecentInvoices((invoicesRes.value.data?.items || invoicesRes.value.data || []).slice(0, 5));
            }

            setAlerts(stockAlerts.slice(0, 5).map((a: any) => ({
                id: a.id || Math.random().toString(),
                title: a.type === 'low_stock'
                    ? `Low Stock - ${a.medicine_name} ${a.brand ? `(${a.brand})` : ''}`
                    : `Expiry Alert - ${a.medicine_name} ${a.brand ? `(${a.brand})` : ''}`,
                description: a.type === 'low_stock'
                    ? `Only ${a.current_quantity} units left`
                    : `Expires in ${a.days_to_expiry} days`,
                time: 'Recently',
                severity: a.type === 'expired' ? 'critical' : 'warning',
                type: a.type,
            })));

            // Charts data - Set to empty or real data only (no demo data)
            setMonthlySales([]);
            setTopMedicines([]);

        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
        return `₹${value}`;
    };

    const kpiCards = [
        {
            title: 'Total Revenue',
            value: formatCurrency(stats.revenue),
            icon: 'payments',
            color: 'emerald',
            trend: '+12.5%',
            trendUp: true,
            subtitle: 'vs last month'
        },
        {
            title: 'Warehouses',
            value: stats.warehouses.toString(),
            icon: 'warehouse',
            color: 'blue',
            trend: '+2',
            trendUp: true,
            subtitle: 'Active locations'
        },
        {
            title: 'Medical Shops',
            value: stats.shops.toString(),
            icon: 'storefront',
            color: 'purple',
            trend: '+5',
            trendUp: true,
            subtitle: 'Connected shops'
        },
        {
            title: 'Total Medicines',
            value: stats.medicines.toString(),
            icon: 'medication',
            color: 'cyan',
            trend: '+1.2%',
            trendUp: true,
            subtitle: 'SKUs in catalog'
        },
    ];

    const alertCards = [
        {
            title: 'Low Stock Items',
            value: stats.lowStockItems.toString(),
            icon: 'inventory',
            color: 'red',
            badge: 'Action Required',
            badgeColor: 'red',
            subtitle: 'Below safety threshold'
        },
        {
            title: 'Expiring Soon',
            value: stats.expiringItems.toString(),
            icon: 'schedule',
            color: 'orange',
            badge: 'Review Needed',
            badgeColor: 'orange',
            subtitle: 'Within 30 days'
        },
        {
            title: 'Pending Requests',
            value: stats.pendingRequests.toString(),
            icon: 'assignment',
            color: 'amber',
            badge: 'Pending',
            badgeColor: 'amber',
            subtitle: 'Awaiting approval'
        },
        {
            title: 'Dispatched Today',
            value: stats.dispatchedToday.toString(),
            icon: 'local_shipping',
            color: 'teal',
            trend: '',
            trendUp: true,
            subtitle: 'Successfully shipped'
        },
    ];

    const quickActions = [
        { label: 'POS Billing', icon: 'point_of_sale', path: '/sales/pos', color: 'blue' },
        { label: 'Add Stock', icon: 'add_box', path: '/warehouses/stock', color: 'green' },
        { label: 'New Order', icon: 'shopping_cart', path: '/purchase-requests', color: 'purple' },
        { label: 'Dispatches', icon: 'local_shipping', path: '/dispatches', color: 'orange' },
        { label: 'Reports', icon: 'bar_chart', path: '/reports/sales', color: 'cyan' },
        { label: 'Employees', icon: 'badge', path: '/employees', color: 'pink' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-primary mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-2xl animate-pulse">dashboard</span>
                        </div>
                    </div>
                    <p className="text-slate-500 mt-4 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const maxSale = Math.max(...monthlySales.map(s => s.amount), 1);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Personalized Greeting */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {(() => {
                            const hour = new Date().getHours();
                            if (hour < 12) return 'Good Morning';
                            if (hour < 17) return 'Good Afternoon';
                            return 'Good Evening';
                        })()}, {user?.full_name || 'User'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[20px]">business</span>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Total Locations</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{stats.warehouses + stats.shops}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Overview of pharmacy operations
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchDashboardData}
                        className="btn btn-secondary"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
                        Refresh
                    </button>
                    {/* New Sale button - Permission based */}
                    {hasPermission('billing.create.shop') && (
                        <button
                            onClick={() => navigate('/sales/pos')}
                            className="btn btn-primary"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                            New Sale
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    <button onClick={fetchDashboardData} className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium">
                        Retry
                    </button>
                </div>
            )}

            {/* KPI Cards - Enhanced Visualization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((card, index) => (
                    <div
                        key={card.title}
                        className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fadeInUp"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Gradient Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity ${card.color === 'emerald' ? 'from-emerald-400 to-emerald-600' :
                            card.color === 'blue' ? 'from-blue-400 to-blue-600' :
                                card.color === 'purple' ? 'from-purple-400 to-purple-600' :
                                    'from-cyan-400 to-cyan-600'
                            }`}></div>

                        {/* Icon with gradient background */}
                        <div className="flex items-start justify-between mb-4 relative">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br ${card.color === 'emerald' ? 'from-emerald-400 to-emerald-600' :
                                card.color === 'blue' ? 'from-blue-400 to-blue-600' :
                                    card.color === 'purple' ? 'from-purple-400 to-purple-600' :
                                        'from-cyan-400 to-cyan-600'
                                } group-hover:scale-110 transition-transform duration-300`}>
                                <span className="material-symbols-outlined text-white" style={{ fontSize: 28 }}>
                                    {card.icon}
                                </span>
                            </div>
                            {card.trend && (
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${card.trendUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                        {card.trendUp ? 'trending_up' : 'trending_down'}
                                    </span>
                                    {card.trend}
                                </div>
                            )}
                        </div>

                        {/* Value */}
                        <h4 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 relative">{card.value}</h4>

                        {/* Title */}
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-1 relative">{card.title}</p>

                        {/* Subtitle */}
                        <p className="text-xs text-slate-500 dark:text-slate-500 relative">{card.subtitle}</p>

                        {/* Decorative element */}
                        <div className={`absolute -bottom-2 -right-2 w-24 h-24 rounded-full opacity-10 blur-2xl bg-gradient-to-br ${card.color === 'emerald' ? 'from-emerald-400 to-emerald-600' :
                            card.color === 'blue' ? 'from-blue-400 to-blue-600' :
                                card.color === 'purple' ? 'from-purple-400 to-purple-600' :
                                    'from-cyan-400 to-cyan-600'
                            }`}></div>
                    </div>
                ))}
            </div>

            {/* Entity-Specific Sections: Charts, Alerts, Quick Actions - NOW VISIBLE FOR GLOBAL SCOPE TOO */}

            {/* Alert Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {alertCards.map((card) => (
                    <div
                        key={card.title}
                        className="card"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400" style={{ fontSize: 20 }}>
                                    {card.icon}
                                </span>
                            </div>
                            {card.badge && (
                                <span className="badge badge-warning">
                                    {card.badge}
                                </span>
                            )}
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{card.title}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Monthly Sales Chart */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sales Overview</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.revenue)}</span>
                                <span className="text-sm text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">+12.5%</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-64 flex items-end gap-4 px-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                        {monthlySales.map((sale, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div
                                    className="w-full max-w-[60px] bg-primary rounded-t-lg"
                                    style={{ height: `${(sale.amount / maxSale) * 100}%`, minHeight: '20px' }}
                                />
                                <span className="text-xs font-medium text-slate-500">{sale.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Selling Medicines */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Top Selling Medicine</h3>
                    <div className="space-y-4">
                        {topMedicines.map((medicine, index) => {
                            const maxSales = Math.max(...topMedicines.map(m => m.sales));
                            const percentage = (medicine.sales / maxSales) * 100;
                            return (
                                <div key={medicine.name} className="group animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{medicine.name}</span>
                                        <span className="text-slate-900 dark:text-white font-bold">₹{(medicine.sales / 1000).toFixed(1)}K</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`${medicine.color} h-3 rounded-full transition-all duration-700 ease-out`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium w-12 text-right">{medicine.quantity}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock Alerts */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-red-50 to-transparent dark:from-red-900/10">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">warning</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Stock Alerts</h3>
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-600 rounded-full">
                                {alerts.length}
                            </span>
                        </div>
                        <button onClick={() => navigate('/notifications')} className="text-sm text-primary font-medium hover:underline">
                            View All
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-auto">
                        {alerts.length > 0 ? alerts.map((alert, index) => (
                            <div
                                key={alert.id}
                                className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeIn"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className={`mt-0.5 h-3 w-3 rounded-full flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`}></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{alert.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{alert.description}</p>
                                </div>
                                <button className="px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                    {alert.type === 'low_stock' ? 'Restock' : 'Review'}
                                </button>
                            </div>
                        )) : (
                            <div className="p-8 text-center">
                                <span className="material-symbols-outlined text-5xl text-green-500 mb-2">check_circle</span>
                                <p className="font-medium text-slate-900 dark:text-white">All Clear!</p>
                                <p className="text-sm text-slate-500">No stock alerts at this time</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Invoices */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">receipt_long</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Invoices</h3>
                        </div>
                        <button onClick={() => navigate('/sales/invoices')} className="text-sm text-primary font-medium hover:underline">
                            View All
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-auto">
                        {recentInvoices.length > 0 ? recentInvoices.map((inv: any, index) => (
                            <div
                                key={inv.id}
                                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeIn"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-blue-600 text-[18px]">receipt</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{inv.invoice_number || `INV-${inv.id}`}</p>
                                        <p className="text-xs text-slate-500">{inv.customer_name || 'Walk-in Customer'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(inv.total_amount || 0)}</p>
                                    <p className="text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center">
                                <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">receipt_long</span>
                                <p className="font-medium text-slate-900 dark:text-white">No invoices yet</p>
                                <p className="text-sm text-slate-500">Create an invoice to get started</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {quickActions.map((action, index) => (
                        <button
                            key={action.label}
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-lg group animate-fadeInUp"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={`w-12 h-12 rounded-xl bg-${action.color}-100 dark:bg-${action.color}-900/30 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <span className={`material-symbols-outlined text-${action.color}-600 dark:text-${action.color}-400 text-2xl`}>
                                    {action.icon}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
