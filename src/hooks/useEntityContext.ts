import { useState, useCallback } from 'react';

/**
 * Entity Context Resolution Hook
 * 
 * GOLDEN RULE:
 * - Super Admin = CHOOSE entity explicitly (shows selector)
 * - Other Roles = entity is CHOSEN for them (auto-applied, no selector)
 */

interface EntityContext {
    // Role info
    role: string | null;
    isSuperAdmin: boolean;
    isWarehouseAdmin: boolean;
    isShopRole: boolean;

    // Assigned entities (from user profile)
    assignedWarehouseId: string | null;
    assignedShopId: string | null;

    // Active context (selected or auto-applied)
    activeWarehouseId: string | null;
    activeShopId: string | null;

    // UI control
    showWarehouseSelector: boolean;
    showShopSelector: boolean;

    // Actions
    setActiveWarehouse: (id: string | null) => void;
    setActiveShop: (id: string | null) => void;

    // Validation
    isContextValid: boolean;
    contextError: string | null;
}

export function useEntityContext(): EntityContext {
    // Get user info from localStorage
    const role = localStorage.getItem('user_role');
    const assignedWarehouseId = localStorage.getItem('assigned_warehouse_id');
    const assignedShopId = localStorage.getItem('assigned_shop_id');

    // Role checks
    const isSuperAdmin = role === 'super_admin';
    const isWarehouseAdmin = role === 'warehouse_admin';
    const isShopRole = ['shop_owner', 'pharmacist', 'cashier', 'hr_manager', 'accountant'].includes(role || '');

    // State for Super Admin's explicit selection
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
    const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

    // Determine active context based on role
    const getActiveWarehouseId = useCallback((): string | null => {
        if (isSuperAdmin) {
            // Super Admin: use explicit selection
            return selectedWarehouseId;
        } else if (isWarehouseAdmin) {
            // Warehouse Admin: auto-apply assigned warehouse
            return assignedWarehouseId;
        } else if (isShopRole) {
            // Shop roles: might have warehouse through shop relationship
            return null; // Derived from shop
        }
        return null;
    }, [isSuperAdmin, isWarehouseAdmin, isShopRole, selectedWarehouseId, assignedWarehouseId]);

    const getActiveShopId = useCallback((): string | null => {
        if (isSuperAdmin) {
            // Super Admin: use explicit selection
            return selectedShopId;
        } else if (isShopRole) {
            // Shop roles: auto-apply assigned shop
            return assignedShopId;
        }
        return null;
    }, [isSuperAdmin, isShopRole, selectedShopId, assignedShopId]);

    // UI control: only Super Admin sees selectors
    const showWarehouseSelector = isSuperAdmin;
    const showShopSelector = isSuperAdmin;

    // Validation
    const validateContext = useCallback((): { valid: boolean; error: string | null } => {
        if (isSuperAdmin) {
            // Super Admin must select context for certain operations
            // This is optional - some views allow "all" context
            return { valid: true, error: null };
        } else if (isWarehouseAdmin) {
            if (!assignedWarehouseId) {
                return { valid: false, error: 'User is not assigned to a warehouse' };
            }
            return { valid: true, error: null };
        } else if (isShopRole) {
            if (!assignedShopId) {
                return { valid: false, error: 'User is not assigned to a shop' };
            }
            return { valid: true, error: null };
        }
        return { valid: true, error: null };
    }, [isSuperAdmin, isWarehouseAdmin, isShopRole, assignedWarehouseId, assignedShopId]);

    const validation = validateContext();

    return {
        // Role info
        role,
        isSuperAdmin,
        isWarehouseAdmin,
        isShopRole,

        // Assigned entities
        assignedWarehouseId,
        assignedShopId,

        // Active context
        activeWarehouseId: getActiveWarehouseId(),
        activeShopId: getActiveShopId(),

        // UI control
        showWarehouseSelector,
        showShopSelector,

        // Actions
        setActiveWarehouse: setSelectedWarehouseId,
        setActiveShop: setSelectedShopId,

        // Validation
        isContextValid: validation.valid,
        contextError: validation.error,
    };
}

/**
 * Hook for warehouse-specific operations
 * Enforces warehouse context based on role
 */
export function useWarehouseContext() {
    const context = useEntityContext();

    return {
        ...context,
        // For warehouse operations, require warehouse context
        requiresSelection: context.isSuperAdmin && !context.activeWarehouseId,
        // Get the warehouse ID to use in API calls
        getWarehouseIdForApi: (): string | null => {
            if (context.isSuperAdmin) {
                return context.activeWarehouseId; // May be null if not selected
            }
            return context.assignedWarehouseId; // Auto-applied
        },
    };
}

/**
 * Hook for shop-specific operations
 * Enforces shop context based on role
 */
export function useShopContext() {
    const context = useEntityContext();

    return {
        ...context,
        // For shop operations, require shop context
        requiresSelection: context.isSuperAdmin && !context.activeShopId,
        // Get the shop ID to use in API calls
        getShopIdForApi: (): string | null => {
            if (context.isSuperAdmin) {
                return context.activeShopId; // May be null if not selected
            }
            return context.assignedShopId; // Auto-applied
        },
    };
}

export default useEntityContext;
