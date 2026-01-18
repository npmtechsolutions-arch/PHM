// tsx


interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger': return 'warning'; // Triangle warning
            case 'warning': return 'error'; // Octagon error (ironically typically used for stop/warning) -> let's use 'warning' logic
            case 'info': return 'info';
            default: return 'warning';
        }
    };

    const getColors = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconBg: 'bg-red-100 dark:bg-red-900/30',
                    iconText: 'text-red-600 dark:text-red-400',
                    buttonBg: 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                };
            case 'warning':
                return {
                    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
                    iconText: 'text-amber-600 dark:text-amber-400',
                    buttonBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                };
            case 'info':
                return {
                    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                    iconText: 'text-blue-600 dark:text-blue-400',
                    buttonBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                };
        }
    };

    const colors = getColors();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-scaleIn">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className={`w-12 h-12 rounded-full ${colors.iconBg} ${colors.iconText} flex items-center justify-center mb-4`}>
                        <span className="material-symbols-outlined text-[24px]">{getIcon()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {message}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors shadow-lg ${colors.buttonBg}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
