import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { warehousesApi } from '../services/api';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

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
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <PageLayout
            title="Edit Warehouse"
            description="Update warehouse information"

        >
            <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <Card className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Warehouse Name *"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Code *"
                                    value={formData.code}
                                    className="font-mono bg-slate-100 dark:bg-slate-800"
                                    disabled
                                    required
                                />
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
                                        className="input min-h-[80px] py-2"
                                        placeholder="Address"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="City *"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        required
                                    />
                                    <Input
                                        label="State *"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="Pincode"
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    />
                                    <Input
                                        label="Phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    <Input
                                        label="Capacity"
                                        type="number"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <Button variant="secondary" type="button" onClick={() => navigate('/warehouses')}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" loading={saving}>
                                {saving ? 'Updating...' : 'Update Warehouse'}
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </PageLayout>
    );
}
