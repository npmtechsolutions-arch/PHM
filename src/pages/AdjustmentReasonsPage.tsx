import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { type Column } from '../components/Table';

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

    // Pagination & Search
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

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
            // Fallback for demo if API fails
            if (items.length === 0) {
                setItems([]);
            }
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

    // Filter
    const filtered = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase())
    );

    const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Stats
    const stats = {
        total: items.length,
        increase: items.filter(i => i.adjustment_type === 'increase').length,
        decrease: items.filter(i => i.adjustment_type === 'decrease').length
    };

    const columns: Column<AdjustmentReason>[] = [
        {
            header: 'Code',
            key: 'code',
            render: (item) => <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.code}</span>
        },
        {
            header: 'Reason Name',
            key: 'name',
            render: (item) => (
                <div>
                    <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                    {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
                </div>
            )
        },
        {
            header: 'Type',
            key: 'adjustment_type',
            render: (item) => (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${item.adjustment_type === 'increase'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    <span className="material-symbols-outlined text-[14px]">
                        {item.adjustment_type === 'increase' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    {item.adjustment_type === 'increase' ? 'Increase' : 'Decrease'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (item) => (
                <div className="flex justify-end gap-1">
                    {hasPermission('adjustment_reasons.edit') && (
                        <Button variant="ghost" onClick={() => openEditModal(item)} className="!p-1.5 h-8 w-8 text-blue-600">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('adjustment_reasons.delete') && (
                        <Button variant="ghost" onClick={() => handleDelete(item)} className="!p-1.5 h-8 w-8 text-red-600 hover:bg-red-50">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                    )}
                </div>
            )
        }
    ];

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Adjustment Reasons"
                subtitle="Manage stock adjustment reasons"
                actions={
                    hasPermission('adjustment_reasons.create') && (
                        <Button variant="primary" onClick={openCreateModal}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            Add Reason
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Reasons" value={stats.total} icon="swap_vert" isActive={true} />
                <StatCard title="Increase Types" value={stats.increase} icon="trending_up" trend="up" valueClassName="text-green-600" />
                <StatCard title="Decrease Types" value={stats.decrease} icon="trending_down" trend="down" valueClassName="text-red-600" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="No adjustment reasons found."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(filtered.length / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: filtered.length,
                    pageSize: pageSize
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Reason List"
                        count={filtered.length}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search reasons..."
                        }}
                        embedded={true}
                    />
                }
            />

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingItem ? 'Edit Reason' : 'Add Reason'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="DAMAGE" required />
                        <Input label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Damaged Goods" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Adjustment Type *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-200 dark:border-slate-700">
                                <input type="radio" checked={formData.adjustment_type === 'decrease'} onChange={() => setFormData({ ...formData, adjustment_type: 'decrease' })} className="text-primary w-4 h-4" />
                                <span className="text-sm">Decrease (Stock Out)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-200 dark:border-slate-700">
                                <input type="radio" checked={formData.adjustment_type === 'increase'} onChange={() => setFormData({ ...formData, adjustment_type: 'increase' })} className="text-primary w-4 h-4" />
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
        </UniversalListPage>
    );
}
