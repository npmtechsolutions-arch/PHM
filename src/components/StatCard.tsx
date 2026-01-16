interface StatCardProps {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    icon: string;
    onClick?: () => void;
    isActive?: boolean;
    trend?: string; // Legacy support
    valueClassName?: string;
    className?: string;
}

export default function StatCard({
    title,
    value,
    change,
    changeType = 'up',
    icon,
    onClick,
    isActive = false,
    valueClassName,
    className = ''
}: StatCardProps) {
    const changeColors = {
        up: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
        down: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
        neutral: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10',
    };

    const changeIcons = {
        up: 'trending_up',
        down: 'trending_down',
        neutral: 'trending_flat',
    };

    return (
        <div
            onClick={onClick}
            className={`
                flex flex-col gap-1 rounded-xl p-5 shadow-sm border transition-all duration-200
                ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
                ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 ring-1 ring-blue-500/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }
                ${className}
            `}
        >
            <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {title}
                </p>
                <span className={`material-symbols-outlined ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                    {icon}
                </span>
            </div>
            <div className="flex items-end gap-2 mt-2">
                <p className={`text-2xl font-bold ${valueClassName ? valueClassName : (isActive ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white')}`}>
                    {value}
                </p>
                {change && (
                    <span className={`flex items-center text-xs font-medium ${changeColors[changeType]} px-1.5 py-0.5 rounded mb-1`}>
                        <span className="material-symbols-outlined text-[14px] mr-0.5">{changeIcons[changeType]}</span>
                        {change}
                    </span>
                )}
            </div>
        </div>
    );
}
