import { useState, useEffect } from 'react';
import { warehousesApi, shopsApi } from '../services/api';

interface Warehouse {
    id: string;
    name: string;
    code: string;
    city: string;
    status: string;
    shop_count: number;
}

interface Shop {
    id: string;
    name: string;
    code: string;
    warehouse_id: string | null;
    city: string;
    status: string;
}

export default function WarehouseShopMapping() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [unassignedShops, setUnassignedShops] = useState<Shop[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [assignedShops, setAssignedShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedWarehouse) {
            const assigned = shops.filter(s => s.warehouse_id === selectedWarehouse.id);
            setAssignedShops(assigned);
        } else {
            setAssignedShops([]);
        }
    }, [selectedWarehouse, shops]);

    useEffect(() => {
        setUnassignedShops(shops.filter(s => !s.warehouse_id));
    }, [shops]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [warehouseRes, shopRes] = await Promise.all([
                warehousesApi.list({ size: 100 }),
                shopsApi.list({ size: 100 })
            ]);
            setWarehouses(warehouseRes.data.items || []);
            setShops(shopRes.data.items || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignShop = async (shopId: string) => {
        if (!selectedWarehouse) return;

        setAssigning(true);
        try {
            await shopsApi.update(shopId, { warehouse_id: selectedWarehouse.id });
            await loadData();
        } catch (error) {
            console.error('Failed to assign shop:', error);
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassignShop = async (shopId: string) => {
        setAssigning(true);
        try {
            await shopsApi.update(shopId, { warehouse_id: null });
            await loadData();
        } catch (error) {
            console.error('Failed to unassign shop:', error);
        } finally {
            setAssigning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Warehouse ↔ Shop Mapping
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Assign medical shops to warehouses. Each shop can only belong to one warehouse.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">warehouse</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{warehouses.length}</p>
                            <p className="text-xs text-slate-500">Total Warehouses</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">storefront</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {shops.filter(s => s.warehouse_id).length}
                            </p>
                            <p className="text-xs text-slate-500">Assigned Shops</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600">warning</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{unassignedShops.length}</p>
                            <p className="text-xs text-slate-500">Unassigned Shops</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Warehouse List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">warehouse</span>
                            Select Warehouse
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Click a warehouse to manage its shops</p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-auto">
                        {warehouses.map(warehouse => (
                            <button
                                key={warehouse.id}
                                onClick={() => setSelectedWarehouse(warehouse)}
                                className={`w-full p-4 text-left transition-colors ${selectedWarehouse?.id === warehouse.id
                                        ? 'bg-primary/10 border-l-4 border-primary'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{warehouse.name}</p>
                                        <p className="text-sm text-slate-500">{warehouse.code} • {warehouse.city}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 rounded-full">
                                            {warehouse.shop_count} shops
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Assigned Shops */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600">storefront</span>
                            {selectedWarehouse ? `Shops in ${selectedWarehouse.name}` : 'Select a Warehouse'}
                        </h2>
                    </div>

                    {selectedWarehouse ? (
                        <>
                            {/* Assigned Shops */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                                    Assigned Shops ({assignedShops.length})
                                </p>
                                {assignedShops.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">No shops assigned yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {assignedShops.map(shop => (
                                            <div
                                                key={shop.id}
                                                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{shop.name}</p>
                                                    <p className="text-xs text-slate-500">{shop.code} • {shop.city}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleUnassignShop(shop.id)}
                                                    disabled={assigning}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Unassign shop"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">link_off</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Unassigned Shops - Available to Assign */}
                            <div className="p-4">
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                                    Available to Assign ({unassignedShops.length})
                                </p>
                                {unassignedShops.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">All shops are assigned</p>
                                ) : (
                                    <div className="space-y-2 max-h-[200px] overflow-auto">
                                        {unassignedShops.map(shop => (
                                            <div
                                                key={shop.id}
                                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{shop.name}</p>
                                                    <p className="text-xs text-slate-500">{shop.code} • {shop.city}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAssignShop(shop.id)}
                                                    disabled={assigning}
                                                    className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">link</span>
                                                    Assign
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">arrow_back</span>
                            <p className="text-slate-500">Select a warehouse from the left to manage its shops</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
