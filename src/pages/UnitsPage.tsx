import { useState, useEffect } from 'react';
import { mastersApi } from '../services/api';

interface Unit {
    id: string;
    name: string;
    short_name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export default function UnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [formData, setFormData] = useState({ name: '', short_name: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listUnits();
            setUnits(res.data || []);
        } catch (err) {
            console.error('Failed to load units:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingUnit(null);
        setFormData({ name: '', short_name: '', description: '' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (unit: Unit) => {
        setEditingUnit(unit);
        setFormData({ name: unit.name, short_name: unit.short_name, description: unit.description || '' });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.short_name.trim()) {
            setError('Name and short name are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editingUnit) await mastersApi.updateUnit(editingUnit.id, formData);
            else await mastersApi.createUnit(formData);
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (unit: Unit) => {
        if (!confirm(`Delete "${unit.name}"?`)) return;
        try {
            await mastersApi.deleteUnit(unit.id);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete');
        }
    };

    const filtered = units.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Units</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage units of measurement.</p>
                </div>
                <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
                    <span className="material-symbols-outlined text-[20px]">add</span>Add Unit
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">straighten</span>
                        </div>
                        <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{units.length}</p><p className="text-xs text-slate-500">Total</p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">check_circle</span>
                        </div>
                        <div><p className="text-2xl font-bold text-green-600">{units.filter(u => u.is_active).length}</p><p className="text-xs text-slate-500">Active</p></div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><span className="material-symbols-outlined text-[20px]">search</span></span>
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center"><span className="material-symbols-outlined text-5xl text-slate-300 mb-3">straighten</span><h3 className="text-lg font-medium text-slate-900 dark:text-white">No units found</h3></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {filtered.map((unit, i) => (
                            <div key={unit.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors animate-fadeIn" style={{ animationDelay: `${i * 30}ms` }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">{unit.short_name}</div>
                                    <div><h3 className="font-semibold text-slate-900 dark:text-white">{unit.name}</h3><span className={`text-xs ${unit.is_active ? 'text-green-600' : 'text-slate-400'}`}>{unit.is_active ? 'Active' : 'Inactive'}</span></div>
                                </div>
                                <div className="flex justify-end gap-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <button onClick={() => openEditModal(unit)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                    <button onClick={() => handleDelete(unit)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingUnit ? 'Edit Unit' : 'Add Unit'}</h2></div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 text-sm">{error}</div>}
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Tablet" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Short Name *</label><input type="text" value={formData.short_name} onChange={(e) => setFormData({ ...formData, short_name: e.target.value })} placeholder="e.g., Tab" maxLength={10} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 resize-none" /></div>
                        </form>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">Cancel</button>
                            <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
