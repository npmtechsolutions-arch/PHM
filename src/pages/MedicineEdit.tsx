import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { medicinesApi } from '../services/api';
import { useMasterData } from '../contexts/MasterDataContext';
import { CategorySelect, MedicineTypeSelect, UnitSelect, GSTSlabSelect } from '../components/MasterSelect';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

export default function MedicineEdit() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isLoading: mastersLoading } = useMasterData();

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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            fetchMedicine(id);
        }
    }, [id]);

    const fetchMedicine = async (medicineId: string) => {
        try {
            setLoading(true);
            const response = await medicinesApi.get(medicineId);
            const data = response.data;
            setFormData({
                name: data.name || '',
                generic_name: data.generic_name || '',
                brand: data.brand || '',
                manufacturer: data.manufacturer || '',
                medicine_type: data.medicine_type || 'tablet',
                category: data.category || '',
                composition: data.composition || '',
                strength: data.strength || '',
                unit: data.unit || 'Strip',
                pack_size: data.pack_size || 10,
                hsn_code: data.hsn_code || '',
                gst_rate: data.gst_rate || 12,
                mrp: data.mrp || 0,
                purchase_price: data.purchase_price || 0,
                is_prescription_required: data.is_prescription_required || false,
                is_controlled: data.is_controlled || false,
                storage_conditions: data.storage_conditions || '',
                rack_number: data.rack_number || '',
                rack_name: data.rack_name || '',
            });
        } catch (err) {
            console.error('Failed to fetch medicine:', err);
            setError('Failed to load medicine details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.category || formData.mrp <= 0) {
            setError('Please fill in all required fields (Name, Category, MRP)');
            return;
        }

        setSaving(true);
        try {
            if (id) {
                await medicinesApi.update(id, formData);
                navigate('/medicines');
            }
        } catch (err: any) {
            console.error('Failed to update medicine:', err);
            setError(err.response?.data?.detail || 'Failed to update medicine');
        } finally {
            setSaving(false);
        }
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
            title="Edit Medicine"
            description={`Update information for ${formData.name}`}
            breadcrumbs={[
                { label: 'Medicines', path: '/medicines' },
                { label: 'Edit', path: undefined }
            ]}
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
                                    label="Medicine Name *"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Generic Name"
                                    value={formData.generic_name}
                                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                                />
                                <Input
                                    label="Brand"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                />
                                <Input
                                    label="Manufacturer"
                                    value={formData.manufacturer}
                                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Category & Type</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category *</label>
                                    <CategorySelect
                                        value={formData.category}
                                        onChange={(val) => setFormData({ ...formData, category: val })}
                                        required
                                        disabled={mastersLoading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Medicine Type</label>
                                    <MedicineTypeSelect
                                        value={formData.medicine_type}
                                        onChange={(val) => setFormData({ ...formData, medicine_type: val })}
                                        disabled={mastersLoading}
                                    />
                                </div>
                                <Input
                                    label="Strength"
                                    value={formData.strength}
                                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Packaging</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Unit</label>
                                    <UnitSelect
                                        value={formData.unit}
                                        onChange={(val) => setFormData({ ...formData, unit: val })}
                                        disabled={mastersLoading}
                                    />
                                </div>
                                <Input
                                    label="Pack Size"
                                    type="number"
                                    value={formData.pack_size}
                                    onChange={(e) => setFormData({ ...formData, pack_size: parseInt(e.target.value) || 1 })}
                                    min="1"
                                />
                                <Input
                                    label="HSN Code"
                                    value={formData.hsn_code}
                                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Pricing</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="MRP (₹) *"
                                    type="number"
                                    step="0.01"
                                    value={formData.mrp}
                                    onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                    required
                                />
                                <Input
                                    label="Purchase Price (₹)"
                                    type="number"
                                    step="0.01"
                                    value={formData.purchase_price}
                                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GST Rate (%)</label>
                                    <GSTSlabSelect
                                        value={formData.gst_rate}
                                        onChange={(val) => setFormData({ ...formData, gst_rate: val })}
                                        disabled={mastersLoading}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Storage Location</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Rack Name"
                                    value={formData.rack_name}
                                    onChange={(e) => setFormData({ ...formData, rack_name: e.target.value })}
                                />
                                <Input
                                    label="Rack Number"
                                    value={formData.rack_number}
                                    onChange={(e) => setFormData({ ...formData, rack_number: e.target.value })}
                                    placeholder="12"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Additional Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Composition</label>
                                    <textarea
                                        value={formData.composition}
                                        onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        rows={2}
                                    />
                                </div>
                                <Input
                                    label="Storage Conditions"
                                    value={formData.storage_conditions}
                                    onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                                />
                                <div className="flex gap-6 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_prescription_required}
                                            onChange={(e) => setFormData({ ...formData, is_prescription_required: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Prescription Required</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_controlled}
                                            onChange={(e) => setFormData({ ...formData, is_controlled: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Controlled Substance</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => navigate('/medicines')} type="button">
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" loading={saving}>
                                {saving ? 'Updating...' : 'Update Medicine'}
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </PageLayout>
    );
}
