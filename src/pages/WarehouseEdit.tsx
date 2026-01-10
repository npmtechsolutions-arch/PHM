import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { warehousesApi } from '../services/api';

export default function WarehouseEdit() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        phone: '',
        email: '',
        capacity: 10000,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadWarehouse();
    }, [id]);

    const loadWarehouse = async () => {
        try {
            const response = await warehousesApi.get(id!);
            const data = response.data;
            setFormData({
                name: data.name || '',
                code: data.code || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                country: data.country || 'India',
                pincode: data.pincode || '',
                phone: data.phone || '',
                email: data.email || '',
                capacity: data.capacity || 10000,
            });
        } catch (err) {
            console.error('Failed to load warehouse:', err);
            setError('Failed to load warehouse details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.code || !formData.city || !formData.state) {
            setError('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            await warehousesApi.update(id!, formData);
            navigate('/warehouses');
        } catch (err: any) {
            console.error('Failed to update warehouse:', err);
            setError(err.response?.data?.detail || 'Failed to update warehouse');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/warehouses')}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    <span>Back to Warehouses</span>
                </button>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Edit Warehouse</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Update warehouse information</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Warehouse Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Code *</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 font-mono"
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Location</h3>
                            <div className="space-y-4">
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                    rows={2}
                                    placeholder="Address"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="City *" required />
                                    <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="State *" required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="Pincode" />
                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="Phone" />
                                    <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="Capacity" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact</h3>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="Email" />
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                        <button type="button" onClick={() => navigate('/warehouses')} className="px-5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-primary/30">{saving ? 'Updating...' : 'Update Warehouse'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
