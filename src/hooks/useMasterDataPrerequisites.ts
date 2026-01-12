import { useMasterData } from '../contexts/MasterDataContext';

export interface MasterPrerequisite {
    name: string;
    masterKey: string;  // Changed from keyof AllMasterData to string
    required: boolean;
}

export interface MasterDependencyCheck {
    canCreate: boolean;
    missingPrerequisites: string[];
    warnings: string[];
}

/**
 * Hook to check if all prerequisites exist before creating a master data entry
 * Enforces the master data dependency graph
 */
export function useMasterDataPrerequisites(
    masterType: string
): MasterDependencyCheck {
    const { getMaster } = useMasterData();

    // Define dependency graph
    // This maps each master type to its required and optional prerequisites
    const dependencies: Record<string, MasterPrerequisite[]> = {
        // HSN Codes require GST slabs to exist first
        'hsn_codes': [
            { name: 'GST Slabs', masterKey: 'gst_slabs', required: true }
        ],

        // Medicines require multiple masters
        'medicines': [
            { name: 'Categories', masterKey: 'categories', required: true },
            { name: 'Medicine Types', masterKey: 'medicine_types', required: true },
            { name: 'Units', masterKey: 'units', required: true },
            { name: 'HSN Codes', masterKey: 'hsn_codes', required: true },
            { name: 'Brands', masterKey: 'brands', required: false },
            { name: 'Manufacturers', masterKey: 'manufacturers', required: false },
        ],

        // GST Configuration requires GST slabs
        'gst_configuration': [
            { name: 'GST Slabs', masterKey: 'gst_slabs', required: true }
        ],

        // Stock operations require suppliers and adjustment reasons
        'stock_entry': [
            { name: 'Suppliers', masterKey: 'suppliers', required: true },
            { name: 'Warehouses', masterKey: 'warehouses', required: true }
        ],

        'stock_adjustment': [
            { name: 'Adjustment Reasons', masterKey: 'adjustment_reasons', required: true }
        ],

        // Billing requires payment methods
        'billing': [
            { name: 'Payment Methods', masterKey: 'payment_methods', required: true }
        ]
    };

    // Check prerequisites for the requested master type
    const prereqs = dependencies[masterType] || [];
    const missing: string[] = [];
    const warnings: string[] = [];

    prereqs.forEach(prereq => {
        const data = getMaster(prereq.masterKey as any);
        if (data.length === 0) {
            if (prereq.required) {
                missing.push(prereq.name);
            } else {
                warnings.push(prereq.name);
            }
        }
    });

    return {
        canCreate: missing.length === 0,
        missingPrerequisites: missing,
        warnings
    };
}
