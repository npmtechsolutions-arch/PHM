import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface PageLayoutProps {
    title: string;
    description?: string;
    icon?: string; // Enterprise: optional icon for page title
    breadcrumbs?: BreadcrumbItem[];
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export default function PageLayout({
    title,
    description,
    icon,
    breadcrumbs,
    actions,
    children,
    className = ''
}: PageLayoutProps) {
    const location = useLocation();

    // Generate default breadcrumbs if not provided
    const defaultBreadcrumbs = breadcrumbs || location.pathname.split('/')
        .filter(Boolean)
        .map((segment, index, array) => {
            const path = `/${array.slice(0, index + 1).join('/')}`;
            return {
                label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
                path: index === array.length - 1 ? undefined : path
            };
        });

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1 min-w-0">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center text-sm text-slate-500 mb-2">
                        <Link to="/" className="hover:text-primary">
                            <span className="material-symbols-outlined text-[18px] align-middle">home</span>
                        </Link>
                        {defaultBreadcrumbs.map((item, index) => (
                            <React.Fragment key={index}>
                                <span className="mx-2 text-slate-400">/</span>
                                {item.path ? (
                                    <Link to={item.path} className="hover:text-primary capitalize">
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className="text-slate-900 dark:text-slate-300 font-medium capitalize">
                                        {item.label}
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>

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
                            {description && (
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {description}
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

