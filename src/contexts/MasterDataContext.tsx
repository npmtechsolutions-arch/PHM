/**
 * MasterDataContext - Single Source of Truth for all master data
 * 
 * This context provides a central cache for all dropdown/selection data.
 * All forms should use this instead of hardcoding values.
 * 
 * Usage:
 *   const { masters, isLoading, getMaster } = useMasterData();
 *   const categories = getMaster('categories');
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';

// ==================== TYPE DEFINITIONS ====================

export interface MasterItem {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
    sort_order?: number;
}

export interface CategoryItem {
    id: string;
    name: string;
    description?: string;
    parent_id?: string;
    is_active: boolean;
}

export interface UnitItem {
    id: string;
    name: string;
    short_name: string;
    description?: string;
    is_active: boolean;
}

export interface HSNItem {
    id: string;
    hsn_code: string;
    description: string;
    gst_rate: number;
    cgst_rate: number;
    sgst_rate: number;
    igst_rate: number;
    is_active: boolean;
}

export interface GSTSlabItem {
    id: string;
    rate: number;
    cgst_rate: number;
    sgst_rate: number;
    igst_rate: number;
    description?: string;
    is_active: boolean;
}

export interface PaymentMethodItem extends MasterItem {
    icon?: string;
}

export interface ShopTypeItem extends MasterItem {
    description?: string;
}

export interface CustomerTypeItem extends MasterItem {
    discount_percent: number;
    credit_limit: number;
}

export interface MedicineTypeItem extends MasterItem {
    description?: string;
}

export interface UrgencyItem extends MasterItem {
    color?: string;
}

export interface StatusItem extends MasterItem {
    entity_type: string;
    color?: string;
    is_terminal: boolean;
    is_default: boolean;
}

export interface DesignationItem extends MasterItem {
    level: number;
}

export interface DepartmentItem extends MasterItem {
    description?: string;
}

export interface RoleItem {
    id: string;
    name: string;
    description?: string;
    entity_type?: string;
    is_system: boolean;
    is_creatable: boolean;
}

export interface WarehouseItem {
    id: string;
    name: string;
    code: string;
    status: string;
}

export interface ShopItem {
    id: string;
    name: string;
    code: string;
    status: string;
    warehouse_id?: string;
}

export interface RackItem {
    id: string;
    rack_name: string;
    rack_number: string;
    warehouse_id?: string;
    shop_id?: string;
    is_active: boolean;
}

export interface SupplierItem {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
}

export interface AdjustmentReasonItem extends MasterItem {
    adjustment_type: 'increase' | 'decrease';
    description?: string;
}

export interface AllMasterData {
    categories: CategoryItem[];
    units: UnitItem[];
    hsn_codes: HSNItem[];
    medicine_types: MedicineTypeItem[];
    payment_methods: PaymentMethodItem[];
    shop_types: ShopTypeItem[];
    customer_types: CustomerTypeItem[];
    gst_slabs: GSTSlabItem[];
    genders: MasterItem[];
    employment_types: MasterItem[];
    urgency_levels: UrgencyItem[];
    statuses: StatusItem[];
    designations: DesignationItem[];
    departments: DepartmentItem[];
    roles: RoleItem[];
    warehouses: WarehouseItem[];
    shops: ShopItem[];
    racks: RackItem[];
    suppliers: SupplierItem[];
    adjustment_reasons: AdjustmentReasonItem[];
}

// ==================== CONTEXT DEFINITION ====================

interface MasterDataContextType {
    masters: AllMasterData | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    getMaster: <K extends keyof AllMasterData>(key: K) => AllMasterData[K];
    getStatusesByEntity: (entityType: string) => StatusItem[];
    findByCode: <K extends keyof AllMasterData>(key: K, code: string) => AllMasterData[K][number] | undefined;
    findById: <K extends keyof AllMasterData>(key: K, id: string) => AllMasterData[K][number] | undefined;
}

const MasterDataContext = createContext<MasterDataContextType | null>(null);

// ==================== PROVIDER COMPONENT ====================

interface MasterDataProviderProps {
    children: ReactNode;
}

export function MasterDataProvider({ children }: MasterDataProviderProps) {
    const [masters, setMasters] = useState<AllMasterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadMasters = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const response = await api.get('/unified-masters/all');
            setMasters(response.data);
        } catch (err: any) {
            console.error('Failed to load master data:', err);
            setError(err.response?.data?.detail || 'Failed to load master data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load masters on mount and when user logs in
    useEffect(() => {
        loadMasters();

        // Listen for login events to reload masters
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'access_token' && e.newValue) {
                loadMasters();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [loadMasters]);

    // Helper to get a specific master list with empty array fallback
    const getMaster = useCallback(<K extends keyof AllMasterData>(key: K): AllMasterData[K] => {
        if (!masters) return [] as AllMasterData[K];
        return masters[key] || ([] as AllMasterData[K]);
    }, [masters]);

    // Get statuses filtered by entity type
    const getStatusesByEntity = useCallback((entityType: string): StatusItem[] => {
        if (!masters) return [];
        return masters.statuses.filter(s => s.entity_type === entityType);
    }, [masters]);

    // Find item by code
    const findByCode = useCallback(<K extends keyof AllMasterData>(
        key: K,
        code: string
    ): AllMasterData[K][number] | undefined => {
        const items = getMaster(key) as any[];
        return items.find(item => item.code === code);
    }, [getMaster]);

    // Find item by id
    const findById = useCallback(<K extends keyof AllMasterData>(
        key: K,
        id: string
    ): AllMasterData[K][number] | undefined => {
        const items = getMaster(key) as any[];
        return items.find(item => item.id === id);
    }, [getMaster]);

    const value: MasterDataContextType = {
        masters,
        isLoading,
        error,
        refresh: loadMasters,
        getMaster,
        getStatusesByEntity,
        findByCode,
        findById,
    };

    return (
        <MasterDataContext.Provider value={value}>
            {children}
        </MasterDataContext.Provider>
    );
}

// ==================== HOOK ====================

export function useMasterData(): MasterDataContextType {
    const context = useContext(MasterDataContext);
    if (!context) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
}

export default MasterDataContext;
