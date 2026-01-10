import { useState, useEffect } from 'react';
import { warehousesApi, medicinesApi, inventoryApi } from '../services/api';
import { useWarehouseContext } from '../hooks/useEntityContext';

interface Medicine {
    id: string;
    name: string;
    generic_name: string;
    manufacturer: string;
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

interface Warehouse {
    id: string;
    name: string;
    code: string;
}

export default function WarehouseStockEntry() {
    // Entity context - handles role-based warehouse resolution
    const entityContext = useWarehouseContext();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [existingBatches, setExistingBatches] = useState<Batch[]>([]); // For convenience dropdown
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [selectedMedicine, setSelectedMedicine] = useState('');
    // Batch is entered directly (created implicitly with stock)
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [quantity, setQuantity] = useState('');
    // Rack fields - physical storage location
    const [rackName, setRackName] = useState('');  // e.g., "Painkillers Box", "Cold Medicines"
    const [rackNumber, setRackNumber] = useState('');  // e.g., "R-01", "R-2A"
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [recentEntries, setRecentEntries] = useState<any[]>([]);
    const [selectedExistingBatch, setSelectedExistingBatch] = useState('');

    // Initialize with entity context
    useEffect(() => {
        // Super Admin: loads all warehouses for selection
        // Warehouse Admin: auto-applied, but we still load for display
        loadWarehouses();
        loadMedicines();
    }, []);

    // Auto-apply warehouse context for non-Super Admin users
    useEffect(() => {
        if (!entityContext.isSuperAdmin && entityContext.assignedWarehouseId) {
            // Warehouse Admin: auto-select their assigned warehouse
            setSelectedWarehouse(entityContext.assignedWarehouseId);
        }
    }, [entityContext.isSuperAdmin, entityContext.assignedWarehouseId]);

    // Load batches when medicine changes
    useEffect(() => {
        if (selectedMedicine) {
            loadExistingBatches(selectedMedicine);
        } else {
            setExistingBatches([]);
        }
        // Reset batch fields when medicine changes
        setBatchNumber('');
        setExpiryDate('');
        setSelectedExistingBatch('');
    }, [selectedMedicine]);

    const loadWarehouses = async () => {
        try {
            const response = await warehousesApi.list();
            setWarehouses(response.data.items || response.data);
        } catch (error) {
            console.error('Error loading warehouses:', error);
        }
    };

    const loadMedicines = async () => {
        try {
            const response = await medicinesApi.list({ size: 100 });
            setMedicines(response.data.items || response.data);
        } catch (error) {
            console.error('Error loading medicines:', error);
        }
    };

    // Load existing batches for convenience (optional reuse)
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

    // When user selects an existing batch, populate the fields
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

        // Validation: batch_number, expiry_date, quantity are MANDATORY
        if (!selectedWarehouse || !selectedMedicine || !batchNumber || !expiryDate || !quantity) {
            setMessage({ type: 'error', text: 'Please fill all required fields: Warehouse, Medicine, Batch Number, Expiry Date, and Quantity' });
            return;
        }

        setLoading(true);
        try {
            const stockData = {
                warehouse_id: selectedWarehouse,
                medicine_id: selectedMedicine,
                batch_number: batchNumber,  // Batch created implicitly
                expiry_date: expiryDate,     // Batch created implicitly
                quantity: parseInt(quantity),
                rack_name: rackName || undefined,    // Physical storage - e.g., "Painkillers Box"
                rack_number: rackNumber || undefined  // Physical rack - e.g., "R-01"
            };

            await inventoryApi.stockEntry(stockData); // This creates stock + batch implicitly

            const medicine = medicines.find(m => m.id === selectedMedicine);

            setRecentEntries(prev => [{
                medicine: medicine?.name,
                batch: batchNumber,
                quantity: parseInt(quantity),
                rack: rackName ? `${rackName} (${rackNumber})` : rackNumber,
                timestamp: new Date().toLocaleTimeString()
            }, ...prev.slice(0, 9)]);

            setMessage({ type: 'success', text: 'Stock entry added successfully! Batch created/updated.' });
            setQuantity('');
            setRackName('');
            setRackNumber('');
            setBatchNumber('');
            setExpiryDate('');
            setSelectedExistingBatch('');
            // Reload batches to show the newly created one
            if (selectedMedicine) loadExistingBatches(selectedMedicine);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add stock entry' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="warehouse-stock-entry">
            <style>{`
                .warehouse-stock-entry {
                    padding: 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .page-header {
                    margin-bottom: 24px;
                }
                .page-header h1 {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1a1a2e;
                    margin: 0 0 8px 0;
                }
                .page-header p {
                    color: #666;
                    margin: 0;
                }
                .content-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }
                @media (max-width: 768px) {
                    .content-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: 24px;
                }
                .card-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #1a1a2e;
                    margin: 0 0 20px 0;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #eee;
                }
                .form-group {
                    margin-bottom: 16px;
                }
                .form-group label {
                    display: block;
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 6px;
                }
                .form-group select,
                .form-group input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }
                .form-group select:focus,
                .form-group input:focus {
                    outline: none;
                    border-color: #4a6cf7;
                }
                .btn-primary {
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #4a6cf7, #6366f1);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(74, 108, 247, 0.4);
                }
                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                .message {
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                }
                .message.success {
                    background: #d4edda;
                    color: #155724;
                }
                .message.error {
                    background: #f8d7da;
                    color: #721c24;
                }
                .recent-entries {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .recent-entry {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                }
                .recent-entry:last-child {
                    border-bottom: none;
                }
                .entry-info {
                    flex: 1;
                }
                .entry-medicine {
                    font-weight: 500;
                    color: #333;
                }
                .entry-batch {
                    font-size: 12px;
                    color: #666;
                }
                .entry-quantity {
                    font-weight: 600;
                    color: #4a6cf7;
                    font-size: 16px;
                }
                .entry-time {
                    font-size: 12px;
                    color: #999;
                    margin-left: 12px;
                }
                .empty-state {
                    text-align: center;
                    padding: 40px;
                    color: #999;
                }
                .medicine-info {
                    background: #f8f9ff;
                    padding: 12px;
                    border-radius: 8px;
                    margin-top: 8px;
                    font-size: 13px;
                }
                .medicine-info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }
                .medicine-info-row:last-child {
                    margin-bottom: 0;
                }
            `}</style>

            <div className="page-header">
                <h1>📦 Warehouse Stock Entry</h1>
                <p>Add inventory to your warehouse</p>
            </div>

            <div className="content-grid">
                <div className="card">
                    <h2 className="card-title">Add Stock</h2>

                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Warehouse Selector - ONLY visible to Super Admin */}
                        {entityContext.isSuperAdmin ? (
                            <div className="form-group" style={{ background: '#fff7ed', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fdba74' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span style={{ color: '#ea580c' }}>🔐</span>
                                    <label style={{ color: '#c2410c', fontWeight: 600, fontSize: '13px' }}>Super Admin: Select Warehouse Context</label>
                                </div>
                                <select
                                    value={selectedWarehouse}
                                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                                    required
                                    style={{ borderColor: '#fdba74' }}
                                >
                                    <option value="">-- Select Warehouse --</option>
                                    {warehouses.map(wh => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name} ({wh.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            // Warehouse Admin: Show assigned warehouse (read-only)
                            <div className="form-group" style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #86efac' }}>
                                <label style={{ color: '#166534', fontWeight: 600 }}>📦 Warehouse (Auto-Applied)</label>
                                <div style={{ padding: '10px', background: '#dcfce7', borderRadius: '6px', fontWeight: 500, color: '#166534' }}>
                                    {warehouses.find(w => w.id === selectedWarehouse)?.name || 'Loading...'}
                                </div>
                                <p style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>Your assigned warehouse is auto-selected</p>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Medicine *</label>
                            <select
                                value={selectedMedicine}
                                onChange={(e) => setSelectedMedicine(e.target.value)}
                                required
                            >
                                <option value="">Select Medicine</option>
                                {medicines.map(med => (
                                    <option key={med.id} value={med.id}>
                                        {med.name} - {med.manufacturer}
                                    </option>
                                ))}
                            </select>
                            {selectedMedicine && (() => {
                                const med = medicines.find(m => m.id === selectedMedicine);
                                return med ? (
                                    <div className="medicine-info">
                                        <div className="medicine-info-row">
                                            <span>Generic:</span>
                                            <span>{med.generic_name}</span>
                                        </div>
                                        <div className="medicine-info-row">
                                            <span>MRP:</span>
                                            <span>₹{med.mrp}</span>
                                        </div>
                                        <div className="medicine-info-row">
                                            <span>Purchase Price:</span>
                                            <span>₹{med.purchase_price}</span>
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        </div>

                        {/* Batch Entry Section - Batch is created implicitly */}
                        <div className="form-group">
                            <label>Batch Number *</label>
                            <input
                                type="text"
                                value={batchNumber}
                                onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                                placeholder="Enter batch number (e.g., BATCH2024-001)"
                                required
                                disabled={!selectedMedicine}
                            />
                        </div>

                        <div className="form-group">
                            <label>Expiry Date *</label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                required
                                disabled={!selectedMedicine}
                            />
                        </div>

                        {/* Optional: Select from existing batches for convenience */}
                        {existingBatches.length > 0 && (
                            <div className="form-group" style={{ background: '#f0f7ff', padding: '12px', borderRadius: '8px', marginTop: '-8px' }}>
                                <label style={{ fontSize: '12px', color: '#666' }}>Or select an existing batch:</label>
                                <select
                                    value={selectedExistingBatch}
                                    onChange={(e) => handleExistingBatchSelect(e.target.value)}
                                    disabled={!selectedMedicine}
                                >
                                    <option value="">-- Use new batch above --</option>
                                    {existingBatches.map(batch => (
                                        <option key={batch.id} value={batch.id}>
                                            {batch.batch_number} (Exp: {batch.expiry_date})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Quantity *</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="Enter quantity"
                                min="1"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Rack Name / Box Name</label>
                            <input
                                type="text"
                                value={rackName}
                                onChange={(e) => setRackName(e.target.value)}
                                placeholder="e.g., Painkillers Box, Cold Medicines"
                            />
                        </div>

                        <div className="form-group">
                            <label>Rack Number</label>
                            <input
                                type="text"
                                value={rackNumber}
                                onChange={(e) => setRackNumber(e.target.value.toUpperCase())}
                                placeholder="e.g., R-01, R-2A"
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Stock Entry'}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <h2 className="card-title">Recent Entries</h2>

                    {recentEntries.length > 0 ? (
                        <ul className="recent-entries">
                            {recentEntries.map((entry, index) => (
                                <li key={index} className="recent-entry">
                                    <div className="entry-info">
                                        <div className="entry-medicine">{entry.medicine}</div>
                                        <div className="entry-batch">Batch: {entry.batch}</div>
                                    </div>
                                    <span className="entry-quantity">+{entry.quantity}</span>
                                    <span className="entry-time">{entry.timestamp}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="empty-state">
                            <p>No entries yet</p>
                            <p>Your stock entries will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
