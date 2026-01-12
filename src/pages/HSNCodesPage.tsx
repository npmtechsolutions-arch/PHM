import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { useMasterDataPrerequisites } from '../hooks/useMasterDataPrerequisites';
import { MasterDataWarning } from '../components/MasterDataWarning';


interface HSN {
    id: string;
    hsn_code: string;
    description: string;
    gst_slab_id?: string;  // Link to GST slab
    gst_rate: number;
    cgst_rate: number;
    sgst_rate: number;
    igst_rate: number;
    is_active: boolean;
    created_at: string;
}

export default function HSNCodesPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const { getMaster } = useMasterData();
    const { canCreate, missingPrerequisites } = useMasterDataPrerequisites('hsn_codes');
    const gstSlabs = getMaster('gst_slabs');

    const [hsnCodes, setHsnCodes] = useState<HSN[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingHSN, setEditingHSN] = useState<HSN | null>(null);
    const [formData, setFormData] = useState({
        hsn_code: '',
        description: '',
        gst_slab_id: '',
        gst_rate: 0,
        cgst_rate: 0,
        sgst_rate: 0,
        igst_rate: 0
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Access Control: Only Super Admin can access
    useEffect(() => {
        if (user && user.role !== 'super_admin') {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listHSN();
            setHsnCodes(res.data || []);
        } catch (err) {
            console.error('Failed to load HSN codes:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingHSN(null);
        setFormData({
            hsn_code: '',
            description: '',
            gst_slab_id: '',
            gst_rate: 0,
            cgst_rate: 0,
            sgst_rate: 0,
            igst_rate: 0
        });
        setError('');
        setShowModal(true);
    };

    // Auto-derive GST rates when slab is selected
    const handleGSTSlabChange = (slabId: string) => {
        const slab = gstSlabs.find((s: any) => s.id === slabId);
        if (slab) {
            setFormData({
                ...formData,
                gst_slab_id: slabId,
                gst_rate: slab.rate,
                cgst_rate: slab.rate / 2,
                sgst_rate: slab.rate / 2,
                igst_rate: slab.rate
            });
        }
    };

    const openEditModal = (hsn: HSN) => {
        setEditingHSN(hsn);
        setFormData({
            hsn_code: hsn.hsn_code, description: hsn.description, gst_slab_id: hsn.gst_slab_id || '',
            gst_rate: hsn.gst_rate, cgst_rate: hsn.cgst_rate, sgst_rate: hsn.sgst_rate, igst_rate: hsn.igst_rate
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.hsn_code.trim() || !formData.description.trim()) {
            setError('HSN code and description are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editingHSN) await mastersApi.updateHSN(editingHSN.id, formData);
            else await mastersApi.createHSN(formData);
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (hsn: HSN) => {
        if (!confirm(`Delete HSN "${hsn.hsn_code}"?`)) return;
        try {
            await mastersApi.deleteHSN(hsn.id);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete');
        }
    };

    const filtered = hsnCodes.filter(h =>
        h.hsn_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Prerequisite Warning */}
            <MasterDataWarning
                masterType="HSN Codes"
                missingPrerequisites={missingPrerequisites}
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">HSN Codes</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage HSN codes with GST rates.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    disabled={!canCreate}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium shadow-lg transition-all ${!canCreate
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-500/25 hover:shadow-xl'
                        }`}
                    title={!canCreate ? 'GST slabs must be created first' : 'Add HSN Code'}
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>Add HSN Code
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600">tag</span>
                        </div>
                        <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{hsnCodes.length}</p><p className="text-xs text-slate-500">Total HSN Codes</p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">percent</span>
                        </div>
                        <div><p className="text-2xl font-bold text-green-600">{hsnCodes.filter(h => h.gst_rate === 5).length}</p><p className="text-xs text-slate-500">5% GST</p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">percent</span>
                        </div>
                        <div><p className="text-2xl font-bold text-blue-600">{hsnCodes.filter(h => h.gst_rate === 12).length}</p><p className="text-xs text-slate-500">12% GST</p></div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><span className="material-symbols-outlined text-[20px]">search</span></span>
                    <input type="text" placeholder="Search HSN codes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div></div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center"><span className="material-symbols-outlined text-5xl text-slate-300 mb-3">tag</span><h3 className="text-lg font-medium text-slate-900 dark:text-white">No HSN codes found</h3></div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">HSN Code</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">GST %</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">CGST</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">SGST</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filtered.map((hsn, i) => (
                                <tr key={hsn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                                    <td className="px-6 py-4"><span className="font-mono font-semibold text-amber-600">{hsn.hsn_code}</span></td>
                                    <td className="px-6 py-4"><span className="text-slate-900 dark:text-white">{hsn.description}</span></td>
                                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-medium">{hsn.gst_rate}%</span></td>
                                    <td className="px-6 py-4 text-center text-slate-600">{hsn.cgst_rate}%</td>
                                    <td className="px-6 py-4 text-center text-slate-600">{hsn.sgst_rate}%</td>
                                    <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 text-xs rounded-full ${hsn.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{hsn.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => openEditModal(hsn)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                            <button onClick={() => handleDelete(hsn)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingHSN ? 'Edit HSN Code' : 'Add HSN Code'}</h2></div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 text-sm">{error}</div>}
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">HSN Code *</label><input type="text" value={formData.hsn_code} onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })} placeholder="e.g., 3004" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" /></div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GST Slab *</label>
                                    <select
                                        value={formData.gst_slab_id}
                                        onChange={(e) => handleGSTSlabChange(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                                    >
                                        <option value="">Select GST Slab</option>
                                        {gstSlabs.map((slab: any) => (
                                            <option key={slab.id} value={slab.id}>
                                                {slab.rate}% - {slab.description || `GST ${slab.rate}%`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description *</label><input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Medicaments" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" /></div>

                            {/* Auto-derived GST rates (read-only) */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3">
                                    <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                                    GST rates are auto-calculated from selected slab
                                </p>
                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total GST</label>
                                        <div className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <span className="font-bold text-blue-600">{formData.gst_rate}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">CGST</label>
                                        <div className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{formData.cgst_rate}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">SGST</label>
                                        <div className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{formData.sgst_rate}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">IGST</label>
                                        <div className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{formData.igst_rate}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">Cancel</button>
                            <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
