import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dispatchesApi } from '../services/api';
import { useOperationalContext } from '../contexts/OperationalContext';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
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
    const [dispatches, setDispatches] = useState<Dispatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Action state
    const [updatingId, setUpdatingId] = useState<string | null>(null);

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

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            setUpdatingId(id);
            await dispatchesApi.updateStatus(id, newStatus);
            fetchDispatches();
        } catch (e) {
            console.error(e);
            alert('Failed to update status');
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
                    {d.status === 'pending' && (
                        <Button
                            variant="primary"
                            onClick={() => handleUpdateStatus(d.id, 'in_transit')}
                            disabled={updatingId === d.id}
                            className="!py-1 !px-2 !text-xs"
                        >
                            Start
                        </Button>
                    )}
                    {/* Allow Shop to Receive Stock at any stage if needed, or strictly after transit. 
                        User requested visibility, but ONLY for shops. Warehouse Admin should NOT see this. */}
                    {activeEntity?.type === 'shop' && ['pending', 'created', 'in_transit'].includes(d.status?.toLowerCase()) && (
                        <Button
                            variant="success"
                            onClick={() => navigate('/shops/stock', {
                                state: {
                                    dispatchId: d.id,
                                }
                            })}
                            className="!py-1 !px-2 !text-xs"
                        >
                            Receive Stock
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

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Dispatch History"
                subtitle="Track warehouse to shop deliveries and shipments"
                actions={
                    <Button variant="primary" onClick={() => navigate('/dispatches/create')}>
                        <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                        New Dispatch
                    </Button>
                }
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title="Total Dispatches"
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
                emptyMessage="No dispatches found."
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
                        title="Dispatch List"
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
        </UniversalListPage>
    );
}
