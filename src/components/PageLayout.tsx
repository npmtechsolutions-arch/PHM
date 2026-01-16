import React from 'react';

interface PageLayoutProps {
    title: string;
    description?: string;
    subtitle?: string;
    icon?: string; // Enterprise: optional icon for page title
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export default function PageLayout({
    title,
    description,
    subtitle,
    icon,
    actions,
    children,
    className = ''
}: PageLayoutProps) {
    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1 min-w-0">
                    {/* Title with optional icon */}
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[24px]">{icon}</span>
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
                                {title}
                            </h1>
                            {(description || subtitle) && (
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {description || subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-3">
                        {actions}
                    </div>
                )}
            </div>

            {/* Page Content */}
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}

