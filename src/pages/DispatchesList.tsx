import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dispatchesApi } from '../services/api';
import { useOperationalContext } from '../contexts/OperationalContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Drawer from '../components/Drawer';
import Input from '../components/Input';
import { type Column } from '../components/Table';

interface Dispatch {
    id: string;
    dispatch_number: string;
    warehouse_name: string;
    shop_name: string;
    status: string;
    total_items: number;
    dispatch_date: string;
    received_date?: string;
    expected_date?: string;
    driver_name?: string;
    vehicle_number?: string;
}

export default function DispatchesList() {
    const navigate = useNavigate();
    const { activeEntity } = useOperationalContext();
    const { hasPermission } = usePermissions();
    const { handleError, handleSuccess } = useErrorHandler();
    const [dispatches, setDispatches] = useState<Dispatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Action state
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    
    // Receive modal state
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [receivingDispatch, setReceivingDispatch] = useState<Dispatch | null>(null);
    const [dispatchItems, setDispatchItems] = useState<any[]>([]);
    const [globalRackNumber, setGlobalRackNumber] = useState('');
    const [globalRackName, setGlobalRackName] = useState('');
    const [itemRackInfo, setItemRackInfo] = useState<Record<string, { rack_number: string; rack_name: string }>>({});

    useEffect(() => {
        fetchDispatches();
    }, [currentPage, pageSize, search, statusFilter]);

    const fetchDispatches = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                size: pageSize,
                status: statusFilter || undefined
            };
            if (search) params.search = search;

            const res = await dispatchesApi.list(params);
            setDispatches(res.data?.items || []);
            setTotalItems(res.data?.total || 0);
        } catch (e) {
            console.error(e);
            setDispatches([]);
        } finally {
            setLoading(false);
        }
    };

    const handleReceiveClick = async (dispatch: Dispatch) => {
        try {
            // Fetch dispatch details to get items
            const res = await dispatchesApi.get(dispatch.id);
            const dispatchData = res.data || res;
            
            setReceivingDispatch(dispatch);
            setDispatchItems(dispatchData.items || []);
            setGlobalRackNumber('');
            setGlobalRackName('');
            setItemRackInfo({});
            setShowReceiveModal(true);
        } catch (e: any) {
            handleError(e, 'Failed to load dispatch details');
        }
    };

    const handleReceiveSubmit = async () => {
        if (!receivingDispatch) return;
        
        try {
            setUpdatingId(receivingDispatch.id);
            
            // Build item rack info array
            const itemRackArray = Object.entries(itemRackInfo)
                .filter(([_, info]) => info.rack_number || info.rack_name)
                .map(([itemId, info]) => ({
                    item_id: itemId,
                    rack_number: info.rack_number || undefined,
                    rack_name: info.rack_name || undefined
                }));
            
            // Update status with rack info
            await dispatchesApi.updateStatus(receivingDispatch.id, 'delivered', {
                global_rack_number: globalRackNumber || undefined,
                global_rack_name: globalRackName || undefined,
                item_rack_info: itemRackArray.length > 0 ? itemRackArray : undefined
            });
            
            fetchDispatches();
            handleSuccess('Stock received and automatically added to shop inventory with rack/box information!');
            setShowReceiveModal(false);
            setReceivingDispatch(null);
        } catch (e: any) {
            handleError(e, 'Failed to receive stock');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            setUpdatingId(id);
            await dispatchesApi.updateStatus(id, newStatus);
            fetchDispatches();
            
            // Show success message
            if (newStatus === 'delivered') {
                handleSuccess('Stock received and automatically added to shop inventory!');
            } else {
                handleSuccess(`Dispatch status updated to ${newStatus}`);
            }
        } catch (e: any) {
            handleError(e, 'Failed to update dispatch status');
        } finally {
            setUpdatingId(null);
        }
    };

    const stats = {
        total: totalItems,
        pending: dispatches.filter(d => d.status === 'pending').length, // Note: This is only for current page. Ideal would be backend stats.
        inTransit: dispatches.filter(d => d.status === 'in_transit').length,
        delivered: dispatches.filter(d => d.status === 'delivered').length,
    };

    const columns: Column<Dispatch>[] = [
        {
            header: 'Dispatch #',
            key: 'dispatch_number',
            render: (d) => (
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${d.status === 'delivered' ? 'bg-green-100 text-green-600' :
                        d.status === 'in_transit' ? 'bg-blue-100 text-blue-600' :
                            'bg-amber-100 text-amber-600'
                        }`}>
                        <span className="material-symbols-outlined">
                            {d.status === 'delivered' ? 'check_circle' : d.status === 'in_transit' ? 'local_shipping' : 'schedule'}
                        </span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white font-mono">{d.dispatch_number || d.id.slice(0, 8)}</div>
                        <div className="text-xs text-slate-500">{d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString() : 'Pending Date'}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'From Warehouse',
            key: 'warehouse_name',
            render: (d) => d.warehouse_name || 'N/A'
        },
        {
            header: 'To Shop',
            key: 'shop_name',
            render: (d) => d.shop_name || 'N/A'
        },
        {
            header: 'Items',
            key: 'total_items',
            render: (d) => <span className="font-mono">{d.total_items}</span>,
            align: 'center'
        },
        {
            header: 'Status',
            key: 'status',
            render: (d) => {
                const variant = d.status === 'delivered' ? 'success' : d.status === 'cancelled' ? 'error' : d.status === 'in_transit' ? 'primary' : 'warning';
                return <Badge variant={variant}>{d.status.replace('_', ' ')}</Badge>;
            },
            align: 'center'
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (d) => (
                <div className="flex justify-end gap-2">
                    {/* Warehouse Admin: Mark as DISPATCHED when ready to ship */}
                    {activeEntity?.type === 'warehouse' && 
                     hasPermission('dispatches.create.warehouse') && 
                     d.status === 'created' && (
                        <Button
                            variant="primary"
                            onClick={() => handleUpdateStatus(d.id, 'dispatched')}
                            disabled={updatingId === d.id}
                            className="!py-1 !px-2 !text-xs"
                        >
                            {updatingId === d.id ? 'Updating...' : 'Mark Dispatched'}
                        </Button>
                    )}
                    
                    {/* Warehouse Admin: Mark as IN_TRANSIT */}
                    {activeEntity?.type === 'warehouse' && 
                     hasPermission('dispatches.create.warehouse') && 
                     d.status === 'dispatched' && (
                        <Button
                            variant="primary"
                            onClick={() => handleUpdateStatus(d.id, 'in_transit')}
                            disabled={updatingId === d.id}
                            className="!py-1 !px-2 !text-xs"
                        >
                            {updatingId === d.id ? 'Updating...' : 'In Transit'}
                        </Button>
                    )}
                    {/* Allow Shop to Receive Stock - Opens modal for rack/box input */}
                    {activeEntity?.type === 'shop' && 
                     (hasPermission('dispatches.view.shop') || hasPermission('inventory.entry.shop')) && 
                     ['created', 'dispatched', 'in_transit'].includes(d.status?.toLowerCase()) && (
                        <Button
                            variant="success"
                            onClick={() => handleReceiveClick(d)}
                            disabled={updatingId === d.id}
                            className="!py-1 !px-2 !text-xs"
                            title="Receive stock - enter rack number and box name"
                        >
                            {updatingId === d.id ? 'Receiving...' : 'Receive'}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        onClick={() => navigate(`/dispatches/${d.id}`)} // Assuming detail page exists or just for placeholder
                        className="!p-1.5 h-8 w-8 text-slate-500"
                        title="View Details"
                    >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </Button>
                </div>
            )
        }
    ];

    // Context-aware labels based on user type
    const isShop = activeEntity?.type === 'shop';
    const pageTitle = isShop ? 'Incoming Shipments' : 'Dispatch History';
    const pageSubtitle = isShop
        ? 'View incoming stock shipments from warehouses'
        : 'Track warehouse to shop deliveries and shipments';

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title={pageTitle}
                subtitle={pageSubtitle}
                actions={
                    hasPermission('dispatches.create.warehouse') && (
                        <Button variant="primary" onClick={() => navigate('/dispatches/create')}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            New Dispatch
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title={isShop ? 'Total Shipments' : 'Total Dispatches'}
                    value={totalItems}
                    icon="local_shipping"
                    onClick={() => setStatusFilter('')}
                    isActive={statusFilter === ''}
                />
                <StatCard
                    title="Pending"
                    value={stats.pending}
                    icon="schedule"
                    onClick={() => setStatusFilter('pending')}
                    isActive={statusFilter === 'pending'}
                    trend="neutral"
                />
                <StatCard
                    title="In Transit"
                    value={stats.inTransit}
                    icon="near_me"
                    onClick={() => setStatusFilter('in_transit')}
                    isActive={statusFilter === 'in_transit'}
                    trend="up"
                />
                <StatCard
                    title="Delivered"
                    value={stats.delivered}
                    icon="check_circle"
                    onClick={() => setStatusFilter('delivered')}
                    isActive={statusFilter === 'delivered'}
                    trend="neutral"
                />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={dispatches}
                loading={loading}
                emptyMessage={isShop ? 'No incoming shipments found.' : 'No dispatches found.'}
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
                        title={isShop ? 'Incoming Shipments' : 'Dispatch List'}
                        count={totalItems}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search dispatches..."
                        }}
                        actions={
                            <div className="flex items-center">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        }
                        embedded={true}
                    />
                }
            />
            
            {/* Receive Stock Modal */}
            <Drawer
                isOpen={showReceiveModal}
                onClose={() => {
                    setShowReceiveModal(false);
                    setReceivingDispatch(null);
                    setDispatchItems([]);
                    setGlobalRackNumber('');
                    setGlobalRackName('');
                    setItemRackInfo({});
                }}
                title="Receive Stock"
                subtitle="Enter rack number and box name for inventory management"
                width="lg"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowReceiveModal(false);
                                setReceivingDispatch(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleReceiveSubmit}
                            disabled={updatingId === receivingDispatch?.id}
                        >
                            {updatingId === receivingDispatch?.id ? 'Receiving...' : 'Receive Stock'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Global Rack/Box Info */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">settings</span>
                            Global Rack & Box (Applies to All Items)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Global Rack Number
                                </label>
                                <Input
                                    type="text"
                                    value={globalRackNumber}
                                    onChange={(e) => setGlobalRackNumber(e.target.value)}
                                    placeholder="e.g., R-01, R-2A"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Global Box Name
                                </label>
                                <Input
                                    type="text"
                                    value={globalRackName}
                                    onChange={(e) => setGlobalRackName(e.target.value)}
                                    placeholder="e.g., Painkillers Box, Cold Medicines"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            These values will be applied to all items unless overridden below
                        </p>
                    </div>

                    {/* Items List with Per-Item Rack/Box */}
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                            Items ({dispatchItems.length})
                        </h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {dispatchItems.map((item: any, index: number) => {
                                const itemId = item.id || `item-${index}`;
                                const currentInfo = itemRackInfo[itemId] || { rack_number: '', rack_name: '' };
                                
                                return (
                                    <div
                                        key={itemId}
                                        className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {item.medicine_name || item.medicine_id}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    Batch: {item.batch_number || item.batch_id} | Qty: {item.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                    Rack Number
                                                </label>
                                                <Input
                                                    type="text"
                                                    value={currentInfo.rack_number}
                                                    onChange={(e) => {
                                                        setItemRackInfo({
                                                            ...itemRackInfo,
                                                            [itemId]: {
                                                                ...currentInfo,
                                                                rack_number: e.target.value
                                                            }
                                                        });
                                                    }}
                                                    placeholder={globalRackNumber || "e.g., R-01"}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                    Box Name
                                                </label>
                                                <Input
                                                    type="text"
                                                    value={currentInfo.rack_name}
                                                    onChange={(e) => {
                                                        setItemRackInfo({
                                                            ...itemRackInfo,
                                                            [itemId]: {
                                                                ...currentInfo,
                                                                rack_name: e.target.value
                                                            }
                                                        });
                                                    }}
                                                    placeholder={globalRackName || "e.g., Painkillers Box"}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Drawer>
        </UniversalListPage>
    );
}
