import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { warehousesApi, shopsApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import Table, { type Column } from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

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
    const userRole = user?.role || 'user';
    const canDelete = userRole === 'super_admin';

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    // View details modal
    const [viewingWarehouse, setViewingWarehouse] = useState<Warehouse | null>(null);
    const [connectedShops, setConnectedShops] = useState<any[]>([]);
    const [loadingShops, setLoadingShops] = useState(false);

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
                        <div className="text-xs text-slate-500">{warehouse.code}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Location',
            key: 'city',
            render: (warehouse) => `${warehouse.city}, ${warehouse.state}`,
            className: 'hidden sm:table-cell'
        },
        {
            header: 'Shops',
            key: 'shop_count',
            render: (warehouse) => (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {warehouse.shop_count || 0}
                </span>
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
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => openViewModal(warehouse)} className="!p-1.5 h-8 w-8 justify-center">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(`/warehouses/edit/${warehouse.id}`)} className="!p-1.5 h-8 w-8 justify-center">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Button>
                    {canDelete && (
                        <Button variant="secondary" onClick={() => handleDelete(warehouse)} className="!p-1.5 h-8 w-8 justify-center text-red-600 hover:bg-red-50 hover:text-red-700">
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
            title="Warehouses"
            description={`Manage ${totalItems} warehouses in your network`}
            actions={
                <Button variant="primary" onClick={() => navigate('/warehouses/add')}>
                    <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                    Add Warehouse
                </Button>
            }
        >
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Search warehouses..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full"
                        />
                    </div>
                    <div className="w-full sm:w-[200px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <Button variant="secondary" onClick={fetchWarehouses}>
                        <span className="material-symbols-outlined">refresh</span>
                    </Button>
                </div>

                <Table
                    columns={columns}
                    data={warehouses}
                    loading={loading}
                    emptyMessage="No warehouses found. Add your first warehouse."
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
                                    <div className="spinner"></div>
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
        </PageLayout>
    );
}
