import { useState, useEffect } from 'react';
import { employeesApi } from '../services/api';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import { type Column } from '../components/Table';

interface Employee {
    id: string;
    employee_code: string;
    name: string;
    designation: string;
    department: string;
    basic_salary: number;
    date_of_joining: string;
    status?: string;
}

interface SalaryRecord {
    id: string;
    employee_id: string;
    month: number;
    year: number;
    basic_salary: number;
    hra: number;
    allowances: number;
    deductions: number;
    pf_deduction: number;
    esi_deduction: number;
    tax_deduction: number;
    bonus: number;
    gross_salary: number;
    net_salary: number;
    is_paid: boolean;
    paid_at?: string;
}

interface SalaryBreakdown {
    employee: Employee;
    record: SalaryRecord | null;
    basic: number;
    hra: number;
    allowances: number;
    grossEarnings: number;
    pf: number;
    esi: number;
    tax: number;
    totalDeductions: number;
    netSalary: number;
}

const SALARY_CONFIG = {
    HRA_PERCENTAGE: 0.40,        // 40% of Basic
    ALLOWANCE_PERCENTAGE: 0.20,  // 20% of Basic
    PF_PERCENTAGE: 0.12,         // 12% of Basic
    ESI_PERCENTAGE: 0.0075,      // 0.75% of Basic
    ESI_LIMIT: 21000             // ESI applicable if Basic < 21000
};

export default function SalaryManagement() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<SalaryBreakdown | null>(null);
    const [showSlipModal, setShowSlipModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
    const pageSize = 15;

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        if (employees.length > 0) {
            loadSalaryRecords();
        }
    }, [selectedMonth, selectedYear, employees]);

    const loadEmployees = async () => {
        try {
            const response = await employeesApi.list({ size: 500 });
            // Filter for active employees on the frontend
            const allEmployees = response.data.items || response.data || [];
            setEmployees(allEmployees.filter((emp: Employee) => emp.status === 'active'));
        } catch (error) {
            console.error('Error loading employees:', error);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const loadSalaryRecords = async () => {
        try {
            const response = await employeesApi.getSalaryRecords({
                month: selectedMonth,
                year: selectedYear
            });
            setSalaryRecords(response.data || []);
        } catch (error) {
            console.error('Error loading salary records:', error);
            setSalaryRecords([]);
        }
    };

    const calculateSalaryBreakdown = (employee: Employee, record?: SalaryRecord): SalaryBreakdown => {
        const basic = record?.basic_salary || employee.basic_salary || 0;
        const hra = record?.hra || basic * SALARY_CONFIG.HRA_PERCENTAGE;
        const allowances = record?.allowances || basic * SALARY_CONFIG.ALLOWANCE_PERCENTAGE;
        const grossEarnings = basic + hra + allowances;
        const pf = record?.pf_deduction || basic * SALARY_CONFIG.PF_PERCENTAGE;
        const esi = record?.esi_deduction || (basic < SALARY_CONFIG.ESI_LIMIT ? basic * SALARY_CONFIG.ESI_PERCENTAGE : 0);
        const tax = record?.tax_deduction || 0;
        const totalDeductions = pf + esi + tax;
        const netSalary = grossEarnings - totalDeductions;

        return {
            employee,
            record: record || null,
            basic,
            hra,
            allowances,
            grossEarnings,
            pf,
            esi,
            tax,
            totalDeductions,
            netSalary
        };
    };

    const getSalaryBreakdowns = (): SalaryBreakdown[] => {
        const salaryMap = new Map(salaryRecords.map(r => [r.employee_id, r]));
        return employees.map(emp => calculateSalaryBreakdown(emp, salaryMap.get(emp.id)));
    };

    const handleProcessClick = () => {
        if (selectedEmployeeIds.size === 0) {
            toast.error('Please select at least one employee to process salary');
            return;
        }
        setShowConfirmModal(true);
    };

    const processSalary = async () => {
        setShowConfirmModal(false);
        setProcessing(true);
        try {
            await employeesApi.processSalary({
                month: selectedMonth,
                year: selectedYear,
                employee_ids: Array.from(selectedEmployeeIds)
            });
            toast.success(`Salary processed for ${selectedEmployeeIds.size} employee(s)`);
            setSelectedEmployeeIds(new Set());
            loadSalaryRecords();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to process salary');
        } finally {
            setProcessing(false);
        }
    };

    const toggleEmployeeSelection = (employeeId: string) => {
        setSelectedEmployeeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedEmployeeIds.size === filteredBreakdowns.length) {
            setSelectedEmployeeIds(new Set());
        } else {
            setSelectedEmployeeIds(new Set(filteredBreakdowns.map(b => b.employee.id)));
        }
    };

    const viewSalarySlip = (breakdown: SalaryBreakdown) => {
        setSelectedEmployee(breakdown);
        setShowSlipModal(true);
    };

    const getMonthName = (month: number) => {
        return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const breakdowns = getSalaryBreakdowns();
    const filteredBreakdowns = breakdowns.filter(b => {
        const matchesSearch = b.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'paid' && b.record?.is_paid) ||
            (filterStatus === 'pending' && !b.record?.is_paid);
        return matchesSearch && matchesStatus;
    });

    const totalGross = filteredBreakdowns.reduce((sum, b) => sum + b.grossEarnings, 0);
    const totalDeductions = filteredBreakdowns.reduce((sum, b) => sum + b.totalDeductions, 0);
    const totalNet = filteredBreakdowns.reduce((sum, b) => sum + b.netSalary, 0);
    const paidCount = filteredBreakdowns.filter(b => b.record?.is_paid).length;
    const pendingCount = filteredBreakdowns.filter(b => !b.record?.is_paid).length;

    const paginatedData = filteredBreakdowns.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns: Column<SalaryBreakdown>[] = [
        {
            header: (
                <input
                    type="checkbox"
                    checked={selectedEmployeeIds.size > 0 && selectedEmployeeIds.size === filteredBreakdowns.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
            ) as any,
            key: 'select',
            width: '50px',
            render: (breakdown) => (
                <input
                    type="checkbox"
                    checked={selectedEmployeeIds.has(breakdown.employee.id)}
                    onChange={() => toggleEmployeeSelection(breakdown.employee.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
            )
        },
        {
            header: 'Employee',
            key: 'employee',
            render: (breakdown) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                        {breakdown.employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">{breakdown.employee.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{breakdown.employee.employee_code} • {breakdown.employee.designation}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Basic',
            key: 'basic',
            align: 'right',
            render: (b) => <span className="font-mono text-sm text-slate-900 dark:text-white">{formatCurrency(b.basic)}</span>
        },
        {
            header: 'HRA',
            key: 'hra',
            align: 'right',
            render: (b) => <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(b.hra)}</span>
        },
        {
            header: 'Allowances',
            key: 'allowances',
            align: 'right',
            render: (b) => <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(b.allowances)}</span>
        },
        {
            header: 'Gross',
            key: 'grossEarnings',
            align: 'right',
            render: (b) => <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(b.grossEarnings)}</span>
        },
        {
            header: 'Deductions',
            key: 'totalDeductions',
            align: 'right',
            render: (b) => <span className="font-mono text-sm text-red-600 dark:text-red-400">-{formatCurrency(b.totalDeductions)}</span>
        },
        {
            header: 'Net Salary',
            key: 'netSalary',
            align: 'right',
            render: (b) => <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">{formatCurrency(b.netSalary)}</span>
        },
        {
            header: 'Status',
            key: 'status',
            align: 'center',
            render: (b) => b.record?.is_paid ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Paid
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    Pending
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'center',
            render: (b) => (
                <Button
                    variant="ghost"
                    onClick={() => viewSalarySlip(b)}
                    className="!p-1.5 h-8 text-blue-600"
                >
                    <span className="material-symbols-outlined text-lg">description</span>
                </Button>
            )
        }
    ];

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Salary Management"
                subtitle="Process and manage employee salaries"
                actions={
                    <div className="flex items-center gap-3">
                        {selectedEmployeeIds.size > 0 && (
                            <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg">
                                {selectedEmployeeIds.size} selected
                            </span>
                        )}
                        <Button
                            variant="primary"
                            onClick={handleProcessClick}
                            loading={processing}
                            disabled={loading || selectedEmployeeIds.size === 0}
                            icon={processing ? 'hourglass_empty' : 'calculate'}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600"
                        >
                            {processing ? 'Processing...' : `Process Salary${selectedEmployeeIds.size > 0 ? ` (${selectedEmployeeIds.size})` : ''}`}
                        </Button>
                    </div>
                }
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title="Total Employees"
                    value={filteredBreakdowns.length}
                    icon="group"
                    isActive={true}
                />
                <StatCard
                    title="Gross Payroll"
                    value={formatCurrency(totalGross)}
                    icon="trending_up"
                    trend="up"
                    valueClassName="text-emerald-600 dark:text-emerald-400"
                />
                <StatCard
                    title="Total Deductions"
                    value={formatCurrency(totalDeductions)}
                    icon="trending_down"
                    trend="down"
                    valueClassName="text-red-600 dark:text-red-400"
                />
                <StatCard
                    title="Net Payable"
                    value={formatCurrency(totalNet)}
                    icon="payments"
                    isActive={true}
                    valueClassName="text-blue-600 dark:text-blue-400"
                />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="No employees found"
                pagination={{
                    currentPage,
                    totalPages: Math.ceil(filteredBreakdowns.length / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: filteredBreakdowns.length,
                    pageSize
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="Salary List"
                        count={filteredBreakdowns.length}
                        searchProps={{
                            value: searchTerm,
                            onChange: (val) => { setSearchTerm(val); setCurrentPage(1); },
                            placeholder: "Search employees..."
                        }}
                        actions={
                            <div className="flex items-center gap-4">
                                {/* Period Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400 text-xl">calendar_month</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {Array.from({ length: 5 }, (_, i) => {
                                            const year = new Date().getFullYear() - i;
                                            return <option key={year} value={year}>{year}</option>;
                                        })}
                                    </select>
                                </div>

                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

                                {/* Status Filter */}
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg p-1">
                                    <button
                                        onClick={() => setFilterStatus('all')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'all' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        All ({breakdowns.length})
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus('paid')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'paid' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        Paid ({paidCount})
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus('pending')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'pending' ? 'bg-white dark:bg-slate-600 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        Pending ({pendingCount})
                                    </button>
                                </div>
                            </div>
                        }
                        embedded={true}
                    />
                }
            />

            {/* Salary Slip Modal */}
            {showSlipModal && selectedEmployee && (
                <Modal
                    isOpen={showSlipModal}
                    onClose={() => setShowSlipModal(false)}
                    title="Salary Slip"
                    maxWidth="lg"
                >
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Salary Slip</h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                {getMonthName(selectedMonth)} {selectedYear}
                            </p>
                        </div>

                        {/* Employee Info */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Employee Name</p>
                                <p className="font-semibold text-slate-900 dark:text-white">{selectedEmployee.employee.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Employee Code</p>
                                <p className="font-semibold text-slate-900 dark:text-white">{selectedEmployee.employee.employee_code}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Designation</p>
                                <p className="font-semibold text-slate-900 dark:text-white">{selectedEmployee.employee.designation}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Department</p>
                                <p className="font-semibold text-slate-900 dark:text-white">{selectedEmployee.employee.department}</p>
                            </div>
                        </div>

                        {/* Earnings & Deductions */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Earnings */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">add_circle</span>
                                    Earnings
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Basic Salary</span>
                                        <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(selectedEmployee.basic)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">HRA (40%)</span>
                                        <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(selectedEmployee.hra)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Allowances (20%)</span>
                                        <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(selectedEmployee.allowances)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="font-semibold text-slate-900 dark:text-white">Gross Earnings</span>
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedEmployee.grossEarnings)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">remove_circle</span>
                                    Deductions
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">PF (12%)</span>
                                        <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(selectedEmployee.pf)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">ESI (0.75%)</span>
                                        <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(selectedEmployee.esi)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Tax</span>
                                        <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(selectedEmployee.tax)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="font-semibold text-slate-900 dark:text-white">Total Deductions</span>
                                        <span className="font-mono font-bold text-red-600 dark:text-red-400">{formatCurrency(selectedEmployee.totalDeductions)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Net Salary */}
                        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-slate-900 dark:text-white">Net Salary</span>
                                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(selectedEmployee.netSalary)}</span>
                            </div>
                        </div>

                        {/* Status */}
                        {selectedEmployee.record && (
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">info</span>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Payment Status:</span>
                                </div>
                                {selectedEmployee.record.is_paid ? (
                                    <div className="text-right">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Paid
                                        </span>
                                        {selectedEmployee.record.paid_at && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                on {formatDate(selectedEmployee.record.paid_at)}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                        Pending
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">print</span>
                                Print Slip
                            </button>
                            <button
                                onClick={() => setShowSlipModal(false)}
                                className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirm Salary Processing"
                maxWidth="sm"
            >
                <div className="p-4">
                    <div className="flex items-center gap-4 mb-6 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                        <span className="material-symbols-outlined text-3xl">warning</span>
                        <div>
                            <p className="font-semibold">Attention Needed</p>
                            <p className="text-sm opacity-90">This action will generate salary records.</p>
                        </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">
                        Are you sure you want to process salary for <span className="font-bold text-slate-900 dark:text-white">{selectedEmployeeIds.size}</span> selected employee(s) for <span className="font-bold text-slate-900 dark:text-white">{getMonthName(selectedMonth)} {selectedYear}</span>?
                    </p>

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setShowConfirmModal(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={processSalary}
                            loading={processing}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                        >
                            Confirm Process
                        </Button>
                    </div>
                </div>
            </Modal>
        </UniversalListPage>
    );
}
