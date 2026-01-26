import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';

export default function ApplicationSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [language, setLanguage] = useState('en-US');
    const [timezone, setTimezone] = useState('UTC-05:00');
    const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
    const [sessionTimeout, setSessionTimeout] = useState(30);
    const [taxRate, setTaxRate] = useState(7.25);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [globalSearch, setGlobalSearch] = useState(true);
    const [autoApprove, setAutoApprove] = useState(false);
    const [supportEmail, setSupportEmail] = useState('helpdesk@pharmacore.io');
    const [helpUrl, setHelpUrl] = useState('https://wiki.internal.pharma/support');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await settingsApi.get();
            const s = response.data?.settings;

            if (s) {
                setSessionTimeout(s.session_timeout_minutes || 30);
                setTaxRate(s.default_tax_rate || 7.25);
                setMaintenanceMode(s.maintenance_mode || false);
                setGlobalSearch(s.global_inventory_search ?? true);
                setAutoApprove(s.auto_approve_low_risk || false);
                setSupportEmail(s.support_email || 'helpdesk@pharmacore.io');
                setHelpUrl(s.support_url || '');
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
                session_timeout_minutes: sessionTimeout,
                default_tax_rate: taxRate,
                maintenance_mode: maintenanceMode,
                global_inventory_search: globalSearch,
                auto_approve_low_risk: autoApprove,
                support_email: supportEmail,
                support_url: helpUrl,
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
        <div className="max-w-5xl mx-auto px-8 py-8">
            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Application Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                        Configure global parameters, localization preferences, and system-wide defaults for your pharmacy network.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[20px]">{saving ? 'sync' : 'save'}</span>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
                <nav className="flex gap-8 min-w-max">
                    <button className="pb-3 border-b-2 border-primary text-primary font-semibold text-sm px-1 transition-colors">General</button>
                    <button className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-sm px-1 transition-colors">Localization</button>
                    <button className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-sm px-1 transition-colors">Security</button>
                    <button className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-sm px-1 transition-colors">Notifications</button>
                </nav>
            </div>

            {/* Settings Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Regional Settings Card */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined text-[20px]">language</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Regional Settings</h3>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Default System Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white"
                            >
                                <option value="en-US">English (United States)</option>
                                <option value="es">Spanish (Español)</option>
                                <option value="fr">French (Français)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Timezone</label>
                                <select
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white"
                                >
                                    <option value="UTC-05:00">UTC-05:00 (EST)</option>
                                    <option value="UTC-08:00">UTC-08:00 (PST)</option>
                                    <option value="UTC+00:00">UTC+00:00 (GMT)</option>
                                    <option value="UTC+05:30">UTC+05:30 (IST)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date Format</label>
                                <select
                                    value={dateFormat}
                                    onChange={(e) => setDateFormat(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white"
                                >
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Currency Symbol</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
                                <input type="text" value="INR" readOnly className="w-full pl-8 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">Locked</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Currency is locked to the organization's primary billing region.</p>
                        </div>
                    </div>
                </div>

                {/* Operational Defaults Card */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <span className="material-symbols-outlined text-[20px]">tune</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Operational Defaults</h3>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Session Timeout (Minutes)</label>
                            <input
                                type="number"
                                value={sessionTimeout}
                                onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white"
                            />
                            <p className="text-xs text-slate-400 mt-1">Auto-logout inactive users for security compliance.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Default Tax Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pharmacy ID Prefix</label>
                                <input type="text" defaultValue="PHARM-" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white uppercase" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Fiscal Year Start</label>
                            <select className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white">
                                <option>January 1st</option>
                                <option selected>April 1st</option>
                                <option>October 1st</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Feature Flags Card */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <span className="material-symbols-outlined text-[20px]">flag</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Feature Flags</h3>
                    </div>
                    <div className="space-y-6">
                        <ToggleItem
                            id="maintenance_mode"
                            title="Maintenance Mode"
                            description="Disables access for all non-admin users immediately."
                            checked={maintenanceMode}
                            onChange={setMaintenanceMode}
                        />
                        <ToggleItem
                            id="global_search"
                            title="Global Inventory Search"
                            description="Allow pharmacists to search stock across all connected locations."
                            checked={globalSearch}
                            onChange={setGlobalSearch}
                        />
                        <ToggleItem
                            id="auto_approve"
                            title="Auto-Approve Low Risk Orders"
                            description="System automatically approves refills for Class C drugs."
                            checked={autoApprove}
                            onChange={setAutoApprove}
                        />
                    </div>
                </div>

                {/* Support Configuration */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <span className="material-symbols-outlined text-[20px]">support_agent</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Support Configuration</h3>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Support Email Address</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
                                <input
                                    type="email"
                                    value={supportEmail}
                                    onChange={(e) => setSupportEmail(e.target.value)}
                                    className="w-full pl-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Internal Help Desk URL</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">link</span>
                                <input
                                    type="url"
                                    value={helpUrl}
                                    onChange={(e) => setHelpUrl(e.target.value)}
                                    className="w-full pl-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-4 flex gap-3">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 shrink-0">info</span>
                            <div className="text-xs text-blue-800 dark:text-blue-200">
                                These contact details will be displayed in the footer of all employee dashboards and on the login screen.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Note */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">
                    System Version v2.4.0 • Connected to Neon PostgreSQL
                </p>
            </div>
        </div>
    );
}

function ToggleItem({ title, description, checked, onChange }: { id: string; title: string; description: string; checked: boolean; onChange: (val: boolean) => void }) {
    return (
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 first:border-t-0 first:pt-0">
            <div className="pr-4">
                <h4 className="text-sm font-medium text-slate-900 dark:text-white">{title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
}
