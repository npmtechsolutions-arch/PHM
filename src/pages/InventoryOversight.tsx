import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { inventoryApi } from '../services/api'; // Remove warehousesApi, shopsApi
import { useOperationalContext } from '../contexts/OperationalContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { WarehouseSelect, ShopSelect } from '../components/MasterSelect';

interface StockItem {
    id: string;
    medicine_name: string;
    brand?: string;
    batch_number: string;
    quantity: number;
    location_type: 'warehouse' | 'shop';
    location_name: string;
    expiry_date: string;
    days_to_expiry: number;
    last_movement?: string;
}

type TabType = 'warehouse' | 'shop' | 'expiry' | 'dead-stock';

export default function InventoryOversight() {
    const location = useLocation();
    const { activeEntity, scope } = useOperationalContext();
    const { isLoading: mastersLoading } = useMasterData();

    // Determine initial tab from URL
    const getTabFromPath = (): TabType => {
        const path = location.pathname;
        if (path.includes('/expiry')) return 'expiry';
        if (path.includes('/dead-stock')) return 'dead-stock';
        if (path.includes('/shop')) return 'shop';
        return 'warehouse';
    };

    const [activeTab, setActiveTab] = useState<TabType>(getTabFromPath());
    // removed local warehouses/shops state
    const [stockData, setStockData] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [selectedShop, setSelectedShop] = useState('');

    // Update tab when URL changes
    useEffect(() => {
        setActiveTab(getTabFromPath());
    }, [location.pathname]);

    useEffect(() => {
        // Init filters from context if available
        if (activeEntity?.type === 'warehouse') {
            setSelectedWarehouse(activeEntity.id);
        } else if (activeEntity?.type === 'shop') {
            setSelectedShop(activeEntity.id);
        }
    }, [activeEntity]);

    useEffect(() => {
        loadStockData();
    }, [activeTab, selectedWarehouse, selectedShop, activeEntity]); // added activeEntity dependency

    const loadStockData = async () => {
        setLoading(true);
        try {
            // Entity-specific alerts
            const params: { warehouse_id?: string; shop_id?: string } = {};
            if (activeEntity?.type === 'warehouse') params.warehouse_id = activeEntity.id;
            if (activeEntity?.type === 'shop') params.shop_id = activeEntity.id;
            
            const alerts = await inventoryApi.getAlerts(params);
            const alertData = alerts.data?.alerts || [];

            // Transform alerts to stock items for display
            const items: StockItem[] = alertData.map((alert: any) => ({
                id: alert.id || Math.random().toString(),
                medicine_name: alert.medicine_name,
                brand: alert.brand,
                batch_number: alert.batch_number || 'N/A',
                quantity: alert.current_quantity || 0,
                location_type: alert.location_type || 'warehouse',
                location_name: alert.location_name || 'Unknown',
                expiry_date: alert.expiry_date || '',
                days_to_expiry: alert.days_to_expiry || 0,
                last_movement: alert.last_movement_date
            }));

            setStockData(items);
        } catch (err) {
            console.error('Failed to load stock data:', err);
            setStockData([]);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'warehouse' as TabType, label: 'Warehouse Stock', icon: 'warehouse', description: activeEntity?.type === 'warehouse' ? `${activeEntity.name} inventory` : 'All warehouse inventory' },
        { id: 'shop' as TabType, label: 'Shop Stock (Derived)', icon: 'storefront', description: activeEntity?.type === 'shop' ? `${activeEntity.name} stock` : 'Stock derived from dispatches' },
        { id: 'expiry' as TabType, label: 'Expiry Monitoring', icon: 'schedule', description: activeEntity ? `Items expiring soon in ${activeEntity.name}` : 'Items expiring soon' },
        { id: 'dead-stock' as TabType, label: 'Dead Stock', icon: 'block', description: activeEntity ? `No movement in 90+ days at ${activeEntity.name}` : 'No movement in 90+ days' },
    ];

    // Stats based on current data
    const stats = {
        totalItems: stockData.length,
        totalQuantity: stockData.reduce((sum, item) => sum + item.quantity, 0),
        expiringSoon: stockData.filter(item => item.days_to_expiry > 0 && item.days_to_expiry <= 30).length,
        expired: stockData.filter(item => item.days_to_expiry <= 0).length,
    };

    if (mastersLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="spinner"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Master Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                        READ-ONLY
                    </span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Inventory Oversight
                    {activeEntity && (
                        <span className="text-lg font-normal text-slate-500 dark:text-slate-400 ml-2">
                            - {activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'}: {activeEntity.name}
                        </span>
                    )}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {activeEntity 
                        ? `${activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'} inventory view for ${activeEntity.name}. This is a read-only oversight view.`
                        : 'Global view of all inventory across warehouses and shops. This is a read-only view for Super Admin oversight.'
                    }
                </p>
                {activeEntity && (
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">
                                {activeEntity.type === 'shop' ? 'storefront' : 'warehouse'}
                            </span>
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'}: {activeEntity.name}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalItems}</p>
                            <p className="text-xs text-slate-500">Total Items</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">package_2</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalQuantity.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Total Quantity</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-600">schedule</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p>
                            <p className="text-xs text-slate-500">Expiring Soon</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-600">error</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                            <p className="text-xs text-slate-500">Expired</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <div className="flex overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Description */}
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {tabs.find(t => t.id === activeTab)?.description}
                    </p>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap gap-4 items-center">
                        {(activeTab === 'warehouse' || activeTab === 'expiry' || activeTab === 'dead-stock') && (
                            <WarehouseSelect
                                value={selectedWarehouse}
                                onChange={setSelectedWarehouse}
                                placeholder="All Warehouses"
                                className="w-[200px]"
                                disabled={scope !== 'global' && activeEntity?.type === 'warehouse'}
                            />
                        )}
                        {activeTab === 'shop' && (
                            <ShopSelect
                                value={selectedShop}
                                onChange={setSelectedShop}
                                placeholder="All Shops"
                                className="w-[200px]"
                                disabled={scope !== 'global' && activeEntity?.type === 'shop'}
                            />
                        )}
                        <button
                            onClick={loadStockData}
                            className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">refresh</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        </div>
                    ) : stockData.length === 0 ? (
                        <div className="py-16 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">
                                {tabs.find(t => t.id === activeTab)?.icon}
                            </span>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No data available</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                {activeTab === 'dead-stock'
                                    ? 'No dead stock items found. All items have recent movement.'
                                    : 'No inventory data matches your filters.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Medicine</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Brand</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Batch</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Location</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Quantity</th>
                                        {(activeTab === 'expiry' || activeTab === 'dead-stock') && (
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                                                {activeTab === 'expiry' ? 'Expiry' : 'Last Movement'}
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {stockData.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeIn"
                                            style={{ animationDelay: `${index * 20}ms` }}
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-slate-900 dark:text-white">{item.medicine_name}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-slate-700 dark:text-slate-300">{item.brand || '-'}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                    {item.batch_number}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                                                        {item.location_type === 'warehouse' ? 'warehouse' : 'storefront'}
                                                    </span>
                                                    <span className="text-slate-600 dark:text-slate-400">{item.location_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                                                {item.quantity.toLocaleString()}
                                            </td>
                                            {activeTab === 'expiry' && (
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.days_to_expiry <= 0
                                                        ? 'bg-red-100 text-red-700'
                                                        : item.days_to_expiry <= 30
                                                            ? 'bg-orange-100 text-orange-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {item.days_to_expiry <= 0 ? 'Expired' : `${item.days_to_expiry} days`}
                                                    </span>
                                                </td>
                                            )}
                                            {activeTab === 'dead-stock' && (
                                                <td className="px-4 py-3 text-center text-sm text-slate-500">
                                                    {item.last_movement ? new Date(item.last_movement).toLocaleDateString() : 'Never'}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Read-Only Notice */}
                <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/10 border-t border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        <p className="text-sm">
                            This is a read-only oversight view. To make inventory adjustments, use the operational modules.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
