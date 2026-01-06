import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehousesApi, shopsApi, reportsApi, inventoryApi, medicinesApi, invoicesApi, customersApi, employeesApi } from '../services/api';

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
}

interface Alert {
    id: string;
    title: string;
    description: string;
    time: string;
    severity: 'critical' | 'warning';
}

interface MonthlySale {
    month: string;
    amount: number;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        warehouses: 0, shops: 0, medicines: 0, invoices: 0,
        customers: 0, employees: 0, revenue: 0, lowStockItems: 0, expiringItems: 0
    });
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [monthlySales, setMonthlySales] = useState<MonthlySale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [warehousesRes, shopsRes, medicinesRes, invoicesRes, customersRes, employeesRes, salesRes, alertsRes] = await Promise.allSettled([
                warehousesApi.list({ page: 1, size: 1 }),
                shopsApi.list({ page: 1, size: 1 }),
                medicinesApi.list({ page: 1, size: 1 }),
                invoicesApi.list({ page: 1, size: 5 }),
                customersApi.list({ page: 1, size: 1 }),
                employeesApi.list({ page: 1, size: 1 }),
                reportsApi.getSales(),
                inventoryApi.getAlerts(),
            ]);

            const getVal = (res: PromiseSettledResult<any>, key: string) =>
                res.status === 'fulfilled' ? (res.value.data?.[key] || res.value.data?.total || 0) : 0;

            const stockAlerts = alertsRes.status === 'fulfilled' ? (alertsRes.value.data?.alerts || []) : [];
            const lowStock = stockAlerts.filter((a: any) => a.type === 'low_stock').length;
            const expiring = stockAlerts.filter((a: any) => a.type === 'expiring' || a.type === 'expired').length;

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
            });

            if (invoicesRes.status === 'fulfilled') {
                setRecentInvoices((invoicesRes.value.data?.items || invoicesRes.value.data || []).slice(0, 5));
            }

            setAlerts(stockAlerts.slice(0, 5).map((a: any) => ({
                id: a.id || Math.random().toString(),
                title: a.type === 'low_stock' ? `Low Stock - ${a.medicine_name}` : `Expiry Alert - ${a.medicine_name}`,
                description: a.type === 'low_stock'
                    ? `Only ${a.current_quantity} units left`
                    : `Expires in ${a.days_to_expiry} days`,
                time: 'Recently',
                severity: a.type === 'expired' ? 'critical' : 'warning',
            })));

            // Generate monthly sales for chart (mock data for visualization)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            setMonthlySales(months.map((month) => ({
                month,
                amount: Math.floor(Math.random() * 500000) + 100000
            })));

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

    const statCards = [
        { title: 'Warehouses', value: stats.warehouses.toString(), icon: 'warehouse', color: 'blue' },
        { title: 'Medical Shops', value: stats.shops.toString(), icon: 'storefront', color: 'green' },
        { title: 'Medicines', value: stats.medicines.toString(), icon: 'medication', color: 'purple' },
        { title: 'Total Revenue', value: formatCurrency(stats.revenue), icon: 'payments', color: 'emerald' },
        { title: 'Customers', value: stats.customers.toString(), icon: 'people', color: 'amber' },
        { title: 'Employees', value: stats.employees.toString(), icon: 'badge', color: 'indigo' },
        { title: 'Low Stock Items', value: stats.lowStockItems.toString(), icon: 'inventory', color: 'red' },
        { title: 'Expiring Soon', value: stats.expiringItems.toString(), icon: 'schedule', color: 'orange' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const maxSale = Math.max(...monthlySales.map(s => s.amount), 1);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Page Heading */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Welcome back! Here's what's happening in your pharmacy network.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchDashboardData}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                        Refresh
                    </button>
                    <button
                        onClick={() => navigate('/sales/pos')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-500/30 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                        New Sale
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                {statCards.map((stat) => (
                    <div key={stat.title} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center mb-3`}>
                            <span className={`material-symbols-outlined text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.icon}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.title}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Sales Chart */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Sales</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Last 6 months performance</p>
                        </div>
                        <select className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800">
                            <option>This Year</option>
                            <option>Last Year</option>
                        </select>
                    </div>
                    <div className="h-64 flex items-end gap-4 px-4">
                        {monthlySales.map((sale, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-blue-600 rounded-t-lg transition-all duration-500"
                                    style={{ height: `${(sale.amount / maxSale) * 100}%`, minHeight: '20px' }}
                                />
                                <span className="text-xs text-slate-500 font-medium">{sale.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Stats</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</span>
                            <span className="text-lg font-bold text-green-600">{formatCurrency(stats.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Avg Order Value</span>
                            <span className="text-lg font-bold text-blue-600">{formatCurrency(stats.invoices > 0 ? stats.revenue / stats.invoices : 0)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Total Invoices</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.invoices}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <span className="text-sm text-red-600 dark:text-red-400">⚠️ Attention Needed</span>
                            <span className="text-lg font-bold text-red-600">{stats.lowStockItems + stats.expiringItems}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock Alerts */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">warning</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Stock Alerts</h3>
                        </div>
                        <button onClick={() => navigate('/notifications')} className="text-sm text-primary font-medium hover:underline">View All</button>
                    </div>
                    <div className="p-0 max-h-64 overflow-auto">
                        {alerts.length > 0 ? alerts.map((alert) => (
                            <div key={alert.id} className="flex items-start gap-4 p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors last:border-b-0">
                                <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{alert.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{alert.description}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-slate-500">
                                <span className="material-symbols-outlined text-4xl mb-2 text-green-500">check_circle</span>
                                <p className="font-medium">All Clear!</p>
                                <p className="text-sm">No stock alerts at this time</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Invoices */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">receipt_long</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Invoices</h3>
                        </div>
                        <button onClick={() => navigate('/sales/invoices')} className="text-sm text-primary font-medium hover:underline">View All</button>
                    </div>
                    <div className="p-0 max-h-64 overflow-auto">
                        {recentInvoices.length > 0 ? recentInvoices.map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors last:border-b-0">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{inv.invoice_number || inv.id}</p>
                                    <p className="text-xs text-slate-500">{inv.customer_name || 'Walk-in'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-green-600">{formatCurrency(inv.total_amount || 0)}</p>
                                    <p className="text-xs text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-slate-500">
                                <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                                <p className="font-medium">No invoices yet</p>
                                <p className="text-sm">Create an invoice to get started</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    <button onClick={() => navigate('/sales/pos')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-primary text-2xl">point_of_sale</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">POS Billing</span>
                    </button>
                    <button onClick={() => navigate('/warehouses/stock')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-primary text-2xl">add_box</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Add Stock</span>
                    </button>
                    <button onClick={() => navigate('/purchase-requests')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-primary text-2xl">shopping_cart</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Purchase Request</span>
                    </button>
                    <button onClick={() => navigate('/dispatches')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-primary text-2xl">local_shipping</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Dispatches</span>
                    </button>
                    <button onClick={() => navigate('/reports/sales')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-primary text-2xl">bar_chart</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Reports</span>
                    </button>
                    <button onClick={() => navigate('/employees/attendance')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-primary text-2xl">event_available</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Attendance</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

