import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehousesApi, shopsApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { type Column } from '../components/Table';

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

export default function WarehouseList() {
    const navigate = useNavigate();
    const { user } = useUser();
    const { hasPermission } = usePermissions();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [activeCount, setActiveCount] = useState(0); // For KPI
    const [pageSize, setPageSize] = useState(10);

    // View details modal
    const [viewingWarehouse, setViewingWarehouse] = useState<Warehouse | null>(null);
    const [connectedShops, setConnectedShops] = useState<any[]>([]);
    const [loadingShops, setLoadingShops] = useState(false);

    useEffect(() => {
        fetchWarehouses();
        fetchStats();
    }, [currentPage, pageSize, search, statusFilter]);

    const fetchStats = async () => {
        try {
            // Rough estimate for KPI if API doesn't support direct stats
            const activeRes = await warehousesApi.list({ status: 'active', size: 1 });
            setActiveCount(activeRes.data.total || 0);
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    }

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

    const openViewModal = async (warehouse: Warehouse) => {
        setViewingWarehouse(warehouse);
        setLoadingShops(true);
        try {
            const response = await shopsApi.list({ warehouse_id: warehouse.id, size: 100 });
            setConnectedShops(response.data.items || []);
        } catch (err) {
            console.error('Failed to fetch connected shops:', err);
            setConnectedShops([]);
        } finally {
            setLoadingShops(false);
        }
    };

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

    const handleDeleteClick = (warehouse: Warehouse) => {
        setWarehouseToDelete(warehouse);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!warehouseToDelete) return;

        try {
            await warehousesApi.delete(warehouseToDelete.id);
            window.toast?.success('Warehouse deleted successfully');
            fetchWarehouses();
            fetchStats();
        } catch (err: any) {
            console.error('Failed to delete warehouse:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete warehouse');
        } finally {
            setIsDeleteModalOpen(false);
            setWarehouseToDelete(null);
        }
    };

    const columns: Column<Warehouse>[] = [
        {
            header: 'Warehouse',
            key: 'name',
            render: (warehouse) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined">warehouse</span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">{warehouse.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{warehouse.code}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Location',
            key: 'city',
            render: (warehouse) => (
                <div className="flex flex-col">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{warehouse.city}</span>
                    <span className="text-xs text-slate-500">{warehouse.state}</span>
                </div>
            ),
            className: 'hidden sm:table-cell'
        },
        {
            header: 'Shops',
            key: 'shop_count',
            render: (warehouse) => (
                <div className="flex items-center justify-center font-medium text-slate-700 dark:text-slate-300">
                    <span className="material-symbols-outlined text-[16px] mr-1 text-slate-400">storefront</span>
                    {warehouse.shop_count || 0}
                </div>
            ),
            align: 'center'
        },
        {
            header: 'Status',
            key: 'status',
            render: (warehouse) => (
                <Badge variant={warehouse.status === 'active' ? 'success' : warehouse.status === 'suspended' ? 'error' : 'secondary'}>
                    {warehouse.status}
                </Badge>
            ),
            align: 'center'
        },
        {
            header: 'Actions',
            key: 'id',
            render: (warehouse) => (
                <div className="flex justify-end gap-1">
                    {hasPermission('warehouses.view') && (
                        <Button
                            variant="ghost"
                            onClick={() => openViewModal(warehouse)}
                            className="!p-1.5 h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            title="View Details"
                        >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </Button>
                    )}
                    {hasPermission('warehouses.edit') && (
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/warehouses/edit/${warehouse.id}`)}
                            className="!p-1.5 h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            title="Edit Warehouse"
                        >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('warehouses.delete') && (
                        <Button
                            variant="ghost"
                            onClick={() => handleDeleteClick(warehouse)}
                            className="!p-1.5 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            title="Delete Warehouse"
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
        <UniversalListPage>
            {/* Zone 1: Page Header */}
            <UniversalListPage.Header
                title="Warehouses"
                subtitle={`Manage ${totalItems} warehouses in your network`}
                actions={
                    hasPermission('warehouses.create') && (
                        <Button variant="primary" onClick={() => navigate('/warehouses/add')}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            Add Warehouse
                        </Button>
                    )
                }
            />

            {/* Zone 2: KPI / Summary Cards */}
            <UniversalListPage.KPICards>
                <StatCard
                    title="Total Warehouses"
                    value={totalItems}
                    icon="warehouse"
                    onClick={() => setStatusFilter('all')}
                    isActive={statusFilter === 'all'}
                />
                <StatCard
                    title="Active Warehouses"
                    value={activeCount}
                    icon="check_circle"
                    onClick={() => setStatusFilter('active')}
                    isActive={statusFilter === 'active'}
                    trend="neutral"
                />
                {/* Placeholder for future specific metrics */}
                <div className="hidden sm:block"></div>
                <div className="hidden lg:block"></div>
            </UniversalListPage.KPICards>

            {/* Zone 3 & 4 Merged: List Controls Embedded in Table */}
            <UniversalListPage.DataTable
                columns={columns}
                data={warehouses}
                loading={loading}
                emptyMessage="No warehouses found. Add your first warehouse."
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
                        title="Warehouse List"
                        count={totalItems}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search warehouses..."
                        }}
                        actions={
                            <div className="flex items-center">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        }
                        embedded={true}
                    />
                }
            />

            {/* View Warehouse Details Modal */}
            <Modal
                isOpen={!!viewingWarehouse}
                onClose={() => setViewingWarehouse(null)}
                title={viewingWarehouse?.name || 'Warehouse Details'}
                maxWidth="lg"
            >
                {viewingWarehouse && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Code</p>
                                <p className="text-sm mt-1 font-mono">{viewingWarehouse.code}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</p>
                                <Badge variant={viewingWarehouse.status === 'active' ? 'success' : 'secondary'} className="mt-1">
                                    {viewingWarehouse.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Capacity</p>
                                <p className="text-sm mt-1">{viewingWarehouse.capacity?.toLocaleString() || '-'} units</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">City</p>
                                <p className="text-sm mt-1">{viewingWarehouse.city}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">State</p>
                                <p className="text-sm mt-1">{viewingWarehouse.state}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Contact</p>
                                <p className="text-sm mt-1">{viewingWarehouse.phone || '-'}</p>
                            </div>
                            <div className="col-span-2 md:col-span-3">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Address</p>
                                <p className="text-sm mt-1">{viewingWarehouse.address || '-'} - {viewingWarehouse.pincode}</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                                Connected Medical Shops ({connectedShops.length})
                            </h4>

                            {loadingShops ? (
                                <div className="text-center py-4">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                            ) : connectedShops.length > 0 ? (
                                <div className="grid gap-3">
                                    {connectedShops.map((shop, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                    <span className="material-symbols-outlined text-[18px]">storefront</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white text-sm">{shop.name}</p>
                                                    <p className="text-xs text-slate-500">{shop.city}, {shop.state}</p>
                                                </div>
                                            </div>
                                            <Badge variant={shop.status === 'active' ? 'success' : 'secondary'} className="text-xs">
                                                {shop.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-500 text-sm">No medical shops connected to this warehouse.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Warehouse"
                message={`Are you sure you want to delete "${warehouseToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete Warehouse"
            />
        </UniversalListPage>
    );
}
