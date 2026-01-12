import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopsApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { StatusSelect } from '../components/MasterSelect';
import PageLayout from '../components/PageLayout';
import Table, { type Column } from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';

interface Shop {
    id: string;
    name: string;
    code: string;
    shop_type: string;
    license_number: string;
    address?: string;
    city: string;
    state: string;
    pincode?: string;
    phone: string;
    email?: string;
    gst_number?: string;
    status: string;
    warehouse_id?: string;
    warehouse_name?: string;
}

export default function ShopList() {
    const navigate = useNavigate();
    const { user } = useUser();
    const userRole = user?.role || 'user';
    const canDelete = userRole === 'super_admin';

    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        fetchShops();
    }, [currentPage, search, statusFilter]);

    const fetchShops = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };
            if (search) params.search = search;
            if (statusFilter !== 'all' && statusFilter) params.status = statusFilter;

            const response = await shopsApi.list(params);
            setShops(response.data.items || []);
            setTotalItems(response.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch shops:', err);
            setShops([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (shop: Shop) => {
        if (!confirm(`Are you sure you want to delete "${shop.name}"?`)) return;

        try {
            await shopsApi.delete(shop.id);
            fetchShops();
        } catch (err: any) {
            console.error('Failed to delete shop:', err);
            alert(err.response?.data?.detail || 'Failed to delete shop');
        }
    };

    const columns: Column<Shop>[] = [
        {
            header: 'Shop',
            key: 'name',
            render: (shop) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined">storefront</span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">{shop.name}</div>
                        <div className="text-xs text-slate-500">{shop.phone}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Code',
            key: 'code',
            render: (shop) => <span className="font-mono text-xs">{shop.code}</span>
        },
        {
            header: 'Type',
            key: 'shop_type',
            render: (shop) => <span className="capitalize">{shop.shop_type}</span>,
            className: 'hidden md:table-cell'
        },
        {
            header: 'Location',
            key: 'city',
            render: (shop) => `${shop.city}, ${shop.state}`,
            className: 'hidden sm:table-cell'
        },
        {
            header: 'Warehouse',
            key: 'warehouse_name',
            render: (shop) => shop.warehouse_name ? (
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">warehouse</span>
                    <span>{shop.warehouse_name}</span>
                </div>
            ) : (
                <span className="text-slate-400 italic">Unassigned</span>
            ),
            className: 'hidden lg:table-cell'
        },
        {
            header: 'Status',
            key: 'status',
            render: (shop) => (
                <Badge variant={shop.status === 'active' ? 'success' : shop.status === 'suspended' ? 'error' : 'secondary'}>
                    {shop.status}
                </Badge>
            ),
            align: 'center'
        },
        {
            header: 'Actions',
            key: 'id',
            render: (shop) => (
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => navigate(`/shops/${shop.id}/edit`)} className="!p-1.5 h-8 w-8 justify-center">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Button>
                    {canDelete && (
                        <Button variant="secondary" onClick={() => handleDelete(shop)} className="!p-1.5 h-8 w-8 justify-center text-red-600 hover:bg-red-50 hover:text-red-700">
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
            title="Medical Shops"
            description={`Manage ${totalItems} retail pharmacy locations`}
            icon="storefront"
            actions={
                <Button variant="primary" onClick={() => navigate('/shops/add')}>
                    <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                    Add Shop
                </Button>
            }
        >
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Search shops..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full"
                        />
                    </div>
                    <div className="w-full sm:w-[200px]">
                        <StatusSelect
                            entityType="shop"
                            value={statusFilter}
                            onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
                            placeholder="All Status"
                        />
                    </div>
                    <Button variant="secondary" onClick={fetchShops}>
                        <span className="material-symbols-outlined">refresh</span>
                    </Button>
                </div>

                <Table
                    columns={columns}
                    data={shops}
                    loading={loading}
                    emptyMessage="No shops found. Add your first shop."
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
