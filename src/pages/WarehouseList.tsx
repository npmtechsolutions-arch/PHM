import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehousesApi } from '../services/api';
import { useUser } from '../contexts/UserContext';

interface Warehouse {
    id: string;
    name: string;
    code: string;
    address?: string;
    city: string;
    state: string;
    country?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    capacity?: number;
    status: string;
    shop_count: number;
}

interface WarehouseForm {
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    phone: string;
    email: string;
    capacity: number;
}

const emptyForm: WarehouseForm = {
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    phone: '',
    email: '',
    capacity: 10000,
};

export default function WarehouseList() {
    const navigate = useNavigate();
    const { user } = useUser();
    const userRole = user?.role || 'user';
    const canDelete = userRole === 'super_admin';

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    // Modal states (kept for edit functionality)
    const [showModal, setShowModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [formData, setFormData] = useState<WarehouseForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // View details modal
    const [viewingWarehouse, setViewingWarehouse] = useState<Warehouse | null>(null);

    useEffect(() => {
        fetchWarehouses();
    }, [currentPage, search, statusFilter]);

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };
            if (search) params.search = search;
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await warehousesApi.list(params);
            setWarehouses(response.data.items || []);
            setTotalItems(response.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch warehouses:', err);
            setWarehouses([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingWarehouse(null);
        setFormData(emptyForm);
        setError('');
        setShowModal(true);
    };

    const openEditModal = async (warehouse: Warehouse) => {
        try {
            // Fetch full details
            const response = await warehousesApi.get(warehouse.id);
            const data = response.data;
            setEditingWarehouse(warehouse);
            setFormData({
                name: data.name || '',
                code: data.code || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                country: data.country || 'India',
                pincode: data.pincode || '',
                phone: data.phone || '',
                email: data.email || '',
                capacity: data.capacity || 10000,
            });
            setError('');
            setShowModal(true);
        } catch (err) {
            console.error('Failed to fetch warehouse details:', err);
            alert('Failed to load warehouse details');
        }
    };

    const openViewModal = async (warehouse: Warehouse) => {
        try {
            const response = await warehousesApi.get(warehouse.id);
            setViewingWarehouse(response.data);
        } catch (err) {
            console.error('Failed to fetch warehouse details:', err);
            alert('Failed to load warehouse details');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name || !formData.code || !formData.city || !formData.state) {
            setError('Please fill in all required fields (Name, Code, City, State)');
            return;
        }

        setSaving(true);
        try {
            if (editingWarehouse) {
                await warehousesApi.update(editingWarehouse.id, formData);
            } else {
                await warehousesApi.create(formData);
            }
            setShowModal(false);
            fetchWarehouses();
        } catch (err: any) {
            console.error('Failed to save warehouse:', err);
            setError(err.response?.data?.detail || 'Failed to save warehouse');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (warehouse: Warehouse) => {
        if (!confirm(`Are you sure you want to delete "${warehouse.name}"?`)) return;

        try {
            await warehousesApi.delete(warehouse.id);
            fetchWarehouses();
        } catch (err: any) {
            console.error('Failed to delete warehouse:', err);
            alert(err.response?.data?.detail || 'Failed to delete warehouse');
        }
    };

    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Warehouses</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your {totalItems} distribution centers across all regions
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchWarehouses}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                        Refresh
                    </button>
                    <button
                        onClick={() => navigate('/warehouses/add')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:shadow-blue-500/40"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Add Warehouse
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-fadeInUp">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">warehouse</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalItems}</p>
                            <p className="text-xs text-slate-500">Total Warehouses</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-fadeInUp" style={{ animationDelay: '50ms' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{warehouses.filter(w => w.status === 'active').length}</p>
                            <p className="text-xs text-slate-500">Active</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">storefront</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{warehouses.reduce((acc, w) => acc + (w.shop_count || 0), 0)}</p>
                            <p className="text-xs text-slate-500">Connected Shops</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">engineering</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{warehouses.filter(w => w.status === 'maintenance').length}</p>
                            <p className="text-xs text-slate-500">Maintenance</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[280px]">
                        <div className="relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name, code, or location..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white dark:focus:bg-slate-800 transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/50 cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">expand_more</span>
                            </span>
                        </div>
                        <button
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            title="Export CSV"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : warehouses.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">warehouse</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No warehouses found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Create your first warehouse to get started</p>
                        <button
                            onClick={openCreateModal}
                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700"
                        >
                            Add Warehouse
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Warehouse</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Code</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Location</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Shops</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {warehouses.map((warehouse, index) => (
                                    <tr key={warehouse.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group animate-fadeIn" style={{ animationDelay: `${index * 30}ms` }}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">warehouse</span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{warehouse.name}</p>
                                                    <p className="text-sm text-slate-500">{warehouse.phone || 'No phone'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{warehouse.code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {warehouse.city}, {warehouse.state}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2.5 py-1 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                                                {warehouse.shop_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${warehouse.status === 'active'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : warehouse.status === 'maintenance'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                }`}>
                                                {warehouse.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openViewModal(warehouse)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    title="View Details"
                                                >
                                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[20px] hover:text-primary">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/warehouses/edit/${warehouse.id}`)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[20px] hover:text-primary">edit</span>
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(warehouse)}
                                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <span className="material-symbols-outlined text-red-500 text-[20px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <span className="px-4 py-2 text-sm font-medium">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto animate-scaleIn">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {editingWarehouse ? 'Update warehouse details' : 'Create a new distribution center'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Warehouse Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Main Warehouse"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                                            placeholder="WH001"
                                            required
                                            disabled={!!editingWarehouse}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Address
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        rows={2}
                                        placeholder="Street address..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            City *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Chennai"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            State *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Tamil Nadu"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.pincode}
                                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="600001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="+91 9876543210"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Capacity
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="10000"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        placeholder="warehouse@example.com"
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {viewingWarehouse && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Warehouse Details</h2>
                            <button
                                onClick={() => setViewingWarehouse(null)}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">warehouse</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{viewingWarehouse.name}</h3>
                                    <p className="text-slate-500 font-mono">{viewingWarehouse.code}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Location</p>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        {viewingWarehouse.city}, {viewingWarehouse.state}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Status</p>
                                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${viewingWarehouse.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {viewingWarehouse.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-slate-500">Phone</p>
                                    <p className="font-medium text-slate-900 dark:text-white">{viewingWarehouse.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Email</p>
                                    <p className="font-medium text-slate-900 dark:text-white">{viewingWarehouse.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Connected Shops</p>
                                    <p className="font-medium text-slate-900 dark:text-white">{viewingWarehouse.shop_count || 0}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Capacity</p>
                                    <p className="font-medium text-slate-900 dark:text-white">{viewingWarehouse.capacity?.toLocaleString() || 'N/A'}</p>
                                </div>
                            </div>

                            {viewingWarehouse.address && (
                                <div>
                                    <p className="text-slate-500 text-sm">Full Address</p>
                                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                                        {viewingWarehouse.address}, {viewingWarehouse.city}, {viewingWarehouse.state} {viewingWarehouse.pincode}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => { setViewingWarehouse(null); openEditModal(viewingWarehouse); }}
                                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                                Edit Warehouse
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
