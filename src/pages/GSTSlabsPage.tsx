import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useMasterData } from '../contexts/MasterDataContext';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

interface GSTSlab {
    id: string;
    rate: number;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export default function GSTSlabsPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { refresh } = useMasterData();

    const [slabs, setSlabs] = useState<GSTSlab[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSlab, setEditingSlab] = useState<GSTSlab | null>(null);
    const [formData, setFormData] = useState({ rate: 0, description: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Access Control: Check permission
    useEffect(() => {
        if (user && !hasPermission('gst.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listGSTSlabs();
            setSlabs(res.data || []);
        } catch (err) {
            console.error('Failed to load GST slabs:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingSlab(null);
        setFormData({ rate: 0, description: '' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (slab: GSTSlab) => {
        setEditingSlab(slab);
        setFormData({ rate: slab.rate, description: slab.description || '' });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.rate <= 0) {
            setError('GST rate must be greater than 0');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editingSlab) {
                await mastersApi.updateGSTSlab(editingSlab.id, formData);
            } else {
                await mastersApi.createGSTSlab(formData);
            }
            setShowModal(false);
            loadData();
            refresh(); // Refresh the master data context
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save GST slab');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (slab: GSTSlab) => {
        if (!confirm(`Delete GST slab "${slab.rate}%"?`)) return;
        try {
            await mastersApi.deleteGSTSlab(slab.id);
            loadData();
            refresh();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete. This slab may be in use.');
        }
    };

    const commonRates = [0, 5, 12, 18, 28];

    return (
        <PageLayout
            title="GST Slabs"
            description="Manage GST tax rates for your products"
            actions={
                hasPermission('gst.create') && (
                    <Button variant="primary" onClick={openCreateModal}>
                        <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                        Add GST Slab
                    </Button>
                )
            }
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Info Card */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex gap-3">
                        <span className="material-symbols-outlined text-blue-600">info</span>
                        <div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">GST Slabs are Required</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                GST Slabs must be created before you can add HSN Codes or Medicines.
                                Standard Indian GST rates are 0%, 5%, 12%, 18%, and 28%.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Add Common Rates */}
                {slabs.length === 0 && !loading && hasPermission('gst.create') && (
                    <Card title="Quick Setup" icon="bolt">
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Click to quickly add standard GST slabs:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {commonRates.map(rate => (
                                <Button
                                    key={rate}
                                    variant="secondary"
                                    onClick={async () => {
                                        try {
                                            await mastersApi.createGSTSlab({ rate, description: `GST ${rate}%` });
                                            loadData();
                                            refresh();
                                        } catch (err) {
                                            console.error(err);
                                        }
                                    }}
                                >
                                    Add {rate}%
                                </Button>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Slabs Table */}
                <Card className="!p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="spinner"></div>
                        </div>
                    ) : slabs.length === 0 ? (
                        <div className="py-16 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">percent</span>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No GST Slabs</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Create GST slabs to enable HSN codes and medicines</p>
                            {hasPermission('gst.create') && (
                                <Button variant="primary" className="mt-4" onClick={openCreateModal}>
                                    Add First GST Slab
                                </Button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Rate</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">CGST</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">SGST</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {slabs.map((slab) => (
                                    <tr key={slab.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-2xl font-bold text-primary">{slab.rate}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {slab.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {(slab.rate / 2).toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {(slab.rate / 2).toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={slab.is_active ? 'success' : 'secondary'}>
                                                {slab.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-1">
                                                {hasPermission('gst.edit') && (
                                                    <Button variant="secondary" onClick={() => openEditModal(slab)} className="!p-1.5">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </Button>
                                                )}
                                                {hasPermission('gst.delete') && (
                                                    <Button variant="secondary" onClick={() => handleDelete(slab)} className="!p-1.5 text-red-600">
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingSlab ? 'Edit GST Slab' : 'Add GST Slab'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 text-sm">
                            {error}
                        </div>
                    )}
                    <Input
                        label="GST Rate (%)"
                        type="number"
                        value={formData.rate}
                        onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                        placeholder="e.g., 18"
                        min={0}
                        max={100}
                        required
                    />
                    <Input
                        label="Description (Optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g., Standard GST Rate"
                    />

                    {/* Preview */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">Tax Breakdown Preview</p>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-lg font-bold text-primary">{formData.rate}%</p>
                                <p className="text-xs text-slate-500">Total GST</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{(formData.rate / 2).toFixed(1)}%</p>
                                <p className="text-xs text-slate-500">CGST</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{(formData.rate / 2).toFixed(1)}%</p>
                                <p className="text-xs text-slate-500">SGST</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" loading={saving}>
                            {saving ? 'Saving...' : editingSlab ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </PageLayout>
    );
}
