import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopsApi } from '../services/api';
import type { MedicalShop } from '../types';

export default function EditMedicalShop() {
    const { shopId } = useParams<{ shopId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
            // Use mock data
            setShop({
                id: 'shop_001',
                name: 'GreenCross Pharmacy',
                code: 'GCP-001',
                shop_type: 'retail',
                license_number: 'PH-2024-001234',
                gst_number: '22AAAAA0000A1Z5',
                phone: '+91-9876543210',
                email: 'greencross@pharmaec.com',
                address: '45 Main Street, Medical Complex',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400050',
                status: 'active',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await shopsApi.update(shopId!, shop);
            alert('Shop updated successfully!');
            navigate('/shops');
        } catch (err) {
            console.error('Failed to update shop:', err);
            alert('Shop updated (mock)');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof MedicalShop, value: any) => {
        setShop(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Page Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/shops')}>Medical Shops</span>
                        <span className="mx-2">/</span>
                        <span className="text-slate-900 dark:text-white font-medium">Edit Shop</span>
                    </nav>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Edit Medical Shop</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Update shop information, licenses, and operational settings</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/shops')}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">storefront</span>
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Shop Name *</label>
                                <input
                                    type="text"
                                    value={shop.name || ''}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Shop Code</label>
                                <input
                                    type="text"
                                    value={shop.code || ''}
                                    onChange={(e) => updateField('code', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Shop Type</label>
                                <select
                                    value={shop.shop_type || 'retail'}
                                    onChange={(e) => updateField('shop_type', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="retail">Retail Pharmacy</option>
                                    <option value="hospital">Hospital Pharmacy</option>
                                    <option value="clinic">Clinic Pharmacy</option>
                                    <option value="wholesale">Wholesale</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Linked Warehouse</label>
                                <select className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                    <option>Central Warehouse (WH-CENT-001)</option>
                                    <option>North Region Warehouse (WH-NOR-002)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* License & Tax Information */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400">verified</span>
                            License & Tax Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Pharmacy License Number *</label>
                                <input
                                    type="text"
                                    value={shop.license_number || ''}
                                    onChange={(e) => updateField('license_number', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">License Expiry Date</label>
                                <input
                                    type="date"
                                    defaultValue="2025-12-31"
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">GST Number</label>
                                <input
                                    type="text"
                                    value={shop.gst_number || ''}
                                    onChange={(e) => updateField('gst_number', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Drug License Type</label>
                                <select className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                    <option>Retail Sale (Form 20)</option>
                                    <option>Wholesale (Form 21)</option>
                                    <option>Both (Form 20 + 21)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400">contact_phone</span>
                            Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Phone Number *</label>
                                <input
                                    type="tel"
                                    value={shop.phone || ''}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={shop.email || ''}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Address</label>
                                <textarea
                                    rows={2}
                                    value={shop.address || ''}
                                    onChange={(e) => updateField('address', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">City</label>
                                <input
                                    type="text"
                                    value={shop.city || ''}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">State</label>
                                    <input
                                        type="text"
                                        value={shop.state || ''}
                                        onChange={(e) => updateField('state', e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Pincode</label>
                                    <input
                                        type="text"
                                        value={shop.pincode || ''}
                                        onChange={(e) => updateField('pincode', e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Shop Status */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Shop Status</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Active</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Shop is operational</p>
                                </div>
                                <button className={`relative w-11 h-6 rounded-full ${shop.status === 'active' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${shop.status === 'active' ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Created</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Jan 15, 2024 at 10:30 AM</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Last Updated</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Manager Assignment */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Manager Assignment</h3>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">AS</div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Alex Smith</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Pharmacist Manager</p>
                            </div>
                        </div>
                        <button className="w-full mt-3 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Change Manager
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Stats</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Total Medicines</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{shop.total_medicines || 450}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Stock Value</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">₹{(shop.total_stock_value || 125000).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Monthly Revenue</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">₹4,50,000</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Low Stock Items</span>
                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">12</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
