import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopsApi } from '../../services/api';
import { useMasterData } from '../../contexts/MasterDataContext';
import { WarehouseSelect } from '../../components/MasterSelect';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';

export default function ShopAdd() {
    const navigate = useNavigate();
    const { isLoading: isMasterLoading, refresh } = useMasterData();

    // Force refresh master data on mount to ensure we have the latest warehouse list
    useEffect(() => {
        refresh();
    }, [refresh]);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        shop_type: 'retail',
        license_number: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        gst_number: '',
        warehouse_id: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.code || !formData.city || !formData.state || !formData.license_number || !formData.warehouse_id) {
            setError('Please fill in all required fields (Name, Code, License Number, Warehouse, City, State)');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                email: formData.email || undefined,
                gst_number: formData.gst_number || undefined,
                warehouse_id: formData.warehouse_id,
            };
            await shopsApi.create(payload);
            navigate('/shops');
        } catch (err: any) {
            console.error('Failed to create shop:', err);
            setError(err.response?.data?.detail || 'Failed to create medical shop');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PageLayout
            title="Add New Medical Shop"
            description="Create a new retail pharmacy location"
            loading={isMasterLoading}
        >
            <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <Card className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Shop Name *"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="GreenCross Pharmacy"
                                    required
                                />
                                <Input
                                    label="Code *"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="GCP001"
                                    className="font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">License & Type</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shop Type</label>
                                    <select
                                        value={formData.shop_type}
                                        onChange={(e) => setFormData({ ...formData, shop_type: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    >
                                        <option value="retail">Retail Pharmacy</option>
                                        <option value="wholesale">Wholesale</option>
                                        <option value="hospital">Hospital Pharmacy</option>
                                        <option value="clinic">Clinic Pharmacy</option>
                                    </select>
                                </div>
                                <Input
                                    label="License Number *"
                                    value={formData.license_number}
                                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                                    placeholder="PH-2024-001234"
                                    required
                                />
                            </div>
                        </div>

                        {/* Warehouse Mapping - MANDATORY */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-200 dark:border-amber-700">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-600">warehouse</span>
                                Warehouse Mapping *
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
                                Every medical shop must be linked to a warehouse. This determines the stock source for this shop.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Warehouse *</label>
                                <WarehouseSelect
                                    value={formData.warehouse_id}
                                    onChange={(val) => setFormData({ ...formData, warehouse_id: val })}
                                    required
                                    className={`w-full ${!formData.warehouse_id ? 'border-amber-300 dark:border-amber-600' : ''}`}
                                />
                                {!formData.warehouse_id && (
                                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                        Warehouse selection is mandatory for supply chain integrity
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Location</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        rows={2}
                                        placeholder="45 Main Street, Medical Complex"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="City *"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Chennai"
                                        required
                                    />
                                    <Input
                                        label="State *"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        placeholder="Tamil Nadu"
                                        required
                                    />
                                    <Input
                                        label="Pincode"
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                        placeholder="600001"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact & Tax Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 9876543210"
                                />
                                <Input
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="shop@example.com"
                                />
                                <div className="md:col-span-2">
                                    <Input
                                        label="GST Number"
                                        value={formData.gst_number}
                                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                                        className="font-mono"
                                        placeholder="22AAAAA0000A1Z5"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => navigate('/shops')} type="button">
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" loading={saving}>
                                {saving ? 'Creating...' : 'Create Shop'}
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </PageLayout>
    );
}
