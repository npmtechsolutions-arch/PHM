import React from 'react';

interface PrintBillProps {
    shop: {
        name: string;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        phone?: string;
        email?: string;
        gst_number?: string;
        license_number?: string;
    } | null;
    invoice: {
        invoice_number: string;
        created_at: string;
        total_amount: number;
        paid_amount?: number;
        balance_amount?: number;
        payment_method?: string;
        discount_percent?: number;
    } | null;
    items: {
        medicine_name: string;
        batch_number: string;
        expiry_date: string;
        quantity: number;
        unit_price: number;
        mrp: number; // For savings calculation if needed
        gst_rate: number;
        discount_amount: number;
        total_amount: number;
    }[];
    customer: {
        name: string;
        doctor_name?: string;
    } | null;
    user?: {
        full_name: string;
    } | null;
    terms?: string[];
}

export const PrintBill: React.FC<PrintBillProps> = ({ shop, invoice, items, customer, user }) => {
    if (!shop || !invoice) return null;

    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const subTotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        } catch { return ''; }
    };

    const formatTime = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch { return ''; }
    };

    const formatExp = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' });
        } catch { return ''; }
    };

    return (
        <div className="hidden print:block font-mono text-sm leading-tight p-2 w-[80mm] mx-auto bg-white text-black">
            {/* Print Styles to hide everything else */}
            <style>
                {`
                    @media print {
                        @page { size: 80mm auto; margin: 0mm; }
                        body * { visibility: hidden; }
                        .print\\:block, .print\\:block * { visibility: visible; }
                        .print\\:block { position: absolute; left: 0; top: 0; width: 100%; min-height: 100vh; }
                    }
                `}
            </style>

            {/* Header */}
            <div className="text-center border-b border-dashed border-black pb-2 mb-2">
                <h1 className="text-lg font-bold uppercase">{shop.name}</h1>
                <p>{shop.address}</p>
                <p>{shop.city} - {shop.pincode}</p>
                <div className="flex justify-center gap-4 mt-1">
                    <p>Ph: {shop.phone}</p>
                </div>
                <div className="grid grid-cols-2 text-xs mt-1 text-left px-1">
                    <div>DL No: {shop.license_number || 'N/A'}</div>
                    <div className="text-right">GST: {shop.gst_number || 'N/A'}</div>
                </div>
            </div>

            {/* Invoice Meta */}
            <div className="border-b border-dashed border-black pb-2 mb-2 text-xs">
                <div className="flex justify-between">
                    <div>Name: {customer?.name || 'Walk-in'}</div>
                    <div>Bill No: {invoice.invoice_number}</div>
                </div>
                <div className="flex justify-between">
                    {/* Placeholder for Doctor if available in future */}
                    <div>Doctor: {customer?.doctor_name || 'Self'}</div>
                    <div>Date: {formatDate(invoice.created_at)}</div>
                </div>
                <div className="flex justify-end">
                    <div>Time: {formatTime(invoice.created_at)}</div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs mb-2">
                <thead>
                    <tr className="border-b border-dashed border-black">
                        <th className="text-left w-6">Sn</th>
                        <th className="text-left">Particulars</th>
                        <th className="text-right w-8">Qty</th>
                        <th className="text-right w-12">Batch</th>
                        <th className="text-right w-10">Exp</th>
                        {/* Simplified GST cols for space, or combine */}
                        <th className="text-right w-12">Amount</th>
                    </tr>
                </thead>
                <tbody className="leading-5">
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td className="align-top">{index + 1}</td>
                            <td className="align-top pr-1">
                                {item.medicine_name}
                            </td>
                            <td className="align-top text-right">{item.quantity}</td>
                            <td className="align-top text-right">{item.batch_number}</td>
                            <td className="align-top text-right">{formatExp(item.expiry_date)}</td>
                            <td className="align-top text-right">
                                {(item.unit_price * item.quantity).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-dashed border-black pt-2 mb-2 text-xs">
                <div className="flex justify-between">
                    <span>TOT ITEMS: {items.length}</span>
                    <div className="text-right w-40">
                        <div className="flex justify-between">
                            <span>SUB TOTAL</span> :
                            <span>{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>DISCOUNT AMT</span> :
                            <span>{totalDiscount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-black mt-1 pt-1 font-bold text-sm">
                            <span>NET AMOUNT</span> :
                            <span>{invoice.total_amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div className="mt-1">
                    <span>Tot QTY: {totalQty}</span>
                    <span className="float-right font-medium">GST Included</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-4">
                <p className="font-bold">THANK YOU GET WELL SOON</p>
                <p className="mt-1">FREE HOME DELIVERY</p>
                <p className="font-bold text-sm mt-1">{shop.phone}</p>
                <div className="flex justify-between mt-4 items-end">
                    <span>{user?.full_name || 'Staff'}</span>
                    <span>PHARMACIST SIGN</span>
                </div>
            </div>
        </div>
    );
};
