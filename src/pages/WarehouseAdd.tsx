import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehousesApi } from '../services/api';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

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
        <PageLayout
            title="Add New Warehouse"
            description="Create a new distribution center"
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
                                    placeholder="Main Warehouse"
                                    required
                                />
                                <Input
                                    label="Code *"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="WH001"
                                    required
                                    className="font-mono"
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
                                        placeholder="Street address..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="Pincode"
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                        placeholder="600001"
                                    />
                                    <Input
                                        label="Phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                    />
                                    <Input
                                        label="Capacity"
                                        type="number"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                        placeholder="10000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="warehouse@example.com"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <Button variant="secondary" type="button" onClick={() => navigate('/warehouses')}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" loading={saving}>
                                {saving ? 'Creating...' : 'Create Warehouse'}
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </PageLayout>
    );
}
