import { useState, useEffect } from 'react';
import { inventoryApi, warehousesApi } from '../services/api';

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

interface Warehouse {
    id: string;
    name: string;
}

export default function InventoryPage() {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [warehouseId, setWarehouseId] = useState('');
    const [movementType, setMovementType] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        fetchMovements();
    }, [currentPage, warehouseId, movementType]);

    const fetchWarehouses = async () => {
        try {
            const response = await warehousesApi.list({ size: 100 });
            setWarehouses(response.data.items || []);
        } catch (err) {
            console.error('Failed to fetch warehouses:', err);
        }
    };

    const fetchMovements = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };
            if (warehouseId) params.warehouse_id = warehouseId;
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
            case 'in': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
            case 'out': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            case 'transfer': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
            case 'adjustment': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400';
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

    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Inventory Movements</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Track stock changes across all locations
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    <select
                        value={warehouseId}
                        onChange={(e) => { setWarehouseId(e.target.value); setCurrentPage(1); }}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-w-[200px]"
                    >
                        <option value="">All Locations</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>

                    <select
                        value={movementType}
                        onChange={(e) => { setMovementType(e.target.value); setCurrentPage(1); }}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-w-[150px]"
                    >
                        <option value="">All Types</option>
                        <option value="in">Stock In</option>
                        <option value="out">Stock Out</option>
                        <option value="transfer">Transfer</option>
                        <option value="adjustment">Adjustment</option>
                    </select>

                    <button
                        onClick={fetchMovements}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ml-auto"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : movements.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">history_toggle_off</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No movements found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Adjust filters to see stock history</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Product</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Type</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Quantity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Location</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {movements.map((move, index) => (
                                    <tr key={move.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeIn" style={{ animationDelay: `${index * 20}ms` }}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-mono text-slate-500">{move.reference_type.toUpperCase()}</span>
                                                <span className="text-xs text-slate-400">By: {move.performed_by || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{move.medicine_name}</p>
                                                <p className="text-xs text-slate-500">Batch: {move.batch_number}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getMovementColor(move.movement_type)}`}>
                                                <span className="material-symbols-outlined text-[14px]">{getMovementIcon(move.movement_type)}</span>
                                                <span className="capitalize">{move.movement_type}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-medium ${move.movement_type === 'out' ? 'text-red-600' : 'text-green-600'}`}>
                                                {move.movement_type === 'out' ? '-' : '+'}{Math.abs(move.quantity)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {move.warehouse_name || move.shop_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-slate-500 dark:text-slate-400">
                                            {new Date(move.created_at).toLocaleDateString()}
                                            <div className="text-xs">{new Date(move.created_at).toLocaleTimeString()}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
