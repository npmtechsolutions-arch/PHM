import { useState, useEffect, useRef } from 'react';
import { medicinesApi, invoicesApi } from '../services/api';
import { useMasterData } from '../contexts/MasterDataContext';
import { useNavigate } from 'react-router-dom';
import { useOperationalContext } from '../contexts/OperationalContext';
import { toast } from '../components/Toast';
import BatchSelectionModal from '../components/BatchSelectionModal';
import CustomerSelect from '../components/CustomerSelect';
import CustomerCreateModal from '../components/CustomerCreateModal';

interface Medicine {
    id: string;
    name: string;
    generic_name: string;
    brand?: string;
    manufacturer?: string;
    mrp: number;
    stock_quantity: number;
    gst_rate?: number; // GST rate from medicine
    is_prescription_required?: boolean;
}

interface Batch {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    mrp: number;
}

interface CartItem {
    medicine: Medicine;
    batch: Batch;
    quantity: number;
    discount: number;
    tax_rate: number; // GST rate per item
}

interface Invoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    total_amount: number;
    created_at: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    total_purchases?: number;
    loyalty_points?: number;
}

export default function POSBilling() {
    const navigate = useNavigate();
    const { activeEntity } = useOperationalContext();
    const { getMaster } = useMasterData();

    // Enforce Shop Context
    useEffect(() => {
        if (!activeEntity || activeEntity.type !== 'shop') {
            navigate('/');
        }
    }, [activeEntity, navigate]);

    if (!activeEntity || activeEntity.type !== 'shop') return null;

    const shopId = activeEntity.id;
    const paymentMethods = getMaster('payment_methods');

    // State
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [loading, setLoading] = useState(false);

    // Customer State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // Batch Selection State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedMedicineForBatch, setSelectedMedicineForBatch] = useState<Medicine | null>(null);
    const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);

    // Invoice/Receipt State
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
    const [amountReceived, setAmountReceived] = useState('');

    const searchRef = useRef<HTMLInputElement>(null);

    // Search Medicines
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search.length >= 2) {
                searchMedicines();
            } else {
                setMedicines([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const searchMedicines = async () => {
        try {
            const res = await medicinesApi.list({ search, shop_id: shopId });
            setMedicines(res.data?.items || res.data || []);
        } catch (e) { console.error(e); }
    };

    // Add to Cart Logic
    const handleMedicineClick = async (medicine: Medicine) => {
        try {
            const res = await medicinesApi.getBatches(medicine.id);
            const allBatches: Batch[] = res.data?.batches || [];

            // Filter batches with stock > 0
            const validBatches = allBatches.filter(b => b.quantity > 0);

            if (validBatches.length === 0) {
                toast.error('No stock available for this medicine');
                return;
            }

            if (validBatches.length === 1) {
                // Auto-select the only batch
                addToCart(medicine, validBatches[0]);
            } else {
                // Show modal
                setSelectedMedicineForBatch(medicine);
                setAvailableBatches(validBatches);
                setShowBatchModal(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch batch details');
        }
    };

    const handleBatchSelect = (batch: Batch) => {
        if (selectedMedicineForBatch) {
            addToCart(selectedMedicineForBatch, batch);
            setShowBatchModal(false);
            setSelectedMedicineForBatch(null);
            setAvailableBatches([]);
        }
    };

    const addToCart = (medicine: Medicine, batch: Batch) => {
        // Check prescription requirement
        if (medicine.is_prescription_required && !selectedCustomer) {
            toast.warning('Prescription required! Please select a customer first.');
            return;
        }

        const existingIndex = cart.findIndex(item => item.medicine.id === medicine.id && item.batch.id === batch.id);

        if (existingIndex >= 0) {
            // Update quantity if stock permits
            const currentQty = cart[existingIndex].quantity;
            if (currentQty + 1 > batch.quantity) {
                toast.warning(`Only ${batch.quantity} units available in this batch`);
                return;
            }

            const newCart = [...cart];
            newCart[existingIndex].quantity += 1;
            setCart(newCart);
        } else {
            const newItem: CartItem = {
                medicine,
                batch,
                quantity: 1,
                discount: 0,
                tax_rate: medicine.gst_rate || 12.0 // Use medicine's GST rate or default to 12%
            };
            setCart([...cart, newItem]);
        }
        setSearch('');
        setMedicines([]);
        searchRef.current?.focus();
    };

    const updateQuantity = (index: number, qty: number) => {
        const item = cart[index];
        if (qty <= 0) {
            const newCart = cart.filter((_, i) => i !== index);
            setCart(newCart);
        } else {
            if (qty > item.batch.quantity) {
                toast.warning(`Only ${item.batch.quantity} units available`);
                return;
            }
            const newCart = [...cart];
            newCart[index].quantity = qty;
            setCart(newCart);
        }
    };

    const updateDiscount = (index: number, discount: number) => {
        const newCart = [...cart];
        newCart[index].discount = Math.max(0, discount);
        setCart(newCart);
    };

    const removeItem = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    // Calculate per-item GST and totals
    const getItemSubtotal = (item: CartItem) => item.batch.mrp * item.quantity;
    const getItemDiscount = (item: CartItem) => item.discount;
    const getItemTaxable = (item: CartItem) => getItemSubtotal(item) - getItemDiscount(item);
    const getItemGST = (item: CartItem) => getItemTaxable(item) * (item.tax_rate / 100);


    // Cart totals
    const getSubtotal = () => cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);
    const getTotalDiscount = () => cart.reduce((sum, item) => sum + getItemDiscount(item), 0);
    const getTaxable = () => getSubtotal() - getTotalDiscount();
    const getGST = () => cart.reduce((sum, item) => sum + getItemGST(item), 0); // Sum of per-item GST
    const getTotal = () => getTaxable() + getGST();
    const getChange = () => parseFloat(amountReceived || '0') - getTotal();

    const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

    // Checkout with prescription check
    const handleCheckout = async () => {
        if (cart.length === 0) return toast.warning('Cart is empty');

        // Check if any medicine requires prescription
        const prescriptionRequired = cart.some(item => item.medicine.is_prescription_required);
        if (prescriptionRequired && !selectedCustomer) {
            toast.error('Customer selection required for prescription medicines!');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                shop_id: shopId,
                customer_id: selectedCustomer?.id,
                items: cart.map(item => ({
                    medicine_id: item.medicine.id,
                    batch_id: item.batch.id,
                    quantity: item.quantity,
                    unit_price: item.batch.mrp,
                    discount_percent: ((item.discount / (item.batch.mrp * item.quantity)) * 100) || 0,
                    tax_percent: item.tax_rate // Use per-item tax rate
                })),
                payment_method: paymentMethod,
                paid_amount: parseFloat(amountReceived) || getTotal(),
                discount_percent: 0 // Invoice level discount
            };

            const res = await invoicesApi.create(payload);
            setLastInvoice(res.data);
            setShowReceipt(true);
            setCart([]);
            setSelectedCustomer(null);
            setAmountReceived('');
            toast.success('Invoice created successfully');
        } catch (e: any) {
            console.error(e);
            toast.error(e.response?.data?.detail || 'Failed to create invoice');
        } finally { setLoading(false); }
    };

    const handleNewSale = () => {
        setShowReceipt(false);
        setLastInvoice(null);
        searchRef.current?.focus();
    };

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6">
            {/* Batch Selection Video Modal */}
            <BatchSelectionModal
                isOpen={showBatchModal}
                onClose={() => setShowBatchModal(false)}
                medicineName={selectedMedicineForBatch?.name || ''}
                batches={availableBatches}
                onSelect={handleBatchSelect}
            />

            {/* Create Customer Video Modal */}
            <CustomerCreateModal
                isOpen={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
                onSuccess={(newCustomer) => {
                    setSelectedCustomer(newCustomer);
                    toast.success('Customer added to sale');
                }}
                shopId={shopId}
            />

            {/* Left Panel - Product Search & Cart */}
            <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">POS Billing</h1>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                        {cart.length} items
                    </div>
                </div>

                {/* Search */}
                <div className="relative z-[20]">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search medicine by name, generic or brand..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        autoFocus
                    />
                    {medicines.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-96 overflow-auto z-50">
                            {medicines.map(m => (
                                <button key={m.id} onClick={() => handleMedicineClick(m)} className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center border-b border-slate-50 dark:border-slate-700 last:border-b-0 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-900 dark:text-white">{m.name}</p>
                                            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                                                {m.stock_quantity} in stock
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                            {m.generic_name}
                                            {m.brand && ` • ${m.brand}`}
                                            {m.manufacturer && ` • ${m.manufacturer}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(m.mrp)}</p>
                                        <p className="text-xs text-slate-400">MRP</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col shadow-sm">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Medicine</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Batch</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase w-32">Qty</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-24">Price</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-24">Disc</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-28">Total</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {cart.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-24 text-center">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="material-symbols-outlined text-3xl text-slate-400">shopping_cart</span>
                                            </div>
                                            <p className="text-slate-900 dark:text-white font-medium mb-1">Your cart is empty</p>
                                            <p className="text-sm text-slate-500 max-w-xs mx-auto">Search for medicines above to add them to your billing cart.</p>
                                        </td>
                                    </tr>
                                ) : cart.map((item, index) => (
                                    <tr key={`${item.medicine.id}-${item.batch.id}`}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900 dark:text-white">{item.medicine.name}</p>
                                            <p className="text-xs text-slate-500">{item.medicine.generic_name}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.batch.batch_number}</p>
                                            <p className="text-[10px] text-slate-400">
                                                Exp: {new Date(item.batch.expiry_date).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => updateQuantity(index, item.quantity - 1)} className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center">-</button>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                                                    className="w-12 text-center font-medium border border-slate-200 dark:border-slate-700 rounded py-1 bg-transparent text-slate-900 dark:text-white text-sm"
                                                />
                                                <button onClick={() => updateQuantity(index, item.quantity + 1)} className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center">+</button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 text-sm">{formatCurrency(item.batch.mrp)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <input
                                                type="number"
                                                value={item.discount || ''}
                                                onChange={(e) => updateDiscount(index, parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-16 text-right border border-slate-200 dark:border-slate-700 rounded py-1 px-2 bg-transparent text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white text-sm">
                                            {formatCurrency((item.batch.mrp * item.quantity) - item.discount)}
                                        </td>
                                        <td className="px-2">
                                            <button onClick={() => removeItem(index)} className="text-slate-400 hover:text-red-500 rounded p-1 transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right Panel - Checkout */}
            <div className="w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col shadow-sm h-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Checkout Details</h2>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">
                        Running
                    </span>
                </div>

                {/* Customer Info */}
                <div className="mb-6 space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</label>
                    <CustomerSelect
                        onSelect={setSelectedCustomer}
                        selectedCustomer={selectedCustomer}
                        onNewCustomer={() => setShowCustomerModal(true)}
                    />
                </div>

                {/* Payment Method */}
                <div className="mb-6 space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                        {paymentMethods?.map(pm => (
                            <button
                                key={pm.code}
                                onClick={() => setPaymentMethod(pm.code)}
                                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all duration-200 ${paymentMethod === pm.code
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    {/* <span className="material-symbols-outlined text-[18px]">{pm.icon}</span> */}
                                    {pm.name}
                                </div>
                            </button>
                        )) || [
                                <button key="cash" onClick={() => setPaymentMethod('cash')} className={`py-2 px-3 rounded-lg text-sm font-medium border ${paymentMethod === 'cash' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200'}`}>Cash</button>,
                                <button key="card" onClick={() => setPaymentMethod('card')} className={`py-2 px-3 rounded-lg text-sm font-medium border ${paymentMethod === 'card' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200'}`}>Card</button>,
                                <button key="upi" onClick={() => setPaymentMethod('upi')} className={`py-2 px-3 rounded-lg text-sm font-medium border ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200'}`}>UPI</button>
                            ]}
                    </div>
                </div>

                {/* Amount Received (for cash) */}
                {paymentMethod === 'cash' && (
                    <div className="mb-6 space-y-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount Received</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                            <input
                                type="number"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-lg font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        {parseFloat(amountReceived) >= getTotal() && getTotal() > 0 && (
                            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium flex justify-between">
                                <span>Change to Return:</span>
                                <span>{formatCurrency(getChange())}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1"></div>

                {/* Totals */}
                <div className="space-y-3 pt-6 border-t border-dashed border-slate-300 dark:border-slate-600">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatCurrency(getSubtotal())}</span>
                    </div>
                    {getTotalDiscount() > 0 && (
                        <div className="flex justify-between text-green-600 text-sm">
                            <span>Discount</span>
                            <span className="font-medium">-{formatCurrency(getTotalDiscount())}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm">
                        <span>GST (12%)</span>
                        <span className="font-medium">{formatCurrency(getGST())}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                        <span className="text-slate-900 dark:text-white font-bold text-lg">Total Amount</span>
                        <span className="text-2xl font-bold text-blue-600">{formatCurrency(getTotal())}</span>
                    </div>
                </div>

                <button
                    onClick={handleCheckout}
                    disabled={loading || cart.length === 0}
                    className="mt-6 w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <span>Complete Sale</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                    )}
                </button>
            </div>

            {/* Receipt Modal */}
            {showReceipt && lastInvoice && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md text-center p-8 animate-scaleIn">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
                        <p className="text-slate-500 mb-8">Invoice #{lastInvoice.invoice_number || lastInvoice.id?.slice(0, 8)}</p>

                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 mb-8 text-left space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Customer</span>
                                <span className="font-medium text-slate-900 dark:text-white">{lastInvoice.customer_name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Payment Method</span>
                                <span className="font-medium capitalize text-slate-900 dark:text-white">{paymentMethod}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-3 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500">Amount Paid</span>
                                <span className="font-bold text-slate-900 dark:text-white text-lg">{formatCurrency(lastInvoice.total_amount || getTotal())}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.print()} // In real app, this would print the receipt component
                                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors"
                            >
                                <span className="material-symbols-outlined">print</span>
                                Print Receipt
                            </button>
                            <button
                                onClick={handleNewSale}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                            >
                                <span className="material-symbols-outlined">add</span>
                                New Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
