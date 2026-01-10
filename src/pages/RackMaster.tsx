import { useState, useEffect } from 'react';
import { warehousesApi, racksApi } from '../services/api';

interface Rack {
    id: string;
    rack_name: string;
    rack_number: string;
    warehouse_id?: string;
    warehouse_name?: string;
    is_active?: boolean;
    created_at: string;
}

export default function RackMaster() {
    const [racks, setRacks] = useState<Rack[]>([]);
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [newRack, setNewRack] = useState({ rack_name: '', rack_number: '', warehouse_id: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [warehouseRes, racksRes] = await Promise.all([
                warehousesApi.list({ size: 100 }),
                racksApi.list({ size: 100 })
            ]);
            setWarehouses(warehouseRes.data.items?.map((w: any) => ({ id: w.id, name: w.name })) || []);
            setRacks(racksRes.data.items || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRack = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!newRack.rack_name || !newRack.rack_number) {
            setError('Rack Name and Rack Number are required');
            return;
        }

        setIsSubmitting(true);
        try {
            await racksApi.create({
                rack_name: newRack.rack_name,
                rack_number: newRack.rack_number.toUpperCase(),
                warehouse_id: newRack.warehouse_id || undefined
            });

            await loadData(); // Reload to get fresh data from backend
            setNewRack({ rack_name: '', rack_number: '', warehouse_id: '' });
            setShowAddForm(false);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to add rack');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRack = async (id: string) => {
        if (confirm('Are you sure you want to delete this rack?')) {
            try {
                await racksApi.delete(id);
                await loadData(); // Reload to get fresh data
            } catch (err) {
                console.error('Failed to delete rack:', err);
            }
        }
    };

    const filteredRacks = racks.filter(rack => {
        const matchesSearch = !searchTerm ||
            rack.rack_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rack.rack_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWarehouse = !filterWarehouse || rack.warehouse_id === filterWarehouse;
        return matchesSearch && matchesWarehouse;
    });

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Rack Master
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage racks for physical stock location. Racks appear in dropdowns across the system.
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Add Rack
                </button>
            </div>

            {/* Inline Add Form (NO MODAL) */}
            {showAddForm && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm animate-fadeIn">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_circle</span>
                        Add New Rack
                    </h3>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAddRack} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Rack Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newRack.rack_name}
                                    onChange={(e) => setNewRack(prev => ({ ...prev, rack_name: e.target.value }))}
                                    placeholder="e.g., Rack A1"
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Rack Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newRack.rack_number}
                                    onChange={(e) => setNewRack(prev => ({ ...prev, rack_number: e.target.value.toUpperCase() }))}
                                    placeholder="e.g., RA1"
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Warehouse
                                </label>
                                <select
                                    value={newRack.warehouse_id}
                                    onChange={(e) => setNewRack(prev => ({ ...prev, warehouse_id: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-5 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Rack'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

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
                                placeholder="Search by rack name or number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>
                    <select
                        value={filterWarehouse}
                        onChange={(e) => setFilterWarehouse(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                        <option value="">All Warehouses</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
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

            {/* Racks Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : filteredRacks.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">view_column</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No racks found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Add your first rack to get started</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Rack Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Rack Number</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Created</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredRacks.map((rack, index) => (
                                <tr
                                    key={rack.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeIn"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-purple-600">view_column</span>
                                            </div>
                                            <span className="font-semibold text-slate-900 dark:text-white">{rack.rack_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            {rack.rack_number}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {rack.warehouse_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(rack.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-colors"
                                                title="Edit"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRack(rack.id)}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </div>
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
