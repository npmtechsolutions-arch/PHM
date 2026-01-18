/**
 * MasterSelect - Reusable dropdown component that loads options from master data
 * 
 * This component replaces ALL hardcoded dropdowns in the application.
 * It uses the MasterDataContext to get options dynamically.
 * 
 * Usage:
 *   <MasterSelect
 *     masterKey="categories"
 *     value={formData.category_id}
 *     onChange={(value) => setFormData({ ...formData, category_id: value })}
 *     placeholder="Select Category"
 *     required
 *   />
 */
import { useMasterData, type AllMasterData } from '../contexts/MasterDataContext';

// Props for the master select component
interface MasterSelectProps {
    /** The master data key to load options from */
    masterKey: keyof AllMasterData;
    /** Current selected value */
    value: string;
    /** Callback when value changes */
    onChange: (value: string) => void;
    /** Placeholder text for empty selection */
    placeholder?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Whether the field is disabled */
    disabled?: boolean;
    /** Which field to use as the option value (default: 'id') */
    valueField?: 'id' | 'code';
    /** Which field to use as the display label (default: 'name') */
    labelField?: 'name' | 'code';
    /** Show an "Add New" option */
    allowAdd?: boolean;
    /** Callback when "Add New" is selected */
    onAdd?: () => void;
    /** For statuses: filter by entity type */
    entityType?: string;
    /** Additional CSS classes */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
}

export function MasterSelect({
    masterKey,
    value,
    onChange,
    placeholder = 'Select...',
    required = false,
    disabled = false,
    valueField = 'id',
    labelField = 'name',
    allowAdd = false,
    onAdd,
    entityType,
    className = '',
    style,
}: MasterSelectProps) {
    const { getMaster, getStatusesByEntity, isLoading } = useMasterData();

    // Get the appropriate options based on master key
    let options: any[] = [];

    if (masterKey === 'statuses' && entityType) {
        options = getStatusesByEntity(entityType);
    } else {
        options = getMaster(masterKey);
    }

    // Handle change - check for special "add new" value
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        if (newValue === '__ADD_NEW__' && onAdd) {
            onAdd();
            return;
        }
        onChange(newValue);
    };

    // Determine the value and label fields based on the data structure
    const getOptionValue = (item: any): string => {
        if (valueField === 'code' && item.code !== undefined) {
            return item.code;
        }
        return item.id;
    };

    const getOptionLabel = (item: any): string => {
        // For HSN codes, show the code
        if (masterKey === 'hsn_codes') {
            return `${item.hsn_code} - ${item.description?.substring(0, 30) || ''}`;
        }
        // For GST slabs, show the rate
        if (masterKey === 'gst_slabs') {
            return `${item.rate}%${item.description ? ` - ${item.description}` : ''}`;
        }
        // For units, show short_name in parentheses
        if (masterKey === 'units' && item.short_name) {
            return `${item.name} (${item.short_name})`;
        }
        // For payment methods, include icon
        if (masterKey === 'payment_methods' && item.icon) {
            return `${item.icon} ${item.name}`;
        }
        // Default: use the specified label field
        return item[labelField] || item.name || item.code || String(item.id);
    };

    // Default styles
    const defaultClassName = `w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}`;

    return (
        <select
            value={value}
            onChange={handleChange}
            required={required}
            disabled={disabled || isLoading}
            className={className || defaultClassName}
            style={style}
        >
            <option value="">
                {isLoading ? 'Loading...' : placeholder}
            </option>
            {options.map((item) => (
                <option key={item.id} value={getOptionValue(item)}>
                    {getOptionLabel(item)}
                </option>
            ))}
            {allowAdd && (
                <option value="__ADD_NEW__">+ Add New...</option>
            )}
        </select>
    );
}

/**
 * CategorySelect - For medicine categories
 * NOTE: Uses 'name' as value to maintain compatibility with existing Medicine model
 */
interface CategorySelectProps {
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    allowAdd?: boolean;
    onAdd?: () => void;
}

export function CategorySelect({ value, onChange, required, disabled, className, placeholder, allowAdd, onAdd }: CategorySelectProps) {
    const { getMaster, isLoading } = useMasterData();
    const categories = getMaster('categories');

    const defaultClassName = `w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}`;

    // Show warning when no categories exist
    const isEmpty = !isLoading && categories.length === 0;

    return (
        <select
            value={value}
            onChange={(e) => {
                const newValue = e.target.value;
                if (newValue === '__ADD_NEW__' && onAdd) {
                    onAdd();
                    return;
                }
                onChange(newValue);
            }}
            required={required}
            disabled={disabled || isLoading || isEmpty}
            className={className || defaultClassName}
            title={isEmpty ? 'No categories available. Please ask your Super Admin to add categories in Master Data Management → Medicine Categories' : undefined}
        >
            <option value="">
                {isLoading ? 'Loading...' : isEmpty ? '⚠️ No categories found - Contact Super Admin' : (placeholder || 'Select Category')}
            </option>
            {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                    {cat.name}
                </option>
            ))}
            {allowAdd && (
                <option value="__ADD_NEW__">+ Add New...</option>
            )}
        </select>
    );
}

/**
 * MedicineTypeSelect - For medicine dosage forms
 * NOTE: Uses 'code' as value for medicine_type field
 */
export function MedicineTypeSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    const { getMaster, isLoading } = useMasterData();
    const types = getMaster('medicine_types');

    const defaultClassName = `w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}`;

    // Show warning when no medicine types exist
    const isEmpty = !isLoading && types.length === 0;

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled || isLoading || isEmpty}
            className={className || defaultClassName}
            title={isEmpty ? 'No medicine types available. Please ask your Super Admin to add medicine types in Master Data Management → Medicine Types' : undefined}
        >
            <option value="">
                {isLoading ? 'Loading...' : isEmpty ? '⚠️ No medicine types found - Contact Super Admin' : (placeholder || 'Select Medicine Type')}
            </option>
            {types.map((type) => (
                <option key={type.id} value={type.code}>
                    {type.name}
                </option>
            ))}
        </select>
    );
}

/**
 * UnitSelect - For units of measurement
 * NOTE: Uses 'name' as value for unit field
 */
export function UnitSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    const { getMaster, isLoading } = useMasterData();
    const units = getMaster('units');

    const defaultClassName = `w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}`;

    // Show warning when no units exist
    const isEmpty = !isLoading && units.length === 0;

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled || isLoading || isEmpty}
            className={className || defaultClassName}
            title={isEmpty ? 'No units available. Please ask your Super Admin to add units in Master Data Management → Units' : undefined}
        >
            <option value="">
                {isLoading ? 'Loading...' : isEmpty ? '⚠️ No units found - Contact Super Admin' : (placeholder || 'Select Unit')}
            </option>
            {units.map((unit) => (
                <option key={unit.id} value={unit.name}>
                    {unit.name} ({unit.short_name})
                </option>
            ))}
        </select>
    );
}

/**
 * GSTSlabSelect - For GST rates
 */
export function GSTSlabSelect({ value, onChange, required, disabled, className }: { value: number | string, onChange: (value: number) => void, required?: boolean, disabled?: boolean, className?: string }) {
    const { getMaster, isLoading } = useMasterData();
    const gstSlabs = getMaster('gst_slabs');

    // Show warning when no GST slabs exist
    const isEmpty = !isLoading && gstSlabs.length === 0;

    return (
        <select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            required={required}
            disabled={disabled || isLoading || isEmpty}
            className={className || "w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"}
            title={isEmpty ? 'No GST slabs available. Please ask your Super Admin to add GST slabs in Master Data Management → Tax & Finance Masters → GST/VAT' : undefined}
        >
            {isEmpty && (
                <option value="">⚠️ No GST slabs found - Contact Super Admin</option>
            )}
            {gstSlabs.map((slab) => (
                <option key={slab.id} value={slab.rate}>
                    {slab.rate}%{slab.description ? ` - ${slab.description}` : ''}
                </option>
            ))}
        </select>
    );
}

/**
 * HSNSelect - For HSN codes with auto-GST derivation
 */
interface HSNSelectProps {
    value: string;
    onChange: (hsnCode: string, gstRate?: number) => void;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export function HSNSelect({ value, onChange, required, disabled, className, placeholder }: HSNSelectProps) {
    const { getMaster, isLoading } = useMasterData();
    const hsnCodes = getMaster('hsn_codes');

    const defaultClassName = `w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}`;

    // Show warning when no HSN codes exist
    const isEmpty = !isLoading && hsnCodes.length === 0;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCode = e.target.value;
        const hsn = hsnCodes.find(h => h.hsn_code === selectedCode);
        // Pass both the HSN code and the GST rate to auto-fill GST
        onChange(selectedCode, hsn?.gst_rate);
    };

    return (
        <select
            value={value}
            onChange={handleChange}
            required={required}
            disabled={disabled || isLoading || isEmpty}
            className={className || defaultClassName}
            title={isEmpty ? 'No HSN codes available. Please ask your Super Admin to add HSN codes in Master Data → HSN Codes' : undefined}
        >
            <option value="">
                {isLoading ? 'Loading...' : isEmpty ? '⚠️ No HSN codes found - Contact Super Admin' : (placeholder || 'Select HSN Code')}
            </option>
            {hsnCodes.map((hsn) => (
                <option key={hsn.id} value={hsn.hsn_code}>
                    {hsn.hsn_code} - {hsn.description?.substring(0, 40) || 'No description'} ({hsn.gst_rate}%)
                </option>
            ))}
        </select>
    );
}

/**
 * PaymentMethodSelect - For payment methods in billing
 */
export function PaymentMethodSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    return (
        <MasterSelect
            masterKey="payment_methods"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Select Payment Method"}
            valueField="code"
            required={required}
            disabled={disabled}
            className={className}
        />
    );
}

/**
 * ShopTypeSelect - For shop types
 */
export function ShopTypeSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    return (
        <MasterSelect
            masterKey="shop_types"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Select Shop Type"}
            valueField="code"
            required={required}
            disabled={disabled}
            className={className}
        />
    );
}

/**
 * CustomerTypeSelect - For customer types
 */
export function CustomerTypeSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    return (
        <MasterSelect
            masterKey="customer_types"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Select Customer Type"}
            valueField="code"
            required={required}
            disabled={disabled}
            className={className}
        />
    );
}

/**
 * GenderSelect - For gender selection (hardcoded values)
 */
export function GenderSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    const genders = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
    ];

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
            className={className || 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}
        >
            <option value="">{placeholder || 'Select Gender'}</option>
            {genders.map((gender) => (
                <option key={gender.value} value={gender.value}>
                    {gender.label}
                </option>
            ))}
        </select>
    );
}

/**
 * EmploymentTypeSelect - For employment types (hardcoded values)
 */
export function EmploymentTypeSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    const employmentTypes = [
        { value: 'full_time', label: 'Full Time' },
        { value: 'part_time', label: 'Part Time' },
        { value: 'contract', label: 'Contract' },
        { value: 'intern', label: 'Intern' }
    ];

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
            className={className || 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}
        >
            <option value="">{placeholder || 'Select Employment Type'}</option>
            {employmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                    {type.label}
                </option>
            ))}
        </select>
    );
}

/**
 * UrgencySelect - For urgency levels
 */
export function UrgencySelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    return (
        <MasterSelect
            masterKey="urgency_levels"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Select Urgency"}
            valueField="code"
            required={required}
            disabled={disabled}
            className={className}
        />
    );
}

/**
 * DesignationSelect - For employee designations
 */
export function DesignationSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    return (
        <MasterSelect
            masterKey="designations"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Select Designation"}
            valueField="code"
            required={required}
            disabled={disabled}
            className={className}
        />
    );
}

/**
 * DepartmentSelect - For departments
 */
export function DepartmentSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    return (
        <MasterSelect
            masterKey="departments"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Select Department"}
            valueField="code"
            required={required}
            disabled={disabled}
            className={className}
        />
    );
}

/**
 * WarehouseSelect - For warehouse selection
 */
export function WarehouseSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    return (
        <MasterSelect
            masterKey="warehouses"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Select Warehouse"}
            required={required}
            disabled={disabled}
            className={className}
        />
    );
}

/**
 * ShopSelect - For shop selection
 */
interface ShopSelectProps extends CategorySelectProps {
    warehouseId?: string;
}

export function ShopSelect({ value, onChange, required, disabled, className, warehouseId }: ShopSelectProps) {
    const { getMaster, isLoading } = useMasterData();
    let shops = getMaster('shops');

    // Filter by warehouse if specified
    if (warehouseId) {
        shops = shops.filter(shop => shop.warehouse_id === warehouseId);
    }

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled || isLoading || shops.length === 0}
            className={className || "w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"}
        >
            <option value="">
                {isLoading ? 'Loading...' : shops.length === 0 ? '⚠️ No shops found' : 'Select Shop'}
            </option>
            {
                shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                        {shop.name} ({shop.code})
                    </option>
                ))
            }
        </select >
    );
}

/**
 * StatusSelect - For status selection (filtered by entity type)
 */
interface StatusSelectProps extends CategorySelectProps {
    entityType: string;
}

export function StatusSelect({ value, onChange, entityType, required, disabled, className, placeholder }: StatusSelectProps) {
    return (
        <MasterSelect
            masterKey="statuses"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Select Status"}
            valueField="code"
            entityType={entityType}
            required={required}
            disabled={disabled}
            className={className}
        />
    );
}

/**
 * BrandSelect - For medicine brands
 */
export function BrandSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    const { getMaster, isLoading } = useMasterData();
    const brands = getMaster('brands');

    const defaultClassName = `w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}`;

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled || isLoading}
            className={className || defaultClassName}
        >
            <option value="">
                {isLoading ? 'Loading...' : (placeholder || 'Select Brand')}
            </option>
            {brands.map((brand) => (
                <option key={brand.id} value={brand.name}>
                    {brand.name}
                </option>
            ))}
        </select>
    );
}

/**
 * ManufacturerSelect - For medicine manufacturers
 */
export function ManufacturerSelect({ value, onChange, required, disabled, className, placeholder }: CategorySelectProps) {
    const { getMaster, isLoading } = useMasterData();
    const manufacturers = getMaster('manufacturers');

    const defaultClassName = `w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}`;

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled || isLoading}
            className={className || defaultClassName}
        >
            <option value="">
                {isLoading ? 'Loading...' : (placeholder || 'Select Manufacturer')}
            </option>
            {manufacturers.map((mfr) => (
                <option key={mfr.id} value={mfr.name}>
                    {mfr.name}
                </option>
            ))}
        </select>
    );
}

export default MasterSelect;


