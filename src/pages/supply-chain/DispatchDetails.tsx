import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dispatchesApi } from '../../services/api';
import { useOperationalContext } from '../../contexts/OperationalContext';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

interface DispatchItem {
    id: string;
    medicine_name: string;
    batch_number: string;
    quantity: number;
    purchase_price: number;
    selling_price: number;
}

interface DispatchDetail {
    id: string;
    dispatch_number: string;
    warehouse_name: string;
    shop_name: string;
    status: string;
    dispatch_date: string;
    items: DispatchItem[];
}

export default function DispatchDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { activeEntity } = useOperationalContext();
    const [dispatch, setDispatch] = useState<DispatchDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDispatch();
    }, [id]);

    const fetchDispatch = async () => {
        try {
            setLoading(true);
            const res = await dispatchesApi.get(id!);
            setDispatch(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!dispatch) return <div className="p-8">Dispatch not found</div>;

    const canReceive = activeEntity?.type === 'shop' && ['pending', 'created', 'in_transit'].includes(dispatch.status.toLowerCase());

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Dispatch #{dispatch.dispatch_number || dispatch.id.slice(0, 8)}
                    </h1>
                    <p className="text-slate-500">
                        From {dispatch.warehouse_name} to {dispatch.shop_name}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant={dispatch.status === 'delivered' ? 'success' : 'primary'}>
                        {dispatch.status.replace('_', ' ')}
                    </Badge>
                    {canReceive && (
                        <Button
                            variant="success"
                            onClick={() => navigate('/shops/stock', {
                                state: { dispatchId: dispatch.id }
                            })}
                        >
                            Receive Stock
                        </Button>
                    )}
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        Back
                    </Button>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Medicine</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Batch</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Quantity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {dispatch.items?.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                                    {item.medicine_name}
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                    {item.batch_number}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-900 dark:text-white">
                                    {item.quantity}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
