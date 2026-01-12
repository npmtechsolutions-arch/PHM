import { useNavigate } from 'react-router-dom';

interface MasterDataWarningProps {
    masterType: string;
    missingPrerequisites: string[];
    warnings?: string[];
}

/**
 * Component to display blocking warnings when master data prerequisites are missing
 * Guides users to create required masters in the correct order
 */
export function MasterDataWarning({
    masterType,
    missingPrerequisites,
    warnings = []
}: MasterDataWarningProps) {
    const navigate = useNavigate();

    if (missingPrerequisites.length === 0 && warnings.length === 0) {
        return null;
    }

    // Map master names to their routes
    const masterRoutes: Record<string, string> = {
        'GST Slabs': '/gst',
        'Categories': '/categories',
        'Medicine Types': '/medicine-types',
        'Units': '/units',
        'HSN Codes': '/hsn',
        'Brands': '/brands',
        'Manufacturers': '/manufacturers',
        'Suppliers': '/suppliers',
        'Payment Methods': '/payment-methods',
        'Adjustment Reasons': '/adjustment-reasons',
        'Warehouses': '/warehouses'
    };

    return (
        <div className="space-y-3 mb-6">
            {/* BLOCKING ERROR - Required prerequisites missing */}
            {missingPrerequisites.length > 0 && (
                <div className="p-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-red-600 dark:text-red-400">
                                block
                            </span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-900 dark:text-red-200">
                                Cannot Create {masterType}
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                The following master data must be created first:
                            </p>
                            <ul className="mt-3 space-y-2">
                                {missingPrerequisites.map(prereq => (
                                    <li key={prereq} className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg text-red-600">
                                            chevron_right
                                        </span>
                                        <span className="font-medium text-red-800 dark:text-red-300">
                                            {prereq}
                                        </span>
                                        {masterRoutes[prereq] && (
                                            <button
                                                onClick={() => navigate(masterRoutes[prereq])}
                                                className="ml-auto px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                            >
                                                Create Now →
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <span className="font-semibold">📌 Required Action:</span> Navigate to{' '}
                                    <strong>Master Data Management</strong> in the sidebar and create the missing items first.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WARNING - Optional prerequisites missing */}
            {warnings.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-xl text-amber-600 dark:text-amber-400">
                            warning
                        </span>
                        <div className="flex-1">
                            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                                Optional Data Missing
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                For better data quality, consider creating: <strong>{warnings.join(', ')}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
