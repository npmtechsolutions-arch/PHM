import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../services/api';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';

interface Supplier {
    id: string;
    name: string;
    code: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    is_active: boolean;
    created_at: string;
}

export default function SuppliersPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        contact_person: '',
        phone: '',
        email: '',
        gst_number: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user && user.role !== 'super_admin') {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await mastersApi.listSuppliers();
            setSuppliers(res.data || []);
        } catch (err) {
            console.error('Failed to load suppliers:', err);
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData({ name: '', code: '', contact_person: '', phone: '', email: '', gst_number: '', address: '', city: '', state: '', pincode: '' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (item: Supplier) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code,
            contact_person: item.contact_person || '',
            phone: item.phone || '',
            email: item.email || '',
            gst_number: item.gst_number || '',
            address: item.address || '',
            city: item.city || '',
            state: item.state || '',
            pincode: item.pincode || ''
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
                await mastersApi.updateSupplier(editingItem.id, formData);
            } else {
                await mastersApi.createSupplier(formData);
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save supplier');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: Supplier) => {
        if (!confirm(`Delete supplier "${item.name}"?`)) return;
        try {
            await mastersApi.deleteSupplier(item.id);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete');
        }
    };

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PageLayout
            title="Suppliers"
            description="Manage suppliers for stock entry and purchase orders"
            icon="local_shipping"
            actions={
                <Button variant="primary" onClick={openCreateModal}>
                    <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                    Add Supplier
                </Button>
            }
        >
            <Card className="space-y-6">
                {/* Search */}
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Search suppliers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">local_shipping</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No suppliers found</h3>
                        <p className="text-slate-500 mt-1">Add suppliers to enable stock entry</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-zebra">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Contact</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">GST Number</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3 font-mono text-sm">{item.code}</td>
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                            {item.contact_person || item.phone || '-'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm">{item.gst_number || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(item)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingItem ? 'Edit Supplier' : 'Add Supplier'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Supplier Code *" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="SUP001" required />
                        <Input label="Supplier Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ABC Pharmaceuticals" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Contact Person" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} placeholder="John Doe" />
                        <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 9876543210" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="supplier@example.com" />
                        <Input label="GST Number" value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} placeholder="29ABCDE1234F1Z5" className="font-mono" />
                    </div>

                    <Input label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Street address" />

                    <div className="grid grid-cols-3 gap-4">
                        <Input label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Mumbai" />
                        <Input label="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="Maharashtra" />
                        <Input label="Pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} placeholder="400001" />
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
