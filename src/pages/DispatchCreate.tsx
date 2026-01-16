import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dispatchesApi, warehousesApi, shopsApi, medicinesApi, purchaseRequestsApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import Button from '../components/Button';
import PageLayout from '../components/PageLayout';
import SearchableSelect from '../components/SearchableSelect';

interface DispatchItem {
    medicine_id: string;
    medicine_name?: string;
    batch_id: string;
    batch_number?: string;
    quantity: number;
    available_stock?: number; // Stock in the specific batch
    available_batches?: any[]; // List of batches for this medicine
    medicine_search?: string;
    brand?: string;
}

export default function DispatchCreate() {
    const navigate = useNavigate();
    const { user } = useUser();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [warehouseId, setWarehouseId] = useState('');
    const [shopId, setShopId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<DispatchItem[]>([]);

    // Dropdown data
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [shops, setShops] = useState<any[]>([]);
    const [medicines, setMedicines] = useState<any[]>([]);

    useEffect(() => {
        fetchWarehouses();
        fetchShops();
        fetchMedicines();
    }, []);

    const [searchParams] = useSearchParams();
    const prId = searchParams.get('pr_id');

    useEffect(() => {
        if (prId) {
            fetchPurchaseRequest(prId);
        }
    }, [prId]);

    const fetchPurchaseRequest = async (id: string) => {
        try {
            const res = await purchaseRequestsApi.get(id);
            const pr = res.data || res;
            setWarehouseId(pr.warehouse_id);
            setShopId(pr.shop_id);
            setNotes(`Fulfilled from PR-${pr.request_number}`);

            // For PR items, we need to fetch batches immediately if medicine is present
            const prItems: DispatchItem[] = [];
            for (const item of (pr.items || [])) {
                let batches: any[] = [];
                if (item.medicine_id) {
                    try {
                        const batchRes = await medicinesApi.getBatches(item.medicine_id);
                        batches = batchRes.data?.batches || batchRes.data || [];
                    } catch (e) {
                        console.error(`Failed to fetch batches for ${item.medicine_id}`, e);
                    }
                }

                prItems.push({
                    medicine_id: item.medicine_id,
                    medicine_name: item.medicine_name,
                    medicine_search: item.medicine_name,
                    batch_id: '',
                    batch_number: '',
                    quantity: item.quantity_approved || item.quantity_requested || 0,
                    available_batches: batches
                });
            }
            setItems(prItems);
        } catch (e) {
            console.error('Failed to load PR', e);
            setError('Failed to load purchase request');
        }
    };

    // Auto-select warehouse for warehouse_admin
    useEffect(() => {
        if (!warehouseId && user?.role === 'warehouse_admin' && user?.warehouse_id) {
            setWarehouseId(user.warehouse_id);
        }
    }, [user, warehouseId]);

    const fetchWarehouses = async () => {
        try {
            const res = await warehousesApi.list({ size: 100 });
            setWarehouses(res.data?.items || res.data || []);
        } catch (e) {
            console.error('Failed to fetch warehouses', e);
        }
    };

    const fetchShops = async () => {
        try {
            const res = await shopsApi.list({ size: 100 });
            setShops(res.data?.items || res.data || []);
        } catch (e) {
            console.error('Failed to fetch shops', e);
        }
    };

    const fetchMedicines = async () => {
        try {
            const res = await medicinesApi.list({ size: 100 });
            setMedicines(res.data?.items || res.data || []);
        } catch (e) {
            console.error('Failed to fetch medicines', e);
        }
    };

    const addItem = () => {
        setItems([...items, { medicine_id: '', batch_id: '', quantity: 1, available_batches: [] }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = async (index: number, field: keyof DispatchItem, value: any) => {
        const newItems = [...items];

        // If medicine changed, reset batch and fetch new batches
        if (field === 'medicine_id') {
            newItems[index] = { ...newItems[index], [field]: value, batch_id: '', batch_number: '', available_stock: 0, available_batches: [] };

            if (value) {
                const medicine = medicines.find(m => m.id === value);
                newItems[index].medicine_name = medicine?.name;
                newItems[index].brand = medicine?.brand;

                // Fetch batches
                try {
                    const res = await medicinesApi.getBatches(value);
                    const batchesData = res.data?.batches || res.data || [];
                    newItems[index].available_batches = batchesData.filter((b: any) => (b.quantity || 0) > 0);
                } catch (e) {
                    console.error('Failed to fetch batches', e);
                }
            }
        }
        // If batch changed, update batch_id, batch_number and available_stock
        else if (field === 'batch_id') {
            const batch = newItems[index].available_batches?.find((b: any) => b.id === value);
            newItems[index].batch_id = value;
            newItems[index].batch_number = batch?.batch_number || '';
            newItems[index].available_stock = batch?.quantity || 0;
            // Optionally clamp quantity
            if (newItems[index].quantity > (batch?.quantity || 0)) {
                newItems[index].quantity = batch?.quantity || 0;
            }
        }
        else {
            newItems[index] = { ...newItems[index], [field]: value };
        }

        setItems(newItems);
    };

    const validateForm = () => {
        if (!warehouseId) {
            setError('Please select a warehouse');
            return false;
        }
        if (!shopId) {
            setError('Please select a shop');
            return false;
        }
        if (items.length === 0) {
            setError('Please add at least one item');
            return false;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.medicine_id || !item.batch_id) {
                setError(`Item ${i + 1}: Please select medicine and batch`);
                return false;
            }
            if (item.quantity <= 0) {
                setError(`Item ${i + 1}: Quantity must be greater than 0`);
                return false;
            }
            if (item.available_stock !== undefined && item.quantity > item.available_stock) {
                setError(`Item ${i + 1}: Quantity (${item.quantity}) exceeds available stock (${item.available_stock})`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setSaving(true);
        try {
            const payload = {
                warehouse_id: warehouseId,
                shop_id: shopId,
                notes: notes || undefined,
                items: items.map(item => ({
                    medicine_id: item.medicine_id,
                    batch_id: item.batch_id,
                    quantity: item.quantity
                }))
            };

            await dispatchesApi.create(payload);
            navigate('/dispatches');
        } catch (err: any) {
            console.error('Failed to create dispatch:', err);
            setError(err.response?.data?.detail || 'Failed to create dispatch');
        } finally {
            setSaving(false);
        }
    };

    const isWarehouseAdmin = user?.role === 'warehouse_admin';

    return (
        <PageLayout
            title="Create New Dispatch"
            subtitle="Create a dispatch from warehouse to shop"
        >
            <div className="max-w-5xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Warehouse and Shop Selection */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    From Warehouse *
                                </label>
                                <select
                                    value={warehouseId}
                                    onChange={(e) => setWarehouseId(e.target.value)}
                                    disabled={isWarehouseAdmin}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 disabled:opacity-50"
                                    required
                                >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    To Shop *
                                </label>
                                <select
                                    value={shopId}
                                    onChange={(e) => setShopId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                    required
                                >
                                    <option value="">Select Shop</option>
                                    {shops.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Dispatch Items
                                </h3>
                                <Button
                                    variant="secondary"
                                    onClick={addItem}
                                    type="button"
                                    disabled={!warehouseId}
                                >
                                    <span className="material-symbols-outlined text-[18px] mr-1">add</span>
                                    Add Item
                                </Button>
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    No items added. Click "Add Item" to start.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item, index) => {
                                        const available = item.available_stock || 0;
                                        const quantity = item.quantity || 0;
                                        let rowClass = "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"; // Default

                                        if (item.batch_id && quantity > available) {
                                            rowClass = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"; // Error (Insufficient stock)
                                        } else if (item.batch_id && quantity > 0 && quantity >= available * 0.8) {
                                            rowClass = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"; // Warning (Low stock remaining)
                                        }

                                        return (
                                            <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${rowClass}`}>
                                                <div className="flex-1 grid grid-cols-12 gap-3">
                                                    <div className="col-span-4">
                                                        <label className="block text-xs text-slate-500 mb-1">Medicine</label>
                                                        <SearchableSelect
                                                            value={item.medicine_id}
                                                            onChange={(val) => updateItem(index, 'medicine_id', val)}
                                                            options={medicines.map(m => ({ value: m.id, label: m.name }))}
                                                            placeholder="Type medicine name..."
                                                        />
                                                    </div>

                                                    <div className="col-span-3">
                                                        <label className="block text-xs text-slate-500 mb-1">Brand</label>
                                                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 h-[38px] flex items-center">
                                                            {item.brand || '-'}
                                                        </div>
                                                    </div>

                                                    <div className="col-span-3">
                                                        <label className="block text-xs text-slate-500 mb-1">Batch</label>
                                                        <select
                                                            value={item.batch_id}
                                                            onChange={(e) => updateItem(index, 'batch_id', e.target.value)}
                                                            className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-[38px]"
                                                            required
                                                            disabled={!item.medicine_id}
                                                        >
                                                            <option value="">Select Batch</option>
                                                            {(item.available_batches || []).map((batch: any) => (
                                                                <option key={batch.id} value={batch.id}>
                                                                    {batch.batch_number} (Exp: {new Date(batch.expiry_date).toLocaleDateString()}) - Qty: {batch.quantity}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="col-span-2">
                                                        <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-[38px]"
                                                            placeholder="Qty"
                                                            min="1"
                                                            required
                                                        />
                                                        {item.available_stock !== undefined && (
                                                            <div className={`text-xs mt-1 ${quantity > available ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                                                Max: {item.available_stock}
                                                                {quantity > available && " (Insufficient Stock!)"}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    onClick={() => removeItem(index)}
                                                    type="button"
                                                    className="!p-1.5 text-red-600 hover:bg-red-50"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                placeholder="Add any special instructions or notes..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button
                                variant="secondary"
                                onClick={() => navigate('/dispatches')}
                                type="button"
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={saving || items.length === 0}
                                loading={saving}
                            >
                                <span className="material-symbols-outlined text-[18px] mr-2">local_shipping</span>
                                Create Dispatch
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
