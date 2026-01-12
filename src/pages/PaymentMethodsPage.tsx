import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';

interface PaymentMethod {
    id: string;
    code: string;
    name: string;
    icon?: string;
    is_active: boolean;
    created_at: string;
}

export default function PaymentMethodsPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [items, setItems] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<PaymentMethod | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        icon: 'payments'
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && user.role !== 'super_admin') {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listPaymentMethods();
            setItems(res.data || []);
        } catch (err) {
            console.error('Failed to load payment methods:', err);
            // Provide defaults if API doesn't exist yet
            setItems([
                { id: '1', code: 'CASH', name: 'Cash', icon: 'payments', is_active: true, created_at: new Date().toISOString() },
                { id: '2', code: 'CARD', name: 'Credit/Debit Card', icon: 'credit_card', is_active: true, created_at: new Date().toISOString() },
                { id: '3', code: 'UPI', name: 'UPI', icon: 'qr_code_scanner', is_active: true, created_at: new Date().toISOString() },
                { id: '4', code: 'WALLET', name: 'Digital Wallet', icon: 'account_balance_wallet', is_active: true, created_at: new Date().toISOString() },
                { id: '5', code: 'CREDIT', name: 'Store Credit', icon: 'receipt', is_active: true, created_at: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData({ name: '', code: '', icon: 'payments' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (item: PaymentMethod) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code,
            icon: item.icon || 'payments'
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            setError('Name and code are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editingItem) {
                await mastersApi.updatePaymentMethod(editingItem.id, formData);
            } else {
                await mastersApi.createPaymentMethod(formData);
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: PaymentMethod) => {
        if (!confirm(`Delete "${item.name}"?`)) return;
        try {
            await mastersApi.deletePaymentMethod(item.id);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete');
        }
    };

    const icons = ['payments', 'credit_card', 'qr_code_scanner', 'account_balance_wallet', 'receipt', 'account_balance'];

    return (
        <PageLayout
            title="Payment Methods"
            description="Manage payment methods for billing and POS"
            icon="credit_card"
            actions={
                <Button variant="primary" onClick={openCreateModal}>
                    <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                    Add Method
                </Button>
            }
        >
            <Card className="space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">credit_card</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No payment methods</h3>
                        <p className="text-slate-500 mt-1">Add payment methods to enable billing</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-2xl">{item.icon || 'payments'}</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-slate-900 dark:text-white">{item.name}</h4>
                                    <p className="text-sm text-slate-500 font-mono">{item.code}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg">
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(item)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingItem ? 'Edit Payment Method' : 'Add Payment Method'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CASH" required />
                        <Input label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Cash Payment" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {icons.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={`p-3 rounded-lg border ${formData.icon === icon ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    <span className="material-symbols-outlined text-xl">{icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </Modal>
        </PageLayout>
    );
}
