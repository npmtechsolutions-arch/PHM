import { useState, useEffect } from 'react';
import { employeesApi } from '../services/api';
import { DepartmentSelect, DesignationSelect, ShopSelect, EmploymentTypeSelect, GenderSelect } from '../components/MasterSelect';
import { useUser } from '../contexts/UserContext';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { type Column } from '../components/Table';


interface Employee {
    id: string;
    name: string;
    employee_code?: string;
    email?: string;
    phone: string;
    department: string;
    designation: string;
    employment_type?: string;
    salary: number;
    status: string;
    shop_id?: string;
    shop_name?: string;
    date_of_joining?: string;
    gender?: string;
}

interface EmployeeForm {
    name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    employment_type: string;
    salary: number;
    shop_id: string;
    date_of_joining: string;
    address: string;
    emergency_contact: string;
    gender: string;
}

const emptyForm: EmployeeForm = {
    name: '',
    email: '',
    phone: '',
    department: 'operations',
    designation: '',
    employment_type: 'full_time',
    salary: 0,
    shop_id: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    address: '',
    emergency_contact: '',
    gender: '',
};

export default function EmployeesList() {
    const { user } = useUser();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<EmployeeForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isWarehouseAdmin = user?.role === 'warehouse_admin';

    useEffect(() => {
        fetchEmployees();
    }, [deptFilter, currentPage, search]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, size: pageSize };
            if (search) params.search = search;
            if (deptFilter) params.department = deptFilter;

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
        setFormData({
            ...emptyForm,
            department: isWarehouseAdmin ? 'operations' : 'pharmacy',
        });
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
                department: data.department || (isWarehouseAdmin ? 'operations' : 'pharmacy'),
                designation: data.designation || '',
                employment_type: data.employment_type || 'full_time',
                salary: data.salary || 0,
                shop_id: data.shop_id || '',
                date_of_joining: data.date_of_joining?.split('T')[0] || '',
                address: data.address || '',
                emergency_contact: data.emergency_contact || '',
                gender: data.gender || '',
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

        if (!formData.name || !formData.phone || !formData.department) {
            setError('Please fill in all required fields (Name, Phone, Department)');
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
                department: formData.department,
                designation: formData.designation || undefined,
                employment_type: formData.employment_type,
                date_of_joining: formData.date_of_joining,
                basic_salary: Number(formData.salary) || undefined,
                email: formData.email || undefined,
                gender: formData.gender || undefined,
                address: formData.address || undefined,
                emergency_contact: formData.emergency_contact || undefined,
                shop_id: formData.shop_id || undefined,
            };

            if (editingEmployee) {
                await employeesApi.update(editingEmployee.id, payload);
            } else {
                await employeesApi.create(payload);
            }
            setShowModal(false);
            fetchEmployees();
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

    const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

    // Stats
    const stats = {
        total: employees.length,
        active: employees.filter(e => e.status === 'active').length,
        inactive: employees.filter(e => e.status === 'inactive').length,
        onLeave: employees.filter(e => e.status === 'on_leave').length
    };

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
            key: 'salary',
            render: (emp) => <span className="font-medium font-mono text-slate-700 dark:text-slate-300">{formatCurrency(emp.salary || 0)}</span>,
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
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => openEditModal(emp)}
                        className="!p-1.5 h-8 w-8 text-slate-500 hover:text-blue-600"
                        title="Edit Employee"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Button>
                </div>
            ),
            align: 'right'
        }
    ];

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Employees"
                subtitle="Manage staff, payroll, and assignments"
                actions={
                    <Button variant="primary" onClick={openCreateModal}>
                        <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                        Add Employee
                    </Button>
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Total Employees" value={totalItems} icon="badge" onClick={() => setDeptFilter('')} isActive={deptFilter === ''} />
                <StatCard title="Active" value={stats.active} icon="check_circle" trend="up" change="+5%" />
                <StatCard title="Inactive" value={stats.inactive} icon="cancel" trend="neutral" />
                <StatCard title="On Leave" value={stats.onLeave} icon="event_busy" trend="neutral" />
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
                    pageSize: pageSize
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
                        actions={
                            <div className="flex items-center gap-2">
                                <DepartmentSelect
                                    value={deptFilter}
                                    onChange={(val) => { setDeptFilter(val); setCurrentPage(1); }}
                                    className="!w-40 !py-1.5 !text-sm !rounded-lg" // specific override for toolstrip
                                />
                            </div>
                        }
                        embedded={true}
                    />
                }
            />

            {/* Edit/Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 animate-scaleIn">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">error</span>
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors"
                                        />
                                    </div>
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
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                                        <DepartmentSelect
                                            value={formData.department}
                                            onChange={(val) => setFormData({ ...formData, department: val })}
                                            required
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Designation</label>
                                        <DesignationSelect
                                            value={formData.designation}
                                            onChange={(val) => setFormData({ ...formData, designation: val })}
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
                                    {!isWarehouseAdmin && (
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

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white transition-colors"
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
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
                                    disabled={saving}
                                    loading={saving}
                                >
                                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </UniversalListPage>
    );
}
