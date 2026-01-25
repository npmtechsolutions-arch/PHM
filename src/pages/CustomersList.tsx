import { useState, useEffect } from 'react';
import { customersApi } from '../services/api';
import { useMasterData } from '../contexts/MasterDataContext';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useOperationalContext } from '../contexts/OperationalContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { formatCurrency } from '../utils/formatting';
import { PermissionGate } from '../components/PermissionGate';
import { CustomerTypeSelect, GenderSelect } from '../components/MasterSelect';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Drawer from '../components/Drawer';
import { type Column } from '../components/Table';

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
    const { isLoading: mastersLoading } = useMasterData();
    const { user } = useUser();
    const { activeEntity, scope } = useOperationalContext();
    const { handleError, handleSuccess } = useErrorHandler();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
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
    }, [currentPage, pageSize, search]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };
            if (search) params.search = search;

            const response = await customersApi.list(params);
            setCustomers(response.data?.items || response.data?.data || []);
            setTotalItems(response.data?.total || 0);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            setCustomers([]);
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
                let shopId = user?.shop_id;
                if (scope === 'shop' && activeEntity?.id) {
                    shopId = activeEntity.id;
                }

                if (!shopId) {
                    // Backend will validate shop_id requirement
                    // Super Admin should select shop context before creating customers
                }

                await customersApi.create({
                    ...formData,
                    shop_id: shopId,
                    customer_type: (formData.customer_type || 'regular').toLowerCase()
                });
            }
            handleSuccess(editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
            setShowModal(false);
            fetchCustomers();
        } catch (error) {
            handleError(error, editingCustomer ? 'Failed to update customer' : 'Failed to create customer');
        }
    };


    const columns: Column<Customer>[] = [
        {
            header: 'Customer',
            key: 'name',
            render: (c) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold">
                        {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.phone}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Type',
            key: 'customer_type',
            render: (c) => (
                <Badge variant={c.customer_type === 'premium' ? 'warning' : 'secondary'} className="capitalize">
                    {c.customer_type || 'regular'}
                </Badge>
            )
        },
        {
            header: 'Email / Address',
            key: 'email',
            className: 'hidden md:table-cell',
            render: (c) => (
                <div className="text-sm">
                    {c.email && <div className="text-slate-700 dark:text-slate-300">{c.email}</div>}
                    {c.address && <div className="text-xs text-slate-500 truncate max-w-[200px]">{c.address}</div>}
                </div>
            )
        },
        {
            header: 'Total Spend',
            key: 'total_purchases',
            align: 'right',
            render: (c) => (
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(c.total_purchases || 0)}</span>
            )
        },
        {
            header: 'Last Visit',
            key: 'last_visit',
            align: 'right',
            render: (c) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    {c.last_visit ? new Date(c.last_visit).toLocaleDateString() : '-'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (c) => (
                <PermissionGate permission="customers.manage.shop">
                    <Button variant="ghost" onClick={() => openEditModal(c)} className="!p-1.5 h-8 w-8 text-blue-600" title="Edit Customer">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Button>
                </PermissionGate>
            )
        }
    ];



    return (
        <UniversalListPage loading={mastersLoading}>
            <UniversalListPage.Header
                title="Customers"
                subtitle="Manage customer profiles and history"
                actions={
                    <PermissionGate permission="customers.manage.shop">
                        <Button variant="primary" onClick={openCreateModal}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            Add Customer
                        </Button>
                    </PermissionGate>
                }
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title="Total Customers"
                    value={totalItems}
                    icon="group"
                    isActive={true}
                />
                {/* 
                  Note: Backend API for stats is not yet available, 
                  so we keep placeholders or minimal cards.
                */}
                <div className="hidden sm:block"></div>
                <div className="hidden lg:block"></div>
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={customers}
                loading={loading}
                emptyMessage="No customers found."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(totalItems / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: totalItems,
                    pageSize: pageSize,
                    onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Customer List"
                        count={totalItems}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search customers..."
                        }}
                        embedded={true}
                    />
                }
            />

            {/* Edit/Create Drawer */}
            <Drawer
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
                subtitle={editingCustomer ? 'Update customer information' : 'Create a new customer profile'}
                width="md"
                footer={
                    <div className="flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" form="customer-form" className="flex-1">
                            {editingCustomer ? 'Update' : 'Create'}
                        </Button>
                    </div>
                }
            >
                <form id="customer-form" onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Enter customer name"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Enter phone number"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Customer Type
                            </label>
                            <CustomerTypeSelect
                                value={formData.customer_type}
                                onChange={(val) => setFormData({ ...formData, customer_type: val })}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Gender
                            </label>
                            <GenderSelect
                                value={formData.gender}
                                onChange={(val) => setFormData({ ...formData, gender: val })}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Enter email address"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Address
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                            placeholder="Enter address"
                        />
                    </div>
                </form>
            </Drawer>
        </UniversalListPage>
    );
}
