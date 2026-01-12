import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicinesApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { CategorySelect } from '../components/MasterSelect';
import PageLayout from '../components/PageLayout';
import Table, { type Column } from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';

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
    const [categoryFilter, setCategoryFilter] = useState('all');
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

    const columns: Column<Medicine>[] = [
        {
            header: 'Medicine',
            key: 'name',
            render: (medicine: Medicine) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined">medication</span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">{medicine.name}</div>
                        <div className="text-xs text-slate-500">{medicine.generic_name}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Manufacturer',
            key: 'manufacturer',
            className: 'hidden md:table-cell'
        },
        {
            header: 'Type',
            key: 'medicine_type',
            render: (row) => <span className="capitalize">{row.medicine_type}</span>,
            className: 'hidden sm:table-cell'
        },
        {
            header: 'MRP',
            key: 'mrp',
            render: (row) => `₹${row.mrp.toFixed(2)}`,
            align: 'right'
        },
        {
            header: 'Stock',
            key: 'total_stock',
            render: (row) => (
                <span className={`font-medium ${row.total_stock < 50 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    {row.total_stock.toLocaleString()}
                </span>
            ),
            align: 'right'
        },
        {
            header: 'Status',
            key: 'is_active',
            render: (row) => <Badge variant={row.is_active ? 'success' : 'secondary'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>,
            align: 'center'
        },
        {
            header: 'Actions',
            key: 'id',
            render: (row) => (
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => navigate(`/medicines/${row.id}/edit`)} className="!p-1.5 h-8 w-8 justify-center">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Button>
                    {canDelete && (
                        <Button variant="secondary" onClick={() => handleDelete(row)} className="!p-1.5 h-8 w-8 justify-center text-red-600 hover:bg-red-50 hover:text-red-700">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                    )}
                </div>
            ),
            align: 'right'
        }
    ];

    return (
        <PageLayout
            title="Medicines"
            description={`Manage ${totalItems} medicines in your catalog`}
            actions={
                <Button variant="primary" onClick={() => navigate('/medicines/add')}>
                    <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                    Add Medicine
                </Button>
            }
        >
            <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by name, generic name..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full"
                        />
                    </div>
                    <div className="w-full sm:w-[250px]">
                        <CategorySelect
                            value={categoryFilter}
                            onChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
                            placeholder="All Categories"
                        />
                    </div>
                    <Button variant="secondary" onClick={fetchMedicines}>
                        <span className="material-symbols-outlined">refresh</span>
                    </Button>
                </div>

                <Table
                    columns={columns}
                    data={medicines}
                    loading={loading}
                    emptyMessage="No medicines found. Add items to your catalog."
                />

                {Boolean(totalItems > pageSize) && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <p className="text-sm text-slate-500">
                            Page {currentPage} of {Math.ceil(totalItems / pageSize)}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="!px-3 !py-1"
                            >
                                Prev
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems / pageSize), p + 1))}
                                disabled={currentPage === Math.ceil(totalItems / pageSize)}
                                className="!px-3 !py-1"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
