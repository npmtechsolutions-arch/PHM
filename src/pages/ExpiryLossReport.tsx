import { useState, useEffect } from 'react';
import { reportsApi } from '../services/api';
import type { ExpiryItem } from '../types';

export default function ExpiryLossReport() {
    const [selectedPeriod, setSelectedPeriod] = useState('current-month');
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [loading, setLoading] = useState(true);
    const [expiryData, setExpiryData] = useState<ExpiryItem[]>([]);
    const [summary, setSummary] = useState({
        totalExpiring: 0,
        totalExpired: 0,
        totalLoss: 0,
    });

    useEffect(() => {
        fetchExpiryData();
    }, [selectedPeriod, selectedLocation]);

    const fetchExpiryData = async () => {
        try {
            setLoading(true);
            const response = await reportsApi.getExpiry({ days_ahead: 60 });
            const data = response.data;

            setExpiryData(data.items || []);
            setSummary({
                totalExpiring: data.total_expiring_items || 0,
                totalExpired: data.total_expired_items || 0,
                totalLoss: data.total_loss_value || 0,
            });
        } catch (err) {
            console.error('Failed to fetch expiry data:', err);
            setExpiryData([]);
            setSummary({ totalExpiring: 0, totalExpired: 0, totalLoss: 0 });
        } finally {
            setLoading(false);
        }
    };

    const summaryCards = [
        { label: 'Total Expired Items', value: summary.totalExpired.toString(), icon: 'inventory_2', color: 'red' },
        { label: 'Total Expiring Soon', value: summary.totalExpiring.toString(), icon: 'schedule', color: 'amber' },
        { label: 'Estimated Loss', value: `₹${summary.totalLoss.toLocaleString()}`, icon: 'trending_down', color: 'red' },
    ];

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Page Head */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Expiry & Loss Report</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Real-time expiry data from database
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchExpiryData}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                        Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Export Report
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Period</label>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="w-full rounded-lg border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm px-3 py-2 focus:ring-1 focus:ring-primary"
                        >
                            <option value="current-month">Current Month</option>
                            <option value="last-month">Last Month</option>
                            <option value="current-quarter">Current Quarter</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Location</label>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full rounded-lg border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm px-3 py-2 focus:ring-1 focus:ring-primary"
                        >
                            <option value="all">All Locations</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {summaryCards.map((card, index) => (
                    <div key={index} className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                            <span className={`material-symbols-outlined text-${card.color}-500`}>{card.icon}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Data Table */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Expiry Details</h3>
                    <div className="flex gap-2">
                        <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                            Expired: {expiryData.filter(i => i.status === 'expired').length}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                            Expiring Soon: {expiryData.filter(i => i.status === 'expiring').length}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : expiryData.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <span className="material-symbols-outlined text-5xl mb-3 text-green-500">check_circle</span>
                        <p className="text-lg font-medium">No expiring items</p>
                        <p className="text-sm">All medicines are within safe expiry dates</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Medicine</th>
                                    <th className="px-6 py-3 font-semibold">Batch No.</th>
                                    <th className="px-6 py-3 font-semibold">Expiry Date</th>
                                    <th className="px-6 py-3 font-semibold text-right">Quantity</th>
                                    <th className="px-6 py-3 font-semibold text-right">Unit Cost</th>
                                    <th className="px-6 py-3 font-semibold text-right">Total Loss</th>
                                    <th className="px-6 py-3 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {expiryData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                                            {item.brand && <div className="text-xs text-slate-500">{item.brand}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{item.batch_number}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.expiry_date}</td>
                                        <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-medium">{item.quantity}</td>
                                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">₹{item.unit_cost?.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-red-600 dark:text-red-400">₹{item.total_loss?.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {item.status === 'expired' ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">Expired</span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">Expiring</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <p className="text-sm text-slate-500">Showing {expiryData.length} items from database</p>
                </div>
            </div>
        </div>
    );
}
