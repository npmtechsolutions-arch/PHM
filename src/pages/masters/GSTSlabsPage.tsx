import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import { usePermissions } from '../../contexts/PermissionContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import Drawer from '../../components/Drawer';
import ConfirmationModal from '../../components/ConfirmationModal';

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
    const { refresh, isLoading: mastersLoading } = useMasterData();

    const [slabs, setSlabs] = useState<GSTSlab[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSlab, setEditingSlab] = useState<GSTSlab | null>(null);
    const [formData, setFormData] = useState({ rate: 0, description: '', is_active: true });
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
            setSlabs(res.data.items || []);
        } catch (err) {
            console.error('Failed to load GST slabs:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingSlab(null);
        setFormData({ rate: 0, description: '', is_active: true });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (slab: GSTSlab) => {
        setEditingSlab(slab);
        setFormData({ rate: slab.rate, description: slab.description || '', is_active: slab.is_active });
        setError('');
        setShowModal(true);
    };

    // handleToggleStatus removed - unused

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

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [slabToDelete, setSlabToDelete] = useState<GSTSlab | null>(null);

    const handleDeleteClick = (slab: GSTSlab) => {
        setSlabToDelete(slab);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!slabToDelete) return;

        try {
            await mastersApi.deleteGSTSlab(slabToDelete.id);
            window.toast?.success('GST Slab deleted successfully');
            loadData();
            refresh();
        } catch (err: any) {
            console.error('Failed to delete GST Slab:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete GST Slab');
        } finally {
            setIsDeleteModalOpen(false);
            setSlabToDelete(null);
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
            loading={mastersLoading}
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
                                                    <Button variant="secondary" onClick={() => handleDeleteClick(slab)} className="!p-1.5 text-red-600">
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

            {/* Create/Edit Drawer */}
            <Drawer
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingSlab ? 'Edit GST Slab' : 'Add GST Slab'}
                subtitle={editingSlab ? 'Update GST slab information' : 'Create a new GST slab'}
                width="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" form="gst-slab-form" loading={saving}>
                            {saving ? 'Saving...' : editingSlab ? 'Update' : 'Create'}
                        </Button>
                    </div>
                }
            >
                <form id="gst-slab-form" onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
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
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3 tracking-wider">Tax Breakdown Preview</p>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formData.rate}%</p>
                                <p className="text-xs text-slate-500 mt-1">Total GST</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{(formData.rate / 2).toFixed(1)}%</p>
                                <p className="text-xs text-slate-500 mt-1">CGST</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{(formData.rate / 2).toFixed(1)}%</p>
                                <p className="text-xs text-slate-500 mt-1">SGST</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                            Active Status
                        </label>
                    </div>
                </form>
            </Drawer>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete GST Slab"
                message={`Are you sure you want to delete GST Slab "${slabToDelete?.rate}%"? This action cannot be undone.`}
                confirmText="Delete Slab"
            />
        </PageLayout>
    );
}
