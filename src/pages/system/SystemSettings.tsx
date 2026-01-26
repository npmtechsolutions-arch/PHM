import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';

export default function SystemSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [platformName, setPlatformName] = useState('PharmaAdmin Central');
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [twoFAEnabled, setTwoFAEnabled] = useState(true);
    const [passwordComplexity, setPasswordComplexity] = useState('high');
    const [sessionTimeout, setSessionTimeout] = useState(30);
    const [lowStockThreshold, setLowStockThreshold] = useState(15);
    const [expiryWarningDays, setExpiryWarningDays] = useState(60);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await settingsApi.get();
            const s = response.data?.settings;

            if (s) {
                setPlatformName(s.app_name || 'PharmaAdmin Central');
                setMaintenanceMode(s.maintenance_mode || false);
                setSessionTimeout(s.session_timeout_minutes || 30);
                setLowStockThreshold(s.low_stock_threshold || 15);
                setExpiryWarningDays(s.expiry_warning_days || 60);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await settingsApi.update({
                app_name: platformName,
                maintenance_mode: maintenanceMode,
                session_timeout_minutes: sessionTimeout,
                low_stock_threshold: lowStockThreshold,
                expiry_warning_days: expiryWarningDays,
            });
            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Failed to save settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark scroll-smooth">
                <div className="max-w-5xl mx-auto p-6 md:p-10 pb-24">
                    {/* Page Heading */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">System Settings</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl">
                                Configure global parameters, security protocols, and integration rules for the entire Pharmacy Management Platform.
                            </p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">history</span>
                            View Change Logs
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="sticky top-0 z-10 bg-background-light dark:bg-background-dark pt-2 pb-4 mb-6">
                        <div className="flex overflow-x-auto border-b border-slate-300 dark:border-slate-700 gap-8">
                            <button className="whitespace-nowrap pb-3 px-1 border-b-[3px] border-primary text-primary font-bold text-sm">General Preferences</button>
                            <button className="whitespace-nowrap pb-3 px-1 border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">Security Policies</button>
                            <button className="whitespace-nowrap pb-3 px-1 border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">Inventory Rules</button>
                            <button className="whitespace-nowrap pb-3 px-1 border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">Integrations & API</button>
                        </div>
                    </div>

                    {/* Settings Sections */}
                    <div className="flex flex-col gap-6">
                        {/* General Preferences */}
                        <section className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
                                    <span className="material-symbols-outlined">tune</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">General Preferences</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-200 mb-2">Platform Name</label>
                                    <input
                                        type="text"
                                        value={platformName}
                                        onChange={(e) => setPlatformName(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                    />
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">This name will appear in emails and dashboard headers.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-200 mb-2">Default Timezone</label>
                                    <select className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
                                        <option>(GMT+05:30) India Standard Time</option>
                                        <option>(GMT-05:00) Eastern Time (US & Canada)</option>
                                        <option>(GMT+00:00) London</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-200 mb-2">Date Format</label>
                                    <select className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
                                        <option>DD/MM/YYYY (e.g. 31/12/2024)</option>
                                        <option>MM/DD/YYYY (e.g. 12/31/2024)</option>
                                        <option>YYYY-MM-DD (e.g. 2024-12-31)</option>
                                    </select>
                                </div>
                                <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                                    <div className="flex items-center justify-between py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">Maintenance Mode</span>
                                            <span className="text-sm text-slate-500 dark:text-slate-500">Prevent non-admin users from accessing the system during updates.</span>
                                        </div>
                                        <button
                                            onClick={() => setMaintenanceMode(!maintenanceMode)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${maintenanceMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-5' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Security Policies */}
                        <section className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
                                    <span className="material-symbols-outlined">shield</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security Policies</h2>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-col max-w-2xl">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">RECOMMENDED</span>
                                        </div>
                                        <span className="text-sm text-slate-500 dark:text-slate-500 mt-1">Enforce 2FA for all administrator and manager level accounts across the network.</span>
                                    </div>
                                    <button
                                        onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${twoFAEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${twoFAEnabled ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-200 mb-2">Password Complexity</label>
                                        <select
                                            value={passwordComplexity}
                                            onChange={(e) => setPasswordComplexity(e.target.value)}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="high">High (Min 12 chars, symbol, number, upper/lowercase)</option>
                                            <option value="medium">Medium (Min 8 chars, number, upper/lowercase)</option>
                                            <option value="low">Low (Min 6 chars)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-200 mb-2">Session Timeout (Minutes)</label>
                                        <input
                                            type="number"
                                            value={sessionTimeout}
                                            onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Inventory Rules */}
                        <section className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
                                    <span className="material-symbols-outlined">inventory_2</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inventory Rules</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <label className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white mb-4">
                                        Low Stock Threshold Alert
                                        <span className="material-symbols-outlined text-slate-500 text-[18px] cursor-help" title="Triggers an alert when stock falls below this percentage of max capacity">info</span>
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            value={lowStockThreshold}
                                            onChange={(e) => setLowStockThreshold(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-primary"
                                        />
                                        <span className="min-w-[3rem] text-center font-mono font-bold text-primary bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">{lowStockThreshold}%</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3">Trigger automated re-order suggestions when stock reaches {lowStockThreshold}% of maximum capacity.</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <label className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white mb-4">
                                        Drug Expiry Warning Window
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            value={expiryWarningDays}
                                            onChange={(e) => setExpiryWarningDays(parseInt(e.target.value))}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-slate-500">Days before expiry</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3">Items will be flagged as "Near Expiry" on dashboards {expiryWarningDays} days before their expiration date.</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-0 w-full bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 p-4 md:px-10 flex items-center justify-between z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="text-sm text-slate-500 hidden md:block">
                    <span className="font-medium text-slate-900 dark:text-white">Database:</span> Connected to Neon PostgreSQL
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Discard
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[20px]">{saving ? 'sync' : 'save'}</span>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
