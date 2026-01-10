import { useState, useRef, useEffect } from 'react';

interface SelectOption {
    id: string;
    label: string;
    sublabel?: string;
}

interface SelectWithAddProps {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    onAddNew: (data: Record<string, string>) => Promise<SelectOption | null>;
    addNewFields: {
        name: string;
        label: string;
        placeholder?: string;
        required?: boolean;
    }[];
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    className?: string;
}

/**
 * SelectWithAdd - Dropdown with inline "Add New" capability
 * 
 * Features:
 * - Shows existing options in dropdown
 * - Has "➕ Add New" option at bottom
 * - Clicking "Add New" expands inline form (NO MODAL)
 * - Form appears below dropdown
 * - After successful add, new option is selected
 */
export default function SelectWithAdd({
    label,
    value,
    options,
    onChange,
    onAddNew,
    addNewFields,
    placeholder = 'Select an option',
    disabled = false,
    error,
    className = '',
}: SelectWithAddProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [addError, setAddError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        setIsOpen(false);
        setShowAddForm(false);
    };

    const handleAddNewClick = () => {
        setShowAddForm(true);
        setIsOpen(false);
        setFormData({});
        setAddError('');
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');

        // Validate required fields
        const missingFields = addNewFields
            .filter(f => f.required && !formData[f.name]?.trim())
            .map(f => f.label);

        if (missingFields.length > 0) {
            setAddError(`Please fill in: ${missingFields.join(', ')}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const newOption = await onAddNew(formData);
            if (newOption) {
                onChange(newOption.id);
                setShowAddForm(false);
                setFormData({});
            }
        } catch (err: any) {
            setAddError(err.message || 'Failed to add new item');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelAdd = () => {
        setShowAddForm(false);
        setFormData({});
        setAddError('');
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Label */}
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {label}
            </label>

            {/* Select Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-between px-4 py-2.5 rounded-lg border 
                    bg-white dark:bg-slate-900 text-left transition-all
                    ${error
                        ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-primary/50 focus:border-primary'
                    }
                    ${disabled
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                        : 'hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
                    }
                    focus:ring-2 focus:outline-none
                `}
            >
                <span className={selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                    {selectedOption ? (
                        <span className="flex items-center gap-2">
                            <span>{selectedOption.label}</span>
                            {selectedOption.sublabel && (
                                <span className="text-xs text-slate-400">({selectedOption.sublabel})</span>
                            )}
                        </span>
                    ) : (
                        placeholder
                    )}
                </span>
                <span className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {/* Error Message */}
            {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto animate-fadeIn">
                    {options.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                            No options available
                        </div>
                    ) : (
                        options.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelect(option.id)}
                                className={`
                                    w-full px-4 py-2.5 text-left text-sm transition-colors
                                    ${option.id === value
                                        ? 'bg-primary/10 text-primary dark:text-blue-400'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }
                                `}
                            >
                                <span className="font-medium">{option.label}</span>
                                {option.sublabel && (
                                    <span className="ml-2 text-xs text-slate-400">{option.sublabel}</span>
                                )}
                            </button>
                        ))
                    )}

                    {/* Add New Option */}
                    <button
                        type="button"
                        onClick={handleAddNewClick}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-primary hover:bg-primary/5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Add New
                    </button>
                </div>
            )}

            {/* Inline Add Form (NO MODAL - appears below dropdown) */}
            {showAddForm && (
                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg animate-fadeIn">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
                            Add New {label}
                        </h4>
                        <button
                            type="button"
                            onClick={handleCancelAdd}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    {addError && (
                        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                            {addError}
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {addNewFields.map(field => (
                                <div key={field.name}>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                                        placeholder={field.placeholder}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleCancelAdd}
                                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[16px]">check</span>
                                        Add
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
