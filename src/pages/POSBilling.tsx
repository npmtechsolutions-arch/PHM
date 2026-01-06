import { useState, useEffect, useRef } from 'react';
import { medicinesApi, invoicesApi } from '../services/api';

interface Medicine {
    id: string;
    name: string;
    generic_name: string;
    mrp: number;
    stock_quantity: number;
}

interface CartItem {
    medicine: Medicine;
    quantity: number;
    discount: number;
}

interface Invoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    total_amount: number;
    created_at: string;
}

export default function POSBilling() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [loading, setLoading] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
    const [amountReceived, setAmountReceived] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (search.length >= 2) {
            searchMedicines();
        } else {
            setMedicines([]);
        }
    }, [search]);

    const searchMedicines = async () => {
        try {
            const res = await medicinesApi.list({ search });
            setMedicines(res.data?.items || res.data || []);
        } catch (e) { console.error(e); }
    };

    const addToCart = (medicine: Medicine) => {
        const existing = cart.find(item => item.medicine.id === medicine.id);
        if (existing) {
            setCart(cart.map(item =>
                item.medicine.id === medicine.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, { medicine, quantity: 1, discount: 0 }]);
        }
        setSearch('');
        setMedicines([]);
        searchRef.current?.focus();
    };

    const updateQuantity = (id: string, qty: number) => {
        if (qty <= 0) {
            setCart(cart.filter(item => item.medicine.id !== id));
        } else {
            setCart(cart.map(item =>
                item.medicine.id === id ? { ...item, quantity: qty } : item
            ));
        }
    };

    const updateDiscount = (id: string, discount: number) => {
        setCart(cart.map(item =>
            item.medicine.id === id ? { ...item, discount: Math.max(0, discount) } : item
        ));
    };

    const removeItem = (id: string) => {
        setCart(cart.filter(item => item.medicine.id !== id));
    };

    const getSubtotal = () => cart.reduce((sum, item) => sum + (item.medicine.mrp * item.quantity), 0);
    const getTotalDiscount = () => cart.reduce((sum, item) => sum + item.discount, 0);
    const getTaxable = () => getSubtotal() - getTotalDiscount();
    const getGST = () => getTaxable() * 0.12; // 12% GST for medicines
    const getTotal = () => getTaxable() + getGST();
    const getChange = () => parseFloat(amountReceived || '0') - getTotal();

    const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

    const handleCheckout = async () => {
        if (cart.length === 0) return alert('Cart is empty');
        setLoading(true);
        try {
            const res = await invoicesApi.create({
                customer_name: customerName || 'Walk-in Customer',
                customer_phone: customerPhone,
                items: cart.map(item => ({
                    medicine_id: item.medicine.id,
                    quantity: item.quantity,
                    unit_price: item.medicine.mrp,
                    discount: item.discount
                })),
                payment_method: paymentMethod,
                payment_status: 'paid',
                subtotal: getSubtotal(),
                tax_amount: getGST(),
                discount_amount: getTotalDiscount(),
                total_amount: getTotal()
            });
            setLastInvoice(res.data);
            setShowReceipt(true);
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setAmountReceived('');
        } catch (e) {
            console.error(e);
            alert('Failed to create invoice');
        } finally { setLoading(false); }
    };

    const handleNewSale = () => {
        setShowReceipt(false);
        setLastInvoice(null);
        searchRef.current?.focus();
    };

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6">
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
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search medicine by name or code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg"
                        autoFocus
                    />
                    {medicines.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-auto z-10">
                            {medicines.map(m => (
                                <button key={m.id} onClick={() => addToCart(m)} className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{m.name}</p>
                                        <p className="text-sm text-slate-500">{m.generic_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(m.mrp)}</p>
                                        <p className={`text-sm ${m.stock_quantity > 10 ? 'text-green-500' : m.stock_quantity > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                            Stock: {m.stock_quantity}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item</th>
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
                                        <td colSpan={6} className="px-4 py-16 text-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">shopping_cart</span>
                                            <p className="text-slate-500">Cart is empty</p>
                                            <p className="text-sm text-slate-400">Search and add medicines above</p>
                                        </td>
                                    </tr>
                                ) : cart.map(item => (
                                    <tr key={item.medicine.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900 dark:text-white">{item.medicine.name}</p>
                                            <p className="text-xs text-slate-500">{item.medicine.generic_name}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)} className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-sm">-</button>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.medicine.id, parseInt(e.target.value) || 1)}
                                                    className="w-12 text-center font-medium border border-slate-200 dark:border-slate-700 rounded py-1 bg-transparent"
                                                />
                                                <button onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)} className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-sm">+</button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.medicine.mrp)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <input
                                                type="number"
                                                value={item.discount || ''}
                                                onChange={(e) => updateDiscount(item.medicine.id, parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-16 text-right border border-slate-200 dark:border-slate-700 rounded py-1 px-2 bg-transparent text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                                            {formatCurrency((item.medicine.mrp * item.quantity) - item.discount)}
                                        </td>
                                        <td className="px-2">
                                            <button onClick={() => removeItem(item.medicine.id)} className="text-red-500 hover:bg-red-50 rounded p-1">
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
            <div className="w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Checkout</h2>

                {/* Customer Info */}
                <div className="space-y-3 mb-4">
                    <input type="tel" placeholder="Customer Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                    <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-500 mb-2">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['cash', 'card', 'upi'].map(method => (
                            <button
                                key={method}
                                onClick={() => setPaymentMethod(method)}
                                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${paymentMethod === method
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {method === 'cash' ? '💵' : method === 'card' ? '💳' : '📱'} {method.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount Received (for cash) */}
                {paymentMethod === 'cash' && (
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-500 mb-2">Amount Received</label>
                        <input
                            type="number"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-medium"
                        />
                        {parseFloat(amountReceived) >= getTotal() && getTotal() > 0 && (
                            <p className="text-sm text-green-600 mt-1">Change: {formatCurrency(getChange())}</p>
                        )}
                    </div>
                )}

                <div className="flex-1"></div>

                {/* Totals */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(getSubtotal())}</span></div>
                    {getTotalDiscount() > 0 && (
                        <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(getTotalDiscount())}</span></div>
                    )}
                    <div className="flex justify-between text-slate-500"><span>GST (12%)</span><span>{formatCurrency(getGST())}</span></div>
                    <div className="flex justify-between text-xl font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span>Total</span><span>{formatCurrency(getTotal())}</span>
                    </div>
                </div>

                <button
                    onClick={handleCheckout}
                    disabled={loading || cart.length === 0}
                    className="mt-4 w-full py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                            Complete Sale ({formatCurrency(getTotal())})
                        </>
                    )}
                </button>
            </div>

            {/* Receipt Modal */}
            {showReceipt && lastInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
                        <p className="text-slate-500 mb-6">Invoice #{lastInvoice.invoice_number || lastInvoice.id?.slice(0, 8)}</p>

                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-6 text-left">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Customer</span>
                                <span className="font-medium">{lastInvoice.customer_name}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Payment</span>
                                <span className="font-medium capitalize">{paymentMethod}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span>Total Paid</span>
                                <span className="text-green-600">{formatCurrency(lastInvoice.total_amount || getTotal())}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">print</span>
                                Print
                            </button>
                            <button
                                onClick={handleNewSale}
                                className="flex-1 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                New Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

