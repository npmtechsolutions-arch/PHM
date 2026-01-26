import { useState, useEffect } from 'react';
import { invoicesApi } from '../../services/api';
import { toast } from '../../components/Toast';

export default function ReturnRefund() {
    const [searchInvoice, setSearchInvoice] = useState('');
    const [loading, setLoading] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const [returnItems, setReturnItems] = useState<any[]>([]);
    const [recentReturns, setRecentReturns] = useState<any[]>([]);
    const [loadingReturns, setLoadingReturns] = useState(false);

    // Fetch recent returns on component mount
    useEffect(() => {
        fetchRecentReturns();
    }, []);

    const fetchRecentReturns = async () => {
        try {
            setLoadingReturns(true);
            const response = await invoicesApi.getReturns({ page: 1, size: 10 });
            setRecentReturns(response.data?.data?.items || response.data?.items || []);
        } catch (err) {
            console.error('Failed to fetch recent returns:', err);
            // No mock data - just leave empty
            setRecentReturns([]);
        } finally {
            setLoadingReturns(false);
        }
    };

    const handleSearchInvoice = async () => {
        if (!searchInvoice.trim()) {
            toast.error('Please enter an invoice number');
            return;
        }

        try {
            setLoading(true);
            const response = await invoicesApi.get(searchInvoice);
            const invoiceData = response.data?.data || response.data;

            if (!invoiceData) {
                toast.error('Invoice not found');
                return;
            }

            setInvoice(invoiceData);

            // Get invoice items
            const itemsRes = await invoicesApi.getItems(searchInvoice);
            const items = itemsRes.data?.data?.items || itemsRes.data?.items || [];
            setReturnItems(items);

            if (items.length === 0) {
                toast.info('No items found for this invoice');
            }
        } catch (err: any) {
            console.error('Invoice not found:', err);
            toast.error(err.response?.data?.detail || 'Invoice not found');
            setInvoice(null);
            setReturnItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessReturn = async () => {
        if (returnItems.length === 0) {
            toast.error('No items to return');
            return;
        }

        try {
            setLoading(true);
            await invoicesApi.processReturn(invoice.id, {
                items: returnItems.map(item => ({
                    medicine_id: item.medicine_id,
                    quantity: item.quantity,
                    reason: item.reason || 'Customer return',
                })),
                refund_method: 'cash',
            });
            toast.success('Return processed successfully!');
            setInvoice(null);
            setReturnItems([]);
            setSearchInvoice('');
            // Refresh recent returns
            fetchRecentReturns();
        } catch (err: any) {
            console.error('Failed to process return:', err);
            toast.error(err.response?.data?.detail || 'Failed to process return');
        } finally {
            setLoading(false);
        }
    };

    const totalRefund = returnItems.reduce((sum, item) => sum + (item.refund_amount || item.unit_price * item.quantity), 0);

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Page Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-primary text-3xl">storefront</span>
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Return / Refund</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                        Process customer returns and issue refunds
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New Return Form */}
                <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">receipt_long</span>
                            New Return Request
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Invoice Search */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Original Invoice Number</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                                    <input
                                        type="text"
                                        value={searchInvoice}
                                        onChange={(e) => setSearchInvoice(e.target.value)}
                                        placeholder="Enter invoice number (e.g., INV-2024-0001)"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchInvoice()}
                                    />
                                </div>
                                <button
                                    onClick={handleSearchInvoice}
                                    disabled={loading}
                                    className="px-5 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Searching...' : 'Find Invoice'}
                                </button>
                            </div>
                        </div>

                        {invoice && (
                            <>
                                {/* Invoice Preview */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Invoice</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{invoice.id || invoice.invoice_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Date</p>
                                            <p className="font-medium text-slate-900 dark:text-white">{invoice.date || new Date(invoice.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                            {(invoice.customer_name || 'C').split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{invoice.customer_name || 'Walk-in Customer'}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.customer_phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Return Items Table */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">Select Items to Return</label>
                                    {returnItems.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                            <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                                            <p>No items found for this invoice</p>
                                        </div>
                                    ) : (
                                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">
                                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
                                                        </th>
                                                        <th className="px-4 py-3 text-left font-semibold">Medicine</th>
                                                        <th className="px-4 py-3 text-left font-semibold">Batch</th>
                                                        <th className="px-4 py-3 text-center font-semibold">Qty</th>
                                                        <th className="px-4 py-3 text-left font-semibold">Reason</th>
                                                        <th className="px-4 py-3 text-right font-semibold">Refund</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {returnItems.map((item) => (
                                                        <tr key={item.id}>
                                                            <td className="px-4 py-3">
                                                                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-primary focus:ring-primary" />
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.medicine_name}</td>
                                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{item.batch_number}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input type="number" defaultValue={item.quantity} min="1" className="w-16 text-center rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm" />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <select className="w-full rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-700 dark:text-slate-300">
                                                                    <option>Wrong medication</option>
                                                                    <option>Damaged packaging</option>
                                                                    <option>Expired product</option>
                                                                    <option>Customer changed mind</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">₹{(item.refund_amount || item.unit_price * item.quantity).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Refund Summary */}
                                {returnItems.length > 0 && (
                                    <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Refund Amount</p>
                                            <p className="text-2xl font-bold text-primary">₹{totalRefund.toFixed(2)}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <select className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                                                <option>Cash Refund</option>
                                                <option>Store Credit</option>
                                                <option>Original Payment Method</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => { setInvoice(null); setReturnItems([]); }}
                                        className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleProcessReturn}
                                        disabled={loading || returnItems.length === 0}
                                        className="px-5 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                        {loading ? 'Processing...' : 'Process Return'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Recent Returns Sidebar */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400">history</span>
                            Recent Returns
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loadingReturns ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                                <p className="text-sm text-slate-500 mt-2">Loading...</p>
                            </div>
                        ) : recentReturns.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                <span className="material-symbols-outlined text-4xl mb-2">assignment_return</span>
                                <p>No recent returns</p>
                            </div>
                        ) : (
                            recentReturns.map((ret) => (
                                <div key={ret.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-sm font-medium text-primary">{ret.return_number || ret.id}</span>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ret.status === 'completed'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                            {ret.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{ret.customer_name || 'Walk-in Customer'}</p>
                                    <div className="flex items-center justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        <span>{ret.created_at ? new Date(ret.created_at).toLocaleDateString() : 'N/A'}</span>
                                        <span>{ret.items_count || 0} items • ₹{(ret.refund_amount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center">
                        <button className="text-sm text-primary font-medium hover:text-blue-700">View All Returns</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
