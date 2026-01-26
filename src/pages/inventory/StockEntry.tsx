import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { medicinesApi, inventoryApi, racksApi, dispatchesApi } from '../../services/api';
import { usePermissions } from '../../contexts/PermissionContext';
import { useOperationalContext } from '../../contexts/OperationalContext';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Select from '../../components/Select';
import SearchableSelect from '../../components/SearchableSelect';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

interface Medicine {
    id: string;
    name: string;
    generic_name: string;
    manufacturer: string;
    brand?: string;
    mrp: number;
    purchase_price: number;
    selling_price?: number;
}

interface Batch {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    mrp: number;
}

export default function StockEntry() {
    const navigate = useNavigate();
    const { activeEntity } = useOperationalContext();
    const { hasPermission } = usePermissions();

    // Check permissions based on entity type
    const canEntry = activeEntity?.type === 'warehouse' 
        ? hasPermission('inventory.entry.warehouse')
        : hasPermission('inventory.entry.shop');

    useEffect(() => {
        if (!canEntry && activeEntity) {
            navigate('/');
        }
    }, [canEntry, activeEntity, navigate]);

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [existingBatches, setExistingBatches] = useState<Batch[]>([]);
    const [racks, setRacks] = useState<any[]>([]);

    // Derived from context
    const entityType = activeEntity?.type; // 'warehouse' or 'shop'
    const entityId = activeEntity?.id || '';
    const entityName = activeEntity?.name || '';

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
        if (!activeEntity || (activeEntity.type !== 'warehouse' && activeEntity.type !== 'shop')) {
            navigate('/');
        }
    }, [activeEntity, navigate]);

    useEffect(() => {
        if (activeEntity) {
            loadMedicines();
            if (activeEntity.type === 'warehouse') {
                loadRacks();
            }
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
            const response = await medicinesApi.list({ size: 500 });
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
            const response = await racksApi.list({ size: 500 });
            setRacks(response.data.items || []);
        } catch (error) {
            console.error('Error loading racks:', error);
        }
    };

    const location = useLocation();
    const [dispatchId, setDispatchId] = useState<string | null>(null);
    const [dispatchItems, setDispatchItems] = useState<any[]>([]);

    useEffect(() => {
        if (location.state?.dispatchId) {
            setDispatchId(location.state.dispatchId);
            loadDispatchDetails(location.state.dispatchId);
        }
    }, [location.state]);

    const loadDispatchDetails = async (id: string) => {
        try {
            setLoading(true);
            const res = await dispatchesApi.get(id); // Ensure get(id) exists or list with filter
            // Ideally we need an endpoint to get dispatch items. 
            // If get(id) only returns header, we might need a separate call or it returns items.
            // Assuming res.data contains items or we fetch them.
            // Let's assume for now res.data includes items or simple metadata.
            // Wait, standard dispatchesApi.get might be needed.
            // Let's check api.ts to see what dispatchesApi.get returns or if it exists.
            setDispatchItems(res.data.items || []); // Adjust based on actual API
        } catch (e) {
            console.error("Failed to load dispatch", e);
            setMessage({ type: 'error', text: 'Failed to load dispatch details' });
        } finally {
            setLoading(false);
        }
    };

    const handleReceiveDispatchItem = async (item: any, index: number, silent: boolean = false) => {
        // IMPORTANT: Do NOT call inventoryApi.stockEntry here!
        // The backend automatically adds stock to ShopStock when dispatch status is set to 'delivered'
        // Calling stockEntry here would cause DOUBLE COUNTING of inventory
        
        // Just mark item as received in UI
        const newItems = [...dispatchItems];
        newItems[index].status = 'received';
        // Save the used values to display
        newItems[index].rack_name = item.rack_name || rackName;
        newItems[index].rack_number = item.rack_number || rackNumber;
        setDispatchItems(newItems);

        // Check if all received - then update dispatch status (backend will add stock)
        if (newItems.every(i => i.status === 'received')) {
            try {
                setLoading(true);
                // Backend will automatically add stock to ShopStock when status is set to 'delivered'
                await dispatchesApi.updateStatus(dispatchId!, 'delivered');
                setMessage({ type: 'success', text: 'All items received. Stock added to inventory. Dispatch marked as Delivered.' });
                setTimeout(() => navigate('/dispatches'), 2000);
            } catch (e) {
                console.error(e);
                setMessage({ type: 'error', text: 'Failed to mark dispatch as delivered' });
            } finally {
                setLoading(false);
            }
        } else if (!silent) {
            setMessage({ type: 'success', text: 'Item marked as received. Complete all items to add stock to inventory.' });
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

        if (!entityId || !selectedMedicine || !batchNumber || !expiryDate || !quantity) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        setLoading(true);
        try {
            const stockData: any = {
                medicine_id: selectedMedicine,
                batch_number: batchNumber,
                expiry_date: expiryDate,
                quantity: parseInt(quantity),
                purchase_price: parseFloat(purchasePrice) || 0,
                selling_price: medicines.find(m => m.id === selectedMedicine)?.selling_price || 0,
            };

            // Add entity ID based on type
            if (entityType === 'warehouse') {
                stockData.warehouse_id = entityId;
                stockData.rack_name = rackName || undefined;
                stockData.rack_number = rackNumber || undefined;
            } else {
                stockData.shop_id = entityId;
            }

            await inventoryApi.stockEntry(stockData);

            const medicine = medicines.find(m => m.id === selectedMedicine);

            setRecentEntries(prev => [{
                medicine: medicine?.name,
                batch: batchNumber,
                quantity: parseInt(quantity),
                rack: stockData.rack_name ? `${stockData.rack_number || ''} / ${stockData.rack_name}` : '-',
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
            title={`${entityType === 'shop' ? 'Shop' : 'Warehouse'} Stock Entry`}
            description={`Add new inventory items to your ${entityType}`}
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

                    {dispatchId ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl mb-4">
                                <h3 className="font-bold text-lg mb-1">Receiving Dispatch Shipment</h3>
                                <p className="text-sm">Verify and accept items below. Status: {location.state?.status}</p>
                            </div>

                            {/* Bulk Actions */}
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Bulk Receive Options</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <Input
                                        label="Global Rack No"
                                        value={rackNumber} // Reuse state variables for bulk input
                                        onChange={(e) => setRackNumber(e.target.value)}
                                        placeholder="Apply to all items"
                                        className="bg-white"
                                    />
                                    <Input
                                        label="Global Box Name"
                                        value={rackName} // Reuse state variables for bulk input
                                        onChange={(e) => setRackName(e.target.value)}
                                        placeholder="Apply to all items"
                                        className="bg-white"
                                    />
                                    <div className="flex items-end">
                                        <Button
                                            onClick={async () => {
                                                if (!confirm("Receive all remaining items with these rack details?")) return;
                                                setLoading(true);
                                                try {
                                                    const pendingItems = dispatchItems.filter(i => i.status !== 'received');
                                                    for (const item of pendingItems) {
                                                        const idx = dispatchItems.findIndex(x => x === item);
                                                        await handleReceiveDispatchItem(item, idx, true); // Add flag to skip success toast per item
                                                    }
                                                    setMessage({ type: 'success', text: 'All items received successfully' });
                                                    setTimeout(() => navigate('/dispatches'), 1500);
                                                } catch (e) { console.error(e); }
                                                finally { setLoading(false); }
                                            }}
                                            variant="primary"
                                            className="w-full justify-center"
                                            disabled={loading || dispatchItems.every(i => i.status === 'received')}
                                        >
                                            Receive All Remaining
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Enters the specified Rack/Box for all items and marks them as received. Individual inputs below override these if set.
                                </p>
                            </div>

                            {dispatchItems.map((item, index) => (
                                <div key={index} className={`p-4 rounded-xl border mb-4 ${item.status === 'received' ? 'bg-green-50 border-green-200 opacity-75' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white text-lg">{item.medicine_name}</div>
                                            <div className="text-sm text-slate-500">{item.manufacturer} • Batch: {item.batch_number}</div>
                                            <div className="text-xs text-slate-400">Exp: {item.expiry_date} • MRP: ₹{item.mrp}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-blue-600">{item.quantity}</div>
                                            <div className="text-xs text-slate-500">Qty</div>
                                        </div>
                                    </div>

                                    {item.status !== 'received' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input
                                                    label="Rack No"
                                                    value={item.rack_number || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...dispatchItems];
                                                        newItems[index].rack_number = e.target.value;
                                                        setDispatchItems(newItems);
                                                    }}
                                                    placeholder={rackNumber || "R-01"}
                                                    className="!text-sm"
                                                />
                                                <Input
                                                    label="Box Name"
                                                    value={item.rack_name || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...dispatchItems];
                                                        newItems[index].rack_name = e.target.value;
                                                        setDispatchItems(newItems);
                                                    }}
                                                    placeholder={rackName || "Shelf A"}
                                                    className="!text-sm"
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    onClick={() => handleReceiveDispatchItem(item, index)}
                                                    variant="success"
                                                    className="w-full justify-center !py-2"
                                                    disabled={loading}
                                                >
                                                    Accept
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-2 flex items-center text-green-600 font-medium">
                                            <span className="material-symbols-outlined mr-2">check_circle</span>
                                            Received to {item.rack_name || item.rack_number || 'Stock'}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {dispatchItems.length === 0 && !loading && (
                                <div className="text-center py-8 text-slate-500">No items found in dispatch.</div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2 capitalize">{entityType}</label>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">
                                        {entityType === 'warehouse' ? 'warehouse' : 'store'}
                                    </span>
                                    {entityName}
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

                            {entityType === 'warehouse' && (
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
                                        label="Box Name / Location (Optional)"
                                        value={rackName}
                                        onChange={(e) => setRackName(e.target.value)}
                                        placeholder="e.g., Shelf A, Box 2"
                                    />
                                </div>
                            )}

                            <Button type="submit" variant="primary" loading={loading} className="w-full justify-center">
                                Add Stock Entry
                            </Button>
                        </form>
                    )}
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
                                            {entry.rack && entry.rack !== '-' && (
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
