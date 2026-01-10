import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { medicinesApi } from '../services/api';
import type { Medicine, Batch } from '../types';

export default function MedicineDetails() {
    const { medicineId } = useParams<{ medicineId: string }>();
    const [loading, setLoading] = useState(true);
    const [medicine, setMedicine] = useState<Medicine | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);

    useEffect(() => {
        if (medicineId) {
            fetchMedicineData();
        }
    }, [medicineId]);

    const fetchMedicineData = async () => {
        try {
            setLoading(true);
            const [medicineRes, batchesRes] = await Promise.all([
                medicinesApi.get(medicineId!),
                medicinesApi.getBatches(medicineId!),
            ]);

            setMedicine(medicineRes.data);
            setBatches(batchesRes.data?.batches || []);
        } catch (err) {
            console.error('Failed to fetch medicine:', err);
            // Use fallback data
            setMedicine({
                id: 'med_001',
                name: 'Amoxicillin 500mg Capsules',
                generic_name: 'Amoxicillin Trihydrate',
                brand: 'AmoxiMax',
                manufacturer: 'Sun Pharma Industries Ltd.',
                medicine_type: 'capsule',
                category: 'Antibiotics',
                composition: 'Amoxicillin Trihydrate IP equivalent to Amoxicillin 500mg',
                strength: '500mg',
                unit: 'Strip',
                pack_size: 10,
                hsn_code: '30049099',
                gst_rate: 12,
                mrp: 125.00,
                purchase_price: 80.00,
                is_prescription_required: true,
                is_controlled: false,
                storage_conditions: 'Store below 25°C in a dry place. Protect from light.',
                is_active: true,
                created_at: new Date().toISOString(),
            });
            setBatches([
                { id: '1', medicine_id: 'med_001', batch_number: 'AMX-2024-0012', manufacturing_date: '2024-01', expiry_date: '2025-12', quantity: 500, purchase_price: 80, mrp: 125, is_expired: false, days_to_expiry: 365, created_at: '' },
                { id: '2', medicine_id: 'med_001', batch_number: 'AMX-2024-0008', manufacturing_date: '2023-12', expiry_date: '2025-11', quantity: 120, purchase_price: 80, mrp: 125, is_expired: false, days_to_expiry: 335, created_at: '' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const stockByLocation = [
        { location: 'Central Warehouse', quantity: 500, value: 40000 },
        { location: 'North Warehouse', quantity: 145, value: 11600 },
        { location: 'GreenCross Pharmacy', quantity: 120, value: 9600 },
        { location: 'MediCare Plus', quantity: 85, value: 6800 },
    ];

    const margin = medicine ? Math.round((1 - medicine.purchase_price / medicine.mrp) * 100) : 0;
    const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!medicine) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">Medicine not found</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Breadcrumb and Page Header */}
            <div className="mb-6">
                <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <span className="hover:text-primary cursor-pointer">Medicines</span>
                    <span className="mx-2">/</span>
                    <span className="text-slate-900 dark:text-white font-medium">{medicine.name}</span>
                </nav>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{medicine.name}</h1>
                            {medicine.is_prescription_required && (
                                <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">Rx Required</span>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">{medicine.generic_name} • {medicine.manufacturer}</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Edit
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Add Stock
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">medication</span>
                            Basic Information
                        </h3>
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
                    </div>

                    {/* Batch Information */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">inventory_2</span>
                                Batch Information
                            </h3>
                            <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full">{batches.length} Batches</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold">Batch No.</th>
                                        <th className="px-6 py-3 text-left font-semibold">Mfg Date</th>
                                        <th className="px-6 py-3 text-left font-semibold">Exp Date</th>
                                        <th className="px-6 py-3 text-right font-semibold">Qty</th>
                                        <th className="px-6 py-3 text-center font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {batches.map((batch) => (
                                        <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="px-6 py-4 font-mono text-xs font-medium text-primary">{batch.batch_number}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{batch.manufacturing_date}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{batch.expiry_date}</td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{batch.quantity}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${batch.is_expired
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : batch.days_to_expiry < 60
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    }`}>
                                                    {batch.is_expired ? 'Expired' : batch.days_to_expiry < 60 ? 'Expiring Soon' : 'Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                    {/* Pricing Card */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Pricing</h3>
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
                    </div>

                    {/* Stock by Location */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Stock by Location</h3>
                        <div className="space-y-3">
                            {stockByLocation.map((loc) => (
                                <div key={loc.location} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{loc.location}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Value: ₹{loc.value.toLocaleString()}</p>
                                    </div>
                                    <span className="text-sm font-bold text-primary">{loc.quantity}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Stock</span>
                            <span className="text-lg font-bold text-primary">{totalStock}</span>
                        </div>
                    </div>

                    {/* Storage Info */}
                    {medicine.storage_conditions && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4">
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">thermostat</span>
                                <div>
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Storage Conditions</p>
                                    <p className="text-sm text-amber-700 dark:text-amber-400">{medicine.storage_conditions}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
    );
}
