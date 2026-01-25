import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopsApi } from '../services/api';
import { usePermissions } from '../contexts/PermissionContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { StatusSelect } from '../components/MasterSelect';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';
import { type Column } from '../components/Table';

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
    const { isLoading: mastersLoading } = useMasterData();
    const { hasPermission } = usePermissions();

    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Stats from API (not calculated from paginated data)
    const [stats, setStats] = useState({ total: 0, active: 0, retail: 0, hospital: 0 });

    useEffect(() => {
        fetchShops();
    }, [currentPage, pageSize, search, statusFilter]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await shopsApi.getStats();
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

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

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);

    const handleDeleteClick = (shop: Shop) => {
        setShopToDelete(shop);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!shopToDelete) return;

        try {
            await shopsApi.delete(shopToDelete.id);
            window.toast?.success('Shop deleted successfully');
            fetchShops();
            fetchStats(); // Refresh stats after delete
        } catch (err: any) {
            console.error('Failed to delete shop:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete shop');
        } finally {
            setIsDeleteModalOpen(false);
            setShopToDelete(null);
        }
    };


    const columns: Column<Shop>[] = [
        {
            header: 'Shop',
            key: 'name',
            render: (shop) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">storefront</span>
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
            render: (shop) => <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{shop.code}</span>
        },
        {
            header: 'Type',
            key: 'shop_type',
            render: (shop) => <Badge variant="secondary" className="capitalize">{shop.shop_type}</Badge>,
            className: 'hidden md:table-cell'
        },
        {
            header: 'Location',
            key: 'city',
            render: (shop) => (
                <div className="flex flex-col">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{shop.city}</span>
                    <span className="text-xs text-slate-500">{shop.state}</span>
                </div>
            ),
            className: 'hidden sm:table-cell'
        },
        {
            header: 'Warehouse',
            key: 'warehouse_name',
            render: (shop) => shop.warehouse_name ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[16px]">warehouse</span>
                    <span>{shop.warehouse_name}</span>
                </div>
            ) : (
                <span className="text-xs text-slate-400 italic flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">link_off</span>
                    Unassigned
                </span>
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
                <div className="flex justify-end gap-1">
                    {hasPermission('shops.edit') && (
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/shops/${shop.id}/edit`)}
                            className="!p-1.5 h-8 w-8 text-blue-600"
                            title="Edit Shop"
                        >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('shops.delete') && (
                        <Button
                            variant="ghost"
                            onClick={() => handleDeleteClick(shop)}
                            className="!p-1.5 h-8 w-8 text-red-600 hover:bg-red-50"
                            title="Delete Shop"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                    )}
                </div>
            ),
            align: 'right'
        }
    ];

    return (
        <UniversalListPage loading={mastersLoading}>
            <UniversalListPage.Header
                title="Medical Shops"
                subtitle={`Manage ${totalItems} retail pharmacy locations`}
                actions={
                    hasPermission('shops.create') && (
                        <Button variant="primary" onClick={() => navigate('/shops/add')}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add_business</span>
                            Add Shop
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Shops" value={stats.total} icon="storefront" onClick={() => setStatusFilter('all')} isActive={statusFilter === 'all'} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="up" change="+2 this month" />
                <StatCard title="Retail" value={stats.retail} icon="shopping_bag" trend="neutral" />
                <StatCard title="Hospital" value={stats.hospital} icon="local_hospital" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={shops}
                loading={loading}
                emptyMessage="No medical shops found in the system."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(totalItems / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: totalItems,
                    pageSize: pageSize,
                    onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Shop List"
                        count={totalItems}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search shops..."
                        }}
                        actions={
                            <div className="flex items-center gap-2">
                                <StatusSelect
                                    entityType="shop"
                                    value={statusFilter}
                                    onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
                                    placeholder="All Status"
                                    className="!w-40 !py-1.5 !text-sm !rounded-lg"
                                />
                            </div>
                        }
                        embedded={true}
                    />
                }
            />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Shop"
                message={`Are you sure you want to delete "${shopToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete Shop"
            />
        </UniversalListPage>
    );
}
