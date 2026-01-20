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
import ConfirmationModal from '../components/ConfirmationModal';
import Input from '../components/Input';
import { type Column } from '../components/Table';

interface Category {
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    is_active: boolean;
    created_at: string;
}

export default function CategoriesPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parent_id: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Access Control: Check permission
    useEffect(() => {
        if (user && !hasPermission('categories.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listCategories();
            setCategories(res.data.items || []);
        } catch (err) {
            console.error('Failed to load categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingCategory(null);
        setFormData({ name: '', description: '', parent_id: '' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            parent_id: category.parent_id || ''
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Category name is required');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                ...formData,
                parent_id: formData.parent_id || null
            };
            if (editingCategory) {
                await mastersApi.updateCategory(editingCategory.id, payload);
            } else {
                await mastersApi.createCategory(payload);
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    const handleDeleteClick = (category: Category) => {
        setCategoryToDelete(category);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;

        try {
            await mastersApi.deleteCategory(categoryToDelete.id);
            window.toast?.success('Category deleted successfully');
            loadData();
        } catch (err: any) {
            console.error('Failed to delete category:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete category');
        } finally {
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
        }
    };

    const filtered = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getParentName = (parentId: string | null) => {
        if (!parentId) return null;
        const parent = categories.find(c => c.id === parentId);
        return parent?.name;
    };

    const stats = {
        total: categories.length,
        active: categories.filter(c => c.is_active).length,
        subcategories: categories.filter(c => c.parent_id).length
    };

    const columns: Column<Category>[] = [
        {
            header: 'Category',
            key: 'name',
            render: (category) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">folder</span>
                    </div>
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">{category.name}</p>
                        {category.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{category.description}</p>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Parent',
            key: 'parent_id',
            render: (category) => {
                const parentName = getParentName(category.parent_id);
                return parentName ? <span className="text-sm text-slate-600 dark:text-slate-400">{parentName}</span> : <span className="text-sm text-slate-400">—</span>;
            }
        },
        {
            header: 'Status',
            key: 'is_active',
            align: 'center',
            render: (category) => <Badge variant={category.is_active ? 'success' : 'secondary'}>{category.is_active ? 'Active' : 'Inactive'}</Badge>
        },
        {
            header: 'Created',
            key: 'created_at',
            render: (category) => <span className="text-sm text-slate-600 dark:text-slate-400">{new Date(category.created_at).toLocaleDateString()}</span>
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (category) => (
                <div className="flex justify-end gap-1">
                    {hasPermission('categories.edit') && (
                        <Button variant="ghost" onClick={() => openEditModal(category)} className="!p-1.5 h-8 w-8 text-emerald-600">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('categories.delete') && (
                        <Button variant="ghost" onClick={() => handleDeleteClick(category)} className="!p-1.5 h-8 w-8 text-red-600">
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
                title="Categories"
                subtitle="Manage medicine categories and subcategories."
                actions={
                    hasPermission('categories.create') && (
                        <Button
                            variant="primary"
                            onClick={openCreateModal}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600"
                            icon="add"
                        >
                            Add Category
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Categories" value={stats.total} icon="category" isActive={true} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="neutral" />
                <StatCard title="Subcategories" value={stats.subcategories} icon="account_tree" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="No categories found."
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
                        title="Category List"
                        count={filtered.length}
                        searchProps={{
                            value: searchTerm,
                            onChange: (val) => { setSearchTerm(val); setCurrentPage(1); },
                            placeholder: "Search categories..."
                        }}
                        embedded={true}
                    />
                }
            />

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingCategory ? 'Edit Category' : 'Add Category'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 text-sm">{error}</div>}

                    <Input label="Category Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Antibiotics" required />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Parent Category</label>
                        <select
                            value={formData.parent_id}
                            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">None (Top Level)</option>
                            {categories
                                .filter(c => c.id !== editingCategory?.id && !c.parent_id)
                                .map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))
                            }
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600">{saving ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Category"
                message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete Category"
            />
        </UniversalListPage>
    );
}
