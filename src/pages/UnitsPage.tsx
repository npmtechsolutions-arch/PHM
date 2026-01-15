import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { type Column } from '../components/Table';

interface Unit {
    id: string;
    name: string;
    short_name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export default function UnitsPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [formData, setFormData] = useState({ name: '', short_name: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const pageSize = 15;
    const [currentPage, setCurrentPage] = useState(1);

    // Access Control: Check permission
    useEffect(() => {
        if (user && !hasPermission('units.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listUnits();
            setUnits(res.data || []);
        } catch (err) {
            console.error('Failed to load units:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingUnit(null);
        setFormData({ name: '', short_name: '', description: '' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (unit: Unit) => {
        setEditingUnit(unit);
        setFormData({ name: unit.name, short_name: unit.short_name, description: unit.description || '' });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.short_name.trim()) {
            setError('Name and short name are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editingUnit) await mastersApi.updateUnit(editingUnit.id, formData);
            else await mastersApi.createUnit(formData);
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (unit: Unit) => {
        if (!confirm(`Delete "${unit.name}"?`)) return;
        try {
            await mastersApi.deleteUnit(unit.id);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete');
        }
    };

    const filtered = units.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const stats = {
        total: units.length,
        active: units.filter(u => u.is_active).length
    };

    // converted from Grid to Table for zero-gap consistency
    const columns: Column<Unit>[] = [
        {
            header: 'Unit Name',
            key: 'name',
            render: (unit) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                        {unit.short_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{unit.name}</span>
                        {unit.description && <p className="text-xs text-slate-500">{unit.description}</p>}
                    </div>
                </div>
            )
        },
        {
            header: 'Short Name',
            key: 'short_name',
            render: (unit) => <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{unit.short_name}</span>
        },
        {
            header: 'Status',
            key: 'is_active',
            align: 'center',
            render: (unit) => <Badge variant={unit.is_active ? 'success' : 'secondary'}>{unit.is_active ? 'Active' : 'Inactive'}</Badge>
        },
        {
            header: 'Created',
            key: 'created_at',
            render: (unit) => <span className="text-sm text-slate-600 dark:text-slate-400">{new Date(unit.created_at).toLocaleDateString()}</span>
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (unit) => (
                <div className="flex justify-end gap-1">
                    {hasPermission('units.edit') && (
                        <Button variant="ghost" onClick={() => openEditModal(unit)} className="!p-1.5 h-8 w-8 text-blue-600">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('units.delete') && (
                        <Button variant="ghost" onClick={() => handleDelete(unit)} className="!p-1.5 h-8 w-8 text-red-600">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                    )}
                </div>
            )
        }
    ];

    const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Units"
                subtitle="Manage units of measurement."
                actions={
                    hasPermission('units.create') && (
                        <Button
                            variant="primary"
                            onClick={openCreateModal}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600"
                            icon="add"
                        >
                            Add Unit
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Units" value={stats.total} icon="straighten" isActive={true} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="No units found."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(filtered.length / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: filtered.length,
                    pageSize: pageSize
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Unit List"
                        count={filtered.length}
                        searchProps={{
                            value: searchTerm,
                            onChange: (val) => { setSearchTerm(val); setCurrentPage(1); },
                            placeholder: "Search units..."
                        }}
                        embedded={true}
                    />
                }
            />

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingUnit ? 'Edit Unit' : 'Add Unit'}
                size="sm"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 text-sm">{error}</div>}

                    <Input label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Tablet" required />
                    <Input label="Short Name *" value={formData.short_name} onChange={(e) => setFormData({ ...formData, short_name: e.target.value })} placeholder="e.g., Tab" maxLength={10} required />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving} className="bg-gradient-to-r from-blue-600 to-cyan-600">{saving ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </Modal>
        </UniversalListPage>
    );
}
