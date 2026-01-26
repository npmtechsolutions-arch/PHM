import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { usePermissions } from '../../contexts/PermissionContext';
import { mastersApi } from '../../services/api';
import { useErrorHandler, type ApiError } from '../../hooks/useErrorHandler';
import UniversalListPage from '../../components/UniversalListPage';
import StatCard from '../../components/StatCard';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import Drawer from '../../components/Drawer';
import ConfirmationModal from '../../components/ConfirmationModal';
import { type Column } from '../../components/Table';

interface Brand {
    id: string;
    code: string;
    name: string;
    description?: string;
    is_active: boolean;
}

export default function BrandsPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [items, setItems] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Brand | null>(null);
    const [formData, setFormData] = useState({ code: '', name: '', description: '', is_active: true });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const { handleError, handleSuccess } = useErrorHandler();

    // Pagination & Search
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        if (user && !hasPermission('brands.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listBrands();
            setItems(res.data.items || []);
        } catch (err) {
            console.error('Failed to load brands:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setFormData({ code: '', name: '', description: '', is_active: true });
        setError('');
        setShowModal(true);
    };

    const openEdit = (item: Brand) => {
        setEditing(item);
        setFormData({ code: item.code, name: item.name, description: item.description || '', is_active: item.is_active });
        setError('');
        setShowModal(true);
    };

    // handleToggleStatus removed - unused

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
                await mastersApi.updateBrand(editing.id, formData);
                handleSuccess('Brand updated successfully');
            } else {
                await mastersApi.createBrand(formData);
                handleSuccess('Brand created successfully');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            const errorMsg = handleError(err as ApiError);
            setError(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Brand | null>(null);

    const handleDeleteClick = (item: Brand) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await mastersApi.deleteBrand(itemToDelete.id);
            handleSuccess('Brand deleted successfully');
            loadData();
        } catch (err) {
            handleError(err as ApiError, 'Failed to delete brand');
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

    const columns: Column<Brand>[] = [
        {
            header: 'Code',
            key: 'code',
            render: (item) => <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.code}</span>
        },
        {
            header: 'Brand',
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
                    {hasPermission('brands.edit') && (
                        <Button variant="ghost" onClick={() => openEdit(item)} className="!p-1.5 h-8 w-8 text-blue-600">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('brands.delete') && (
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
                title="Brands"
                subtitle="Manage medicine brand masters"
                actions={
                    hasPermission('brands.create') && (
                        <Button variant="primary" onClick={openCreate}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            Add Brand
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Brands" value={stats.total} icon="label" isActive={true} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="neutral" />
                <StatCard title="Inactive" value={stats.inactive} icon="cancel" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="No brands found."
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
                        title="Brand List"
                        count={filtered.length}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search brands..."
                        }}
                        embedded={true}
                    />
                }
            />

            <Drawer
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Edit Brand' : 'Add Brand'}
                subtitle={editing ? 'Update brand information' : 'Create a new brand master'}
                width="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" form="brand-form" loading={saving}>
                            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                }
            >
                <form id="brand-form" onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}
                    <Input
                        label="Code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                        placeholder="e.g., cipla"
                        required
                    />
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Cipla"
                        required
                    />
                    <Input
                        label="Description (Optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brand description"
                    />
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
                title="Delete Brand"
                message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete Brand"
            />
        </UniversalListPage>
    );
}
