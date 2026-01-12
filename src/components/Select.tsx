interface Option {
    value: string | number;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: Option[];
    placeholder?: string;
}

export default function Select({
    label,
    error,
    options,
    placeholder,
    className = '',
    ...props
}: SelectProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    className={`input appearance-none ${error ? 'border-red-500' : ''} ${className}`}
                    {...props}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>expand_more</span>
                </span>
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
