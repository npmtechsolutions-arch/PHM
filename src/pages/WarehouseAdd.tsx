import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehousesApi } from '../services/api';

export default function WarehouseAdd() {
    const navigate = useNavigate();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.code || !formData.city || !formData.state) {
            setError('Please fill in all required fields (Name, Code, City, State)');
            return;
        }

        setSaving(true);
        try {
            await warehousesApi.create(formData);
            navigate('/warehouses');
        } catch (err: any) {
            console.error('Failed to create warehouse:', err);
            setError(err.response?.data?.detail || 'Failed to create warehouse');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/warehouses')}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    <span>Back to Warehouses</span>
                </button>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Add New Warehouse</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Create a new distribution center</p>
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
                                        Warehouse Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="Main Warehouse"
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
                                        placeholder="WH001"
                                        required
                                    />
                                </div>
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
                                        placeholder="Street address..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                            Capacity
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                            placeholder="10000"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact Information</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    placeholder="warehouse@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                        <button
                            type="button"
                            onClick={() => navigate('/warehouses')}
                            className="px-5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
                        >
                            {saving ? 'Creating...' : 'Create Warehouse'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
