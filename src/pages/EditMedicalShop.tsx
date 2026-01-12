import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopsApi } from '../services/api';
import type { MedicalShop } from '../types';
import { ShopTypeSelect, WarehouseSelect, StatusSelect } from '../components/MasterSelect';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

export default function EditMedicalShop() {
    const { id: shopId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [shop, setShop] = useState<Partial<MedicalShop>>({
        name: '',
        code: '',
        shop_type: 'retail',
        license_number: '',
        gst_number: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        warehouse_id: '',
        status: 'active',
    });

    useEffect(() => {
        if (shopId) {
            fetchShop();
        }
    }, [shopId]);

    const fetchShop = async () => {
        try {
            setLoading(true);
            const response = await shopsApi.get(shopId!);
            setShop(response.data);
        } catch (err) {
            console.error('Failed to fetch shop:', err);
            setError('Failed to load shop details');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!shop.name || !shop.city || !shop.state || !shop.license_number) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setSaving(true);
            await shopsApi.update(shopId!, shop);
            navigate('/shops');
        } catch (err: any) {
            console.error('Failed to update shop:', err);
            setError(err.response?.data?.detail || 'Failed to update shop');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof MedicalShop, value: any) => {
        setShop(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <PageLayout
            title="Edit Medical Shop"
            description={`Update information for ${shop.name}`}
            breadcrumbs={[
                { label: 'Medical Shops', path: '/shops' },
                { label: 'Edit', path: undefined }
            ]}
        >
            <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        {/* Basic Information */}
                        <Card title="Basic Information" icon="storefront">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Shop Name *"
                                    value={shop.name || ''}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    required
                                />
                                <Input
                                    label="Shop Code"
                                    value={shop.code || ''}
                                    onChange={(e) => updateField('code', e.target.value)}
                                    className="font-mono"
                                    disabled
                                />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shop Type</label>
                                    <ShopTypeSelect
                                        value={shop.shop_type || 'retail'}
                                        onChange={(val) => updateField('shop_type', val)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Linked Warehouse</label>
                                    <WarehouseSelect
                                        value={shop.warehouse_id || ''}
                                        onChange={(val) => updateField('warehouse_id', val)}
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* License & Tax Information */}
                        <Card title="License & Tax Information" icon="verified">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Pharmacy License Number *"
                                    value={shop.license_number || ''}
                                    onChange={(e) => updateField('license_number', e.target.value)}
                                    required
                                />
                                <Input
                                    label="GST Number"
                                    value={shop.gst_number || ''}
                                    onChange={(e) => updateField('gst_number', e.target.value.toUpperCase())}
                                    className="font-mono"
                                />
                            </div>
                        </Card>

                        {/* Contact Information */}
                        <Card title="Contact Information" icon="contact_phone">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Phone Number"
                                    type="tel"
                                    value={shop.phone || ''}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                />
                                <Input
                                    label="Email Address"
                                    type="email"
                                    value={shop.email || ''}
                                    onChange={(e) => updateField('email', e.target.value)}
                                />
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Address</label>
                                    <textarea
                                        rows={2}
                                        value={shop.address || ''}
                                        onChange={(e) => updateField('address', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>
                                <Input
                                    label="City *"
                                    value={shop.city || ''}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    required
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="State *"
                                        value={shop.state || ''}
                                        onChange={(e) => updateField('state', e.target.value)}
                                        required
                                    />
                                    <Input
                                        label="Pincode"
                                        value={shop.pincode || ''}
                                        onChange={(e) => updateField('pincode', e.target.value)}
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Action Buttons for Mobile */}
                        <div className="lg:hidden flex justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={() => navigate('/shops')} type="button">
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" loading={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        {/* Shop Status */}
                        <Card title="Shop Status" icon="toggle_on">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Status</label>
                                    <StatusSelect
                                        entityType="shop"
                                        value={shop.status || 'active'}
                                        onChange={(val) => updateField('status', val)}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Current operational status of this shop</p>
                                </div>
                            </div>
                        </Card>

                        {/* Quick Stats */}
                        <Card title="Quick Stats" icon="analytics">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Total Medicines</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{shop.total_medicines || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Stock Value</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">₹{(shop.total_stock_value || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Save Actions - Desktop */}
                        <div className="hidden lg:block">
                            <Card>
                                <div className="flex flex-col gap-3">
                                    <Button variant="primary" type="submit" loading={saving} className="w-full justify-center">
                                        <span className="material-symbols-outlined text-[18px] mr-2">save</span>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                    <Button variant="secondary" onClick={() => navigate('/shops')} type="button" className="w-full justify-center">
                                        Cancel
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </form>
        </PageLayout>
    );
}
