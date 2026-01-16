import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import axios from 'axios';

interface Alert {
    medicine_id: string;
    medicine_name: string;
    current_stock?: number;
    reorder_level?: number;
    batch_number?: string;
    expiry_date?: string;
    days_to_expiry?: number;
    quantity?: number;
    severity: string;
}

interface AlertSummary {
    low_stock: { total: number; critical: number };
    expiry: { total: number; expired: number; critical: number };
}

export default function InventoryAlertsWidget() {
    const { user } = useUser();
    const [summary, setSummary] = useState<AlertSummary | null>(null);
    const [lowStockAlerts, setLowStockAlerts] = useState<Alert[]>([]);
    const [expiryAlerts, setExpiryAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'low-stock' | 'expiry'>('low-stock');

    useEffect(() => {
        fetchAlerts();
    }, [user]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const params: any = {};

            if (user?.shop_id) params.shop_id = user.shop_id;
            if (user?.warehouse_id) params.warehouse_id = user.warehouse_id;

            // Fetch summary
            const summaryRes = await axios.get('/api/inventory/alerts/dashboard-summary', { params });
            setSummary(summaryRes.data);

            // Fetch low stock details
            const lowStockRes = await axios.get('/api/inventory/alerts/low-stock', { params });
            setLowStockAlerts(lowStockRes.data.alerts.slice(0, 5)); // Show top 5

            // Fetch expiry details
            const expiryRes = await axios.get('/api/inventory/alerts/expiry-alerts', { params });
            setExpiryAlerts(expiryRes.data.alerts.slice(0, 5)); // Show top 5
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'expired':
            case 'critical':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'warning':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default:
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                    <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">warning</span>
                    <h3 className="font-bold text-slate-900 dark:text-white">Inventory Alerts</h3>
                </div>
                <button
                    onClick={fetchAlerts}
                    className="text-xs text-primary hover:underline"
                >
                    Refresh
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('low-stock')}
                    className={`p-3 rounded-lg border-2 transition-colors ${activeTab === 'low-stock'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'
                        }`}
                >
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {summary.low_stock.critical}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Critical Low Stock</div>
                    <div className="text-xs text-slate-500 mt-1">
                        {summary.low_stock.total} total warnings
                    </div>
                </button>

                <button
                    onClick={() => setActiveTab('expiry')}
                    className={`p-3 rounded-lg border-2 transition-colors ${activeTab === 'expiry'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-red-300'
                        }`}
                >
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {summary.expiry.expired + summary.expiry.critical}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Expiry Alerts</div>
                    <div className="text-xs text-slate-500 mt-1">
                        {summary.expiry.total} total warnings
                    </div>
                </button>
            </div>

            {/* Alert List */}
            <div className="p-4">
                {activeTab === 'low-stock' ? (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            Critical Low Stock Items
                        </div>
                        {lowStockAlerts.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                                <p className="text-sm">No low stock alerts</p>
                            </div>
                        ) : (
                            lowStockAlerts.map((alert, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                            {alert.medicine_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Stock: {alert.current_stock} / Reorder: {alert.reorder_level}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                        {alert.severity}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            Expiring Soon / Expired
                        </div>
                        {expiryAlerts.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <span className="material-symbols-outlined text-4xl mb-2">event_available</span>
                                <p className="text-sm">No expiry alerts</p>
                            </div>
                        ) : (
                            expiryAlerts.map((alert, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                            {alert.medicine_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Batch: {alert.batch_number} • {alert.quantity} units
                                            {alert.days_to_expiry !== undefined && (
                                                <span className="ml-2">
                                                    {alert.days_to_expiry < 0
                                                        ? `Expired ${Math.abs(alert.days_to_expiry)} days ago`
                                                        : `Expires in ${alert.days_to_expiry} days`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                        {alert.severity}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
