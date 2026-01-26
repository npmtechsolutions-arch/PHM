import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import { usePermissions } from '../../contexts/PermissionContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import UniversalListPage from '../../components/UniversalListPage';
import StatCard from '../../components/StatCard';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { type Column } from '../../components/Table';
import Drawer from '../../components/Drawer';
import ConfirmationModal from '../../components/ConfirmationModal';
import Input from '../../components/Input';

interface HSN {
    id: string;
    hsn_code: string;
    description: string;
    gst_slab_id?: string;
    gst_rate: number;
    cgst_rate: number;
    sgst_rate: number;
    igst_rate: number;
    is_active: boolean;
    created_at: string;
}

export default function HSNCodesPage() {
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { getMaster, isLoading: mastersLoading } = useMasterData();
    const gstSlabs = getMaster('gst_slabs');

    // Debug log to identify why GST slabs might not be loading
    console.log('GST Slabs Debug:', { mastersLoading, gstSlabs, count: gstSlabs?.length });

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
        igst_rate: 0,
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        if (user && !hasPermission('hsn.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, [currentPage, pageSize, searchTerm]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listHSN({
                page: currentPage,
                size: pageSize,
                search: searchTerm
            });
            if (res.data && Array.isArray(res.data.items)) {
                setHsnCodes(res.data.items);
                setTotalItems(res.data.total || 0);
            } else {
                // Fallback for safety
                setHsnCodes([]);
                setTotalItems(0);
            }
        } catch (err) {
            console.error('Failed to load HSN codes:', err);
            setHsnCodes([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingHSN(null);
        setFormData({
            hsn_code: '', description: '', gst_slab_id: '',
            gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, is_active: true
        });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (hsn: HSN) => {
        setEditingHSN(hsn);
        setFormData({
            hsn_code: hsn.hsn_code, description: hsn.description, gst_slab_id: hsn.gst_slab_id || '',
            gst_rate: hsn.gst_rate, cgst_rate: hsn.cgst_rate, sgst_rate: hsn.sgst_rate, igst_rate: hsn.igst_rate,
            is_active: hsn.is_active
        });
        setError('');
        setShowModal(true);
    };

    // handleToggleStatus removed - unused

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

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [hsnToDelete, setHsnToDelete] = useState<HSN | null>(null);

    const handleDeleteClick = (hsn: HSN) => {
        setHsnToDelete(hsn);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!hsnToDelete) return;

        try {
            await mastersApi.deleteHSN(hsnToDelete.id);
            window.toast?.success('HSN Code deleted successfully');
            loadData();
        } catch (err: any) {
            console.error('Failed to delete HSN Code:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete HSN Code');
        } finally {
            setIsDeleteModalOpen(false);
            setHsnToDelete(null);
        }
    };



    const stats = {
        total: totalItems,
        gst5: hsnCodes.filter(h => h.gst_rate === 5).length,
        gst12: hsnCodes.filter(h => h.gst_rate === 12).length
    };

    const columns: Column<HSN>[] = [
        {
            header: 'HSN Code',
            key: 'hsn_code',
            render: (hsn) => <span className="font-mono font-semibold text-amber-600 dark:text-amber-500">{hsn.hsn_code}</span>
        },
        {
            header: 'Description',
            key: 'description',
            render: (hsn) => <span className="text-slate-900 dark:text-white">{hsn.description}</span>
        },
        {
            header: 'GST %',
            key: 'gst_rate',
            align: 'center',
            render: (hsn) => <Badge variant="warning">{hsn.gst_rate}%</Badge>
        },
        {
            header: 'CGST',
            key: 'cgst_rate',
            align: 'center',
            render: (hsn) => <span className="text-slate-500">{hsn.cgst_rate}%</span>
        },
        {
            header: 'SGST',
            key: 'sgst_rate',
            align: 'center',
            render: (hsn) => <span className="text-slate-500">{hsn.sgst_rate}%</span>
        },
        {
            header: 'Status',
            key: 'is_active',
            align: 'center',
            render: (hsn) => <Badge variant={hsn.is_active ? 'success' : 'secondary'}>{hsn.is_active ? 'Active' : 'Inactive'}</Badge>
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (hsn) => (
                <div className="flex justify-end gap-1">
                    {hasPermission('hsn.edit') && (
                        <Button variant="ghost" onClick={() => openEditModal(hsn)} className="!p-1.5 h-8 w-8 text-blue-600">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                    )}
                    {hasPermission('hsn.delete') && (
                        <Button variant="ghost" onClick={() => handleDeleteClick(hsn)} className="!p-1.5 h-8 w-8 text-red-600">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                    )}
                </div>
            )
        }
    ];



    return (
        <UniversalListPage loading={mastersLoading}>
            <UniversalListPage.Header
                title="HSN Codes"
                subtitle="Manage HSN codes with GST rates."
                actions={
                    hasPermission('hsn.create') && (
                        <Button
                            variant="primary"
                            onClick={openCreateModal}
                            className="bg-gradient-to-r from-amber-600 to-orange-600"
                            icon="add"
                        >
                            Add HSN Code
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total HSN Codes" value={stats.total} icon="tag" isActive={true} />
                <StatCard title="5% GST Items" value={stats.gst5} icon="percent" trend="neutral" />
                <StatCard title="12% GST Items" value={stats.gst12} icon="percent" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={hsnCodes}
                loading={loading}
                emptyMessage="No HSN codes found."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(totalItems / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: totalItems,
                    pageSize: pageSize,
                    onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="HSN List"
                        count={totalItems}
                        searchProps={{
                            value: searchTerm,
                            onChange: (val) => { setSearchTerm(val); setCurrentPage(1); },
                            placeholder: "Search HSN codes..."
                        }}
                        embedded={true}
                    />
                }
            />

            <Drawer
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingHSN ? 'Edit HSN Code' : 'Add HSN Code'}
                subtitle={editingHSN ? 'Update HSN code information' : 'Create a new HSN code'}
                width="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" form="hsn-code-form" loading={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                }
            >
                <form id="hsn-code-form" onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="HSN Code" value={formData.hsn_code} onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })} placeholder="e.g. 3004" required />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                GST Slab <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.gst_slab_id}
                                onChange={(e) => handleGSTSlabChange(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            >
                                <option value="">Select GST Slab</option>
                                {gstSlabs.map((slab: any) => (
                                    <option key={slab.id} value={slab.id}>
                                        {slab.rate}% GST{slab.description ? ` - ${slab.description}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Medicaments" required />

                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">info</span>
                            Auto-calculated Tax Rates
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center">
                                <label className="text-[10px] uppercase text-slate-500 font-bold block">Total</label>
                                <div className="mt-1 font-mono font-bold text-amber-600 dark:text-amber-400">{formData.gst_rate}%</div>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center">
                                <label className="text-[10px] uppercase text-slate-500 font-bold block">CGST</label>
                                <div className="mt-1 font-mono text-slate-700 dark:text-slate-300">{formData.cgst_rate}%</div>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center">
                                <label className="text-[10px] uppercase text-slate-500 font-bold block">SGST</label>
                                <div className="mt-1 font-mono text-slate-700 dark:text-slate-300">{formData.sgst_rate}%</div>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center">
                                <label className="text-[10px] uppercase text-slate-500 font-bold block">IGST</label>
                                <div className="mt-1 font-mono text-slate-700 dark:text-slate-300">{formData.igst_rate}%</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                            Active Status
                        </label>
                    </div>
                </form>
            </Drawer>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete HSN Code"
                message={`Are you sure you want to delete HSN Code "${hsnToDelete?.hsn_code}"? This action cannot be undone.`}
                confirmText="Delete HSN Code"
            />
        </UniversalListPage>
    );
}
