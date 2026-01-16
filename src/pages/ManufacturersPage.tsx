import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import { mastersApi } from '../services/api';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { type Column } from '../components/Table';

interface Manufacturer {
    id: string;
    code: string;
    name: string;
    description?: string;
    is_active: boolean;
}

export default function ManufacturersPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [items, setItems] = useState<Manufacturer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Manufacturer | null>(null);
    const [formData, setFormData] = useState({ code: '', name: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Pagination & Search
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        if (user && !hasPermission('manufacturers.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listManufacturers();
            setItems(res.data || []);
        } catch (err) {
            console.error('Failed to load manufacturers:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setFormData({ code: '', name: '', description: '' });
        setError('');
        setShowModal(true);
    };

    const openEdit = (item: Manufacturer) => {
        setEditing(item);
        setFormData({ code: item.code, name: item.name, description: item.description || '' });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) {
            setError('Code and Name are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editing) {
                await mastersApi.updateManufacturer(editing.id, formData);
            } else {
                await mastersApi.createManufacturer(formData);
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: Manufacturer) => {
        if (!confirm(`Delete "${item.name}"?`)) return;
        try {
            await mastersApi.deleteManufacturer(item.id);
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
        active: items.filter(i => i.is_active).length,
        inactive: items.filter(i => !i.is_active).length
    };

    const columns: Column<Manufacturer>[] = [
        {
            header: 'Code',
            key: 'code',
            render: (item) => <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.code}</span>
        },
        {
            header: 'Manufacturer',
            key: 'name',
            render: (item) => (
                <div>
                    <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                    {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
                </div>
            )
        },
        {
            header: 'Status',
            key: 'is_active',
            render: (item) => (
                <Badge variant={item.is_active ? 'success' : 'secondary'}>
                    {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
            align: 'center'
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (item) => (
                <div className="flex justify-end gap-1">
                    {hasPermission('manufacturers.edit') && (
                        <Button variant="ghost" onClick={() => openEdit(item)} className="!p-1.5 h-8 w-8 text-blue-600">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('manufacturers.delete') && (
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
                title="Manufacturers"
                subtitle="Manage medicine manufacturer masters"
                actions={
                    hasPermission('manufacturers.create') && (
                        <Button variant="primary" onClick={openCreate}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            Add Manufacturer
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Manufacturers" value={stats.total} icon="factory" isActive={true} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="neutral" />
                <StatCard title="Inactive" value={stats.inactive} icon="cancel" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="No manufacturers found."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(filtered.length / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: filtered.length,
                    pageSize: pageSize
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Manufacturer List"
                        count={filtered.length}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search manufacturers..."
                        }}
                        embedded={true}
                    />
                }
            />

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Manufacturer' : 'Add Manufacturer'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 text-sm">{error}</div>}
                    <Input
                        label="Code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                        placeholder="e.g., sunpharma"
                        required
                    />
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Sun Pharmaceutical"
                        required
                    />
                    <Input
                        label="Description (Optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Manufacturer description"
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving}>
                            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </UniversalListPage>
    );
}
