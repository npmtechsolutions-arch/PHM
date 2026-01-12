interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    required?: boolean;
}

export default function Input({
    label,
    error,
    required,
    className = '',
    ...props
}: InputProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                className={`input ${error ? 'border-red-500' : ''} ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {error}
                </p>
            )}
        </div>
    );
}
