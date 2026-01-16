import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';

interface AdjustmentReason {
    id: string;
    code: string;
    name: string;
    description?: string;
    adjustment_type: 'increase' | 'decrease';
    is_active: boolean;
    created_at: string;
}

export default function AdjustmentReasonsPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [items, setItems] = useState<AdjustmentReason[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<AdjustmentReason | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        adjustment_type: 'decrease' as 'increase' | 'decrease'
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && !hasPermission('adjustment_reasons.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listAdjustmentReasons();
            setItems(res.data || []);
        } catch (err) {
            console.error('Failed to load adjustment reasons:', err);
            // Provide defaults if API doesn't exist yet
            setItems([
                { id: '1', code: 'DAMAGE', name: 'Damaged Goods', description: 'Stock damaged during storage or handling', adjustment_type: 'decrease', is_active: true, created_at: new Date().toISOString() },
                { id: '2', code: 'EXPIRED', name: 'Expired Stock', description: 'Stock passed expiry date', adjustment_type: 'decrease', is_active: true, created_at: new Date().toISOString() },
                { id: '3', code: 'THEFT', name: 'Theft/Loss', description: 'Stock lost or stolen', adjustment_type: 'decrease', is_active: true, created_at: new Date().toISOString() },
                { id: '4', code: 'CORRECTION', name: 'Count Correction', description: 'Physical count differs from system', adjustment_type: 'decrease', is_active: true, created_at: new Date().toISOString() },
                { id: '5', code: 'FOUND', name: 'Found Stock', description: 'Previously missing stock found', adjustment_type: 'increase', is_active: true, created_at: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData({ name: '', code: '', description: '', adjustment_type: 'decrease' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (item: AdjustmentReason) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code,
            description: item.description || '',
            adjustment_type: item.adjustment_type
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            setError('Name and code are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editingItem) {
                await mastersApi.updateAdjustmentReason(editingItem.id, formData);
            } else {
                await mastersApi.createAdjustmentReason(formData);
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: AdjustmentReason) => {
        if (!confirm(`Delete "${item.name}"?`)) return;
        try {
            await mastersApi.deleteAdjustmentReason(item.id);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete');
        }
    };

    return (
        <PageLayout
            title="Adjustment Reasons"
            description="Manage stock adjustment reasons for inventory corrections"
            icon="swap_vert"
            actions={
                hasPermission('adjustment_reasons.create') && (
                    <Button variant="primary" onClick={openCreateModal}>
                        <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                        Add Reason
                    </Button>
                )
            }
        >
            <Card className="space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">swap_vert</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No adjustment reasons</h3>
                        <p className="text-slate-500 mt-1">Add reasons to enable stock adjustments</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-zebra">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3 font-mono text-sm">{item.code}</td>
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${item.adjustment_type === 'increase' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.adjustment_type === 'increase' ? '↑ Increase' : '↓ Decrease'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{item.description || '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center gap-1">
                                                {hasPermission('adjustment_reasons.edit') && (
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => openEditModal(item)}
                                                        className="!p-1.5 h-8 w-8 text-blue-600"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </Button>
                                                )}
                                                {hasPermission('adjustment_reasons.delete') && (
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleDelete(item)}
                                                        className="!p-1.5 h-8 w-8 text-red-600"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingItem ? 'Edit Reason' : 'Add Reason'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="DAMAGE" required />
                        <Input label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Damaged Goods" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Adjustment Type *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={formData.adjustment_type === 'decrease'} onChange={() => setFormData({ ...formData, adjustment_type: 'decrease' })} className="text-primary" />
                                <span className="text-sm">Decrease (Stock Out)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={formData.adjustment_type === 'increase'} onChange={() => setFormData({ ...formData, adjustment_type: 'increase' })} className="text-primary" />
                                <span className="text-sm">Increase (Stock In)</span>
                            </label>
                        </div>
                    </div>

                    <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Explain when this reason is used" />

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </Modal>
        </PageLayout>
    );
}
