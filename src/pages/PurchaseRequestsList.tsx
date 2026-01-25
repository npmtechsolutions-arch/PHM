import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseRequestsApi, medicinesApi } from '../services/api';
import { useMasterData } from '../contexts/MasterDataContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useOperationalContext } from '../contexts/OperationalContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import SearchableSelect from '../components/SearchableSelect';
import { ShopSelect, WarehouseSelect, UrgencySelect } from '../components/MasterSelect';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Drawer from '../components/Drawer';
import { type Column } from '../components/Table';

interface PurchaseRequest {
    id: string;
    request_number: string;
    shop_name: string;
    warehouse_name: string;
    status: string;
    total_items: number;
    requested_by: string;
    created_at: string;
    priority?: string;
}

export default function PurchaseRequestsList() {
    const navigate = useNavigate();
    const { isLoading: mastersLoading } = useMasterData();
    const { hasPermission } = usePermissions();
    const { activeEntity } = useOperationalContext();
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Create/Edit State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [dropdownsLoading, setDropdownsLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newRequest, setNewRequest] = useState({
        shop_id: '',
        warehouse_id: '',
        priority: 'medium',
        items: [{ medicine_id: '', quantity: 1 }]
    });

    useEffect(() => {
        fetchRequests();
    }, [currentPage, pageSize, search, statusFilter]);

    // Load ALL dropdowns when component mounts (not when modal opens)
    // This ensures dropdowns are ready before user can interact with the page
    useEffect(() => {
        const loadAllDropdowns = async () => {
            setDropdownsLoading(true);
            try {
                // Load medicines and warehouses in parallel
                await Promise.all([
                    medicinesApi.list({ size: 1000 }).then(medRes => {
                        const medsData = medRes.data?.items || (Array.isArray(medRes.data) ? medRes.data : []);
                        setMedicines(medsData);
                    }).catch(err => {
                        console.error('[PurchaseRequests] Failed to load medicines:', err);
                    }),
                    // Trigger warehouse loading in WarehouseSelect component
                    // (WarehouseSelect will fetch if not in master data)
                ]);
            } finally {
                setDropdownsLoading(false);
            }
        };

        if (medicines.length === 0) {
            loadAllDropdowns();
        } else {
            setDropdownsLoading(false);
        }
    }, [medicines.length]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                size: pageSize,
                status: statusFilter || undefined
            };
            if (search) params.search = search;

            const res = await purchaseRequestsApi.list(params);
            setRequests(res.data?.items || []);
            setTotalItems(res.data?.total || 0);
        } catch (e) {
            console.error(e);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const { handleError, handleSuccess } = useErrorHandler();

    const handleApprove = async (id: string) => {
        try {
            await purchaseRequestsApi.approve(id, {});
            handleSuccess('Purchase request approved successfully');
            fetchRequests();
        } catch (e: any) {
            handleError(e as any, 'Failed to approve purchase request');
        }
    };

    const handleReject = async (id: string) => {
        try {
            await purchaseRequestsApi.reject(id);
            handleSuccess('Purchase request rejected');
            fetchRequests();
        } catch (e: any) {
            handleError(e as any, 'Failed to reject purchase request');
        }
    };

    const isShopUser = activeEntity?.type === 'shop';

    // Auto-fill shop ID for shop users when modal opens
    useEffect(() => {
        if (showCreateModal && isShopUser && activeEntity?.id) {
            setNewRequest(prev => ({ ...prev, shop_id: activeEntity.id }));
        }
    }, [showCreateModal, isShopUser, activeEntity]);

    const handleCreate = async () => {
        if (!newRequest.shop_id || !newRequest.warehouse_id || newRequest.items.length === 0) {
            handleError({ message: 'Please fill all required fields' } as any, 'Validation Error');
            return;
        }
        try {
            setCreating(true);
            await purchaseRequestsApi.create({
                shop_id: newRequest.shop_id,
                warehouse_id: newRequest.warehouse_id,
                urgency: newRequest.priority,
                items: newRequest.items
                    .filter(i => i.medicine_id && i.quantity > 0)
                    .map(i => ({ medicine_id: i.medicine_id, quantity_requested: i.quantity }))
            });
            handleSuccess('Purchase request created successfully');
            setShowCreateModal(false);
            setNewRequest({ shop_id: '', warehouse_id: '', priority: 'medium', items: [{ medicine_id: '', quantity: 1 }] });
            fetchRequests();
        } catch (e: any) {
            handleError(e, 'Failed to create purchase request');
        } finally {
            setCreating(false);
        }
    };

    const addItem = () => {
        setNewRequest(prev => ({ ...prev, items: [...prev.items, { medicine_id: '', quantity: 1 }] }));
    };

    const removeItem = (index: number) => {
        setNewRequest(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const updateItem = (index: number, field: string, value: any) => {
        setNewRequest(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
        }));
    };

    const stats = {
        total: totalItems,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    const columns: Column<PurchaseRequest>[] = [
        {
            header: 'Request #',
            key: 'request_number',
            render: (req) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined">shopping_cart</span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white font-mono">{req.request_number || req.id.slice(0, 8)}</div>
                        <div className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Shop',
            key: 'shop_name',
            render: (req) => req.shop_name || 'N/A'
        },
        {
            header: 'Warehouse',
            key: 'warehouse_name',
            render: (req) => req.warehouse_name || 'N/A'
        },
        {
            header: 'Items',
            key: 'total_items',
            render: (req) => <span className="font-mono">{req.total_items}</span>,
            align: 'center'
        },
        {
            header: 'Priority',
            key: 'priority',
            render: (req) => (
                <Badge variant={req.priority === 'urgent' || req.priority === 'critical' ? 'error' : req.priority === 'high' ? 'warning' : 'secondary'}>
                    {req.priority || 'Normal'}
                </Badge>
            ),
            align: 'center'
        },
        {
            header: 'Status',
            key: 'status',
            render: (req) => {
                const variant = req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'error' : req.status === 'dispatched' ? 'info' : 'warning';
                return <Badge variant={variant}>{req.status}</Badge>;
            },
            align: 'center'
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (req) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setViewId(req.id)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                        title="View Details"
                    >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </button>
                    {req.status === 'pending' && hasPermission('purchase_requests.approve.warehouse') && (
                        <>
                            <Button
                                variant="success"
                                onClick={() => handleApprove(req.id)}
                                className="!py-1 !px-2 !text-xs"
                            >
                                Approve
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => handleReject(req.id)}
                                className="!py-1 !px-2 !text-xs"
                            >
                                Reject
                            </Button>
                        </>
                    )}
                    {req.status === 'approved' && hasPermission('dispatches.create.warehouse') && (
                        <Button
                            variant="primary"
                            onClick={() => navigate(`/dispatches/create?pr_id=${req.id}`)}
                            className="!py-1 !px-2 !text-xs"
                        >
                            Create Dispatch
                        </Button>
                    )}
                </div>
            )
        }
    ];

    const [viewId, setViewId] = useState<string | null>(null);

    const getStatus = (id: string) => requests.find(r => r.id === id)?.status;

    // Page should not be interactive until all dropdowns are loaded
    const pageLoading = mastersLoading || dropdownsLoading;

    return (
        <UniversalListPage loading={pageLoading}>
            <UniversalListPage.Header
                title="Purchase Requests"
                subtitle="Manage stock requests from shops to warehouses"
                actions={
                    hasPermission('purchase_requests.create.shop') && (
                        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            New Request
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title="Total Requests"
                    value={totalItems}
                    icon="list_alt"
                    onClick={() => setStatusFilter('')}
                    isActive={statusFilter === ''}
                />
                <StatCard
                    title="Pending"
                    value={stats.pending}
                    icon="pending"
                    onClick={() => setStatusFilter('pending')}
                    isActive={statusFilter === 'pending'}
                    trend="neutral"
                />
                <StatCard
                    title="Approved"
                    value={stats.approved}
                    icon="check_circle"
                    onClick={() => setStatusFilter('approved')}
                    isActive={statusFilter === 'approved'}
                    trend="up"
                />
                <StatCard
                    title="Rejected"
                    value={stats.rejected}
                    icon="cancel"
                    onClick={() => setStatusFilter('rejected')}
                    isActive={statusFilter === 'rejected'}
                    trend="down"
                />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={requests}
                loading={loading}
                emptyMessage="No purchase requests found."
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
                        title="Request List"
                        count={totalItems}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search requests..."
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
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="dispatched">Dispatched</option>
                                </select>
                            </div>
                        }
                        embedded={true}
                    />
                }
            />

            {/* Create Drawer */}
            <Drawer
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="New Purchase Request"
                subtitle="Create a stock request from a shop to warehouse"
                width="lg"
                loading={dropdownsLoading}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleCreate} disabled={creating || dropdownsLoading}>
                            {creating ? 'Creating...' : 'Create Request'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {!isShopUser && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Shop <span className="text-red-500">*</span>
                                </label>
                                <ShopSelect
                                    value={newRequest.shop_id}
                                    onChange={(val) => setNewRequest(prev => ({ ...prev, shop_id: val }))}
                                    className="w-full"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Warehouse <span className="text-red-500">*</span>
                            </label>
                            <WarehouseSelect
                                value={newRequest.warehouse_id}
                                onChange={(val) => setNewRequest(prev => ({ ...prev, warehouse_id: val }))}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Priority
                        </label>
                        <UrgencySelect
                            value={newRequest.priority}
                            onChange={(val) => setNewRequest(prev => ({ ...prev, priority: val }))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Items <span className="text-red-500">*</span>
                            </label>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={addItem}
                                className="text-sm text-blue-600 hover:text-blue-700"
                            >
                                <span className="material-symbols-outlined text-[18px] mr-1">add</span>
                                Add Item
                            </Button>
                        </div>
                        <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            {newRequest.items.map((item: any, index) => (
                                <div key={index} className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                                        <div className="col-span-6">
                                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                                                Medicine
                                            </label>
                                            <SearchableSelect
                                                value={item.medicine_id}
                                                onChange={(val) => {
                                                    const med = medicines.find(m => m.id === val);
                                                    setNewRequest(prev => ({
                                                        ...prev,
                                                        items: prev.items.map((it, i) => i === index ? { ...it, medicine_id: val, brand: med?.brand } : it)
                                                    }));
                                                }}
                                                options={medicines.map(m => ({ value: m.id, label: m.name }))}
                                                placeholder="Select Medicine"
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                                                Brand
                                            </label>
                                            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 h-[38px] flex items-center">
                                                {item.brand || <span className="text-slate-400">—</span>}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 h-[38px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                placeholder="Qty"
                                            />
                                        </div>
                                    </div>
                                    {newRequest.items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="mt-7 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg h-[38px] w-[38px] flex items-center justify-center transition-colors"
                                            title="Remove item"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </form>
            </Drawer>
            {/* View Modal */}
            {viewId && (
                <ViewRequestModal
                    requestId={viewId}
                    onClose={() => setViewId(null)}
                    onApprove={() => { setViewId(null); handleApprove(viewId); }}
                    onReject={() => { setViewId(null); handleReject(viewId); }}
                    canAction={getStatus(viewId) === 'pending' && hasPermission('purchase_requests.approve.warehouse')}
                />
            )}
        </UniversalListPage>
    );
}

function ViewRequestModal({ requestId, onClose, onApprove, onReject, canAction }: any) {
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        purchaseRequestsApi.get(requestId).then(res => {
            setRequest(res.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, [requestId]);

    if (!requestId) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto animate-scaleIn border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request Details</h2>
                        <p className="text-sm text-slate-500">#{request?.request_number || requestId.slice(0, 8)}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : request ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-slate-500">From Shop</span>
                                    <span className="font-medium text-slate-900 dark:text-white text-lg">{request.shop_name}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500">To Warehouse</span>
                                    <span className="font-medium text-slate-900 dark:text-white text-lg">{request.warehouse_name}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500">Status</span>
                                    <Badge variant={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'error' : 'warning'}>
                                        {request.status}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="block text-slate-500">Date</span>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {new Date(request.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                                    Requested Items
                                    {request.items && (
                                        <span className="text-xs font-normal text-slate-500">
                                            ({request.items.length} items)
                                        </span>
                                    )}
                                </h3>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Medicine</th>
                                                <th className="px-4 py-3 text-right">Requested</th>
                                                <th className="px-4 py-3 text-right">Available Stock</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {request.items?.map((item: any, idx: number) => {
                                                const isAvailable = item.is_stock_available !== false;
                                                const availableStock = item.available_stock ?? 0;
                                                const requestedQty = item.quantity_requested ?? 0;
                                                
                                                return (
                                                    <tr key={idx} className={!isAvailable ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-900 dark:text-white">{item.medicine_name}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono">
                                                            {requestedQty}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`font-mono ${isAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {availableStock}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {isAvailable ? (
                                                                <Badge variant="success" className="!text-xs">
                                                                    <span className="material-symbols-outlined text-[14px] mr-1">check_circle</span>
                                                                    Available
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="error" className="!text-xs">
                                                                    <span className="material-symbols-outlined text-[14px] mr-1">error</span>
                                                                    Insufficient
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Stock Availability Summary */}
                                {request.items && request.items.length > 0 && (
                                    <div className="mt-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                        {(() => {
                                            const allAvailable = request.items.every((item: any) => item.is_stock_available !== false);
                                            const insufficientCount = request.items.filter((item: any) => item.is_stock_available === false).length;
                                            
                                            return allAvailable ? (
                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                                    <span className="font-medium">All items have sufficient stock. Approval is allowed.</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                                    <span className="material-symbols-outlined text-[20px]">error</span>
                                                    <span className="font-medium">
                                                        {insufficientCount} item(s) have insufficient stock. Cannot approve without stock.
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-red-500">Failed to load details</div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                        Close
                    </button>
                    {canAction && request && (
                        <>
                            <Button variant="danger" onClick={onReject}>Reject</Button>
                            <Button 
                                variant="success" 
                                onClick={onApprove}
                                disabled={
                                    request.items && 
                                    request.items.some((item: any) => item.is_stock_available === false)
                                }
                                title={
                                    request.items && 
                                    request.items.some((item: any) => item.is_stock_available === false)
                                        ? "Cannot approve: Some items have insufficient stock"
                                        : "Approve purchase request"
                                }
                            >
                                Approve
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
