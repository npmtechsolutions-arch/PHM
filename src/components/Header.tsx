import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { getRoleName } from '../utils/rbac';

export default function Header() {
    const [searchQuery, setSearchQuery] = useState('');
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });
    const [showSearch, setShowSearch] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const navigate = useNavigate();
    const { user } = useUser();

    // Default fallback user data
    const userName = user?.full_name || 'User';
    const userEmail = user?.email || 'user@example.com';
    const userRole = getRoleName(user?.role || 'user');
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Implement global search
            console.log('Searching for:', searchQuery);
        }
    };

    return (
        <header className="flex h-16 items-center justify-end border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 sticky top-0 z-10">
            {/* Right: Actions (minimal per enterprise spec) */}
            <div className="flex items-center gap-2">
                {/* Search Toggle (Mobile) */}
                <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                    <span className="material-symbols-outlined">search</span>
                </button>

                {/* Search Bar (Desktop) */}
                <form onSubmit={handleSearch} className="hidden md:block relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </div>
                    <input
                        type="text"
                        className="block w-64 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white border-none bg-slate-100 dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-700 placeholder-slate-400"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700"
                    title={darkMode ? 'Light Mode' : 'Dark Mode'}
                >
                    <span className="material-symbols-outlined">
                        {darkMode ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>

                {/* Notifications */}
                <button
                    onClick={() => navigate('/notifications')}
                    className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
                </button>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

                {/* User Profile */}
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{userRole}</p>
                        </div>
                        <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-sm">
                                {userInitials}
                            </div>
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 text-[20px] hidden sm:block">
                            expand_more
                        </span>
                    </button>

                    {/* User Dropdown Menu */}
                    {showUserMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowUserMenu(false)}
                            ></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 animate-slideIn">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
                                    <p className="text-xs text-slate-500">{userEmail}</p>
                                </div>
                                <div className="p-2">
                                    <button
                                        onClick={() => { navigate('/settings/application'); setShowUserMenu(false); }}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">person</span>
                                        My Profile
                                    </button>
                                    <button
                                        onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">settings</span>
                                        Settings
                                    </button>
                                </div>
                                <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">logout</span>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile Search Overlay */}
            {showSearch && (
                <div className="absolute inset-x-0 top-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 md:hidden animate-slideIn">
                    <form onSubmit={handleSearch} className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </div>
                        <input
                            type="text"
                            className="block w-full py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </form>
                </div>
            )}
        </header>
    );
}

