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

interface DailySale {
    date: string;
    amount: number;
}

interface PaymentBreakdown {
    cash: number;
    card: number;
    upi: number;
    other: number;
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
    const [dailySales, setDailySales] = useState<DailySale[]>([]);
    const [topMedicines, setTopMedicines] = useState<TopMedicine[]>([]);
    const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({ cash: 0, card: 0, upi: 0, other: 0 });
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

            // Params based on context - Entity-specific data
            const params: { [key: string]: any } = {};
            if (activeEntity?.type === 'warehouse') params['warehouse_id'] = activeEntity.id;
            if (activeEntity?.type === 'shop') params['shop_id'] = activeEntity.id;

            // Sales report params - shop-specific for shops, no filter for global/warehouse
            const salesParams: { [key: string]: any } = {};
            if (activeEntity?.type === 'shop') salesParams['shop_id'] = activeEntity.id;

            const [warehousesRes, shopsRes, medicinesRes, invoicesRes, customersRes, employeesRes, salesRes, alertsRes, prRes, dispRes] = await Promise.allSettled([
                // Only fetch warehouses count if global scope or warehouse admin
                (scope === 'global' || activeEntity?.type === 'warehouse') ? warehousesApi.list({ page: 1, size: 1 }) : Promise.resolve({ data: { total: 0 } }),
                // Only fetch shops count if global scope or shop admin
                (scope === 'global' || activeEntity?.type === 'shop') ? shopsApi.list({ page: 1, size: 1, ...params }) : Promise.resolve({ data: { total: 0 } }),
                medicinesApi.list({ page: 1, size: 1 }),
                invoicesApi.list({ page: 1, size: 5, ...params }),
                // Customers only for shops
                (activeEntity?.type === 'shop' || scope === 'global') ? customersApi.list({ page: 1, size: 1, ...params }) : Promise.resolve({ data: { total: 0 } }),
                employeesApi.list({ page: 1, size: 1, ...params }),
                // Sales data - shop-specific when viewing shop
                reportsApi.getSales(salesParams),
                // Alerts - entity-specific (warehouse_id or shop_id)
                inventoryApi.getAlerts(params),
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

            // Fetch charts data - Entity-specific
            if (activeEntity?.type === 'shop') {
                // Fetch monthly sales for last 6 months
                const monthlyDataPromises = [];
                const currentDate = new Date();
                for (let i = 5; i >= 0; i--) {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                    monthlyDataPromises.push(
                        reportsApi.getMonthlySales({
                            shop_id: activeEntity.id,
                            month: date.getMonth() + 1,
                            year: date.getFullYear()
                        }).catch(() => ({ data: { total_sales: 0 } }))
                    );
                }
                
                const monthlyResults = await Promise.allSettled(monthlyDataPromises);
                const monthlySalesData: MonthlySale[] = monthlyResults.map((result, index) => {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - index), 1);
                    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                    const sales = result.status === 'fulfilled' ? (result.value.data?.total_sales || 0) : 0;
                    return { month: monthName, amount: sales };
                });
                setMonthlySales(monthlySalesData);

                // Fetch daily sales for last 7 days
                const dailyDataPromises = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    dailyDataPromises.push(
                        reportsApi.getDailySales({
                            shop_id: activeEntity.id,
                            date: dateStr
                        }).catch(() => ({ data: { total_sales: 0 } }))
                    );
                }
                
                const dailyResults = await Promise.allSettled(dailyDataPromises);
                const dailySalesData: DailySale[] = dailyResults.map((result, index) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - index));
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const sales = result.status === 'fulfilled' ? (result.value.data?.total_sales || 0) : 0;
                    return { date: dayName, amount: sales };
                });
                setDailySales(dailySalesData);

                // Fetch payment breakdown from today's sales
                try {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todaySales = await reportsApi.getDailySales({
                        shop_id: activeEntity.id,
                        date: todayStr
                    }).catch(() => ({ data: { payment_breakdown: { cash: 0, card: 0, upi: 0 } } }));
                    
                    const paymentData = todaySales.data?.payment_breakdown || { cash: 0, card: 0, upi: 0 };
                    setPaymentBreakdown({
                        cash: paymentData.cash || 0,
                        card: paymentData.card || 0,
                        upi: paymentData.upi || 0,
                        other: 0
                    });
                } catch (err) {
                    console.error('Error fetching payment breakdown:', err);
                }

                // Fetch top selling medicines from recent invoices
                try {
                    // Fetch more invoices to get better top medicines data
                    const invoicesForTopMed = await invoicesApi.list({ 
                        page: 1, 
                        size: 50, 
                        shop_id: activeEntity.id 
                    }).catch(() => ({ data: { items: [] } }));
                    
                    const invoiceList = invoicesForTopMed.data?.items || [];
                    
                    if (invoiceList.length > 0) {
                        // Fetch invoice items to calculate top medicines
                        const invoiceItemsPromises = invoiceList.slice(0, 30).map((inv: any) =>
                            invoicesApi.getItems(inv.id).catch(() => ({ data: [] }))
                        );
                        const invoiceItemsResults = await Promise.allSettled(invoiceItemsPromises);
                        
                        // Aggregate medicine sales
                        const medicineSales: { [key: string]: { name: string; sales: number; quantity: number } } = {};
                        
                        invoiceItemsResults.forEach((result) => {
                            if (result.status === 'fulfilled' && result.value.data) {
                                const items = Array.isArray(result.value.data) ? result.value.data : [];
                                items.forEach((item: any) => {
                                    const medName = item.medicine_name || item.medicine?.name || 'Unknown';
                                    if (!medicineSales[medName]) {
                                        medicineSales[medName] = {
                                            name: medName,
                                            sales: 0,
                                            quantity: 0
                                        };
                                    }
                                    medicineSales[medName].sales += item.subtotal || (item.price || 0) * (item.quantity || 0);
                                    medicineSales[medName].quantity += item.quantity || 0;
                                });
                            }
                        });
                        
                        // Convert to array and sort by sales
                        const topMedicinesList = Object.values(medicineSales)
                            .sort((a, b) => b.sales - a.sales)
                            .slice(0, 5)
                            .map((med, index) => ({
                                name: med.name.length > 25 ? med.name.substring(0, 25) + '...' : med.name,
                                sales: med.sales,
                                quantity: med.quantity,
                                color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-cyan-500'][index] || 'bg-slate-500'
                            }));
                        
                        setTopMedicines(topMedicinesList);
                    } else {
                        setTopMedicines([]);
                    }
                } catch (err) {
                    console.error('Error fetching top medicines:', err);
                    setTopMedicines([]);
                }
            } else {
                // No sales charts for warehouse/global
                setMonthlySales([]);
                setDailySales([]);
                setTopMedicines([]);
                setPaymentBreakdown({ cash: 0, card: 0, upi: 0, other: 0 });
            }

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

    // Entity-specific KPI cards
    const getKpiCards = () => {
        if (activeEntity?.type === 'shop') {
            // Pharmacy/Shop Dashboard
            return [
                {
                    title: 'Shop Revenue',
                    value: formatCurrency(stats.revenue),
                    icon: 'payments',
                    color: 'emerald',
                    trend: '+12.5%',
                    trendUp: true,
                    subtitle: 'Total sales revenue'
                },
                {
                    title: 'Total Invoices',
                    value: stats.invoices.toString(),
                    icon: 'receipt_long',
                    color: 'blue',
                    trend: '',
                    trendUp: true,
                    subtitle: 'Completed invoices'
                },
                {
                    title: 'Customers',
                    value: stats.customers.toString(),
                    icon: 'people',
                    color: 'purple',
                    trend: '',
                    trendUp: true,
                    subtitle: 'Registered customers'
                },
                {
                    title: 'Stock Items',
                    value: stats.medicines.toString(),
                    icon: 'inventory_2',
                    color: 'cyan',
                    trend: '',
                    trendUp: true,
                    subtitle: 'Items in stock'
                },
            ];
        } else if (activeEntity?.type === 'warehouse') {
            // Warehouse Dashboard
            return [
                {
                    title: 'Warehouse Stock',
                    value: stats.medicines.toString(),
                    icon: 'warehouse',
                    color: 'blue',
                    trend: '',
                    trendUp: true,
                    subtitle: 'Items in warehouse'
                },
                {
                    title: 'Dispatches Today',
                    value: stats.dispatchedToday.toString(),
                    icon: 'local_shipping',
                    color: 'teal',
                    trend: '',
                    trendUp: true,
                    subtitle: 'Shipments sent'
                },
                {
                    title: 'Pending Requests',
                    value: stats.pendingRequests.toString(),
                    icon: 'assignment',
                    color: 'amber',
                    trend: '',
                    trendUp: true,
                    subtitle: 'Awaiting approval'
                },
                {
                    title: 'Employees',
                    value: stats.employees.toString(),
                    icon: 'badge',
                    color: 'purple',
                    trend: '',
                    trendUp: true,
                    subtitle: 'Warehouse staff'
                },
            ];
        } else {
            // Global/Super Admin Dashboard
            return [
                {
                    title: 'Total Revenue',
                    value: formatCurrency(stats.revenue),
                    icon: 'payments',
                    color: 'emerald',
                    trend: '+12.5%',
                    trendUp: true,
                    subtitle: 'System-wide revenue'
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
        }
    };

    const kpiCards = getKpiCards();

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

    // Entity-specific quick actions
    const getQuickActions = () => {
        if (activeEntity?.type === 'shop') {
            // Pharmacy/Shop quick actions
            return [
                { label: 'POS Billing', icon: 'point_of_sale', path: '/sales/pos', color: 'blue' },
                { label: 'Invoices', icon: 'receipt_long', path: '/sales/invoices', color: 'green' },
                { label: 'New Order', icon: 'shopping_cart', path: '/purchase-requests', color: 'purple' },
                { label: 'Incoming Stock', icon: 'local_shipping', path: '/dispatches', color: 'orange' },
                { label: 'Reports', icon: 'bar_chart', path: '/reports/sales', color: 'cyan' },
                { label: 'Customers', icon: 'people', path: '/customers', color: 'pink' },
            ];
        } else if (activeEntity?.type === 'warehouse') {
            // Warehouse quick actions
            return [
                { label: 'Stock Entry', icon: 'add_box', path: '/warehouses/stock', color: 'green' },
                { label: 'Stock Adjustment', icon: 'tune', path: '/inventory/adjust', color: 'blue' },
                { label: 'Dispatches', icon: 'local_shipping', path: '/dispatches', color: 'orange' },
                { label: 'Purchase Requests', icon: 'shopping_cart', path: '/purchase-requests', color: 'purple' },
                { label: 'Inventory', icon: 'inventory_2', path: '/inventory', color: 'cyan' },
                { label: 'Employees', icon: 'badge', path: '/employees', color: 'pink' },
            ];
        } else {
            // Global quick actions
            return [
                { label: 'Warehouses', icon: 'warehouse', path: '/warehouses', color: 'blue' },
                { label: 'Shops', icon: 'storefront', path: '/shops', color: 'green' },
                { label: 'Users', icon: 'people', path: '/users', color: 'purple' },
                { label: 'Reports', icon: 'bar_chart', path: '/reports/sales', color: 'cyan' },
                { label: 'Master Data', icon: 'database', path: '/categories', color: 'orange' },
                { label: 'Settings', icon: 'settings', path: '/system/settings', color: 'pink' },
            ];
        }
    };

    const quickActions = getQuickActions();

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

    const maxSale = monthlySales.length > 0 ? Math.max(...monthlySales.map(s => s.amount), 1) : 1;

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
                        {activeEntity 
                            ? `${activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'}: ${activeEntity.name}`
                            : 'System Overview'
                        } • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {activeEntity && (
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[20px]">
                                {activeEntity.type === 'shop' ? 'storefront' : 'warehouse'}
                            </span>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'}
                                </p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{activeEntity.name}</p>
                            </div>
                        </div>
                    )}
                    {scope === 'global' && (
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[20px]">business</span>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Locations</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{stats.warehouses + stats.shops}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {activeEntity?.type === 'shop' ? 'Pharmacy Dashboard' : 
                         activeEntity?.type === 'warehouse' ? 'Warehouse Dashboard' : 
                         'System Dashboard'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {activeEntity?.type === 'shop' ? 'Overview of pharmacy sales and inventory' : 
                         activeEntity?.type === 'warehouse' ? 'Overview of warehouse operations and stock' : 
                         'Overview of system-wide operations'}
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
            {activeEntity?.type === 'shop' && (
            <>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Monthly Sales Chart - Only show for shops */}
                    <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Sales Trend</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.revenue)}</span>
                                    <span className="text-sm text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Last 6 months</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-64 flex items-end gap-2 px-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                            {monthlySales.length > 0 ? monthlySales.map((sale, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                        {formatCurrency(sale.amount)}
                                    </div>
                                    <div
                                        className="w-full max-w-[60px] bg-gradient-to-t from-primary to-primary/70 rounded-t-lg hover:from-primary/90 hover:to-primary/60 transition-all cursor-pointer"
                                        style={{ height: `${Math.max((sale.amount / maxSale) * 100, 5)}%`, minHeight: '20px' }}
                                    />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{sale.month}</span>
                                </div>
                            )) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                                        <p className="text-sm">No sales data available</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Selling Medicines - Only show for shops */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Top Selling Medicines</h3>
                        <div className="space-y-4">
                            {topMedicines.length > 0 ? topMedicines.map((medicine, index) => {
                                const maxSales = Math.max(...topMedicines.map(m => m.sales), 1);
                                const percentage = (medicine.sales / maxSales) * 100;
                                return (
                                    <div key={medicine.name} className="group animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate flex-1 mr-2" title={medicine.name}>
                                                {medicine.name}
                                            </span>
                                            <span className="text-slate-900 dark:text-white font-bold whitespace-nowrap">{formatCurrency(medicine.sales)}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`${medicine.color} h-3 rounded-full transition-all duration-700 ease-out`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium w-12 text-right">{medicine.quantity} units</span>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-8 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">medication</span>
                                    <p className="text-sm">No sales data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Charts for Shops */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Trend (Last 7 Days) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Daily Sales (Last 7 Days)</h3>
                    <div className="h-48 flex items-end gap-2 px-4">
                        {dailySales.length > 0 ? (() => {
                            const maxDaily = Math.max(...dailySales.map(d => d.amount), 1);
                            return dailySales.map((sale, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                        {formatCurrency(sale.amount)}
                                    </div>
                                    <div
                                        className="w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer"
                                        style={{ height: `${Math.max((sale.amount / maxDaily) * 100, 5)}%`, minHeight: '10px' }}
                                    />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{sale.date}</span>
                                </div>
                            ));
                        })() : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <p className="text-sm">No daily sales data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Method Breakdown */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Payment Methods (Today)</h3>
                    <div className="space-y-4">
                        {(() => {
                            const total = paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.upi + paymentBreakdown.other;
                            if (total === 0) {
                                return (
                                    <div className="text-center py-8 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">payment</span>
                                        <p className="text-sm">No payment data today</p>
                                    </div>
                                );
                            }
                            return (
                                <>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-emerald-500"></div>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cash</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {formatCurrency(paymentBreakdown.cash)} ({(paymentBreakdown.cash / total * 100).toFixed(0)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                            <div 
                                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                                style={{ width: `${(paymentBreakdown.cash / total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-blue-500"></div>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Card</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {formatCurrency(paymentBreakdown.card)} ({(paymentBreakdown.card / total * 100).toFixed(0)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                            <div 
                                                className="bg-blue-500 h-2 rounded-full transition-all"
                                                style={{ width: `${(paymentBreakdown.card / total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-purple-500"></div>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">UPI</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {formatCurrency(paymentBreakdown.upi)} ({(paymentBreakdown.upi / total * 100).toFixed(0)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                            <div 
                                                className="bg-purple-500 h-2 rounded-full transition-all"
                                                style={{ width: `${(paymentBreakdown.upi / total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
            </>
            )}

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

                {/* Recent Invoices - Only show for shops */}
                {activeEntity?.type === 'shop' && (
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
                )}
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
