import React, { useEffect } from 'react';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: 'sm' | 'md' | 'lg' | 'xl' | string;
    loading?: boolean;
}

const Drawer: React.FC<DrawerProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    subtitle,
    children, 
    footer,
    width = 'md',
    loading = false
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Width mapping
    const widthClasses: Record<string, string> = {
        sm: 'w-full sm:w-96',
        md: 'w-full sm:w-[500px]',
        lg: 'w-full sm:w-[600px]',
        xl: 'w-full sm:w-[700px]'
    };
    const drawerWidth = widthClasses[width] || width;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div 
                className={`absolute inset-y-0 right-0 ${drawerWidth} bg-white dark:bg-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Close drawer"
                        >
                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[24px]">
                                close
                            </span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="spinner mx-auto"></div>
                        </div>
                    ) : (
                        children
                    )}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Drawer;
