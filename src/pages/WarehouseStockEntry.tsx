import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicinesApi, inventoryApi, racksApi } from '../services/api';
import { useOperationalContext } from '../contexts/OperationalContext';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import SearchableSelect from '../components/SearchableSelect';
import Button from '../components/Button';
import Badge from '../components/Badge';

interface Medicine {
    id: string;
    name: string;
    generic_name: string;
    manufacturer: string;
    brand?: string;
    mrp: number;
    purchase_price: number;
}

interface Batch {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    mrp: number;
}

export default function WarehouseStockEntry() {
    const navigate = useNavigate();
    const { activeEntity } = useOperationalContext();

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [existingBatches, setExistingBatches] = useState<Batch[]>([]);
    const [racks, setRacks] = useState<any[]>([]); // Added racks state

    // Derived from context
    const warehouseId = activeEntity?.type === 'warehouse' ? activeEntity.id : '';
    const warehouseName = activeEntity?.type === 'warehouse' ? activeEntity.name : '';

    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [quantity, setQuantity] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [rackName, setRackName] = useState('');
    const [rackNumber, setRackNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [recentEntries, setRecentEntries] = useState<any[]>([]);
    const [selectedExistingBatch, setSelectedExistingBatch] = useState('');

    useEffect(() => {
        if (!activeEntity || activeEntity.type !== 'warehouse') {
            navigate('/');
        }
    }, [activeEntity, navigate]);

    useEffect(() => {
        if (activeEntity?.type === 'warehouse') {
            loadMedicines();
            loadRacks(); // Load racks
        }
    }, [activeEntity]);

    useEffect(() => {
        if (selectedMedicine) {
            loadExistingBatches(selectedMedicine);
        } else {
            setExistingBatches([]);
        }
        setBatchNumber('');
        setExpiryDate('');
        setPurchasePrice('');
        setSelectedExistingBatch('');
    }, [selectedMedicine]);

    const loadMedicines = async () => {
        try {
            const response = await medicinesApi.list({ size: 100 });
            setMedicines(response.data.items || response.data);
        } catch (error) {
            console.error('Error loading medicines:', error);
        }
    };

    const loadExistingBatches = async (medicineId: string) => {
        try {
            const response = await medicinesApi.getBatches(medicineId);
            let batchesData: Batch[] = [];
            if (response.data) {
                if (Array.isArray(response.data)) {
                    batchesData = response.data;
                } else if (response.data.items && Array.isArray(response.data.items)) {
                    batchesData = response.data.items;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    batchesData = response.data.data;
                }
            }
            setExistingBatches(batchesData);
        } catch (error) {
            console.error('Error loading batches:', error);
            setExistingBatches([]);
        }
    };

    const loadRacks = async () => {
        try {
            const response = await racksApi.list({ size: 100 });
            setRacks(response.data.items || []);
        } catch (error) {
            console.error('Error loading racks:', error);
        }
    };

    const handleExistingBatchSelect = (batchId: string) => {
        setSelectedExistingBatch(batchId);
        if (batchId) {
            const batch = existingBatches.find(b => b.id === batchId);
            if (batch) {
                setBatchNumber(batch.batch_number);
                setExpiryDate(batch.expiry_date);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!warehouseId || !selectedMedicine || !batchNumber || !expiryDate || !quantity) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        setLoading(true);
        try {
            const stockData = {
                warehouse_id: warehouseId,
                medicine_id: selectedMedicine,
                batch_number: batchNumber,
                expiry_date: expiryDate,
                quantity: parseInt(quantity),
                purchase_price: parseFloat(purchasePrice) || 0,
                rack_name: rackName || undefined,
                rack_number: rackNumber || undefined
            };

            await inventoryApi.stockEntry(stockData);

            const medicine = medicines.find(m => m.id === selectedMedicine);

            setRecentEntries(prev => [{
                medicine: medicine?.name,
                batch: batchNumber,
                quantity: parseInt(quantity),
                rack: rackNumber && rackName ? `${rackNumber} / ${rackName}` : (rackNumber || rackName),
                timestamp: new Date().toLocaleTimeString()
            }, ...prev.slice(0, 9)]);

            setMessage({ type: 'success', text: 'Stock entry added successfully' });
            setQuantity('');
            setPurchasePrice('');
            setRackName('');
            setRackNumber('');
            setBatchNumber('');
            setExpiryDate('');
            setSelectedMedicine('');
            setSelectedExistingBatch('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add stock entry' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageLayout
            title="Warehouse Stock Entry"
            description="Add new inventory items to your warehouse"
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Add Stock" icon="add_circle">
                    {message.text && (
                        <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${message.type === 'error'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                            }`}>
                            <span className="material-symbols-outlined text-[20px] mt-0.5">
                                {message.type === 'error' ? 'error' : 'check_circle'}
                            </span>
                            <p>{message.text}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Warehouse</label>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">warehouse</span>
                                {warehouseName}
                            </div>
                        </div>

                        <div>
                            <SearchableSelect
                                label="Medicine *"
                                value={selectedMedicine}
                                onChange={(val) => setSelectedMedicine(val)}
                                required
                                options={medicines.map(med => ({
                                    value: med.id,
                                    label: `${med.name} ${med.brand ? `(${med.brand})` : ''} - ${med.manufacturer}`
                                }))}
                                placeholder="Select Medicine"
                            />
                            {selectedMedicine && (() => {
                                const med = medicines.find(m => m.id === selectedMedicine);
                                return med ? (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm grid grid-cols-2 gap-2">
                                        <div className="flex justify-between col-span-2 border-b border-blue-200 dark:border-blue-800 pb-2 mb-1">
                                            <span className="text-slate-500">Brand:</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{med.brand || '-'} ({med.manufacturer})</span>
                                        </div>
                                        <div className="flex justify-between"><span className="text-slate-500">Generic:</span> <span className="font-medium text-slate-900 dark:text-white">{med.generic_name}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">MRP:</span> <span className="font-medium text-slate-900 dark:text-white">₹{med.mrp}</span></div>
                                    </div>
                                ) : null;
                            })()}
                        </div>

                        {existingBatches.length > 0 && (
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <Select
                                    label="Quick Fill from Existing Batch (Optional)"
                                    value={selectedExistingBatch}
                                    onChange={(e) => handleExistingBatchSelect(e.target.value)}
                                    placeholder="-- Use new batch details below --"
                                    options={existingBatches.map(b => ({
                                        value: b.id,
                                        label: `${b.batch_number} (Exp: ${b.expiry_date})`
                                    }))}
                                    className="!bg-white"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Batch Number *"
                                value={batchNumber}
                                onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                                placeholder="New or Existing Batch Number"
                                required
                                disabled={!selectedMedicine}
                                className="font-mono"
                            />
                            <Input
                                label="Expiry Date *"
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                required
                                disabled={!selectedMedicine}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Quantity *"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="Enter quantity"
                                min="1"
                                required
                            />
                            <Input
                                label="Purchase Price (₹) *"
                                type="number"
                                step="0.01"
                                value={purchasePrice}
                                onChange={(e) => setPurchasePrice(e.target.value)}
                                placeholder="Enter purchase price"
                                min="0"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Rack No"
                                value={racks.find(r => r.rack_number === rackNumber)?.id || ''} // Bind by finding ID that matches current number
                                onChange={(e) => {
                                    const selectedRack = racks.find(r => r.id === e.target.value);
                                    if (selectedRack) {
                                        setRackNumber(selectedRack.rack_number);
                                    }
                                }}
                                options={racks.map(r => ({
                                    value: r.id,
                                    label: `${r.rack_number} - ${r.rack_name}`
                                }))}
                                placeholder="Select Rack"
                            />
                            <Input
                                label="Box No"
                                value={rackName}
                                onChange={(e) => setRackName(e.target.value)}
                                placeholder="e.g., B-05"
                            />
                        </div>

                        <Button type="submit" variant="primary" loading={loading} className="w-full justify-center">
                            Add Stock Entry
                        </Button>
                    </form>
                </Card>

                <Card title="Recent Entries" icon="history" className="h-fit">
                    {recentEntries.length > 0 ? (
                        <ul className="space-y-4">
                            {recentEntries.map((entry, index) => (
                                <li key={index} className="flex justify-between items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 animate-fadeIn">
                                    <div className="space-y-1">
                                        <div className="font-medium text-slate-900 dark:text-white">{entry.medicine}</div>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                                Batch: {entry.batch}
                                            </span>
                                            {entry.rack && (
                                                <Badge variant="info" className="!py-0.5">
                                                    📍 {entry.rack}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-600">+ {entry.quantity}</div>
                                        <div className="text-xs text-slate-400 mt-1">{entry.timestamp}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">post_add</span>
                            <p>No recent entries</p>
                            <p className="text-sm opacity-75">Added stock will appear here</p>
                        </div>
                    )}
                </Card>
            </div>
        </PageLayout>
    );
}
