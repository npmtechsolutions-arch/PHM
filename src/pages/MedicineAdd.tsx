import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicinesApi } from '../services/api';

export default function MedicineAdd() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        generic_name: '',
        brand: '',
        manufacturer: '',
        medicine_type: 'tablet',
        category: '',
        composition: '',
        strength: '',
        unit: 'Strip',
        pack_size: 10,
        hsn_code: '',
        gst_rate: 12,
        mrp: 0,
        purchase_price: 0,
        is_prescription_required: false,
        is_controlled: false,
        storage_conditions: '',
        rack_number: '',
        rack_name: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.category || formData.mrp <= 0) {
            setError('Please fill in all required fields (Name, Category, MRP)');
            return;
        }

        setSaving(true);
        try {
            await medicinesApi.create(formData);
            navigate('/medicines');
        } catch (err: any) {
            console.error('Failed to create medicine:', err);
            setError(err.response?.data?.detail || 'Failed to create medicine');
        } finally {
            setSaving(false);
        }
    };

    const categories = [
        'Antibiotics', 'Analgesics', 'Antacids', 'Antihistamines', 'Antidiabetics',
        'Cardiovascular', 'Dermatology', 'Gastrointestinal', 'Respiratory', 'Vitamins & Supplements', 'Other'
    ];

    const medicineTypes = [
        { value: 'tablet', label: 'Tablet' },
        { value: 'capsule', label: 'Capsule' },
        { value: 'syrup', label: 'Syrup' },
        { value: 'injection', label: 'Injection' },
        { value: 'cream', label: 'Cream/Ointment' },
        { value: 'drops', label: 'Drops' },
        { value: 'powder', label: 'Powder' },
        { value: 'inhaler', label: 'Inhaler' },
    ];

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/medicines')}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    <span>Back to Medicines</span>
                </button>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Add New Medicine</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Add a new medicine to your catalog</p>
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
                                        Medicine Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="Paracetamol 500mg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Generic Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.generic_name}
                                        onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="Paracetamol"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Brand
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="Dolo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Manufacturer
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.manufacturer}
                                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="Micro Labs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category & Type */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Category & Type</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Category *
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Medicine Type
                                    </label>
                                    <select
                                        value={formData.medicine_type}
                                        onChange={(e) => setFormData({ ...formData, medicine_type: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    >
                                        {medicineTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Strength
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.strength}
                                        onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="500mg"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Packaging */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Packaging</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Unit
                                    </label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    >
                                        <option value="Strip">Strip</option>
                                        <option value="Bottle">Bottle</option>
                                        <option value="Box">Box</option>
                                        <option value="Tube">Tube</option>
                                        <option value="Vial">Vial</option>
                                        <option value="Piece">Piece</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Pack Size
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.pack_size}
                                        onChange={(e) => setFormData({ ...formData, pack_size: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        HSN Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.hsn_code}
                                        onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="30049099"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Pricing</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        MRP (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.mrp}
                                        onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Purchase Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.purchase_price}
                                        onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        GST Rate (%)
                                    </label>
                                    <select
                                        value={formData.gst_rate}
                                        onChange={(e) => setFormData({ ...formData, gst_rate: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    >
                                        <option value={0}>0%</option>
                                        <option value={5}>5%</option>
                                        <option value={12}>12%</option>
                                        <option value={18}>18%</option>
                                        <option value={28}>28%</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Storage Location */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Storage Location</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Rack Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.rack_name}
                                        onChange={(e) => setFormData({ ...formData, rack_name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="Shelf A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Rack Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.rack_number}
                                        onChange={(e) => setFormData({ ...formData, rack_number: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="12"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Additional Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Composition
                                    </label>
                                    <textarea
                                        value={formData.composition}
                                        onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        rows={2}
                                        placeholder="Active ingredients..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Storage Conditions
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.storage_conditions}
                                        onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        placeholder="Store below 25°C"
                                    />
                                </div>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_prescription_required}
                                            onChange={(e) => setFormData({ ...formData, is_prescription_required: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Prescription Required</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_controlled}
                                            onChange={(e) => setFormData({ ...formData, is_controlled: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Controlled Substance</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                        <button
                            type="button"
                            onClick={() => navigate('/medicines')}
                            className="px-5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
                        >
                            {saving ? 'Creating...' : 'Create Medicine'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
