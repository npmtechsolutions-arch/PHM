import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicinesApi, inventoryApi } from '../services/api';
import { useOperationalContext } from '../contexts/OperationalContext';
import SearchableSelect from '../components/SearchableSelect';

interface Medicine {
    id: string;
    name: string;
    generic_name: string;
    manufacturer: string;
    brand?: string;
}

interface Batch {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
}

export default function StockAdjustment() {
    const navigate = useNavigate();
    const { activeEntity } = useOperationalContext();

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [batchesLoading, setBatchesLoading] = useState(false);

    // Form State
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('decrease');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Load Medicines on mount
    useEffect(() => {
        loadMedicines();
    }, []);

    // Load Batches when Medicine is selected
    useEffect(() => {
        if (selectedMedicine) {
            loadBatches(selectedMedicine);
            setSelectedBatch('');
        } else {
            setBatches([]);
            setBatchesLoading(false);
        }
    }, [selectedMedicine]);

    const loadMedicines = async () => {
        try {
            const response = await medicinesApi.list({ size: 500 });
            setMedicines(response.data.items || response.data);
        } catch (error) {
            console.error('Error loading medicines:', error);
        }
    };

    const loadBatches = async (medicineId: string) => {
        setBatchesLoading(true);
        try {
            console.log('Loading batches for medicine:', medicineId);
            const response = await medicinesApi.getBatches(medicineId);
            console.log('Batches API response:', response.data);
            // API returns: { medicine_id: "...", batches: [...] }
            const batchesData = response.data?.batches || [];
            console.log('Extracted batches:', batchesData);
            setBatches(batchesData);

            if (batchesData.length === 0) {
                setMessage({ type: 'error', text: 'No batches found for this medicine. Please add stock first.' });
            } else {
                // Clear any previous error messages
                if (message.type === 'error' && message.text.includes('No batches')) {
                    setMessage({ type: '', text: '' });
                }
            }
        } catch (error: any) {
            console.error('Error loading batches:', error);
            console.error('Error details:', error.response?.data);
            setBatches([]);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to load batches' });
        } finally {
            setBatchesLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedMedicine || !selectedBatch || !quantity || !reason) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await inventoryApi.adjustStock({
                medicine_id: selectedMedicine,
                batch_id: selectedBatch,
                adjustment_type: adjustmentType,
                quantity: parseInt(quantity),
                reason: reason
            });

            setMessage({ type: 'success', text: 'Stock adjusted successfully' });
            // Reset form
            setQuantity('');
            setReason('');
            // Reload batches to reflect new quantity (if displayed)
            loadBatches(selectedMedicine);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to adjust stock' });
        } finally {
            setLoading(false);
        }
    };

    const selectedBatchDetails = batches.find(b => b.id === selectedBatch);

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fadeIn">
            <button
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
            >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                <span>Back to Inventory</span>
            </button>

            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">📉 Stock Adjustment</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Correct stock levels for damages, expiry, or corrections.</p>
                {activeEntity && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                        <span className="material-symbols-outlined text-[18px]">
                            {activeEntity.type === 'warehouse' ? 'warehouse' : 'storefront'}
                        </span>
                        <span>{activeEntity.name}</span>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">

                {message.text && (
                    <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${message.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                        }`}>
                        <span className="material-symbols-outlined text-[20px] mt-0.5">
                            {message.type === 'error' ? 'error' : 'check_circle'}
                        </span>
                        <p>{message.text}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Medicine Selection */}
                        <div>
                            <SearchableSelect
                                label="Medicine *"
                                value={selectedMedicine}
                                onChange={(val) => setSelectedMedicine(val)}
                                required
                                options={medicines.map(med => ({
                                    value: med.id,
                                    label: `${med.name} ${med.brand ? `(${med.brand})` : ''}`
                                }))}
                                placeholder="Select Medicine"
                            />
                        </div>

                        {/* Batch Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Batch *</label>
                            <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                required
                                disabled={!selectedMedicine || batchesLoading}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                            >
                                <option value="">
                                    {!selectedMedicine
                                        ? 'Select medicine first'
                                        : batchesLoading
                                            ? 'Loading batches...'
                                            : batches.length === 0
                                                ? 'No batches available'
                                                : 'Select Batch'}
                                </option>
                                {batches.map(batch => (
                                    <option key={batch.id} value={batch.id}>
                                        {batch.batch_number} (Stock: {batch.quantity}, Exp: {new Date(batch.expiry_date).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                            {selectedMedicine && batches.length === 0 && !batchesLoading && (
                                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">info</span>
                                    No batches found for this medicine. Add stock first.
                                </p>
                            )}
                        </div>
                    </div>

                    {selectedBatchDetails && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Current Stock</div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{selectedBatchDetails.quantity}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Expiry Date</div>
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">{selectedBatchDetails.expiry_date}</div>
                            </div>
                        </div>
                    )}

                    {/* Adjustment Type & Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Adjustment Type</label>
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentType('decrease')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${adjustmentType === 'decrease'
                                        ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Decrease (-)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentType('increase')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${adjustmentType === 'increase'
                                        ? 'bg-white dark:bg-slate-700 text-green-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Increase (+)
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quantity to Adjust *</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="1"
                                placeholder="Example: 5"
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reason for Adjustment *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Broken in transit, Expired stock removal..."
                            required
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] ${loading
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                                }`}
                        >
                            {loading ? 'Processing Adjustment...' : 'Confirm Adjustment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
