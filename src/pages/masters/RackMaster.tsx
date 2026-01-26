import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { usePermissions } from '../../contexts/PermissionContext';
import { warehousesApi, racksApi } from '../../services/api';
import UniversalListPage from '../../components/UniversalListPage';
import StatCard from '../../components/StatCard';
import Button from '../../components/Button';

import Drawer from '../../components/Drawer';
import ConfirmationModal from '../../components/ConfirmationModal';
import Input from '../../components/Input';
import { type Column } from '../../components/Table';

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
    const { user } = useUser();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [racks, setRacks] = useState<Rack[]>([]);
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWarehouse] = useState('');
    const [newRack, setNewRack] = useState({ rack_name: '', rack_number: '', warehouse_id: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (user && !hasPermission('racks.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [warehouseRes, racksRes] = await Promise.all([
                warehousesApi.list({ size: 500 }),
                racksApi.list({ size: 500 })
            ]);
            setWarehouses(warehouseRes.data.items?.map((w: any) => ({ id: w.id, name: w.name })) || []);
            setRacks(racksRes.data.items || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setNewRack({ rack_name: '', rack_number: '', warehouse_id: '' });
        setError('');
        setShowModal(true);
    };

    // Note: The original file didn't seem to have an Edit function for racks, only Add/Delete.
    // I will stick to that to avoid breaking backend expectations, or just adding new features unprompted.

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

            await loadData();
            setShowModal(false);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to add rack');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [rackToDelete, setRackToDelete] = useState<Rack | null>(null);

    const handleDeleteClick = (rack: Rack) => {
        setRackToDelete(rack);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!rackToDelete) return;

        try {
            await racksApi.delete(rackToDelete.id);
            window.toast?.success('Rack deleted successfully');
            await loadData();
        } catch (err: any) {
            console.error('Failed to delete rack:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete rack');
        } finally {
            setIsDeleteModalOpen(false);
            setRackToDelete(null);
        }
    };

    const filtered = racks.filter(rack => {
        const matchesSearch = !searchTerm ||
            rack.rack_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rack.rack_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWarehouse = !filterWarehouse || rack.warehouse_id === filterWarehouse;
        return matchesSearch && matchesWarehouse;
    });

    const stats = {
        total: racks.length,
        warehouses: new Set(racks.map(r => r.warehouse_id).filter(Boolean)).size
    };

    const columns: Column<Rack>[] = [
        {
            header: 'Rack Name',
            key: 'rack_name',
            render: (rack) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-600 text-[18px]">view_column</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{rack.rack_name}</span>
                </div>
            )
        },
        {
            header: 'Rack Number',
            key: 'rack_number',
            render: (rack) => <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{rack.rack_number}</span>
        },
        {
            header: 'Warehouse',
            key: 'warehouse_name',
            render: (rack) => <span className="text-slate-600 dark:text-slate-400">{rack.warehouse_name || '-'}</span>
        },
        {
            header: 'Created',
            key: 'created_at',
            render: (rack) => <span className="text-sm text-slate-500">{new Date(rack.created_at).toLocaleDateString()}</span>
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (rack) => (
                <div className="flex justify-end gap-1">
                    {hasPermission('racks.delete') && (
                        <Button variant="ghost" onClick={() => handleDeleteClick(rack)} className="!p-1.5 h-8 w-8 text-red-600">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                    )}
                </div>
            )
        }
    ];

    const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Rack Master"
                subtitle="Manage racks for physical stock location."
                actions={
                    hasPermission('racks.create') && (
                        <Button
                            variant="primary"
                            onClick={openAddModal}
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/30"
                            icon="add"
                        >
                            Add Rack
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Racks" value={stats.total} icon="view_column" isActive={true} />
                <StatCard title="Warehouses" value={stats.warehouses} icon="warehouse" trend="neutral" />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="No racks found."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(filtered.length / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: filtered.length,
                    pageSize: pageSize,
                    onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Rack List"
                        count={filtered.length}
                        searchProps={{
                            value: searchTerm,
                            onChange: (val) => { setSearchTerm(val); setCurrentPage(1); },
                            placeholder: "Search racks..."
                        }}
                        embedded={true}
                    />
                }
            />

            <Drawer
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Add New Rack"
                subtitle="Create a new rack for warehouse organization"
                width="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" form="rack-form" loading={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Rack'}
                        </Button>
                    </div>
                }
            >
                <form id="rack-form" onSubmit={handleAddRack} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Rack Name" value={newRack.rack_name} onChange={(e) => setNewRack({ ...newRack, rack_name: e.target.value })} placeholder="e.g., Rack A1" required />
                        <Input label="Rack Number" value={newRack.rack_number} onChange={(e) => setNewRack({ ...newRack, rack_number: e.target.value.toUpperCase() })} placeholder="e.g., RA1" required className="font-mono" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Warehouse
                        </label>
                        <select
                            value={newRack.warehouse_id}
                            onChange={(e) => setNewRack({ ...newRack, warehouse_id: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                            <option value="">Select Warehouse</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                </form>
            </Drawer>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Rack"
                message={`Are you sure you want to delete "${rackToDelete?.rack_name}"? This action cannot be undone.`}
                confirmText="Delete Rack"
            />
        </UniversalListPage>
    );
}
