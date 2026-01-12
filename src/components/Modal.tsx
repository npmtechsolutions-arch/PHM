interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
    size?: 'sm' | 'md' | 'lg' | 'xl'; // Alias for maxWidth
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidth = 'md',
    size
}: ModalProps) {
    const effectiveWidth = size || maxWidth;
    if (!isOpen) return null;

    const widthClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content w-full ${widthClasses[effectiveWidth]} mx-4`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
