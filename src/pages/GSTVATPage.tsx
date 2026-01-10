import { useState, useEffect } from 'react';
import { taxApi } from '../services/api';

interface TaxSettings {
    enable_gst: boolean;
    default_gst_rate: number;
    enable_vat: boolean;
    default_vat_rate: number;
    tax_inclusive_pricing: boolean;
    round_off_tax: boolean;
    gst_number: string;
    business_name: string;
    business_address: string;
}

export default function GSTVATPage() {
    const [settings, setSettings] = useState<TaxSettings>({
        enable_gst: true, default_gst_rate: 12, enable_vat: false, default_vat_rate: 5,
        tax_inclusive_pricing: false, round_off_tax: true, gst_number: '', business_name: '', business_address: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await taxApi.getSettings();
            if (res.data) setSettings(res.data);
        } catch (err) {
            console.error('Failed to load tax settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await taxApi.updateSettings(settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const gstRates = [0, 5, 12, 18, 28];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">GST / VAT Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configure tax settings for your business.</p>
                </div>
                {saved && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        Settings saved!
                    </div>
                )}
            </div>

            {/* GST Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-600">receipt_long</span>
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">GST Configuration</h2>
                            <p className="text-sm text-slate-500">Goods and Services Tax settings</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-white">Enable GST</h3>
                            <p className="text-sm text-slate-500">Apply GST to all transactions</p>
                        </div>
                        <button onClick={() => setSettings({ ...settings, enable_gst: !settings.enable_gst })} className={`relative w-12 h-6 rounded-full transition-colors ${settings.enable_gst ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enable_gst ? 'left-7' : 'left-1'}`}></span>
                        </button>
                    </div>

                    {settings.enable_gst && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Default GST Rate</label>
                                <div className="flex flex-wrap gap-2">
                                    {gstRates.map(rate => (
                                        <button key={rate} onClick={() => setSettings({ ...settings, default_gst_rate: rate })} className={`px-4 py-2 rounded-xl font-medium transition-all ${settings.default_gst_rate === rate ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}>
                                            {rate}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GST Number (GSTIN)</label>
                                <input type="text" value={settings.gst_number} onChange={(e) => setSettings({ ...settings, gst_number: e.target.value })} placeholder="e.g., 29ABCDE1234F1Z5" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* VAT Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600">percent</span>
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">VAT Configuration</h2>
                            <p className="text-sm text-slate-500">Value Added Tax settings (if applicable)</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-white">Enable VAT</h3>
                            <p className="text-sm text-slate-500">Apply VAT in addition to or instead of GST</p>
                        </div>
                        <button onClick={() => setSettings({ ...settings, enable_vat: !settings.enable_vat })} className={`relative w-12 h-6 rounded-full transition-colors ${settings.enable_vat ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enable_vat ? 'left-7' : 'left-1'}`}></span>
                        </button>
                    </div>

                    {settings.enable_vat && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default VAT Rate (%)</label>
                            <input type="number" value={settings.default_vat_rate} onChange={(e) => setSettings({ ...settings, default_vat_rate: Number(e.target.value) })} className="w-32 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                        </div>
                    )}
                </div>
            </div>

            {/* Pricing Options */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">tune</span>
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">Pricing Options</h2>
                            <p className="text-sm text-slate-500">Configure how tax is applied to prices</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-white">Tax Inclusive Pricing</h3>
                            <p className="text-sm text-slate-500">Product prices already include tax</p>
                        </div>
                        <button onClick={() => setSettings({ ...settings, tax_inclusive_pricing: !settings.tax_inclusive_pricing })} className={`relative w-12 h-6 rounded-full transition-colors ${settings.tax_inclusive_pricing ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.tax_inclusive_pricing ? 'left-7' : 'left-1'}`}></span>
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-white">Round Off Tax</h3>
                            <p className="text-sm text-slate-500">Round tax amounts to nearest rupee</p>
                        </div>
                        <button onClick={() => setSettings({ ...settings, round_off_tax: !settings.round_off_tax })} className={`relative w-12 h-6 rounded-full transition-colors ${settings.round_off_tax ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.round_off_tax ? 'left-7' : 'left-1'}`}></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Business Details */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">business</span>
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">Business Details</h2>
                            <p className="text-sm text-slate-500">For tax invoices</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Business Name</label>
                        <input type="text" value={settings.business_name} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} placeholder="Your business name" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Business Address</label>
                        <textarea value={settings.business_address} onChange={(e) => setSettings({ ...settings, business_address: e.target.value })} placeholder="Full business address" rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 resize-none" />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 transition-all">
                    {saving ? (
                        <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>Saving...</>
                    ) : (
                        <><span className="material-symbols-outlined text-[20px]">save</span>Save Settings</>
                    )}
                </button>
            </div>
        </div>
    );
}
