import { useState, useEffect } from 'react';
import { inventoryApi, warehousesApi, shopsApi } from '../../services/api';
import { useOperationalContext } from '../../contexts/OperationalContext';
import UniversalListPage from '../../components/UniversalListPage';
import StatCard from '../../components/StatCard';
import { type Column } from '../../components/Table';
import Badge from '../../components/Badge';

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

interface StockItem {
    id: string;
    medicine_id: string;
    medicine_name: string;
    medicine_code: string;
    brand: string;
    batch_id: string;
    batch_number: string;
    expiry_date: string | null;
    quantity: number;
    rack_name: string | null;
    rack_number: string | null;
    updated_at: string;
}

export default function InventoryPage() {
    // Operational Context for Super Admin flow
    const { activeEntity, scope } = useOperationalContext();

    // View Mode: 'stock' (Current Levels) or 'movements' (History)
    const [viewMode, setViewMode] = useState<'stock' | 'movements'>('stock');

    // Data States
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [movementType, setMovementType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => {
        if (viewMode === 'stock') {
            fetchStock();
        } else {
            fetchMovements();
        }
    }, [viewMode, currentPage, pageSize, selectedWarehouseId, movementType, searchQuery, activeEntity]);

    const fetchStock = async () => {
        setLoading(true);
        try {
            // CRITICAL: Determine source based on entity type
            // Warehouse inventory and Shop inventory are SEPARATE
            // - Warehouse stock: stored in WarehouseStock table
            // - Shop stock: stored in ShopStock table
            // We must use the correct API based on activeEntity.type
            let response;
            const params: any = { page: currentPage, size: pageSize };

            // Add search query if present
            if (searchQuery) {
                params.search = searchQuery;
            }

            if (activeEntity?.type === 'warehouse') {
                // Fetch WAREHOUSE inventory (WarehouseStock table)
                response = await warehousesApi.getStock(activeEntity.id, params);
            } else if (activeEntity?.type === 'shop') {
                // Fetch SHOP inventory (ShopStock table) - SEPARATE from warehouse
                response = await shopsApi.getStock(activeEntity.id, params);
            } else if (scope === 'global') {
                // For global view, we might need a different approach or default to oversight
                // But for now, let's assume Super Admin selects a warehouse
                if (selectedWarehouseId) {
                    response = await warehousesApi.getStock(selectedWarehouseId, params);
                } else {
                    // If no warehouse selected in global, show empty or prompt
                    setStockItems([]);
                    setTotalItems(0);
                    setLoading(false);
                    return;
                }
            }

            if (response?.data) {
                setStockItems(response.data.items || []);
                setTotalItems(response.data.total || 0);
            }
        } catch (err) {
            console.error('Failed to fetch stock:', err);
            setStockItems([]);
        } finally {
            setLoading(false);
        }
    };

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

    // Columns for Stock View
    const stockColumns: Column<StockItem>[] = [
        {
            header: 'Medicine Name',
            key: 'medicine_name',
            render: (item) => (
                <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{item.medicine_name}</p>
                    <p className="text-[11px] text-slate-500">{item.medicine_code || 'N/A'}</p>
                </div>
            )
        },
        {
            header: 'Brand',
            key: 'brand',
            className: 'hidden md:table-cell',
            render: (item) => (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.brand || '-'}
                </span>
            )
        },
        {
            header: 'Batch Info',
            key: 'batch_number',
            render: (item) => (
                <div>
                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.batch_number}</span>
                    {item.expiry_date && (
                        <p className="text-[10px] text-slate-500 mt-0.5">Exp: {new Date(item.expiry_date).toLocaleDateString()}</p>
                    )}
                </div>
            )
        },
        {
            header: 'Location',
            key: 'rack_name',
            className: 'hidden lg:table-cell',
            render: (item) => (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                    {item.rack_name || item.rack_number ? (
                        <span>{item.rack_name} {item.rack_number ? `(${item.rack_number})` : ''}</span>
                    ) : (
                        <span className="italic text-slate-400">No Rack</span>
                    )}
                </div>
            )
        },
        {
            header: 'Quantity',
            key: 'quantity',
            align: 'right',
            render: (item) => (
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                    {item.quantity.toLocaleString()}
                </span>
            )
        }
    ];

    // Columns for Movements View
    const movementColumns: Column<StockMovement>[] = [
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
                    {/* Backend needs to provide brand for movements, currently not available in model but UI ready */}
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
                title="Inventory Management"
                subtitle={`Manage stock and view history ${scope === 'global' ? 'across all locations' : activeEntity?.name ? `for ${activeEntity.name}` : ''}`}
                actions={
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => { setViewMode('stock'); setCurrentPage(1); }}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'stock'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            Current Stock
                        </button>
                        <button
                            onClick={() => { setViewMode('movements'); setCurrentPage(1); }}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'movements'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            History
                        </button>
                    </div>
                }
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title={viewMode === 'stock' ? "Total Stock Items" : "Total Movements"}
                    value={totalItems}
                    icon={viewMode === 'stock' ? "inventory_2" : "history"}
                    onClick={() => { }}
                    isActive={true}
                />
                <StatCard title="Stock In" value={"-"} icon="login" trend="neutral" />
                <StatCard title="Stock Out" value={"-"} icon="logout" trend="neutral" />
                <StatCard title="Transfers" value={"-"} icon="swap_horiz" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={viewMode === 'stock' ? stockColumns : movementColumns as any}
                data={viewMode === 'stock' ? stockItems : movements as any}
                loading={loading}
                emptyMessage={viewMode === 'stock' ? "No stock found in this location." : "No stock movements found."}
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
                        title={viewMode === 'stock' ? "Stock List" : "Movement List"}
                        count={totalItems}
                        searchProps={viewMode === 'stock' ? {
                            value: searchQuery,
                            onChange: (val) => { setSearchQuery(val); setCurrentPage(1); },
                            placeholder: "Search medicines..."
                        } : undefined}
                        actions={
                            <div className="flex items-center gap-2">
                                {/* Warehouse Selector - ONLY visible to Super Admin in GLOBAL scope */}
                                {scope === 'global' && (
                                    <select
                                        value={selectedWarehouseId}
                                        onChange={(e) => { setSelectedWarehouseId(e.target.value); setCurrentPage(1); }}
                                        className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Warehouse</option>
                                        <option value="WH001">Central Warehouse</option>
                                    </select>
                                )}

                                {viewMode === 'movements' && (
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
                                )}
                            </div>
                        }
                        embedded={true}
                    />
                }
            />
        </UniversalListPage>
    );
}
