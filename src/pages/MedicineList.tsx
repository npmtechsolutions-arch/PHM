import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicinesApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { CategorySelect } from '../components/MasterSelect';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { type Column } from '../components/Table';

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
    gst_rate: number;
    mrp: number;
    purchase_price: number;
    selling_price: number;
    total_stock: number;
    is_active: boolean;
    rack_number?: string;
    rack_name?: string;
}

export default function MedicineList() {
    const navigate = useNavigate();
    const { user } = useUser();
    const userRole = user?.role || 'user';
    const canDelete = userRole === 'super_admin';

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 15;

    useEffect(() => {
        fetchMedicines();
    }, [currentPage, search, categoryFilter]);

    const fetchMedicines = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;

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

    // Calculate stats
    const stats = {
        total: totalItems,
        active: medicines.filter(m => m.is_active).length,
        lowStock: medicines.filter(m => m.total_stock < 50).length,
        categories: new Set(medicines.map(m => m.category).filter(Boolean)).size || 0
    };

    const columns: Column<Medicine>[] = [
        {
            header: 'Medicine',
            key: 'name',
            render: (medicine) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined text-[20px]">medication</span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">{medicine.name}</div>
                        <div className="text-xs text-slate-500">{medicine.generic_name}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Mfg',
            key: 'manufacturer',
            className: 'hidden md:table-cell',
            render: (m) => <span className="text-slate-600 dark:text-slate-400 text-sm">{m.manufacturer}</span>
        },
        {
            header: 'Purchase',
            key: 'purchase_price',
            align: 'right',
            className: 'hidden lg:table-cell',
            render: (m) => <span className="font-medium text-slate-700 dark:text-slate-300">₹{m.purchase_price?.toFixed(2)}</span>
        },
        {
            header: 'MRP',
            key: 'mrp',
            align: 'right',
            className: 'hidden sm:table-cell',
            render: (m) => <span className="text-slate-500 dark:text-slate-400 line-through text-xs mr-2">₹{m.mrp.toFixed(2)}</span>
        },
        {
            header: 'Sale Value',
            key: 'selling_price',
            align: 'right',
            render: (m) => <span className="font-bold text-slate-900 dark:text-white">₹{(m.selling_price || m.mrp).toFixed(2)}</span>
        },
        {
            header: 'GST',
            key: 'gst_rate',
            align: 'center',
            className: 'hidden xl:table-cell',
            render: (m) => <Badge variant="secondary">{m.gst_rate}%</Badge>
        },
        {
            header: 'Stock',
            key: 'total_stock',
            align: 'right',
            render: (m) => (
                <span className={`font-medium ${m.total_stock < 50 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {m.total_stock.toLocaleString()}
                </span>
            )
        },
        {
            header: 'Status',
            key: 'is_active',
            align: 'center',
            className: 'hidden sm:table-cell',
            render: (m) => (
                <Badge variant={m.is_active ? 'success' : 'secondary'}>
                    {m.is_active ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (medicine) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(`/medicines/${medicine.id}/edit`)}
                        className="!p-1.5 h-8 w-8 text-blue-600"
                        title="Edit Medicine"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Button>
                    {canDelete && (
                        <Button
                            variant="ghost"
                            onClick={() => handleDelete(medicine)}
                            className="!p-1.5 h-8 w-8 text-red-600 hover:bg-red-50"
                            title="Delete Medicine"
                        >
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
                title="Medicines"
                subtitle="Manage your medicine catalog"
                actions={
                    <Button variant="primary" onClick={() => navigate('/medicines/add')}>
                        <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                        Add Medicine
                    </Button>
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Medicines" value={stats.total} icon="medication" onClick={() => setCategoryFilter('')} isActive={categoryFilter === ''} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="neutral" />
                <StatCard title="Low Stock" value={stats.lowStock} icon="warning" trend="down" changeType="down" />
                <StatCard title="Categories" value={stats.categories} icon="category" trend="neutral" />
            </UniversalListPage.KPICards>

            {/* Zero-Gap Integration */}
            <UniversalListPage.DataTable
                columns={columns}
                data={medicines}
                loading={loading}
                emptyMessage="No medicines found. Add items to your catalog."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(totalItems / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: totalItems,
                    pageSize: pageSize
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Medicine List"
                        count={totalItems}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search medicines..."
                        }}
                        actions={
                            <div className="flex items-center gap-2">
                                <CategorySelect
                                    value={categoryFilter}
                                    onChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
                                    className="!w-48 !py-1.5 !text-sm !rounded-lg"
                                />
                            </div>
                        }
                        embedded={true}
                    />
                }
            />
        </UniversalListPage>
    );
}
