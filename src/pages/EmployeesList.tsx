import { useState, useEffect } from 'react';
import { employeesApi, shopsApi } from '../services/api';

interface Employee {
    id: string;
    name: string;
    employee_code?: string;
    email?: string;
    phone: string;
    department: string;
    designation: string;
    salary: number;
    status: string;
    shop_id?: string;
    shop_name?: string;
    date_of_joining?: string;
}

interface Shop {
    id: string;
    name: string;
}

interface EmployeeForm {
    name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    salary: number;
    shop_id: string;
    date_of_joining: string;
    address: string;
    emergency_contact: string;
}

const emptyForm: EmployeeForm = {
    name: '',
    email: '',
    phone: '',
    department: 'pharmacy',
    designation: '',
    salary: 0,
    shop_id: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    address: '',
    emergency_contact: '',
};

export default function EmployeesList() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
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

    useEffect(() => {
        fetchEmployees();
        fetchShops();
    }, [deptFilter, currentPage]);

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

    const fetchShops = async () => {
        try {
            const response = await shopsApi.list({ size: 100 });
            setShops(response.data.items || []);
        } catch (err) {
            console.error('Failed to fetch shops:', err);
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
                department: data.department || 'pharmacy',
                designation: data.designation || '',
                salary: data.salary || 0,
                shop_id: data.shop_id || '',
                date_of_joining: data.date_of_joining?.split('T')[0] || '',
                address: data.address || '',
                emergency_contact: data.emergency_contact || '',
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

        setSaving(true);
        try {
            if (editingEmployee) {
                await employeesApi.update(editingEmployee.id, formData);
            } else {
                await employeesApi.create(formData);
            }
            setShowModal(false);
            fetchEmployees();
        } catch (err: any) {
            console.error('Failed to save employee:', err);
            setError(err.response?.data?.detail || 'Failed to save employee');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);
    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employees</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage staff and payroll</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Add Employee
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[250px]">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <select
                        value={deptFilter}
                        onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                        <option value="">All Departments</option>
                        <option value="sales">Sales</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="warehouse">Warehouse</option>
                        <option value="admin">Admin</option>
                        <option value="hr">HR</option>
                    </select>
                    <button
                        onClick={fetchEmployees}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin h-10 w-10 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : employees.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">badge</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No employees found</h3>
                        <p className="text-slate-500 mt-1">Add your first employee to get started</p>
                        <button
                            onClick={openCreateModal}
                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700"
                        >
                            Add Employee
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Employee</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Department</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Designation</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Salary</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-medium">
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{emp.name}</p>
                                                    <p className="text-sm text-slate-500">{emp.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                                                {emp.department}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{emp.designation || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(emp.salary || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${emp.status === 'active'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {emp.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(emp)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-slate-500 text-[20px]">edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <span className="px-4 py-2 text-sm font-medium">Page {currentPage} of {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone *</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Joining</label>
                                        <input
                                            type="date"
                                            value={formData.date_of_joining}
                                            onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department *</label>
                                        <select
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            required
                                        >
                                            <option value="pharmacy">Pharmacy</option>
                                            <option value="sales">Sales</option>
                                            <option value="warehouse">Warehouse</option>
                                            <option value="admin">Admin</option>
                                            <option value="hr">HR</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                                        <input
                                            type="text"
                                            value={formData.designation}
                                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                            placeholder="e.g., Pharmacist, Sales Executive"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monthly Salary (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.salary}
                                            onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Shop</label>
                                        <select
                                            value={formData.shop_id}
                                            onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        >
                                            <option value="">Select Shop</option>
                                            {shops.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Emergency Contact</label>
                                    <input
                                        type="tel"
                                        value={formData.emergency_contact}
                                        onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
