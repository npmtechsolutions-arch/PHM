import { useState, useEffect } from 'react';
import { invoicesApi } from '../services/api';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { type Column } from '../components/Table';
import Button from '../components/Button';

interface Invoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    shop_name: string;
    total_amount: number;
    payment_status: string;
    payment_method: string;
    created_at: string;
}

export default function InvoicesList() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        fetchInvoices();
    }, [currentPage, pageSize, search, statusFilter]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                size: pageSize,
                // status: statusFilter || undefined
            };
            if (search) params.search = search;

            // Handle status filtering mapping
            if (statusFilter === 'cancelled') {
                params.status = 'cancelled';
            } else if (statusFilter === 'completed' || statusFilter === 'pending') {
                params.payment_status = statusFilter;
            }

            const res = await invoicesApi.list(params);
            setInvoices(res.data?.items || res.data?.data || []);
            setTotalItems(res.data?.total || 0);
        } catch (e) {
            console.error(e);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

    const stats = {
        total: totalItems,
        paid: invoices.filter(i => i.payment_status === 'completed').length,
        pending: invoices.filter(i => i.payment_status === 'pending').length,
        cancelled: invoices.filter(i => i.payment_status === 'cancelled').length,
    };

    const columns: Column<Invoice>[] = [
        {
            header: 'Invoice #',
            key: 'invoice_number',
            render: (inv) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined">receipt_long</span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white font-mono">{inv.invoice_number}</div>
                        <div className="text-xs text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Customer',
            key: 'customer_name',
            render: (inv) => (
                <div className="font-medium text-slate-700 dark:text-slate-300">
                    {inv.customer_name || 'Walk-in Customer'}
                </div>
            )
        },
        {
            header: 'Shop',
            key: 'shop_name',
            render: (inv) => inv.shop_name || 'N/A',
            className: 'hidden md:table-cell'
        },
        {
            header: 'Amount',
            key: 'total_amount',
            align: 'right',
            render: (inv) => (
                <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(inv.total_amount)}
                </span>
            )
        },
        {
            header: 'Status',
            key: 'payment_status',
            align: 'center',
            render: (inv) => {
                const variant = inv.payment_status === 'completed' ? 'success' : inv.payment_status === 'cancelled' ? 'error' : 'warning';
                return <Badge variant={variant} className="capitalize">{inv.payment_status === 'completed' ? 'paid' : inv.payment_status}</Badge>;
            }
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: () => (
                <Button variant="ghost" className="!p-1.5 h-8 w-8 text-slate-500" title="View Invoice">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                </Button>
            )
        }
    ];

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Invoices"
                subtitle="View and manage sales invoices"
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title="Total Invoices"
                    value={totalItems}
                    icon="receipt"
                    onClick={() => setStatusFilter('')}
                    isActive={statusFilter === ''}
                />
                <StatCard
                    title="Paid"
                    value={stats.paid}
                    icon="check_circle"
                    onClick={() => setStatusFilter('completed')}
                    isActive={statusFilter === 'completed'}
                    trend="up"
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
                    title="Cancelled"
                    value={stats.cancelled}
                    icon="cancel"
                    onClick={() => setStatusFilter('cancelled')}
                    isActive={statusFilter === 'cancelled'}
                    trend="down"
                />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={invoices}
                loading={loading}
                emptyMessage="No invoices found."
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
                        title="Invoice List"
                        count={totalItems}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search invoices..."
                        }}
                        actions={
                            <div className="flex items-center">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">All Status</option>
                                    <option value="completed">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        }
                        embedded={true}
                    />
                }
            />
        </UniversalListPage>
    );
}
