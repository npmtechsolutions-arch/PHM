import { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';
import { useOperationalContext } from '../contexts/OperationalContext';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import { type Column } from '../components/Table';
import Badge from '../components/Badge';

interface StockMovement {
    id: string;
    medicine_name: string;
    batch_number: string;
    warehouse_name?: string;
    shop_name?: string;
    quantity: number;
    movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
    reference_type: string;
    created_at: string;
    performed_by: string;
}

export default function InventoryPage() {
    // Operational Context for Super Admin flow
    const { activeEntity, scope } = useOperationalContext();

    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    // Local filter for Super Admin in global scope
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [movementType, setMovementType] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        fetchMovements();
    }, [currentPage, selectedWarehouseId, movementType, activeEntity]);

    const fetchMovements = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };

            // Enforce Context
            if (activeEntity?.type === 'warehouse') {
                params.warehouse_id = activeEntity.id;
            } else if (activeEntity?.type === 'shop') {
                params.shop_id = activeEntity.id;
            } else if (scope === 'global' && selectedWarehouseId) {
                // If global, allow filtering by selected warehouse
                params.warehouse_id = selectedWarehouseId;
            }

            if (movementType) params.movement_type = movementType;

            const response = await inventoryApi.getMovements(params);

            // Extract movements array safely
            let movementsData = [];
            if (response.data) {
                if (Array.isArray(response.data)) {
                    movementsData = response.data;
                } else if (response.data.items && Array.isArray(response.data.items)) {
                    movementsData = response.data.items;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    movementsData = response.data.data;
                }
            }

            setMovements(movementsData);
            setTotalItems(response.data?.total || movementsData.length);
        } catch (err) {
            console.error('Failed to fetch movements:', err);
            setMovements([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    const getMovementColor = (type: string) => {
        switch (type) {
            case 'in': return 'success';
            case 'out': return 'error';
            case 'transfer': return 'info';
            case 'adjustment': return 'warning';
            default: return 'secondary';
        }
    };

    const getMovementIcon = (type: string) => {
        switch (type) {
            case 'in': return 'login';
            case 'out': return 'logout';
            case 'transfer': return 'swap_horiz';
            case 'adjustment': return 'tune';
            default: return 'history';
        }
    };

    // Calculate stats
    const stats = {
        total: totalItems,
        stockIn: movements.filter(m => m.movement_type === 'in').length,
        stockOut: movements.filter(m => m.movement_type === 'out').length,
        transfers: movements.filter(m => m.movement_type === 'transfer').length
    };

    const columns: Column<StockMovement>[] = [
        {
            header: 'Details',
            key: 'id',
            render: (move) => (
                <div className="flex flex-col">
                    <span className="text-[11px] font-mono text-slate-500">{move.reference_type.toUpperCase()}</span>
                    <span className="text-[11px] text-slate-400">By: {move.performed_by || 'System'}</span>
                </div>
            )
        },
        {
            header: 'Product',
            key: 'medicine_name',
            render: (move) => (
                <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{move.medicine_name}</p>
                    <p className="text-[11px] text-slate-500">Batch: {move.batch_number}</p>
                </div>
            )
        },
        {
            header: 'Type',
            key: 'movement_type',
            render: (move) => (
                <Badge variant={getMovementColor(move.movement_type) as any} className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">{getMovementIcon(move.movement_type)}</span>
                    <span className="capitalize">{move.movement_type}</span>
                </Badge>
            )
        },
        {
            header: 'Qty',
            key: 'quantity',
            align: 'right',
            render: (move) => (
                <span className={`font-mono text-sm font-medium ${move.movement_type === 'out' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {move.movement_type === 'out' ? '-' : '+'}{Math.abs(move.quantity)}
                </span>
            )
        },
        {
            header: 'Location',
            key: 'warehouse_name',
            render: (move) => (
                <span className="text-xs text-slate-600 dark:text-slate-400">
                    {move.warehouse_name || move.shop_name || '-'}
                </span>
            )
        },
        {
            header: 'Date',
            key: 'created_at',
            align: 'right',
            render: (move) => (
                <div className="text-right">
                    <div className="text-xs text-slate-600 dark:text-slate-400">{new Date(move.created_at).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400">{new Date(move.created_at).toLocaleTimeString()}</div>
                </div>
            )
        }
    ];

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Inventory Movements"
                subtitle={`Track stock changes ${scope === 'global' ? 'across all locations' : activeEntity?.name ? `for ${activeEntity.name}` : ''}`}
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Movements" value={stats.total} icon="history" onClick={() => setMovementType('')} isActive={movementType === ''} />
                <StatCard title="Stock In" value={stats.stockIn} icon="login" trend="neutral" />
                <StatCard title="Stock Out" value={stats.stockOut} icon="logout" trend="neutral" />
                <StatCard title="Transfers" value={stats.transfers} icon="swap_horiz" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={movements}
                loading={loading}
                emptyMessage="No stock movements found."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(totalItems / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: totalItems,
                    pageSize: pageSize
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Movement List"
                        count={totalItems}
                        actions={
                            <div className="flex items-center gap-2">
                                {/* Warehouse Selector - ONLY visible to Super Admin in GLOBAL scope */}
                                {scope === 'global' && (
                                    <select
                                        value={selectedWarehouseId}
                                        onChange={(e) => { setSelectedWarehouseId(e.target.value); setCurrentPage(1); }}
                                        className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">All Warehouses</option>
                                        <option value="WH001">Central Warehouse</option>
                                    </select>
                                )}

                                <select
                                    value={movementType}
                                    onChange={(e) => { setMovementType(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Types</option>
                                    <option value="in">Stock In</option>
                                    <option value="out">Stock Out</option>
                                    <option value="transfer">Transfer</option>
                                    <option value="adjustment">Adjustment</option>
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
