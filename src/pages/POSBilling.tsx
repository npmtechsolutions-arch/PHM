import { useState, useEffect, useRef } from 'react';
import { medicinesApi, invoicesApi } from '../services/api';
import { useMasterData } from '../contexts/MasterDataContext';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { shopsApi } from '../services/api';
import { PrintBill } from '../components/PrintBill';
import { useOperationalContext } from '../contexts/OperationalContext';
import { toast } from '../components/Toast';
import BatchSelectionModal from '../components/BatchSelectionModal';
import CustomerSelect from '../components/CustomerSelect';
import CustomerCreateModal from '../components/CustomerCreateModal';
import Drawer from '../components/Drawer';

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
    selling_price?: number;
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
    customer_name?: string;
    total_amount: number;
    created_at: string;
    customer_id?: string;
    payment_method?: string;
    paid_amount?: number;
    balance_amount?: number;
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
    const { user } = useUser();
    const { activeEntity } = useOperationalContext();
    const { isLoading: mastersLoading } = useMasterData();

    // Enforce Shop Context
    useEffect(() => {
        if (!activeEntity || activeEntity.type !== 'shop') {
            navigate('/');
        }
    }, [activeEntity, navigate]);

    if (!activeEntity || activeEntity.type !== 'shop') return null;

    if (mastersLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="spinner"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Master Data...</p>
                </div>
            </div>
        );
    }

    const shopId = activeEntity.id;

    // Hardcoded payment methods matching backend PaymentMethod enum
    const paymentMethods = [
        { code: 'cash', name: 'Cash' },
        { code: 'card', name: 'Credit/Debit Card' },
        { code: 'upi', name: 'UPI / QR Code' },
        { code: 'net_banking', name: 'Net Banking' },
        { code: 'cheque', name: 'Cheque' },
        { code: 'credit', name: 'Credit (Postpaid)' }
    ];

    // State
    const [shopDetails, setShopDetails] = useState<any>(null);
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
    const [lastSoldItems, setLastSoldItems] = useState<any[]>([]);
    const [amountReceived, setAmountReceived] = useState('');

    // Payment Reference State
    const [paymentReference, setPaymentReference] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [dueDate, setDueDate] = useState('');

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

    // Fetch Shop Details
    useEffect(() => {
        if (shopId) {
            shopsApi.get(shopId).then(res => {
                setShopDetails(res.data);
            }).catch(err => console.error('Failed to fetch shop details', err));
        }
    }, [shopId]);

    const searchMedicines = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            // CRITICAL: Pass shop_id to filter medicines by SHOP stock only
            // Backend will return medicines with stock_quantity from ShopStock table (not WarehouseStock)
            // This ensures POS only shows medicines available in the shop's inventory
            const res = await medicinesApi.list({ search, shop_id: shopId });
            clearTimeout(timeoutId);
            setMedicines(res.data?.items || res.data || []);
        } catch (e: any) {
            console.error('Search error:', e);
            if (e.name === 'AbortError') {
                toast.error('Search timed out. Please try again.');
            }
        }
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

    // Calculate per-item GST and totals with defensive checks
    const getItemPrice = (item: CartItem) => {
        const price = item.batch?.selling_price || item.batch?.mrp || 0;
        return isNaN(price) ? 0 : price;
    };

    const getItemSubtotal = (item: CartItem) => {
        const subtotal = getItemPrice(item) * (item.quantity || 0);
        return isNaN(subtotal) ? 0 : subtotal;
    };

    const getItemDiscount = (item: CartItem) => {
        const discount = item.discount || 0;
        return isNaN(discount) ? 0 : discount;
    };

    const getItemTaxable = (item: CartItem) => {
        const taxable = getItemSubtotal(item) - getItemDiscount(item);
        return isNaN(taxable) ? 0 : taxable;
    };

    const getItemGST = (item: CartItem) => {
        const taxRate = item.tax_rate || 0;
        const gst = getItemTaxable(item) * (taxRate / 100);
        return isNaN(gst) ? 0 : gst;
    };


    // Cart totals with NaN safety
    const getSubtotal = () => {
        const total = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);
        return isNaN(total) ? 0 : total;
    };

    const getTotalDiscount = () => {
        const total = cart.reduce((sum, item) => sum + getItemDiscount(item), 0);
        return isNaN(total) ? 0 : total;
    };

    const getTaxable = () => {
        const taxable = getSubtotal() - getTotalDiscount();
        return isNaN(taxable) ? 0 : taxable;
    };

    const getGST = () => {
        const gst = cart.reduce((sum, item) => sum + getItemGST(item), 0);
        return isNaN(gst) ? 0 : gst;
    };

    const getTotal = () => {
        const total = getTaxable() + getGST();
        return isNaN(total) ? 0 : total;
    };

    const getChange = () => {
        const change = parseFloat(amountReceived || '0') - getTotal();
        return isNaN(change) ? 0 : change;
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

    // Payment Validation
    const validatePayment = (): { valid: boolean; error?: string } => {
        const total = getTotal();
        const paid = amountReceived && !isNaN(parseFloat(amountReceived))
            ? parseFloat(amountReceived)
            : total;

        // Partial payment validation - for non-cash/non-credit methods only
        // Cash allows any amount without customer (small shortfalls treated as rounding/discount)
        if ((total - paid) > 1 && !selectedCustomer && paymentMethod !== 'cash' && paymentMethod !== 'credit') {
            return {
                valid: false,
                error: 'Customer selection required for partial payment'
            };
        }

        // Credit payment validation
        if (paymentMethod === 'credit') {
            if (!selectedCustomer) {
                return { valid: false, error: 'Customer selection required for credit payment' };
            }
            if (!dueDate) {
                return { valid: false, error: 'Due date required for credit payment' };
            }
            // Credit payments can have any amount (including partial)
            return { valid: true };
        }

        // Payment reference validation for digital methods
        if (['upi', 'net_banking'].includes(paymentMethod) && !paymentReference) {
            const methodName = paymentMethod === 'upi' ? 'UPI' : 'Net Banking';
            return { valid: false, error: `${methodName} reference number required` };
        }

        if (paymentMethod === 'card' && !paymentReference) {
            return { valid: false, error: 'Card transaction ID required' };
        }

        if (paymentMethod === 'cheque') {
            if (!chequeNumber) return { valid: false, error: 'Cheque number required' };
            if (!chequeDate) return { valid: false, error: 'Cheque date required' };
        }

        return { valid: true };
    };

    // Checkout with prescription check
    const handleCheckout = async () => {
        if (cart.length === 0) return toast.warning('Cart is empty');

        // Validate payment
        const validation = validatePayment();
        if (!validation.valid) {
            toast.error(validation.error!);
            return;
        }

        // Check if any medicine requires prescription
        const prescriptionRequired = cart.some(item => item.medicine.is_prescription_required);
        if (prescriptionRequired && !selectedCustomer) {
            toast.error('Customer selection required for prescription medicines!');
            return;
        }

        setLoading(true);
        try {
            const totalAmount = getTotal();
            const paidAmount = amountReceived && !isNaN(parseFloat(amountReceived))
                ? parseFloat(amountReceived)
                : totalAmount;

            const payload = {
                shop_id: shopId,
                customer_id: selectedCustomer?.id,
                items: cart.map(item => {
                    const price = getItemPrice(item) * item.quantity;
                    const discountPercent = price > 0 ? (item.discount / price) * 100 : 0;
                    const unitPrice = item.batch?.selling_price || item.batch?.mrp || 0;
                    const taxRate = item.tax_rate || 12.0;

                    return {
                        medicine_id: item.medicine.id,
                        batch_id: item.batch.id,
                        quantity: Math.floor(item.quantity) || 1,
                        unit_price: isNaN(unitPrice) ? 0 : unitPrice,
                        discount_percent: Number.isFinite(discountPercent) ? discountPercent : 0,
                        tax_percent: isNaN(taxRate) ? 12.0 : taxRate
                    };
                }),
                payment_method: paymentMethod,
                paid_amount: isNaN(paidAmount) ? 0 : paidAmount,
                discount_percent: 0,
                // Payment Details
                payment_reference: paymentReference || undefined,
                cheque_number: chequeNumber || undefined,
                cheque_date: chequeDate || undefined,
                due_date: dueDate || undefined
            };

            console.log('=== Invoice Payload ===');
            console.log('Total from getTotal():', totalAmount);
            console.log('Paid Amount:', paidAmount);
            console.log('Items count:', payload.items.length);
            console.log('Full Payload:', JSON.stringify(payload, null, 2));
            console.log('======================');

            const res = await invoicesApi.create(payload);

            // API returns { message, data: {...invoice...} }
            const invoiceData = res.data?.data || res.data;
            console.log('=== Invoice Response ===');
            console.log('Full response:', res.data);
            console.log('Invoice data:', invoiceData);
            console.log('========================');

            setLastInvoice(invoiceData);

            // Prepare items for print
            const billItems = cart.map(item => ({
                medicine_name: item.medicine.name,
                batch_number: item.batch.batch_number,
                expiry_date: item.batch.expiry_date,
                quantity: item.quantity,
                unit_price: item.batch.selling_price || item.batch.mrp,
                mrp: item.batch.mrp,
                gst_rate: item.tax_rate,
                discount_amount: item.discount,
                total_amount: ((item.batch.selling_price || item.batch.mrp) * item.quantity) - item.discount
            }));
            setLastSoldItems(billItems);

            setShowReceipt(true);
            setCart([]);
            setSelectedCustomer(null);
            setAmountReceived('');
            toast.success('Invoice created successfully');
        } catch (e: any) {
            console.error('Invoice creation error:', e);
            let msg = 'Failed to create invoice';

            if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
                msg = 'Request timed out. Please check your connection and try again.';
            } else if (e.response?.data?.detail) {
                const detail = e.response.data.detail;
                if (Array.isArray(detail)) {
                    // Handle Pydantic validation errors
                    msg = detail.map((d: any) => d.msg || 'Validation error').join(', ');
                } else if (typeof detail === 'object') {
                    msg = detail.msg || JSON.stringify(detail);
                } else {
                    msg = String(detail);
                }
            } else if (!e.response) {
                msg = 'Network error. Please check your connection.';
            }
            toast.error(msg);
        } finally { setLoading(false); }
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
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 text-sm">
                                            {item.batch.selling_price && item.batch.selling_price !== item.batch.mrp && (
                                                <div className="text-xs text-slate-400 line-through mr-1 inline-block">
                                                    {formatCurrency(item.batch.mrp)}
                                                </div>
                                            )}
                                            {formatCurrency(item.batch.selling_price || item.batch.mrp)}
                                        </td>
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
                                            {formatCurrency(((item.batch.selling_price || item.batch.mrp) * item.quantity) - item.discount)}
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
            <div className="w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col shadow-sm max-h-[calc(100vh-120px)] overflow-y-auto">
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

                {/* Payment Reference Fields */}
                {['upi', 'card', 'net_banking'].includes(paymentMethod) && (
                    <div className="mb-4 space-y-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {paymentMethod === 'card' ? 'Transaction ID' : 'Reference Number'} *
                        </label>
                        <input
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder={`Enter ${paymentMethod === 'card' ? 'transaction ID' : 'reference number'}`}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                )}

                {/* Cheque Fields */}
                {paymentMethod === 'cheque' && (
                    <>
                        <div className="mb-4 space-y-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Cheque Number *</label>
                            <input
                                type="text"
                                value={chequeNumber}
                                onChange={(e) => setChequeNumber(e.target.value)}
                                placeholder="Enter cheque number"
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="mb-4 space-y-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Cheque Date *</label>
                            <input
                                type="date"
                                value={chequeDate}
                                onChange={(e) => setChequeDate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </>
                )}

                {/* Credit Due Date */}
                {paymentMethod === 'credit' && (
                    <div className="mb-4 space-y-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date *</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                )}

                {/* Amount Received */}
                <div className="mb-6 space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {paymentMethod === 'cash' ? 'Amount Received' : 'Amount Paid'}
                        {paymentMethod === 'credit' && ' (Optional)'}
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium z-10 pointer-events-none">₹</span>
                        <input
                            type="number"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            placeholder={getTotal().toFixed(2)}
                            disabled={!['cash', 'credit'].includes(paymentMethod)}
                            className={`w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-lg font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!['cash', 'credit'].includes(paymentMethod)
                                ? 'bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed'
                                : 'bg-slate-50 dark:bg-slate-900'
                                }`}
                        />
                    </div>
                    {paymentMethod === 'cash' && parseFloat(amountReceived) >= getTotal() && getTotal() > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium flex justify-between">
                            <span>Change to Return:</span>
                            <span>{formatCurrency(getChange())}</span>
                        </div>
                    )}
                </div>

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
                        <span className="flex items-center gap-1">
                            GST (12%)
                            <span className="text-[10px] text-slate-400">(Auto)</span>
                        </span>
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

            {/* Receipt Drawer */}
            <Drawer
                isOpen={showReceipt}
                onClose={() => {
                    setShowReceipt(false);
                    setLastInvoice(null);
                }}
                title="Payment Receipt"
                width="w-[400px]"
            >
                {lastInvoice && (
                    <div className="space-y-6">
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">check_circle</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Payment Successful!</h3>
                            <p className="text-slate-500">Invoice #{lastInvoice.invoice_number || 'N/A'}</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500">Customer</span>
                                <span className="font-medium text-slate-900 dark:text-white">
                                    {lastInvoice.customer_id ? selectedCustomer?.name : 'Walk-in Customer'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500">Payment Method</span>
                                <span className="font-medium text-slate-900 dark:text-white capitalize">
                                    {String(lastInvoice.payment_method || '').replace('_', ' ')}
                                </span>
                            </div>

                            <div className="pt-2 space-y-3">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-slate-600 dark:text-slate-300">Total Amount</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(Number(lastInvoice.total_amount) || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-slate-600 dark:text-slate-300">Amount Paid</span>
                                    <span className="font-bold text-green-600">
                                        {formatCurrency(Number(lastInvoice.paid_amount) || 0)}
                                    </span>
                                </div>
                                {(Number(lastInvoice.balance_amount) || 0) > 0 && (
                                    <div className="flex justify-between items-center text-lg text-red-600 font-bold">
                                        <span>Balance Due</span>
                                        <span>{formatCurrency(Number(lastInvoice.balance_amount) || 0)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">print</span>
                                Print Receipt
                            </button>
                            <button
                                onClick={() => {
                                    setShowReceipt(false);
                                    setLastInvoice(null);
                                    setCart([]);
                                    setSelectedCustomer(null);
                                    setAmountReceived('');
                                    setPaymentMethod('cash');
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
                            >
                                <span className="material-symbols-outlined">add</span>
                                New Sale
                            </button>
                        </div>
                    </div>
                )}
            </Drawer>

            {/* Hidden Print Bill Component */}
            {lastInvoice && (
                <PrintBill
                    shop={shopDetails}
                    invoice={lastInvoice}
                    items={lastSoldItems}
                    customer={selectedCustomer}
                    user={user}
                />
            )}
        </div>
    );
}


