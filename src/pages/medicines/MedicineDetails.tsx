import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { medicinesApi } from '../../services/api';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import { PermissionGate } from '../../components/PermissionGate';
import type { Medicine, Batch } from '../../types';

export default function MedicineDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [medicine, setMedicine] = useState<Medicine | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);

    useEffect(() => {
        if (id) {
            fetchMedicineData();
        }
    }, [id]);

    const fetchMedicineData = async () => {
        try {
            setLoading(true);
            const [medicineRes, batchesRes] = await Promise.all([
                medicinesApi.get(id!),
                medicinesApi.getBatches(id!),
            ]);

            setMedicine(medicineRes.data);
            setBatches(batchesRes.data?.batches || []);
        } catch (err) {
            console.error('Failed to fetch medicine:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!medicine) {
        return (
            <PageLayout title="Medicine Not Found">
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-4xl text-slate-300">medication_off</span>
                    <p className="text-slate-500 mt-2">The requested medicine could not be found.</p>
                    <Button variant="primary" className="mt-4" onClick={() => navigate('/medicines')}>
                        Back to Medicines
                    </Button>
                </div>
            </PageLayout>
        );
    }

    const margin = Math.round((1 - medicine.purchase_price / medicine.mrp) * 100);
    const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);

    return (
        <PageLayout
            title={medicine.name}
            description={`${medicine.generic_name} • ${medicine.manufacturer}`}
            actions={
                <div className="flex gap-3">
                    <PermissionGate permission="medicines.edit">
                        <Button variant="secondary" onClick={() => navigate(`/medicines/${medicine.id}/edit`)}>
                            <span className="material-symbols-outlined text-[18px] mr-2">edit</span>
                            Edit
                        </Button>
                    </PermissionGate>
                    <PermissionGate anyOf={['inventory.entry.warehouse', 'inventory.entry.shop']}>
                        <Button variant="primary" onClick={() => navigate('/warehouses/stock')}>
                            <span className="material-symbols-outlined text-[18px] mr-2">add</span>
                            Add Stock
                        </Button>
                    </PermissionGate>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <Card title="Basic Information" icon="medication">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <InfoItem label="Brand" value={medicine.brand || '-'} />
                            <InfoItem label="Category" value={medicine.category} />
                            <InfoItem label="Type" value={medicine.medicine_type} />
                            <InfoItem label="Strength" value={medicine.strength || '-'} />
                            <InfoItem label="Pack Size" value={`${medicine.pack_size} ${medicine.unit}`} />
                            <InfoItem label="HSN Code" value={medicine.hsn_code || '-'} />
                        </div>
                        {medicine.composition && (
                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Composition</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{medicine.composition}</p>
                            </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                            {medicine.is_prescription_required && (
                                <Badge variant="error" className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">prescription</span>
                                    Rx Required
                                </Badge>
                            )}
                            {medicine.is_controlled && (
                                <Badge variant="warning" className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">warning</span>
                                    Controlled
                                </Badge>
                            )}
                        </div>
                    </Card>

                    {/* Batch Information */}
                    <Card title="Batch Information" icon="inventory_2" padding="0">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Batches: {batches.length}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Batch No.</th>
                                        <th className="px-6 py-3">Mfg Date</th>
                                        <th className="px-6 py-3">Exp Date</th>
                                        <th className="px-6 py-3 text-right">Qty</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {batches.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                No batch information available
                                            </td>
                                        </tr>
                                    ) : (
                                        batches.map((batch) => (
                                            <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-6 py-4 font-mono text-xs font-medium text-primary">{batch.batch_number}</td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{batch.manufacturing_date}</td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{batch.expiry_date}</td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{batch.quantity}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={batch.is_expired ? 'error' : batch.days_to_expiry < 60 ? 'warning' : 'success'}>
                                                        {batch.is_expired ? 'Expired' : batch.days_to_expiry < 60 ? 'Expiring Soon' : 'Active'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                    {/* Pricing Card */}
                    <Card title="Pricing" icon="payments">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">MRP</span>
                                <span className="text-xl font-bold text-slate-900 dark:text-white">₹{medicine.mrp.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Purchase Price</span>
                                <span className="font-medium text-slate-900 dark:text-white">₹{medicine.purchase_price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Profit Margin</span>
                                <span className="font-bold text-green-600 dark:text-green-400">{margin}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">GST Rate</span>
                                <span className="font-medium text-slate-900 dark:text-white">{medicine.gst_rate}%</span>
                            </div>
                        </div>
                    </Card>

                    {/* Stock Summary */}
                    <Card title="Stock Summary" icon="inventory">
                        <div className="flex flex-col items-center justify-center p-4">
                            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{totalStock}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Total Units in Stock</div>
                        </div>
                        {medicine.storage_conditions && (
                            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg p-3">
                                <div className="flex gap-2">
                                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px]">thermostat</span>
                                    <div>
                                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Storage Conditions</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400">{medicine.storage_conditions}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Location Info */}
                    <Card title="Location" icon="location_on">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Rack Name</p>
                                <p className="font-medium">{medicine.rack_name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Rack Number</p>
                                <p className="font-medium">{medicine.rack_number || '-'}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </PageLayout>
    );
}

function InfoItem({ label, value }: { label: string; value: string | undefined }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={value}>{value || '-'}</p>
        </div>
    );
}
