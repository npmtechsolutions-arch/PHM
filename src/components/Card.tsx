interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: string;
    title?: string;
    icon?: string;
}

export default function Card({ children, className = '', padding, title, icon }: CardProps) {
    const paddingStyle = padding ? { padding } : {};

    return (
        <div className={`card ${className}`} style={paddingStyle}>
            {(title || icon) && (
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                    {icon && <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">{icon}</span>}
                    {title && <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>}
                </div>
            )}
            {children}
        </div>
    );
}

