
import Button from './Button';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    image?: string;
}

export default function EmptyState({
    icon = 'inbox',
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 h-[400px]">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500">
                    {icon}
                </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                {title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="primary" icon="add">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
