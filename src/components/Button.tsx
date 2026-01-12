interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    children: React.ReactNode;
    icon?: string;
    loading?: boolean;
}

export default function Button({
    variant = 'primary',
    children,
    icon,
    loading,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseClass = 'btn';
    const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';

    return (
        <button
            className={`${baseClass} ${variantClass} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
            ) : icon ? (
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
            ) : null}
            {children}
        </button>
    );
}
