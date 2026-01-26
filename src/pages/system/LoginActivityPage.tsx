import { useState, useEffect } from 'react';
import { loginActivityApi } from '../../services/api';

interface LoginRecord {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    user_role: string;
    action: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
}

export default function LoginActivityPage() {
    const [logins, setLogins] = useState<LoginRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0 });
    const [filterStatus, setFilterStatus] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [filterStatus]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [loginsRes, statsRes] = await Promise.all([
                loginActivityApi.list({
                    size: 100,
                    status: filterStatus || undefined
                }),
                loginActivityApi.getStats()
            ]);

            setLogins(loginsRes.data.items || []);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to load login activity:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogins = logins.filter(login => {
        const matchesSearch = !searchTerm ||
            login.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            login.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !filterRole || login.user_role === filterRole;
        return matchesSearch && matchesRole;
    });

    const activeToday = logins.filter(l =>
        l.action === 'login_success' &&
        new Date(l.created_at).toDateString() === new Date().toDateString()
    ).length;

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Login Activity
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Monitor user login activity and identify security issues.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">login</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                            <p className="text-xs text-slate-500">Total Logins</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">check_circle</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
                            <p className="text-xs text-slate-500">Successful</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-600">error</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                            <p className="text-xs text-slate-500">Failed</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600">person</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{activeToday}</p>
                            <p className="text-xs text-slate-500">Active Today</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[250px]">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                            />
                        </div>
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                        <option value="">All Status</option>
                        <option value="success">Successful</option>
                        <option value="failed">Failed</option>
                    </select>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                        <option value="">All Roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="warehouse_admin">Warehouse Admin</option>
                        <option value="shop_owner">Shop Owner</option>
                        <option value="pharmacist">Pharmacist</option>
                    </select>
                    <button
                        onClick={loadData}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        title="Refresh"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                </div>
            </div>

            {/* Activity Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : filteredLogins.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">login</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No login records found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Adjust your filters to see more results</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Login Time</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">IP Address</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredLogins.map((login, index) => (
                                <tr
                                    key={login.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeIn"
                                    style={{ animationDelay: `${index * 20}ms` }}
                                >
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900 dark:text-white">{login.user_name || 'Unknown'}</p>
                                        <p className="text-xs text-slate-500">{login.user_email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full capitalize">
                                            {login.user_role?.replace('_', ' ') || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-900 dark:text-white">
                                            {new Date(login.created_at).toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{login.ip_address || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${login.action === 'login_success'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {login.action === 'login_success' ? 'Success' : 'Failed'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
