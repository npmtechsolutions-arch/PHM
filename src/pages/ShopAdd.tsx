import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopsApi, warehousesApi } from '../services/api';

interface Warehouse {
    id: string;
    name: string;
}

export default function ShopAdd() {
    const navigate = useNavigate();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
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

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const response = await warehousesApi.list({ size: 100 });
            setWarehouses(response.data.items || []);
        } catch (err) {
            console.error('Failed to fetch warehouses:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.code || !formData.city || !formData.state || !formData.license_number) {
            setError('Please fill in all required fields (Name, Code, License Number, City, State)');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                email: formData.email || undefined,
                gst_number: formData.gst_number || undefined,
                warehouse_id: formData.warehouse_id || undefined,
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
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/shops')}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    <span>Back to Medical Shops</span>
                </button>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Add New Medical Shop</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Create a new retail pharmacy location</p>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Shop Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="GreenCross Pharmacy"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="GCP001"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Shop Type & License */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">License & Type</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Shop Type
                                    </label>
                                    <select
                                        value={formData.shop_type}
                                        onChange={(e) => setFormData({ ...formData, shop_type: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    >
                                        <option value="retail">Retail Pharmacy</option>
                                        <option value="wholesale">Wholesale</option>
                                        <option value="franchise">Franchise</option>
                                        <option value="hospital">Hospital Pharmacy</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        License Number *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.license_number}
                                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="PH-2024-001234"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Warehouse Mapping */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Warehouse Mapping</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Linked Warehouse
                                </label>
                                <select
                                    value={formData.warehouse_id}
                                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                >
                                    <option value="">Select Warehouse (Optional)</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Link this shop to a warehouse for stock and dispatch management
                                </p>
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Location</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Address
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        rows={2}
                                        placeholder="45 Main Street, Medical Complex"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            City *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                            placeholder="Chennai"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            State *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                            placeholder="Tamil Nadu"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.pincode}
                                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                            placeholder="600001"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact & Tax */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact & Tax Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="shop@example.com"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.gst_number}
                                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="22AAAAA0000A1Z5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                        <button
                            type="button"
                            onClick={() => navigate('/shops')}
                            className="px-5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
                        >
                            {saving ? 'Creating...' : 'Create Shop'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
