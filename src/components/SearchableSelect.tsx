import { useState, useEffect, useRef } from 'react';

interface Option {
    value: string | number;
    label: string;
}

interface SearchableSelectProps {
    value: string | number;
    onChange: (value: any) => void;
    options: Option[];
    label?: string;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

export default function SearchableSelect({
    value,
    onChange,
    options,
    label,
    placeholder = 'Select...',
    error,
    required,
    disabled,
    className = ''
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync search term when value changes externally
    useEffect(() => {
        const selectedOption = options.find(opt => opt.value === value);
        if (selectedOption) {
            setSearchTerm(selectedOption.label);
        } else if (!value) {
            // Only clear search term if it doesn't match the current input (avoid clearing while typing if logic allows)
            // Ideally, if value is empty, search term should be filterable. 
            // Stick to simple: if value is empty, keep search term as is UNLESS it was a valid selection before?
            // Actually, if purely controlled, we might want to let user type.
            // Let's rely on internal state tracking for typing.
            // If value is cleared externally, we might want to clear search.
        }
    }, [value, options]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset search term to selected value if no new selection made
                const selectedOption = options.find(opt => opt.value === value);
                if (selectedOption) {
                    setSearchTerm(selectedOption.label);
                } else if (!value) {
                    // If no value selected, keep search term? Or clear? 
                    // User might have typed "dolo" and clicked away without selecting. 
                    // Should we clear it? Yes, visually it implies selection otherwise.
                    setSearchTerm('');
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, value, options]);

    // Smart word-based filter: each word in searchTerm should match somewhere in the label
    // Also normalizes numbers by removing spaces (so "shop2" matches "shop 2")
    const filteredOptions = options.filter(opt => {
        const normalizedLabel = opt.label.toLowerCase().replace(/\s+/g, ''); // Remove all spaces
        const normalizedSearch = searchTerm.toLowerCase().replace(/\s+/g, ''); // Remove all spaces

        // Method 1: Direct match after normalizing spaces
        if (normalizedLabel.includes(normalizedSearch)) {
            return true;
        }

        // Method 2: All words in search term should exist in label
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const labelLower = opt.label.toLowerCase();

        return searchWords.every(word => labelLower.includes(word));
    });

    return (
        <div className={`w-full ${className}`} ref={wrapperRef}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        if (!e.target.value) onChange(''); // Clear value if cleared
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`input w-full ${error ? 'border-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />

                {isOpen && !disabled && (
                    <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${value === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                                    onClick={() => {
                                        onChange(option.value);
                                        setSearchTerm(option.label);
                                        setIsOpen(false);
                                    }}
                                >
                                    {option.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-slate-500 text-center">
                                No matches found
                            </div>
                        )}
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {error}
                </p>
            )}
        </div>
    );
}
