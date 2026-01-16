interface BadgeProps {
    children: React.ReactNode;
    variant: 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'primary';
    className?: string;
}

const variantStyles: Record<BadgeProps['variant'], string> = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    secondary: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export default function Badge({ children, variant, className = '' }: BadgeProps) {
    return (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${variantStyles[variant]} ${className}`}>
            {children}
        </span>
    );
}
