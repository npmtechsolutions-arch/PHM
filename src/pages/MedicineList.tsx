import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { medicinesApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import BatchManagementModal from '../components/BatchManagementModal';

interface Medicine {
    id: string;
    name: string;
    generic_name: string;
    brand?: string;
    manufacturer: string;
    medicine_type: string;
    category?: string;
    composition?: string;
    strength?: string;
    unit?: string;
    pack_size?: number;
    hsn_code?: string;
    gst_rate?: number;
    mrp: number;
    purchase_price: number;
    total_stock: number;
    is_active: boolean;
    batch_number?: string;
    expiry_date?: string;
    rack_number?: string;
    rack_name?: string;
}

interface MedicineForm {
    name: string;
    generic_name: string;
    brand: string;
    manufacturer: string;
    medicine_type: string;
    category: string;
    composition: string;
    strength: string;
    unit: string;
    pack_size: number;
    hsn_code: string;
    gst_rate: number;
    mrp: number;
    purchase_price: number;
    is_prescription_required: boolean;
    batch_number: string;
    expiry_date: string;
    rack_number: string;
    rack_name: string;
}

const emptyForm: MedicineForm = {
    name: '',
    generic_name: '',
    brand: '',
    manufacturer: '',
    medicine_type: 'tablet',
    category: '',
    composition: '',
    strength: '',
    unit: 'strip',
    pack_size: 10,
    hsn_code: '',
    gst_rate: 12,
    mrp: 0,
    purchase_price: 0,
    is_prescription_required: false,
    batch_number: '',
    expiry_date: '',
    rack_number: '',
    rack_name: '',
};

export default function MedicineList() {
    const navigate = useNavigate();
    const { user } = useUser();
    const userRole = user?.role || 'user';
    const canDelete = userRole === 'super_admin';

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 15;

    // Modal states (kept for edit functionality)
    const [showModal, setShowModal] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
    const [formData, setFormData] = useState<MedicineForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Batch modal states
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

    useEffect(() => {
        fetchMedicines();
    }, [currentPage, search, categoryFilter]);

    const fetchMedicines = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };
            if (search) params.search = search;
            if (categoryFilter !== 'all') params.category = categoryFilter;

            const response = await medicinesApi.list(params);
            setMedicines(response.data.items || []);
            setTotalItems(response.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch medicines:', err);
            setMedicines([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingMedicine(null);
        setFormData(emptyForm);
        setError('');
        setShowModal(true);
    };

    const openEditModal = async (medicine: Medicine) => {
        try {
            const response = await medicinesApi.get(medicine.id);
            const data = response.data;
            setEditingMedicine(medicine);
            setFormData({
                name: data.name || '',
                generic_name: data.generic_name || '',
                brand: data.brand || '',
                manufacturer: data.manufacturer || '',
                medicine_type: data.medicine_type || 'tablet',
                category: data.category || '',
                composition: data.composition || '',
                strength: data.strength || '',
                unit: data.unit || 'strip',
                pack_size: data.pack_size || 10,
                hsn_code: data.hsn_code || '',
                gst_rate: data.gst_rate || 12,
                mrp: data.mrp || 0,
                purchase_price: data.purchase_price || 0,
                is_prescription_required: data.is_prescription_required || false,
                batch_number: data.batch_number || '',
                expiry_date: data.expiry_date || '',
                rack_number: data.rack_number || '',
                rack_name: data.rack_name || '',
            });
            setError('');
            setShowModal(true);
        } catch (err) {
            console.error('Failed to fetch medicine details:', err);
            alert('Failed to load medicine details');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.generic_name || !formData.manufacturer || !formData.mrp) {
            setError('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            if (editingMedicine) {
                await medicinesApi.update(editingMedicine.id, formData);
            } else {
                await medicinesApi.create(formData);
            }
            setShowModal(false);
            fetchMedicines();
        } catch (err: any) {
            console.error('Failed to save medicine:', err);
            setError(err.response?.data?.detail || 'Failed to save medicine');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (medicine: Medicine) => {
        if (!confirm(`Are you sure you want to delete "${medicine.name}"?`)) return;

        try {
            await medicinesApi.delete(medicine.id);
            fetchMedicines();
        } catch (err: any) {
            console.error('Failed to delete medicine:', err);
            alert(err.response?.data?.detail || 'Failed to delete medicine');
        }
    };

    const totalPages = Math.ceil(totalItems / pageSize);

    const getMedicineTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            tablet: 'medication',
            capsule: 'pill',
            syrup: 'water_drop',
            injection: 'syringe',
            cream: 'spa',
            drops: 'opacity',
        };
        return icons[type] || 'medication';
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Medicines</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage {totalItems} medicines in your catalog
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchMedicines}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                        Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">upload</span>
                        Import
                    </button>
                    <button
                        onClick={() => navigate('/medicines/add')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:shadow-blue-500/40"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Add Medicine
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-fadeInUp">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">medication</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalItems}</p>
                            <p className="text-xs text-slate-500">Total Medicines</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-fadeInUp" style={{ animationDelay: '50ms' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{medicines.filter(m => m.is_active).length}</p>
                            <p className="text-xs text-slate-500">Active Items</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600">inventory</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {medicines.reduce((sum, m) => sum + (m.total_stock || 0), 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-500">Stock Units</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-600">warning</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {medicines.filter(m => (m.total_stock || 0) < 50).length}
                            </p>
                            <p className="text-sm text-slate-500">Low Stock</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[250px]">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name, generic name, or manufacturer..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                        <option value="all">All Categories</option>
                        <option value="antibiotics">Antibiotics</option>
                        <option value="painkillers">Painkillers</option>
                        <option value="vitamins">Vitamins</option>
                        <option value="cardiac">Cardiac</option>
                        <option value="diabetes">Diabetes</option>
                    </select>
                    <button
                        onClick={fetchMedicines}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : medicines.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">medication</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No medicines found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Add medicines to your catalog to get started</p>
                        <button
                            onClick={openCreateModal}
                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700"
                        >
                            Add Medicine
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Medicine</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Manufacturer</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Type</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">MRP</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Stock</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Location</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {medicines.map((medicine, index) => (
                                    <tr key={medicine.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group animate-fadeIn" style={{ animationDelay: `${index * 20}ms` }}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                                                        {getMedicineTypeIcon(medicine.medicine_type)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{medicine.name}</p>
                                                    <p className="text-sm text-slate-500">{medicine.generic_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {medicine.manufacturer}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize text-slate-600 dark:text-slate-400">{medicine.medicine_type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                                            ₹{medicine.mrp.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-medium ${(medicine.total_stock || 0) < 50
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-slate-900 dark:text-white'
                                                }`}>
                                                {(medicine.total_stock || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-left">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">{medicine.rack_name || '-'}</span>
                                                <span className="text-xs text-slate-500">{medicine.rack_number ? `Rack: ${medicine.rack_number}` : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${medicine.is_active
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                }`}>
                                                {medicine.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedMedicine(medicine);
                                                        setShowBatchModal(true);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="Manage Batches"
                                                >
                                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">inventory_2</span>
                                                </button>
                                                <Link
                                                    to={`/medicines/${medicine.id}`}
                                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    title="View Details"
                                                >
                                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[20px] hover:text-primary">visibility</span>
                                                </Link>
                                                <button
                                                    onClick={() => openEditModal(medicine)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[20px] hover:text-primary">edit</span>
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(medicine)}
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
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto animate-scaleIn">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                            </h2>
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
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Medicine Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Paracetamol 500mg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Generic Name *</label>
                                        <input
                                            type="text"
                                            value={formData.generic_name}
                                            onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Paracetamol"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Manufacturer *</label>
                                        <input
                                            type="text"
                                            value={formData.manufacturer}
                                            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Sun Pharma"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Brand</label>
                                        <input
                                            type="text"
                                            value={formData.brand}
                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Dolo"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                                        <select
                                            value={formData.medicine_type}
                                            onChange={(e) => setFormData({ ...formData, medicine_type: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        >
                                            <option value="tablet">Tablet</option>
                                            <option value="capsule">Capsule</option>
                                            <option value="syrup">Syrup</option>
                                            <option value="injection">Injection</option>
                                            <option value="cream">Cream</option>
                                            <option value="drops">Drops</option>
                                            <option value="ointment">Ointment</option>
                                            <option value="powder">Powder</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        >
                                            <option value="">Select Category</option>
                                            <option value="antibiotics">Antibiotics</option>
                                            <option value="painkillers">Painkillers</option>
                                            <option value="vitamins">Vitamins</option>
                                            <option value="cardiac">Cardiac</option>
                                            <option value="diabetes">Diabetes</option>
                                            <option value="general">General</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Strength</label>
                                        <input
                                            type="text"
                                            value={formData.strength}
                                            onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="500mg"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">MRP (₹) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.mrp}
                                            onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Price (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.purchase_price}
                                            onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GST Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.gst_rate}
                                            onChange={(e) => setFormData({ ...formData, gst_rate: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pack Size</label>
                                        <input
                                            type="number"
                                            value={formData.pack_size}
                                            onChange={(e) => setFormData({ ...formData, pack_size: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">HSN Code</label>
                                        <input
                                            type="text"
                                            value={formData.hsn_code}
                                            onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="3004"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Composition</label>
                                        <input
                                            type="text"
                                            value={formData.composition}
                                            onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Paracetamol IP 500mg"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Batch Number</label>
                                        <input
                                            type="text"
                                            value={formData.batch_number}
                                            onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Batch123"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={formData.expiry_date}
                                            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rack Name</label>
                                        <input
                                            type="text"
                                            value={formData.rack_name}
                                            onChange={(e) => setFormData({ ...formData, rack_name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="Shelf A"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rack Number</label>
                                        <input
                                            type="text"
                                            value={formData.rack_number}
                                            onChange={(e) => setFormData({ ...formData, rack_number: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="12"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="prescription"
                                        checked={formData.is_prescription_required}
                                        onChange={(e) => setFormData({ ...formData, is_prescription_required: e.target.checked })}
                                        className="rounded border-slate-300"
                                    />
                                    <label htmlFor="prescription" className="text-sm text-slate-700 dark:text-slate-300">
                                        Prescription Required
                                    </label>
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
                                    {saving ? 'Saving...' : editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }

            {/* Batch Management Modal */}
            {
                showBatchModal && selectedMedicine && (
                    <BatchManagementModal
                        medicineId={selectedMedicine.id}
                        medicineName={selectedMedicine.name}
                        onClose={() => {
                            setShowBatchModal(false);
                            setSelectedMedicine(null);
                            fetchMedicines(); // Refresh to update batch counts
                        }}
                    />
                )
            }
        </div >
    );
}
