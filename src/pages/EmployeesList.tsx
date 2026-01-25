import { useState, useEffect } from 'react';
import { employeesApi } from '../services/api';
import { ShopSelect, EmploymentTypeSelect, GenderSelect } from '../components/MasterSelect';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useOperationalContext } from '../contexts/OperationalContext';
import { useMasterData } from '../contexts/MasterDataContext';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Drawer from '../components/Drawer';
import { type Column } from '../components/Table';


interface Employee {
    id: string;
    name: string;
    employee_code?: string;
    email?: string;
    phone: string;

    employment_type?: string;
    basic_salary: number;
    status: string;
    shop_id?: string;
    shop_name?: string;
    date_of_joining?: string;
    gender?: string;
    department?: string;
    designation?: string;
}

interface EmployeeForm {
    name: string;
    email: string;
    password: string;
    phone: string;

    employment_type: string;
    salary: number;
    shop_id: string;
    date_of_joining: string;
    address: string;
    emergency_contact: string;
    gender: string;
    // Salary components
    hra_percent: number;
    allowances_percent: number;
    pf_percent: number;
    esi_percent: number;
    esi_applicable: boolean;
}

const emptyForm: EmployeeForm = {
    name: '',
    email: '',
    password: '',
    phone: '',

    employment_type: 'full_time',
    salary: 0,
    shop_id: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    address: '',
    emergency_contact: '',
    gender: '',
    hra_percent: 40.0,
    allowances_percent: 20.0,
    pf_percent: 12.0,
    esi_percent: 0.75,
    esi_applicable: true,
};

export default function EmployeesList() {
    const { user } = useUser();
    const { activeEntity } = useOperationalContext();
    const { isLoading: mastersLoading } = useMasterData();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<EmployeeForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [createdCredentials, setCreatedCredentials] = useState<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [statusFilter, setStatusFilter] = useState('');
    const { hasPermission } = usePermissions();

    useEffect(() => {
        fetchEmployees();
    }, [deptFilter, currentPage, pageSize, search, statusFilter]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };
            if (search) params.search = search;
            if (deptFilter) params.department = deptFilter;
            if (statusFilter) params.status = statusFilter;

            const res = await employeesApi.list(params);
            setEmployees(res.data.items || res.data.data || res.data || []);
            setTotalItems(res.data.total || res.data.length || 0);
        } catch (e) {
            console.error(e);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingEmployee(null);
        setFormData(emptyForm);
        setError('');
        setShowModal(true);
    };

    const openEditModal = async (employee: Employee) => {
        try {
            const response = await employeesApi.get(employee.id);
            const data = response.data;
            setEditingEmployee(employee);
            setFormData({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                employment_type: data.employment_type || 'full_time',
                salary: data.basic_salary || 0,
                shop_id: data.shop_id || '',
                date_of_joining: data.date_of_joining?.split('T')[0] || '',
                address: data.address || '',
                emergency_contact: data.emergency_contact || '',
                gender: data.gender || '',
                hra_percent: data.hra_percent || 40.0,
                allowances_percent: data.allowances_percent || 20.0,
                pf_percent: data.pf_percent || 12.0,
                esi_percent: data.esi_percent || 0.75,
                esi_applicable: data.esi_applicable !== undefined ? data.esi_applicable : true,
                password: '',
            });
            setError('');
            setShowModal(true);
        } catch (err) {
            console.error('Failed to fetch employee details:', err);
            alert('Failed to load employee details');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.phone) {
            setError('Please fill in all required fields (Name, Phone)');
            return;
        }

        if (!formData.salary || formData.salary <= 0) {
            setError('Please enter a valid salary amount');
            return;
        }

        setSaving(true);
        try {
            const payload: any = {
                name: formData.name,
                phone: formData.phone,
                employment_type: formData.employment_type,
                date_of_joining: formData.date_of_joining,
                basic_salary: Number(formData.salary) || undefined,
                email: formData.email || undefined,
                password: formData.password || undefined,
                gender: formData.gender || undefined,
                address: formData.address || undefined,
                emergency_contact: formData.emergency_contact || undefined,
                shop_id: formData.shop_id || undefined,
                hra_percent: formData.hra_percent,
                allowances_percent: formData.allowances_percent,
                pf_percent: formData.pf_percent,
                esi_percent: formData.esi_percent,
                esi_applicable: formData.esi_applicable,
            };

            if (editingEmployee) {
                await employeesApi.update(editingEmployee.id, payload);
                setShowModal(false);
                fetchEmployees();
            } else {
                const response = await employeesApi.create(payload);
                // Check if credentials were returned
                if (response.data?.data?.credentials) {
                    setCreatedCredentials(response.data.data.credentials);
                }
                setShowModal(false);
                fetchEmployees();
            }
        } catch (err: any) {
            console.error('Failed to save employee:', err);
            let errorMessage = 'Failed to save employee';
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (Array.isArray(detail)) {
                    errorMessage = detail.map((e: any) => `${e.loc?.join('.') || 'Field'}: ${e.msg}`).join(', ');
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }
            }
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingEmployee) return;

        setDeleting(true);
        try {
            await employeesApi.delete(deletingEmployee.id);
            setShowDeleteModal(false);
            setDeletingEmployee(null);
            fetchEmployees();
        } catch (err: any) {
            console.error('Failed to delete employee:', err);
            let errorMessage = 'Failed to delete employee';
            if (err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            }
            alert(errorMessage);
        } finally {
            setDeleting(false);
        }
    };

    const openDeleteModal = (employee: Employee) => {
        setDeletingEmployee(employee);
        setShowDeleteModal(true);
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

    // Stats
    // Stats removed as per build cleanup (unused)

    const columns: Column<Employee>[] = [
        {
            header: 'Employee',
            key: 'name',
            render: (emp) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 text-sm font-bold">
                        {emp.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.phone}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Department',
            key: 'department',
            render: (emp) => <Badge variant="secondary" className="capitalize">{emp.department}</Badge>
        },
        { header: 'Designation', key: 'designation', className: 'hidden sm:table-cell' },
        {
            header: 'Salary',
            key: 'basic_salary',
            render: (emp) => <span className="font-medium font-mono text-slate-700 dark:text-slate-300">{formatCurrency(emp.basic_salary || 0)}</span>,
            align: 'right'
        },
        {
            header: 'Status',
            key: 'status',
            render: (emp) => (
                <Badge variant={emp.status === 'active' ? 'success' : emp.status === 'on_leave' ? 'warning' : 'error'}>
                    {emp.status || 'Active'}
                </Badge>
            ),
            align: 'center'
        },
        {
            header: 'Actions',
            key: 'id',
            render: (emp) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="ghost"
                        onClick={() => openEditModal(emp)}
                        className="!p-1.5 h-8 w-8 text-slate-500 hover:text-blue-600"
                        title="Edit Employee"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => openDeleteModal(emp)}
                        className="!p-1.5 h-8 w-8 text-slate-500 hover:text-red-600"
                        title="Delete Employee"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </Button>
                </div>
            ),
            align: 'right'
        }
    ];

    return (
        <UniversalListPage loading={mastersLoading}>
            <UniversalListPage.Header
                title="Employees"
                subtitle="Manage staff, payroll, and assignments"
                actions={
                    (hasPermission('employees.manage.warehouse') || hasPermission('employees.manage.shop')) && (
                        <Button variant="primary" onClick={openCreateModal}>
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            Add Employee
                        </Button>
                    )
                }
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title="All Employees"
                    value={!statusFilter ? totalItems : '-'}
                    icon="badge"
                    onClick={() => { setStatusFilter(''); setDeptFilter(''); }}
                    isActive={!statusFilter && !deptFilter}
                />
                <StatCard
                    title="Active"
                    value={statusFilter === 'active' ? totalItems : '-'}
                    icon="check_circle"
                    onClick={() => setStatusFilter('active')}
                    isActive={statusFilter === 'active'}
                />
                <StatCard
                    title="On Leave"
                    value={statusFilter === 'on_leave' ? totalItems : '-'}
                    icon="event_busy"
                    onClick={() => setStatusFilter('on_leave')}
                    isActive={statusFilter === 'on_leave'}
                />
                <StatCard
                    title="Inactive"
                    value={statusFilter === 'inactive' ? totalItems : '-'}
                    icon="cancel"
                    onClick={() => setStatusFilter('inactive')}
                    isActive={statusFilter === 'inactive'}
                />
                {hasPermission('employees.view.global') && (
                    <StatCard
                        title="Terminated"
                        value={statusFilter === 'terminated' ? totalItems : '-'}
                        icon="delete"
                        onClick={() => setStatusFilter('terminated')}
                        isActive={statusFilter === 'terminated'}
                        className="!bg-red-50 dark:!bg-red-900/10 !border-red-200 dark:!border-red-800"
                    />
                )}
            </UniversalListPage.KPICards>

            {/* Zero-Gap Integration */}
            <UniversalListPage.DataTable
                columns={columns}
                data={employees}
                loading={loading}
                emptyMessage="No employees found. Add your first employee."
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
                        title="Employee List"
                        count={totalItems}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); },
                            placeholder: "Search employees..."
                        }}
                        actions={null}
                        embedded={true}
                    />
                }
            />

            {/* Edit/Create Drawer */}
            <Drawer
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                subtitle={editingEmployee ? 'Update employee information' : 'Create a new employee record'}
                width="lg"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setShowModal(false)}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            form="employee-form"
                            disabled={saving}
                            loading={saving}
                        >
                            {editingEmployee ? 'Update Employee' : 'Add Employee'}
                        </Button>
                    </div>
                }
            >
                <form id="employee-form" onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Enter full name"
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
                                    {!editingEmployee && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors"
                                                placeholder="Enter password for user account"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Join Date</label>
                                        <input
                                            type="date"
                                            value={formData.date_of_joining}
                                            onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employment Type</label>
                                        <EmploymentTypeSelect
                                            value={formData.employment_type}
                                            onChange={(val) => setFormData({ ...formData, employment_type: val })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                                        <GenderSelect
                                            value={formData.gender}
                                            onChange={(val) => setFormData({ ...formData, gender: val })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                        />
                                    </div>
                                </div>



                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Salary (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.salary}
                                            onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors font-mono"
                                        />
                                    </div>
                                    {activeEntity?.type !== 'warehouse' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned Shop</label>
                                            <ShopSelect
                                                value={formData.shop_id}
                                                onChange={(val) => setFormData({ ...formData, shop_id: val })}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Salary Components Section */}
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">percent</span>
                                        Salary Component Configuration
                                    </h3>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">HRA %</label>
                                            <input
                                                type="number"
                                                value={formData.hra_percent}
                                                onChange={(e) => setFormData({ ...formData, hra_percent: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors font-mono text-sm"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Allowances %</label>
                                            <input
                                                type="number"
                                                value={formData.allowances_percent}
                                                onChange={(e) => setFormData({ ...formData, allowances_percent: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors font-mono text-sm"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PF %</label>
                                            <input
                                                type="number"
                                                value={formData.pf_percent}
                                                onChange={(e) => setFormData({ ...formData, pf_percent: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors font-mono text-sm"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ESI %</label>
                                            <input
                                                type="number"
                                                value={formData.esi_percent}
                                                onChange={(e) => setFormData({ ...formData, esi_percent: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors font-mono text-sm"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                disabled={!formData.esi_applicable}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.esi_applicable}
                                                onChange={(e) => setFormData({ ...formData, esi_applicable: e.target.checked })}
                                                className="rounded border-slate-300"
                                            />
                                            <span className="text-xs text-slate-600 dark:text-slate-400">ESI Applicable (only for salary &lt; ₹21,000)</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors"
                                        rows={2}
                                    />
                                </div>
                </form>
            </Drawer>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingEmployee && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-scaleIn">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delete Employee</h2>
                                    <p className="text-sm text-slate-500">This action cannot be undone</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                                <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
                                    <span>Are you sure you want to delete <strong>{deletingEmployee.name}</strong>? The employee status will be set to "terminated".</span>
                                </p>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex justify-between">
                                    <span>Employee Code:</span>
                                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{deletingEmployee.employee_code || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Department:</span>
                                    <span className="font-medium text-slate-900 dark:text-white capitalize">{deletingEmployee.department}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Phone:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{deletingEmployee.phone}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingEmployee(null);
                                }}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleDelete}
                                disabled={deleting}
                                loading={deleting}
                                className="!bg-red-600 hover:!bg-red-700"
                            >
                                Delete Employee
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Credentials Modal */}
            {createdCredentials && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-scaleIn">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">check_circle</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Employee Created!</h2>
                                    <p className="text-sm text-slate-500">User account credentials generated</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                                <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
                                    <span>Please save these credentials securely and share them with the employee. They won't be shown again.</span>
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={createdCredentials.email}
                                            readOnly
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-sm"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigator.clipboard.writeText(createdCredentials.email)}
                                            className="!p-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Temporary Password</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={createdCredentials.temporary_password}
                                            readOnly
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-sm font-bold"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigator.clipboard.writeText(createdCredentials.temporary_password)}
                                            className="!p-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <Button
                                variant="primary"
                                onClick={() => setCreatedCredentials(null)}
                            >
                                Got It
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </UniversalListPage>
    );
}
