import { useState, useEffect } from 'react';
import { purchaseRequestsApi, shopsApi, warehousesApi, medicinesApi } from '../services/api';

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
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [shops, setShops] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [creating, setCreating] = useState(false);
    const [newRequest, setNewRequest] = useState({
        shop_id: '',
        warehouse_id: '',
        priority: 'normal',
        items: [{ medicine_id: '', quantity: 1 }]
    });

    useEffect(() => { fetchRequests(); }, [statusFilter]);

    useEffect(() => {
        if (showCreateModal) {
            Promise.all([
                shopsApi.list({ size: 100 }),
                warehousesApi.list({ size: 100 }),
                medicinesApi.list({ size: 100 })
            ]).then(([shopRes, warehouseRes, medRes]) => {
                setShops(shopRes.data?.items || shopRes.data || []);
                setWarehouses(warehouseRes.data?.items || warehouseRes.data || []);
                setMedicines(medRes.data?.items || medRes.data || []);
            });
        }
    }, [showCreateModal]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await purchaseRequestsApi.list({ status: statusFilter || undefined });
            setRequests(res.data?.items || res.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
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
                priority: newRequest.priority,
                items: newRequest.items.filter(i => i.medicine_id && i.quantity > 0)
            });
            setShowCreateModal(false);
            setNewRequest({ shop_id: '', warehouse_id: '', priority: 'normal', items: [{ medicine_id: '', quantity: 1 }] });
            fetchRequests();
        } catch (e) { console.error(e); alert('Failed to create request'); }
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'dispatched': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purchase Requests</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage stock requests from shops to warehouses</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    New Request
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                    <p className="text-sm text-slate-500">Total Requests</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                    <p className="text-sm text-slate-500">Pending</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                    <p className="text-sm text-slate-500">Approved</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                    <p className="text-sm text-slate-500">Rejected</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="dispatched">Dispatched</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center h-64 items-center">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <span className="material-symbols-outlined text-5xl mb-3">shopping_cart</span>
                        <p className="font-medium text-lg">No purchase requests yet</p>
                        <p className="text-sm">Create a new request to get started</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700"
                        >
                            Create Request
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Request #</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Shop</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Items</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                    <td className="px-6 py-4 font-mono text-sm text-slate-900 dark:text-white">{req.request_number || req.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{req.shop_name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-slate-500">{req.warehouse_name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-slate-500">{req.total_items || 0} items</td>
                                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>{req.status}</span></td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => handleApprove(req.id)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700">Approve</button>
                                                <button onClick={() => handleReject(req.id)} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700">Reject</button>
                                            </div>
                                        )}
                                        {req.status === 'approved' && (
                                            <span className="text-sm text-green-600 font-medium">✓ Ready</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Purchase Request</h2>
                            <p className="text-sm text-slate-500">Create a stock request from a shop to warehouse</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shop *</label>
                                    <select
                                        value={newRequest.shop_id}
                                        onChange={(e) => setNewRequest(prev => ({ ...prev, shop_id: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    >
                                        <option value="">Select Shop</option>
                                        {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Warehouse *</label>
                                    <select
                                        value={newRequest.warehouse_id}
                                        onChange={(e) => setNewRequest(prev => ({ ...prev, warehouse_id: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    >
                                        <option value="">Select Warehouse</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                                <select
                                    value={newRequest.priority}
                                    onChange={(e) => setNewRequest(prev => ({ ...prev, priority: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Items *</label>
                                    <button onClick={addItem} className="text-sm text-primary font-medium hover:underline">+ Add Item</button>
                                </div>
                                <div className="space-y-2">
                                    {newRequest.items.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            <select
                                                value={item.medicine_id}
                                                onChange={(e) => updateItem(index, 'medicine_id', e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                            >
                                                <option value="">Select Medicine</option>
                                                {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                                className="w-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                placeholder="Qty"
                                            />
                                            {newRequest.items.length > 1 && (
                                                <button onClick={() => removeItem(index)} className="px-2 text-red-500 hover:bg-red-50 rounded">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
                                Cancel
                            </button>
                            <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                                {creating ? 'Creating...' : 'Create Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

