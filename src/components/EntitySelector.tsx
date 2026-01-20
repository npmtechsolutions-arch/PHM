import { useState, useEffect } from 'react';
import { warehousesApi, shopsApi } from '../services/api';
import { useEntityContext } from '../hooks/useEntityContext';

interface Warehouse {
    id: string;
    name: string;
    code: string;
}

interface Shop {
    id: string;
    name: string;
    code: string;
}

interface EntitySelectorProps {
    type: 'warehouse' | 'shop' | 'both';
    onWarehouseChange?: (id: string | null) => void;
    onShopChange?: (id: string | null) => void;
    required?: boolean;
    className?: string;
}

/**
 * Entity Selector Component
 * 
 * ONLY visible to Super Admin - allows explicit entity selection
 * Hidden for other roles (they have auto-applied context)
 */
export default function EntitySelector({
    type,
    onWarehouseChange,
    onShopChange,
    required = false,
    className = ''
}: EntitySelectorProps) {
    const context = useEntityContext();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);

    // Only Super Admin sees this component
    if (!context.isSuperAdmin) {
        return null;
    }

    useEffect(() => {
        loadEntities();
    }, [type]);

    const loadEntities = async () => {
        setLoading(true);
        try {
            if (type === 'warehouse' || type === 'both') {
                const res = await warehousesApi.list({ size: 500 });
                setWarehouses(res.data?.items || res.data || []);
            }
            if (type === 'shop' || type === 'both') {
                const res = await shopsApi.list({ size: 500 });
                setShops(res.data?.items || res.data || []);
            }
        } catch (error) {
            console.error('Failed to load entities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWarehouseChange = (id: string) => {
        context.setActiveWarehouse(id || null);
        onWarehouseChange?.(id || null);
    };

    const handleShopChange = (id: string) => {
        context.setActiveShop(id || null);
        onShopChange?.(id || null);
    };

    return (
        <div className={`entity-selector bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-amber-600 text-lg">admin_panel_settings</span>
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Super Admin: Select Entity Context
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(type === 'warehouse' || type === 'both') && (
                    <div>
                        <label className="block text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                            Warehouse {required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            value={context.activeWarehouseId || ''}
                            onChange={(e) => handleWarehouseChange(e.target.value)}
                            disabled={loading}
                            className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                            required={required}
                        >
                            <option value="">-- Select Warehouse --</option>
                            {warehouses.map(wh => (
                                <option key={wh.id} value={wh.id}>
                                    {wh.name} ({wh.code})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {(type === 'shop' || type === 'both') && (
                    <div>
                        <label className="block text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                            Medical Shop {required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            value={context.activeShopId || ''}
                            onChange={(e) => handleShopChange(e.target.value)}
                            disabled={loading}
                            className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                            required={required}
                        >
                            <option value="">-- Select Shop --</option>
                            {shops.map(shop => (
                                <option key={shop.id} value={shop.id}>
                                    {shop.name} ({shop.code})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                As Super Admin, you must select the entity context for this operation.
            </p>
        </div>
    );
}
