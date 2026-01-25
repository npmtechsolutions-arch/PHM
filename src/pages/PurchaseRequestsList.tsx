import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseRequestsApi, medicinesApi } from '../services/api';
import { useMasterData } from '../contexts/MasterDataContext';
import { useUser } from '../contexts/UserContext';
import { useOperationalContext } from '../contexts/OperationalContext';
import SearchableSelect from '../components/SearchableSelect';
import { ShopSelect, WarehouseSelect, UrgencySelect } from '../components/MasterSelect';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
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
    const { user } = useUser(); // Need to import useUser if not available, or use permission context. 
    // Assuming UniversalListPage wraps this or we have context access.
    // Wait, PurchaseRequestsList uses UniversalListPage but we are inside the component.
    // Let's add useUser hook.
    const userRole = user?.role;
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
    const [medicinesLoading, setMedicinesLoading] = useState(false);
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
                setMedicinesLoading(false);
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

    const handleApprove = async (id: string) => {
        try {
            await purchaseRequestsApi.approve(id, {});
            fetchRequests();
        } catch (e) { console.error(e); alert('Failed to approve'); }
    };

    const handleReject = async (id: string) => {
        try {
            await purchaseRequestsApi.reject(id);
            fetchRequests();
        } catch (e) { console.error(e); alert('Failed to reject'); }
    };

    const { activeEntity } = useOperationalContext();
    const isShopUser = activeEntity?.type === 'shop';

    // Auto-fill shop ID for shop users when modal opens
    useEffect(() => {
        if (showCreateModal && isShopUser && activeEntity?.id) {
            setNewRequest(prev => ({ ...prev, shop_id: activeEntity.id }));
        }
    }, [showCreateModal, isShopUser, activeEntity]);

    const handleCreate = async () => {
        if (!newRequest.shop_id || !newRequest.warehouse_id || newRequest.items.length === 0) {
            alert('Please fill all required fields');
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
            setShowCreateModal(false);
            setNewRequest({ shop_id: '', warehouse_id: '', priority: 'medium', items: [{ medicine_id: '', quantity: 1 }] });
            fetchRequests();
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.detail || 'Failed to create request');
        }
        finally { setCreating(false); }
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
                    {req.status === 'pending' && (userRole === 'warehouse_admin' || userRole === 'warehouse_employee') && (
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
                    {req.status === 'approved' && (userRole === 'warehouse_admin' || userRole === 'warehouse_employee') && (
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
                    (userRole !== 'warehouse_admin' && userRole !== 'warehouse_employee') && (
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

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Purchase Request</h2>
                            <p className="text-sm text-slate-500">Create a stock request from a shop to warehouse</p>
                        </div>
                        {dropdownsLoading ? (
                            <div className="p-6 text-center">
                                <div className="spinner mx-auto mb-2"></div>
                                <p className="text-sm text-slate-500">Loading dropdowns...</p>
                            </div>
                        ) : (
                        <div className="p-6 space-y-4 overflow-visible">
                            <div className="grid grid-cols-2 gap-4">
                                {!isShopUser && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shop *</label>
                                        <ShopSelect
                                            value={newRequest.shop_id}
                                            onChange={(val) => setNewRequest(prev => ({ ...prev, shop_id: val }))}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Warehouse *</label>
                                    <WarehouseSelect
                                        value={newRequest.warehouse_id}
                                        onChange={(val) => setNewRequest(prev => ({ ...prev, warehouse_id: val }))}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                                <UrgencySelect
                                    value={newRequest.priority}
                                    onChange={(val) => setNewRequest(prev => ({ ...prev, priority: val }))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Items *</label>
                                    <button onClick={addItem} className="text-sm text-blue-600 font-medium hover:underline">+ Add Item</button>
                                </div>
                                <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                    {newRequest.items.map((item: any, index) => (
                                        <div key={index} className="flex gap-2 items-start py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <div className="flex-1 grid grid-cols-12 gap-3">
                                                <div className="col-span-6">
                                                    <label className="block text-xs text-slate-500 mb-1">Medicine</label>
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
                                                    <label className="block text-xs text-slate-500 mb-1">Brand</label>
                                                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 h-[38px] flex items-center truncate">
                                                        {item.brand || '-'}
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-xs text-slate-500 mb-1">Qty</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                                        className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 h-[38px]"
                                                        placeholder="Qty"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-6">
                                                {newRequest.items.length > 1 && (
                                                    <button onClick={() => removeItem(index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg h-[38px] w-[38px] flex items-center justify-center transition-colors">
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        )}
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                                Cancel
                            </button>
                            <Button variant="primary" onClick={handleCreate} disabled={creating || dropdownsLoading}>
                                {creating ? 'Creating...' : 'Create Request'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* View Modal */}
            {viewId && (
                <ViewRequestModal
                    requestId={viewId}
                    onClose={() => setViewId(null)}
                    onApprove={() => { setViewId(null); handleApprove(viewId); }}
                    onReject={() => { setViewId(null); handleReject(viewId); }}
                    canAction={getStatus(viewId) === 'pending' && (userRole === 'warehouse_admin' || userRole === 'warehouse_employee')}
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
                                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Requested Items</h3>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Medicine</th>
                                                <th className="px-4 py-3 text-right">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {request.items?.map((item: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-slate-900 dark:text-white">{item.medicine_name}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono">
                                                        {item.quantity_requested}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                            <Button variant="success" onClick={onApprove}>Approve</Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
