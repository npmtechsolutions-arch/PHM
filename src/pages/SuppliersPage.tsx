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
import ConfirmationModal from '../components/ConfirmationModal';
import Badge from '../components/Badge';
import { type Column } from '../components/Table';

interface Supplier {
    id: string;
    name: string;
    code: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    is_active: boolean;
    created_at: string;
}

export default function SuppliersPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        contact_person: '',
        phone: '',
        email: '',
        gst_number: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(15);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (user && !hasPermission('suppliers.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listSuppliers();
            setSuppliers(res.data || []);
        } catch (err) {
            console.error('Failed to load suppliers:', err);
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData({ name: '', code: '', contact_person: '', phone: '', email: '', gst_number: '', address: '', city: '', state: '', pincode: '' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (item: Supplier) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code,
            contact_person: item.contact_person || '',
            phone: item.phone || '',
            email: item.email || '',
            gst_number: item.gst_number || '',
            address: item.address || '',
            city: item.city || '',
            state: item.state || '',
            pincode: item.pincode || ''
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
                await mastersApi.updateSupplier(editingItem.id, formData);
            } else {
                await mastersApi.createSupplier(formData);
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save supplier');
        } finally {
            setSaving(false);
        }
    };

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

    const handleDeleteClick = (supplier: Supplier) => {
        setSupplierToDelete(supplier);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!supplierToDelete) return;

        try {
            await mastersApi.deleteSupplier(supplierToDelete.id);
            window.toast?.success('Supplier deleted successfully');
            loadData();
        } catch (err: any) {
            console.error('Failed to delete supplier:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete supplier');
        } finally {
            setIsDeleteModalOpen(false);
            setSupplierToDelete(null);
        }
    };

    // Filter logic
    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase())
    );

    // Stats
    const stats = {
        total: suppliers.length,
        active: suppliers.filter(s => s.is_active).length,
        inactive: suppliers.filter(s => !s.is_active).length,
        cities: new Set(suppliers.map(s => s.city).filter(Boolean)).size
    };

    const columns: Column<Supplier>[] = [
        {
            header: 'Code',
            key: 'code',
            render: (item) => <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.code}</span>
        },
        {
            header: 'Supplier',
            key: 'name',
            render: (item) => (
                <div>
                    <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.city || 'No Location'}</div>
                </div>
            )
        },
        {
            header: 'Contact',
            key: 'contact_person',
            render: (item) => (
                <div className="text-sm">
                    <div className="text-slate-900 dark:text-white">{item.contact_person}</div>
                    <div className="text-xs text-slate-500">{item.phone}</div>
                </div>
            )
        },
        {
            header: 'GST Number',
            key: 'gst_number',
            render: (item) => <span className="font-mono text-xs">{item.gst_number || '-'}</span>,
            className: 'hidden md:table-cell'
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
            render: (item) => (
                <div className="flex justify-end gap-1">
                    {hasPermission('suppliers.edit') && (
                        <Button
                            variant="ghost"
                            onClick={() => openEditModal(item)}
                            className="!p-1.5 h-8 w-8 text-blue-600"
                        >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('suppliers.delete') && (
                        <Button
                            variant="ghost"
                            onClick={() => handleDeleteClick(item)}
                            className="!p-1.5 h-8 w-8 text-red-600 hover:bg-red-50"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                    )}
                </div>
            ),
            align: 'right'
        }
    ];

    // Pagination slice
    const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Suppliers"
                subtitle="Manage suppliers for stock entry and purchase orders"
                actions={
                    hasPermission('suppliers.create') && (
                        <Button variant="primary" onClick={openCreateModal}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            Add Supplier
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Suppliers" value={stats.total} icon="local_shipping" isActive={true} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="neutral" />
                <StatCard title="Inactive" value={stats.inactive} icon="cancel" trend="neutral" />
                <StatCard title="Cities" value={stats.cities} icon="location_city" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData} // Client-side pagination for now as API seems to return all
                loading={loading}
                emptyMessage="No suppliers found."
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
                        title="Supplier List"
                        count={filtered.length}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search suppliers..."
                        }}
                        embedded={true}
                    />
                }
            />

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingItem ? 'Edit Supplier' : 'Add Supplier'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Supplier Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="SUP001" required />
                        <Input label="Supplier Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ABC Pharmaceuticals" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Contact Person" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} placeholder="John Doe" />
                        <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 9876543210" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="supplier@example.com" />
                        <Input label="GST Number" value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} placeholder="29ABCDE1234F1Z5" className="font-mono" />
                    </div>

                    <Input label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Street address" />

                    <div className="grid grid-cols-3 gap-4">
                        <Input label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Mumbai" />
                        <Input label="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="Maharashtra" />
                        <Input label="Pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} placeholder="400001" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Supplier"
                message={`Are you sure you want to delete "${supplierToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete Supplier"
            />
        </UniversalListPage>
    );
}
