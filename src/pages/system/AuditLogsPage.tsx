import { useState, useEffect } from 'react';
import { auditLogsApi } from '../../services/api';

interface AuditLog {
    id: string;
    timestamp: string;
    user_name: string;
    user_role: string;
    action: string;
    entity_type: string;
    entity_id: string;
    entity_name: string;
    details: string;
    ip_address: string;
    created_at: string;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, creates: 0, updates: 0, deletes: 0 });
    const [filterAction, setFilterAction] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [filterAction, filterEntity]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [logsRes, statsRes] = await Promise.all([
                auditLogsApi.list({
                    size: 100,
                    action: filterAction || undefined,
                    entity_type: filterEntity || undefined
                }),
                auditLogsApi.getStats()
            ]);

            setLogs(logsRes.data.items?.map((log: any) => ({
                ...log,
                timestamp: log.created_at,
                details: log.new_values || ''
            })) || []);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action?.toUpperCase()) {
            case 'CREATE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'UPDATE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'LOGIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'LOGOUT': return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400';
        }
    };

    const getEntityIcon = (entityType: string) => {
        switch (entityType?.toLowerCase()) {
            case 'warehouse': return 'warehouse';
            case 'shop': return 'storefront';
            case 'medicine': return 'medication';
            case 'user': return 'person';
            case 'invoice': return 'receipt';
            case 'dispatch': return 'local_shipping';
            case 'batch': return 'inventory';
            case 'rack': return 'view_column';
            default: return 'description';
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = !searchTerm ||
            log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Audit Logs
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Complete audit trail of all system activities. Track who did what and when.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-600">history</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                            <p className="text-xs text-slate-500">Total Logs</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">add_circle</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.creates}</p>
                            <p className="text-xs text-slate-500">Creates</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">edit</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{stats.updates}</p>
                            <p className="text-xs text-slate-500">Updates</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-600">delete</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{stats.deletes}</p>
                            <p className="text-xs text-slate-500">Deletes</p>
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
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                            />
                        </div>
                    </div>
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                    </select>
                    <select
                        value={filterEntity}
                        onChange={(e) => setFilterEntity(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                        <option value="">All Entities</option>
                        <option value="warehouse">Warehouse</option>
                        <option value="shop">Shop</option>
                        <option value="medicine">Medicine</option>
                        <option value="user">User</option>
                        <option value="invoice">Invoice</option>
                        <option value="dispatch">Dispatch</option>
                        <option value="rack">Rack</option>
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

            {/* Logs Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">history</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No logs found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Adjust your filters to see more results</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Action</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Entity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredLogs.map((log, index) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeIn"
                                        style={{ animationDelay: `${index * 20}ms` }}
                                    >
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-900 dark:text-white">
                                                {new Date(log.timestamp || log.created_at).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(log.timestamp || log.created_at).toLocaleTimeString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900 dark:text-white">{log.user_name || 'System'}</p>
                                            <p className="text-xs text-slate-500 capitalize">{log.user_role?.replace('_', ' ') || '-'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px] text-slate-400">
                                                    {getEntityIcon(log.entity_type)}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{log.entity_name || log.entity_id || '-'}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{log.entity_type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-500">{log.ip_address || '-'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
