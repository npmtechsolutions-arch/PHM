import { useState, useEffect } from 'react';
import { customersApi } from '../services/api';
import { CustomerTypeSelect, GenderSelect } from '../components/MasterSelect';
import SearchBar from '../components/SearchBar';

interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    shop_id?: string;
    total_purchases: number;
    last_visit?: string;
    customer_type?: string;
    gender?: string;
    created_at: string;
}

export default function CustomersList() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        customer_type: 'regular',
        gender: '',
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customersApi.list({ search });
            setCustomers(response.data?.items || response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    };



    const openCreateModal = () => {
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '', address: '', customer_type: 'regular', gender: '' });
        setShowModal(true);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            address: customer.address || '',
            customer_type: customer.customer_type || 'regular',
            gender: customer.gender || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await customersApi.update(editingCustomer.id, formData);
            } else {
                await customersApi.create(formData);
            }
            setShowModal(false);
            fetchCustomers();
        } catch (error) {
            console.error('Failed to save customer:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage customer information and purchase history</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="min-w-[250px]">
                        <SearchBar
                            placeholder="Search customers..."
                            value={search}
                            onChange={setSearch}
                        />
                    </div>
                    <button onClick={fetchCustomers} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Add Customer
                    </button>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-slate-400">person_off</span>
                        <p className="mt-2 text-slate-500">No customers found</p>
                    </div>
                ) : (
                    customers.map((customer) => (
                        <div key={customer.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold text-lg">
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{customer.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{customer.phone}</p>
                                        <div className="flex gap-2 mt-1">
                                            {customer.customer_type && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800 capitalize">
                                                    {customer.customer_type}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => openEditModal(customer)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                            </div>

                            {customer.email && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <span className="material-symbols-outlined text-[16px]">mail</span>
                                    {customer.email}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">Total Purchases</p>
                                    <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(customer.total_purchases || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">Last Visit</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">
                                        {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl h-auto max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                                    <CustomerTypeSelect
                                        value={formData.customer_type}
                                        onChange={(val) => setFormData({ ...formData, customer_type: val })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                                    <GenderSelect
                                        value={formData.gender}
                                        onChange={(val) => setFormData({ ...formData, gender: val })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                    {editingCustomer ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
