import { useState, useEffect } from 'react';
import { warehousesApi, shopsApi } from '../services/api';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';

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
                warehousesApi.list({ size: 500 }),
                shopsApi.list({ size: 500 })
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
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <PageLayout
            title="Warehouse ↔ Shop Mapping"
            description="Assign medical shops to warehouses"
        >
            <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card padding="16px" className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined">warehouse</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{warehouses.length}</p>
                            <p className="text-xs text-slate-500 mt-1">Total Warehouses</p>
                        </div>
                    </Card>
                    <Card padding="16px" className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined">storefront</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                                {shops.filter(s => s.warehouse_id).length}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Assigned Shops</p>
                        </div>
                    </Card>
                    <Card padding="16px" className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{unassignedShops.length}</p>
                            <p className="text-xs text-slate-500 mt-1">Unassigned Shops</p>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Warehouse List */}
                    <Card title="Select Warehouse" icon="warehouse" padding="0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-auto">
                            {warehouses.map(warehouse => (
                                <button
                                    key={warehouse.id}
                                    onClick={() => setSelectedWarehouse(warehouse)}
                                    className={`w-full p-4 text-left transition-colors ${selectedWarehouse?.id === warehouse.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">{warehouse.name}</p>
                                            <p className="text-sm text-slate-500">{warehouse.code} • {warehouse.city}</p>
                                        </div>
                                        <Badge variant="info">{warehouse.shop_count || 0} shops</Badge>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Right: Assigned Shops */}
                    <Card
                        title={selectedWarehouse ? `Shops in ${selectedWarehouse.name}` : 'Select a Warehouse'}
                        icon="storefront"
                        padding="0"
                    >
                        {selectedWarehouse ? (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {/* Assigned Shops */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                        Assigned Shops ({assignedShops.length})
                                    </p>
                                    {assignedShops.length === 0 ? (
                                        <div className="text-center py-4 text-slate-400 text-sm">No shops assigned yet</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignedShops.map(shop => (
                                                <div
                                                    key={shop.id}
                                                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                                                >
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">{shop.name}</p>
                                                        <p className="text-xs text-slate-500">{shop.code} • {shop.city}</p>
                                                    </div>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleUnassignShop(shop.id)}
                                                        disabled={assigning}
                                                        className="!p-1.5 !h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        title="Unassign Shop"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>link_off</span>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Unassigned Shops */}
                                <div className="p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                        Available to Assign ({unassignedShops.length})
                                    </p>
                                    {unassignedShops.length === 0 ? (
                                        <div className="text-center py-4 text-slate-400 text-sm">All shops are assigned</div>
                                    ) : (
                                        <div className="space-y-2 max-h-[300px] overflow-auto pr-2">
                                            {unassignedShops.map(shop => (
                                                <div
                                                    key={shop.id}
                                                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700"
                                                >
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">{shop.name}</p>
                                                        <p className="text-xs text-slate-500">{shop.code} • {shop.city}</p>
                                                    </div>
                                                    <Button
                                                        variant="primary"
                                                        onClick={() => handleAssignShop(shop.id)}
                                                        disabled={assigning}
                                                        className="!px-3 !py-1 !text-xs gap-1"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>
                                                        Assign
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">arrow_back</span>
                                <p>Select a warehouse to manage shops</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </PageLayout>
    );
}
