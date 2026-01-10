import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { warehousesApi, shopsApi, usersApi, medicinesApi } from '../services/api';

interface PlatformStats {
    warehouses: number;
    shops: number;
    users: number;
    medicines: number;
}

export default function PlatformHome() {
    const navigate = useNavigate();
    const { user } = useUser();
    const [stats, setStats] = useState<PlatformStats>({ warehouses: 0, shops: 0, users: 0, medicines: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const [warehousesRes, shopsRes, usersRes, medicinesRes] = await Promise.allSettled([
                warehousesApi.list({ page: 1, size: 1 }),
                shopsApi.list({ page: 1, size: 1 }),
                usersApi.list({ page: 1, size: 1 }),
                medicinesApi.list({ page: 1, size: 1 }),
            ]);

            setStats({
                warehouses: warehousesRes.status === 'fulfilled' ? (warehousesRes.value.data?.total || 0) : 0,
                shops: shopsRes.status === 'fulfilled' ? (shopsRes.value.data?.total || 0) : 0,
                users: usersRes.status === 'fulfilled' ? (usersRes.value.data?.total || 0) : 0,
                medicines: medicinesRes.status === 'fulfilled' ? (medicinesRes.value.data?.total || 0) : 0,
            });
        } catch (err) {
            console.error('Failed to load platform stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const entityCards = [
        { label: 'Warehouses', value: stats.warehouses, icon: 'warehouse', color: 'blue', path: '/warehouses', description: 'Distribution centers' },
        { label: 'Medical Shops', value: stats.shops, icon: 'storefront', color: 'purple', path: '/shops', description: 'Retail locations' },
        { label: 'Users', value: stats.users, icon: 'people', color: 'emerald', path: '/users', description: 'Platform users' },
        { label: 'Medicines', value: stats.medicines, icon: 'medication', color: 'cyan', path: '/medicines', description: 'Product catalog' },
    ];

    const quickLinks = [
        { label: 'Manage Warehouses', icon: 'warehouse', path: '/warehouses', color: 'blue', description: 'Add, edit, or disable warehouses' },
        { label: 'Manage Medical Shops', icon: 'storefront', path: '/shops', color: 'purple', description: 'Configure shop-warehouse mapping' },
        { label: 'Manage Users', icon: 'manage_accounts', path: '/users', color: 'emerald', description: 'User roles and access control' },
        { label: 'Medicine Master', icon: 'medication', path: '/medicines', color: 'cyan', description: 'Product definitions and categories' },
        { label: 'Warehouse ↔ Shop Mapping', icon: 'swap_horiz', path: '/warehouse-mapping', color: 'amber', description: 'Supply chain configuration' },
        { label: 'Audit Logs', icon: 'history', path: '/audit-logs', color: 'slate', description: 'System activity tracking' },
    ];

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
            {/* Welcome Header */}
            <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-2xl shadow-purple-500/30 mb-6">
                    <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">
                    {greeting}, {user?.full_name || 'Admin'}
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400">
                    Platform Overview — Super Admin Console
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Platform Stats - Counts Only */}
            <div>
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                    Platform Overview
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {entityCards.map((card, index) => (
                        <button
                            key={card.label}
                            onClick={() => navigate(card.path)}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-left hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group animate-fadeInUp"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={`w-12 h-12 rounded-xl bg-${card.color}-100 dark:bg-${card.color}-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <span className={`material-symbols-outlined text-${card.color}-600 dark:text-${card.color}-400 text-2xl`}>
                                    {card.icon}
                                </span>
                            </div>
                            {loading ? (
                                <div className="h-10 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                            ) : (
                                <p className="text-4xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                            )}
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">{card.label}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{card.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Navigation */}
            <div>
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickLinks.map((link, index) => (
                        <button
                            key={link.label}
                            onClick={() => navigate(link.path)}
                            className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary/30 transition-all group text-left animate-fadeInUp"
                            style={{ animationDelay: `${(index + 4) * 50}ms` }}
                        >
                            <div className={`w-11 h-11 rounded-lg bg-${link.color}-100 dark:bg-${link.color}-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                <span className={`material-symbols-outlined text-${link.color}-600 dark:text-${link.color}-400`}>
                                    {link.icon}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                    {link.label}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    {link.description}
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                arrow_forward
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Platform Information */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">info</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Super Admin Role</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            As a Super Admin, you manage the platform structure: warehouses, medical shops, users, and product catalog.
                            You do not participate in day-to-day pharmacy operations like stock entry, billing, or sales.
                            Operational activities are handled by Warehouse Admins and Shop-level users.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
                <p>PharmaEC Platform — Super Admin Console v1.0</p>
            </div>
        </div>
    );
}
