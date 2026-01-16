import Modal from './Modal';
import Button from './Button';

interface Batch {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    mrp: number;
}

interface BatchSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    medicineName: string;
    batches: Batch[];
    onSelect: (batch: Batch) => void;
}

export default function BatchSelectionModal({
    isOpen,
    onClose,
    medicineName,
    batches,
    onSelect
}: BatchSelectionModalProps) {

    // Sort batches by expiry date (earliest first)
    const sortedBatches = [...batches].sort((a, b) =>
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    );

    const formatDate = (dateConfig: string) => {
        if (!dateConfig) return 'N/A';
        return new Date(dateConfig).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

    const isExpired = (dateString: string) => {
        return new Date(dateString) < new Date();
    };

    const isExpiringSoon = (dateString: string) => {
        const today = new Date();
        const expiry = new Date(dateString);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 60;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Select Batch - ${medicineName}`}
            maxWidth="md"
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Multiple batches found for this medicine. Please select one to proceed.
                </p>

                <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Batch #</th>
                                <th className="px-4 py-3">Expiry</th>
                                <th className="px-4 py-3 text-right">MRP</th>
                                <th className="px-4 py-3 text-right">Stock</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {sortedBatches.map(batch => {
                                const expired = isExpired(batch.expiry_date);
                                const expiring = isExpiringSoon(batch.expiry_date);

                                return (
                                    <tr
                                        key={batch.id}
                                        className={`
                                            bg-white dark:bg-slate-800 
                                            ${expired ? 'opacity-60 bg-slate-50 dark:bg-slate-900' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}
                                        `}
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                            {batch.batch_number}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className={`font-medium ${expired ? 'text-red-500' : expiring ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {formatDate(batch.expiry_date)}
                                                </span>
                                                {expired && <span className="text-[10px] text-red-500 font-bold uppercase">Expired</span>}
                                                {expiring && !expired && <span className="text-[10px] text-amber-500 font-bold uppercase">Expiring Soon</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                            {formatCurrency(batch.mrp)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                                            {batch.quantity}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="sm"
                                                variant={expired ? "secondary" : "primary"}
                                                disabled={expired || batch.quantity <= 0}
                                                onClick={() => onSelect(batch)}
                                            >
                                                Select
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                </div>
            </div>
        </Modal>
    );
}
