import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import { usePermissions } from '../../contexts/PermissionContext';
import PageLayout from '../../components/PageLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Drawer from '../../components/Drawer';
import ConfirmationModal from '../../components/ConfirmationModal';

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
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [items, setItems] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<PaymentMethod | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        icon: 'payments',
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && !hasPermission('payment_methods.view')) {
            navigate('/');
        }
    }, [user, navigate, hasPermission]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listPaymentMethods();
            setItems(res.data.items || []);
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
        setFormData({ name: '', code: '', icon: 'payments', is_active: true });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (item: PaymentMethod) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code,
            icon: item.icon || 'payments',
            is_active: item.is_active
        });
        setError('');
        setShowModal(true);
    };

    // handleToggleStatus removed - unused

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

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<PaymentMethod | null>(null);

    const handleDeleteClick = (item: PaymentMethod) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await mastersApi.deletePaymentMethod(itemToDelete.id);
            window.toast?.success('Payment method deleted successfully');
            loadData();
        } catch (err: any) {
            console.error('Failed to delete payment method:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete payment method');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const icons = ['payments', 'credit_card', 'qr_code_scanner', 'account_balance_wallet', 'receipt', 'account_balance'];

    return (
        <PageLayout
            title="Payment Methods"
            description="Manage payment methods for billing and POS"
            icon="credit_card"
            actions={
                hasPermission('payment_methods.create') && (
                    <Button variant="primary" onClick={openCreateModal}>
                        <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                        Add Method
                    </Button>
                )
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
                                    {hasPermission('payment_methods.edit') && (
                                        <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg">
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                    )}
                                    {hasPermission('payment_methods.delete') && (
                                        <button onClick={() => handleDeleteClick(item)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Drawer
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingItem ? 'Edit Payment Method' : 'Add Payment Method'}
                subtitle={editingItem ? 'Update payment method' : 'Create a new payment method'}
                width="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" form="payment-method-form" loading={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                }
            >
                <form id="payment-method-form" onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CASH" required />
                        <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Cash Payment" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            Icon
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {icons.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={`p-3 rounded-lg border transition-all ${
                                        formData.icon === icon 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' 
                                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-xl">{icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                            Active Status
                        </label>
                    </div>
                </form>
            </Drawer>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Payment Method"
                message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete Method"
            />
        </PageLayout>
    );
}
