interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'error' | 'info' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    icon?: string;
    loading?: boolean;
    className?: string;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    children,
    icon,
    loading,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseClass = 'btn';

    // Map variants to classes
    let variantClass = '';
    switch (variant) {
        case 'primary': variantClass = 'btn-primary'; break;
        case 'secondary': variantClass = 'btn-secondary'; break;
        case 'ghost': variantClass = 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent shadow-none'; break;
        case 'danger':
        case 'error': variantClass = 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200 shadow-sm'; break;
        case 'success': variantClass = 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200 shadow-sm'; break;
        case 'warning': variantClass = 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border-yellow-200 shadow-sm'; break;
        case 'info': variantClass = 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 shadow-sm'; break;
        case 'outline': variantClass = 'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50'; break;
        default: variantClass = 'btn-primary';
    }

    // Map sizes
    let sizeClass = '';
    switch (size) {
        case 'sm': sizeClass = 'px-3 py-1.5 text-sm h-8'; break;
        case 'lg': sizeClass = 'px-6 py-3 text-lg h-12'; break;
        default: sizeClass = 'px-4 py-2'; // md
    }

    return (
        <button
            className={`${baseClass} ${variantClass} ${sizeClass} ${className} flex items-center justify-center gap-2 transition-all font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className={`animate-spin rounded-full border-2 border-current border-t-transparent ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`}></span>
            ) : icon ? (
                <span className={`material-symbols-outlined ${size === 'sm' ? 'text-[18px]' : 'text-[20px]'}`}>{icon}</span>
            ) : null}
            {children}
        </button>
    );
}
