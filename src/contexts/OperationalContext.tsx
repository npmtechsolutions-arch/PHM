import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useUser } from './UserContext';
import { warehousesApi, shopsApi } from '../services/api';

export type OperationalScope = 'global' | 'warehouse' | 'shop';

export interface OperationalEntity {
    id: string;
    type: 'warehouse' | 'shop';
    name: string;
}

interface OperationalContextType {
    scope: OperationalScope;
    activeEntity: OperationalEntity | null;
    switchContext: (scope: OperationalScope, entity?: OperationalEntity) => void;
    availableWarehouses: OperationalEntity[];
    availableShops: OperationalEntity[];
    loading: boolean;
}

const OperationalContext = createContext<OperationalContextType | undefined>(undefined);

export function OperationalProvider({ children }: { children: ReactNode }) {
    const { user } = useUser();
    const [scope, setScope] = useState<OperationalScope>('global');
    const [activeEntity, setActiveEntity] = useState<OperationalEntity | null>(null);
    const [availableWarehouses, setAvailableWarehouses] = useState<OperationalEntity[]>([]);
    const [availableShops, setAvailableShops] = useState<OperationalEntity[]>([]);
    const [loading, setLoading] = useState(true);

    // Initialize context based on user role
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const initContext = async () => {
            try {
                setLoading(true);

                // Fetch available entities for switching
                // Ideally backend should provide this, but for now we fetch lists
                // Super Admin sees all, others see assigned
                let warehouses: any[] = [];
                let shops: any[] = [];

                if (user.role === 'super_admin') {
                    // Fetch generic lists for dropdowns (limited to recent/search in real app, but here simple list)
                    const [wRes, sRes] = await Promise.all([
                        warehousesApi.list({ size: 500 }), // Limit to 100 for context switcher
                        shopsApi.list({ size: 500 })
                    ]);
                    warehouses = wRes.data?.items || [];
                    shops = sRes.data?.items || [];
                } else if (user.warehouse_id) {
                    // If user is bound to warehouse
                    const wRes = await warehousesApi.get(user.warehouse_id);
                    warehouses = [wRes.data];
                } else if (user.shop_id) {
                    // If user is bound to shop
                    const sRes = await shopsApi.get(user.shop_id);
                    shops = [sRes.data];
                }

                const mappedWarehouses = warehouses.map((w: any) => ({
                    id: w.id,
                    type: 'warehouse' as const,
                    name: w.name
                }));

                const mappedShops = shops.map((s: any) => ({
                    id: s.id,
                    type: 'shop' as const,
                    name: s.name
                }));

                setAvailableWarehouses(mappedWarehouses);
                setAvailableShops(mappedShops);

                // Set initial scope/entity
                if (user.role === 'super_admin') {
                    // Super Admin starts in Global scope by default
                    // Unless we persist their last choice? For now, SAFETY FIRST -> Global
                    setScope('global');
                    setActiveEntity(null);
                } else if (user.warehouse_id) {
                    setScope('warehouse');
                    setActiveEntity(mappedWarehouses.find((w: any) => w.id === user.warehouse_id) || null);
                } else if (user.shop_id) {
                    setScope('shop');
                    setActiveEntity(mappedShops.find((s: any) => s.id === user.shop_id) || null);
                } else {
                    // Fallback for weird state (e.g. role but no entity assigned yet)
                    setScope('global');
                    setActiveEntity(null);
                }

            } catch (err) {
                console.error("Failed to initialize operational context", err);
            } finally {
                setLoading(false);
            }
        };

        initContext();
    }, [user]);

    const switchContext = (newScope: OperationalScope, entity?: OperationalEntity) => {
        if (user?.role !== 'super_admin') {
            // Non-super-admins cannot switch context arbitrarily
            console.warn("Attempted context switch by non-super-admin blocked.");
            return;
        }

        setScope(newScope);
        setActiveEntity(entity || null);
    };

    return (
        <OperationalContext.Provider value={{
            scope,
            activeEntity,
            switchContext,
            availableWarehouses,
            availableShops,
            loading
        }}>
            {children}
        </OperationalContext.Provider>
    );
}

export function useOperationalContext(): OperationalContextType {
    const context = useContext(OperationalContext);
    if (context === undefined) {
        throw new Error('useOperationalContext must be used within an OperationalProvider');
    }
    return context;
}

export default OperationalContext;
