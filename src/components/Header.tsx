import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { warehousesApi, shopsApi } from '../services/api';

export default function Header() {
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [entityName, setEntityName] = useState<string>('');
    const [entityType, setEntityType] = useState<'warehouse' | 'shop' | null>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user, logout } = useUser();

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    // Fetch entity name when user changes
    useEffect(() => {
        const fetchEntityName = async () => {
            if (!user) {
                setEntityName('');
                setEntityType(null);
                return;
            }

            try {
                if (user.shop_id) {
                    const response = await shopsApi.get(user.shop_id);
                    setEntityName(response.data.name || 'Unknown Shop');
                    setEntityType('shop');
                } else if (user.warehouse_id) {
                    const response = await warehousesApi.get(user.warehouse_id);
                    setEntityName(response.data.name || 'Unknown Warehouse');
                    setEntityType('warehouse');
                } else {
                    // Super admin or unassigned
                    setEntityName('');
                    setEntityType(null);
                }
            } catch (error) {
                console.error('Failed to fetch entity name:', error);
                setEntityName('');
                setEntityType(null);
            }
        };

        fetchEntityName();
    }, [user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileMenu]);

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleBadgeColor = (role: string) => {
        const roleColors: Record<string, string> = {
            'super_admin': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
            'warehouse_admin': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
            'pharmacy_admin': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
            'hr_manager': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
            'pharmacist': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
        };
        return roleColors[role] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    };

    const formatRoleName = (role: string) => {
        return role
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <header className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 sticky top-0 z-10">
            {/* Left: Entity Name */}
            <div className="flex items-center gap-2">
                {entityName && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                        <span className={`material-symbols-outlined text-[18px] ${entityType === 'shop' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {entityType === 'shop' ? 'store' : 'warehouse'}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold leading-none">
                                {entityType === 'shop' ? 'Shop' : 'Warehouse'}
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                {entityName}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    <span className="material-symbols-outlined text-[20px]">
                        {darkMode ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>

                {/* Notifications */}
                <button
                    onClick={() => navigate('/notifications')}
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Notifications"
                >
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
                </button>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                {/* User Profile Dropdown */}
                {user && (
                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                {getInitials(user.full_name || user.email)}
                            </div>

                            {/* Dropdown Icon */}
                            <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                                {/* User Info Header */}
                                <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                            {getInitials(user.full_name || user.email)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                                {user.full_name || 'User'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                                        <span className="material-symbols-outlined text-sm">badge</span>
                                        {formatRoleName(user.role)}
                                    </span>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            navigate('/settings');
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">person</span>
                                        <span className="text-sm font-medium">My Profile</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            navigate('/settings/application');
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">settings</span>
                                        <span className="text-sm font-medium">Settings</span>
                                    </button>

                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">logout</span>
                                        <span className="text-sm font-medium">Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

