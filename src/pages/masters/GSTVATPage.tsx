import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taxApi } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import { usePermissions } from '../../contexts/PermissionContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';

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
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { getMaster, isLoading: mastersLoading } = useMasterData();
    const gstSlabs = getMaster('gst_slabs');

    const [settings, setSettings] = useState<TaxSettings>({
        enable_gst: true, default_gst_rate: 12, enable_vat: false, default_vat_rate: 5,
        tax_inclusive_pricing: false, round_off_tax: true, gst_number: '', business_name: '', business_address: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (user && !hasPermission('gst.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <PageLayout
            title="GST / VAT Settings"
            description="Configure tax settings for your business"
            icon="receipt_long"
            actions={
                saved ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        Saved Successfully
                    </div>
                ) : undefined
            }
            loading={loading || mastersLoading}
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* GST Settings */}
                <Card title="GST Configuration" icon="receipt_long">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Enable GST</h3>
                                <p className="text-sm text-slate-500">Apply GST to all transactions</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, enable_gst: !settings.enable_gst })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${settings.enable_gst ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enable_gst ? 'left-7' : 'left-1'}`}></span>
                            </button>
                        </div>

                        {settings.enable_gst && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Default GST Rate</label>
                                    <div className="flex flex-wrap gap-2">
                                        {gstSlabs.length > 0 ? gstSlabs.map(slab => (
                                            <button
                                                key={slab.id}
                                                onClick={() => setSettings({ ...settings, default_gst_rate: slab.rate })}
                                                className={`px-4 py-2 rounded-xl font-medium transition-all ${settings.default_gst_rate === slab.rate ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                                            >
                                                {slab.rate}%
                                            </button>
                                        )) : (
                                            <div className="text-sm text-slate-500 italic">No GST slabs found. Check master data.</div>
                                        )}
                                    </div>
                                </div>

                                <Input
                                    label="GST Number (GSTIN)"
                                    value={settings.gst_number}
                                    onChange={(e) => setSettings({ ...settings, gst_number: e.target.value })}
                                    placeholder="e.g., 29ABCDE1234F1Z5"
                                    className="font-mono"
                                />
                            </>
                        )}
                    </div>
                </Card>

                {/* VAT Settings */}
                <Card title="VAT Configuration" icon="percent">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Enable VAT</h3>
                                <p className="text-sm text-slate-500">Apply VAT in addition to or instead of GST</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, enable_vat: !settings.enable_vat })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${settings.enable_vat ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enable_vat ? 'left-7' : 'left-1'}`}></span>
                            </button>
                        </div>

                        {settings.enable_vat && (
                            <Input
                                label="Default VAT Rate (%)"
                                type="number"
                                value={settings.default_vat_rate}
                                onChange={(e) => setSettings({ ...settings, default_vat_rate: Number(e.target.value) })}
                                className="w-32"
                            />
                        )}
                    </div>
                </Card>

                {/* Pricing Options */}
                <Card title="Pricing Options" icon="tune">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Tax Inclusive Pricing</h3>
                                <p className="text-sm text-slate-500">Product prices already include tax</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, tax_inclusive_pricing: !settings.tax_inclusive_pricing })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${settings.tax_inclusive_pricing ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.tax_inclusive_pricing ? 'left-7' : 'left-1'}`}></span>
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Round Off Tax</h3>
                                <p className="text-sm text-slate-500">Round tax amounts to nearest rupee</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, round_off_tax: !settings.round_off_tax })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${settings.round_off_tax ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.round_off_tax ? 'left-7' : 'left-1'}`}></span>
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Business Details */}
                <Card title="Business Details" icon="business">
                    <div className="space-y-4">
                        <Input
                            label="Business Name"
                            value={settings.business_name}
                            onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                            placeholder="Your business name"
                        />
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Business Address</label>
                            <textarea
                                value={settings.business_address}
                                onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
                                placeholder="Full business address"
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                        </div>
                    </div>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                    {hasPermission('gst.edit') && (
                        <Button variant="primary" onClick={handleSave} loading={saving}>
                            <span className="material-symbols-outlined text-[20px] mr-2">save</span>
                            {saving ? 'Saving...' : 'Save Settings'}
                        </Button>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
