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

export interface BrandItem extends MasterItem {
    description?: string;
}

export interface ManufacturerItem {
    id: string;
    code: string;
    name: string;
    address?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    website?: string;
    is_active: boolean;
    sort_order?: number;
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
    brands: BrandItem[];
    manufacturers: ManufacturerItem[];
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

            // Check if response has data, otherwise use fallback
            if (response.data && response.data.categories && response.data.categories.length > 0) {
                setMasters(response.data);
            } else {
                console.warn('Master data API returned empty, using fallback.');
                setMasters(getFallbackData());
            }
        } catch (err: any) {
            console.error('Failed to load master data, using fallback:', err);
            // On error, use fallback data so the app remains usable
            setMasters(getFallbackData());
            // Only set error if we want to show a warning, but still let app function
            // setError(err.response?.data?.detail || 'Failed to load master data - Using Offline Defaults');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fallback data function
    const getFallbackData = (): AllMasterData => ({
        categories: [
            { id: 'cat-1', name: 'Antibiotics', is_active: true },
            { id: 'cat-2', name: 'Painkillers', is_active: true },
            { id: 'cat-3', name: 'Supplements', is_active: true },
            { id: 'cat-4', name: 'General', is_active: true }
        ],
        units: [
            { id: 'unit-1', name: 'Strip', short_name: 'stp', is_active: true },
            { id: 'unit-2', name: 'Bottle', short_name: 'btl', is_active: true },
            { id: 'unit-3', name: 'Box', short_name: 'box', is_active: true },
            { id: 'unit-4', name: 'Vial', short_name: 'vl', is_active: true }
        ],
        hsn_codes: [
            { id: 'hsn-1', hsn_code: '3004', description: 'Medicaments', gst_rate: 12, cgst_rate: 6, sgst_rate: 6, igst_rate: 12, is_active: true },
            { id: 'hsn-2', hsn_code: '3003', description: 'Medicaments', gst_rate: 5, cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 5, is_active: true }
        ],
        medicine_types: [
            { id: 'type-1', code: 'tablet', name: 'Tablet', is_active: true, sort_order: 1 },
            { id: 'type-2', code: 'capsule', name: 'Capsule', is_active: true, sort_order: 2 },
            { id: 'type-3', code: 'syrup', name: 'Syrup', is_active: true, sort_order: 3 },
            { id: 'type-4', code: 'injection', name: 'Injection', is_active: true, sort_order: 4 }
        ],
        gst_slabs: [
            { id: 'gst-0', rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, is_active: true },
            { id: 'gst-5', rate: 5, cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 5, is_active: true },
            { id: 'gst-12', rate: 12, cgst_rate: 6, sgst_rate: 6, igst_rate: 12, is_active: true },
            { id: 'gst-18', rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 18, is_active: true },
            { id: 'gst-28', rate: 28, cgst_rate: 14, sgst_rate: 14, igst_rate: 28, is_active: true }
        ],
        brands: [
            { id: 'br-1', code: 'GSK', name: 'GSK', is_active: true },
            { id: 'br-2', code: 'CIPLA', name: 'Cipla', is_active: true },
            { id: 'br-3', code: 'SUN', name: 'Sun Pharma', is_active: true }
        ],
        manufacturers: [
            { id: 'mfr-1', code: 'GSK', name: 'GlaxoSmithKline', is_active: true },
            { id: 'mfr-2', code: 'CIPLA', name: 'Cipla Ltd', is_active: true },
            { id: 'mfr-3', code: 'SUN', name: 'Sun Pharmaceutical Industries', is_active: true }
        ],
        genders: [
            { id: 'gen-1', code: 'male', name: 'Male', is_active: true },
            { id: 'gen-2', code: 'female', name: 'Female', is_active: true },
            { id: 'gen-3', code: 'other', name: 'Other', is_active: true }
        ],
        employment_types: [
            { id: 'emp-1', code: 'full_time', name: 'Full Time', is_active: true },
            { id: 'emp-2', code: 'part_time', name: 'Part Time', is_active: true },
            { id: 'emp-3', code: 'contract', name: 'Contract', is_active: true },
            { id: 'emp-4', code: 'intern', name: 'Intern', is_active: true }
        ],
        departments: [
            { id: 'dept-1', code: 'pharmacy', name: 'Pharmacy', is_active: true },
            { id: 'dept-2', code: 'warehouse', name: 'Warehouse', is_active: true },
            { id: 'dept-3', code: 'admin', name: 'Administration', is_active: true },
            { id: 'dept-4', code: 'hr', name: 'Human Resources', is_active: true },
            { id: 'dept-5', code: 'accounts', name: 'Accounts', is_active: true }
        ],
        designations: [
            { id: 'des-1', code: 'pharmacist', name: 'Pharmacist', is_active: true, level: 3 },
            { id: 'des-2', code: 'cashier', name: 'Cashier', is_active: true, level: 2 },
            { id: 'des-3', code: 'manager', name: 'Manager', is_active: true, level: 4 },
            { id: 'des-4', code: 'assistant', name: 'Assistant', is_active: true, level: 1 },
            { id: 'des-5', code: 'supervisor', name: 'Supervisor', is_active: true, level: 3 }
        ],
        urgency_levels: [
            { id: 'urg-1', code: 'low', name: 'Low', is_active: true, color: 'green' },
            { id: 'urg-2', code: 'medium', name: 'Medium', is_active: true, color: 'yellow' },
            { id: 'urg-3', code: 'high', name: 'High', is_active: true, color: 'orange' },
            { id: 'urg-4', code: 'critical', name: 'Critical', is_active: true, color: 'red' }
        ],
        payment_methods: [
            { id: 'pm-1', code: 'cash', name: 'Cash', is_active: true, icon: '💵' },
            { id: 'pm-2', code: 'card', name: 'Card', is_active: true, icon: '💳' },
            { id: 'pm-3', code: 'upi', name: 'UPI', is_active: true, icon: '📱' },
            { id: 'pm-4', code: 'credit', name: 'Credit', is_active: true, icon: '📋' }
        ],
        shop_types: [
            { id: 'st-1', code: 'retail', name: 'Retail Pharmacy', is_active: true },
            { id: 'st-2', code: 'hospital', name: 'Hospital Pharmacy', is_active: true }
        ],
        customer_types: [
            { id: 'ct-1', code: 'regular', name: 'Regular', is_active: true, discount_percent: 0, credit_limit: 0 },
            { id: 'ct-2', code: 'vip', name: 'VIP', is_active: true, discount_percent: 10, credit_limit: 50000 }
        ],
        suppliers: [],
        statuses: [],
        roles: [],
        warehouses: [],
        shops: [],
        racks: [],
        adjustment_reasons: []
    });

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
