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
import ConfirmationModal from '../components/ConfirmationModal';
import { type Column } from '../components/Table';

interface MedicineType {
    id: string;
    code: string;
    name: string;
    description?: string;
    is_active: boolean;
}

export default function MedicineTypesPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [items, setItems] = useState<MedicineType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MedicineType | null>(null);
    const [formData, setFormData] = useState({ code: '', name: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Pagination & Search
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    useEffect(() => {
        if (user && !hasPermission('medicine_types.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listMedicineTypes();
            setItems(res.data || []);
        } catch (err) {
            console.error('Failed to load medicine types:', err);
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

    const openEdit = (item: MedicineType) => {
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
                await mastersApi.updateMedicineType(editing.id, formData);
            } else {
                await mastersApi.createMedicineType(formData);
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<MedicineType | null>(null);

    const handleDeleteClick = (item: MedicineType) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await mastersApi.deleteMedicineType(itemToDelete.id);
            window.toast?.success('Medicine type deleted successfully');
            loadData();
        } catch (err: any) {
            console.error('Failed to delete medicine type:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete medicine type');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
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

    const columns: Column<MedicineType>[] = [
        {
            header: 'Code',
            key: 'code',
            render: (item) => <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.code}</span>
        },
        {
            header: 'Type Name',
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
                    {hasPermission('medicine_types.edit') && (
                        <Button variant="ghost" onClick={() => openEdit(item)} className="!p-1.5 h-8 w-8 text-blue-600">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('medicine_types.delete') && (
                        <Button variant="ghost" onClick={() => handleDeleteClick(item)} className="!p-1.5 h-8 w-8 text-red-600 hover:bg-red-50">
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
                title="Medicine Types"
                subtitle="Manage medicine form types (tablet, capsule, syrup, etc.)"
                actions={
                    hasPermission('medicine_types.create') && (
                        <Button variant="primary" onClick={openCreate}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            Add Type
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Types" value={stats.total} icon="medication" isActive={true} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="neutral" />
                <StatCard title="Inactive" value={stats.inactive} icon="cancel" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="No medicine types found."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(filtered.length / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: filtered.length,
                    pageSize: pageSize,
                    onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Type List"
                        count={filtered.length}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search types..."
                        }}
                        embedded={true}
                    />
                }
            />

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Medicine Type' : 'Add Medicine Type'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 text-sm">{error}</div>}
                    <Input
                        label="Code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                        placeholder="e.g., tablet"
                        required
                    />
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Tablet"
                        required
                    />
                    <Input
                        label="Description (Optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g., Solid oral dosage form"
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving}>
                            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Medicine Type"
                message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete Type"
            />
        </UniversalListPage>
    );
}
