import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { employeesApi } from '../services/api';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { type Column } from '../components/Table';

interface Employee {
    id: string;
    employee_code: string;
    name: string;
    designation: string;
    department: string;
}

interface AttendanceRecord {
    employee_id: string;
    date: string;
    status: 'present' | 'absent' | 'half_day' | 'leave';
    check_in?: string;
    check_out?: string;
}

export default function AttendanceManagement() {
    const location = useLocation();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'mark' | 'summary'>('mark');
    const [search, setSearch] = useState('');

    // Update view mode when route changes
    useEffect(() => {
        const newMode = location.pathname.includes('/report') ? 'summary' : 'mark';
        setViewMode(newMode);
    }, [location.pathname]);

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        if (viewMode === 'mark' || viewMode === 'summary') {
            loadAttendanceForDate();
        }
    }, [selectedDate, employees]); // Reload when date changes

    const loadEmployees = async () => {
        try {
            const response = await employeesApi.list({ size: 100 });
            setEmployees(response.data.items || response.data);
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAttendanceForDate = async () => {
        try {
            setLoading(true);

            // Fetch attendance records for the selected date
            const response = await employeesApi.getDailyAttendance(selectedDate);
            const attendanceData = response.data;

            // Build attendance state from the response
            const attendanceState: Record<string, AttendanceRecord> = {};

            attendanceData.attendance.forEach((record: any) => {
                // Extract time from datetime string if it exists
                const check_in_time = record.check_in ? record.check_in.split('T')[1]?.substr(0, 5) : '09:00';
                const check_out_time = record.check_out ? record.check_out.split('T')[1]?.substr(0, 5) : '18:00';

                attendanceState[record.employee_id] = {
                    employee_id: record.employee_id,
                    date: selectedDate,
                    status: record.status || 'present',
                    check_in: check_in_time,
                    check_out: check_out_time
                };
            });

            setAttendance(attendanceState);
        } catch (error) {
            console.error('Error loading attendance:', error);
            window.toast?.error('Failed to load attendance records');
        } finally {
            setLoading(false);
        }
    };

    const updateAttendance = (employeeId: string, field: string, value: string) => {
        setAttendance(prev => ({
            ...prev,
            [employeeId]: {
                ...(prev[employeeId] || {
                    employee_id: employeeId,
                    date: selectedDate,
                    status: 'present',
                    check_in: '09:00',
                    check_out: '18:00'
                }),
                [field]: value
            }
        }));
    };

    const submitAttendance = async () => {
        setSubmitting(true);
        try {
            const records = Object.values(attendance);

            for (const record of records) {
                // Convert time strings to datetime strings
                const payload = {
                    employee_id: record.employee_id,
                    date: record.date,
                    status: record.status,
                    check_in: record.check_in ? `${record.date}T${record.check_in}:00` : undefined,
                    check_out: record.check_out ? `${record.date}T${record.check_out}:00` : undefined,
                };

                await employeesApi.markAttendance(payload);
            }
            window.toast?.success('Attendance saved successfully!');
        } catch (error: any) {
            // Handle Pydantic validation errors (422) similar to original
            let errorMessage = 'Failed to save attendance';
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail)) {
                    errorMessage = detail.map((e: any) => `${e.loc?.join('.') || 'Field'}: ${e.msg}`).join(', ');
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }
            }
            window.toast?.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const stats = {
        total: employees.length,
        present: Object.values(attendance).filter(a => a.status === 'present').length,
        absent: Object.values(attendance).filter(a => a.status === 'absent').length,
        half_day: Object.values(attendance).filter(a => a.status === 'half_day').length,
        leave: Object.values(attendance).filter(a => a.status === 'leave').length
    };

    // Filter employees for table
    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(search.toLowerCase())
    );

    // Columns for Mark Mode
    const markColumns: Column<Employee>[] = [
        {
            header: 'Employee',
            key: 'name',
            render: (emp) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {emp.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.employee_code}</div>
                    </div>
                </div>
            )
        },
        { header: 'Department', key: 'department', className: 'hidden sm:table-cell' },
        {
            header: 'Status',
            key: 'id',
            width: '200px',
            render: (emp) => {
                const status = attendance[emp.id]?.status || 'present';
                const statusColors: any = {
                    present: 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 dark:text-emerald-400',
                    absent: 'border-red-500 text-red-700 bg-red-50 dark:bg-red-900/10 dark:text-red-400',
                    half_day: 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-900/10 dark:text-amber-400',
                    leave: 'border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-900/10 dark:text-purple-400'
                };

                return (
                    <select
                        className={`w-full px-3 py-1.5 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-opacity-50 transition-all cursor-pointer appearance-none ${statusColors[status]}`}
                        value={status}
                        onChange={(e) => updateAttendance(emp.id, 'status', e.target.value)}
                    >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="leave">Leave</option>
                    </select>
                );
            }
        },
        {
            header: 'Check In',
            key: 'id',
            render: (emp) => {
                const status = attendance[emp.id]?.status;
                const disabled = status === 'absent' || status === 'leave';
                return (
                    <input
                        type="time"
                        className="w-28 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        value={attendance[emp.id]?.check_in || '09:00'}
                        onChange={(e) => updateAttendance(emp.id, 'check_in', e.target.value)}
                        disabled={disabled}
                    />
                );
            }
        },
        {
            header: 'Check Out',
            key: 'id',
            render: (emp) => {
                const status = attendance[emp.id]?.status;
                const disabled = status === 'absent' || status === 'leave';
                return (
                    <input
                        type="time"
                        className="w-28 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        value={attendance[emp.id]?.check_out || '18:00'}
                        onChange={(e) => updateAttendance(emp.id, 'check_out', e.target.value)}
                        disabled={disabled}
                    />
                );
            }
        }
    ];

    // Columns for Summary Mode
    const summaryColumns: Column<AttendanceRecord>[] = [
        {
            header: 'Employee',
            key: 'employee_id',
            render: (record) => {
                const emp = employees.find(e => e.id === record.employee_id);
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-sm font-bold">
                            {emp?.name.charAt(0)}
                        </div>
                        <div className="font-medium text-slate-900 dark:text-white">{emp?.name || 'Unknown'}</div>
                    </div>
                );
            }
        },
        {
            header: 'Code',
            key: 'employee_id',
            render: (record) => <span className="text-slate-500 font-mono">{employees.find(e => e.id === record.employee_id)?.employee_code}</span>
        },
        {
            header: 'Status',
            key: 'status',
            render: (record) => {
                const variant = record.status === 'present' ? 'success' :
                    record.status === 'absent' ? 'error' :
                        record.status === 'half_day' ? 'warning' : 'info';
                return <Badge variant={variant}>{record.status.replace('_', ' ')}</Badge>;
            }
        },
        {
            header: 'Check In',
            key: 'check_in',
            render: (record) => (record.status !== 'absent' && record.status !== 'leave') ? record.check_in : '-'
        },
        {
            header: 'Check Out',
            key: 'check_out',
            render: (record) => (record.status !== 'absent' && record.status !== 'leave') ? record.check_out : '-'
        },
        {
            header: 'Hours',
            key: 'employee_id', // dummy key
            render: (record) => {
                if (record.status === 'absent' || record.status === 'leave' || !record.check_in || !record.check_out) return '-';
                const [inH, inM] = record.check_in.split(':').map(Number);
                const [outH, outM] = record.check_out.split(':').map(Number);
                const hours = (outH + outM / 60) - (inH + inM / 60);
                return <span className="font-medium">{hours.toFixed(1)}h</span>;
            }
        }
    ];

    // Summary data preparation
    const summaryData = Object.values(attendance).filter(record => {
        const emp = employees.find(e => e.id === record.employee_id);
        if (!emp) return false;
        return emp.name.toLowerCase().includes(search.toLowerCase()) ||
            emp.employee_code.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="Attendance Management"
                subtitle={`Manage attendance for ${employees.length} employees`}
                actions={
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('mark')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'mark' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Mark Attendance
                        </button>
                        <button
                            onClick={() => setViewMode('summary')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'summary' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Summary Report
                        </button>
                    </div>
                }
            />

            <UniversalListPage.KPICards>
                <StatCard title="Present" value={stats.present} icon="check_circle" trend="neutral" isActive={false} />
                <StatCard title="Absent" value={stats.absent} icon="cancel" changeType="down" isActive={false} />
                <StatCard title="Half Day" value={stats.half_day} icon="hourglass_bottom" changeType="neutral" isActive={false} />
                <StatCard title="On Leave" value={stats.leave} icon="flight_takeoff" changeType="neutral" isActive={false} />
            </UniversalListPage.KPICards>

            {/* Zone 3 & 4 Merged: Controls Embedded in Table */}
            {viewMode === 'mark' ? (
                <UniversalListPage.DataTable
                    columns={markColumns}
                    data={filteredEmployees}
                    loading={loading}
                    emptyMessage="No employees found."
                    headerSlot={
                        <UniversalListPage.ListControls
                            title="Daily Attendance"
                            count={filteredEmployees.length}
                            searchProps={{
                                value: search,
                                onChange: setSearch,
                                placeholder: "Search employees..."
                            }}
                            actions={
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        <span className="text-sm font-medium text-slate-500">Date:</span>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="bg-transparent border-none p-0 text-sm font-medium text-slate-900 dark:text-white focus:ring-0 outline-none"
                                        />
                                    </div>
                                </div>
                            }
                            embedded={true}
                        />
                    }
                />
            ) : (
                <UniversalListPage.DataTable
                    columns={summaryColumns}
                    data={summaryData}
                    loading={loading}
                    emptyMessage="No attendance records found."
                    headerSlot={
                        <UniversalListPage.ListControls
                            title="Attendance Report"
                            count={summaryData.length}
                            searchProps={{
                                value: search,
                                onChange: setSearch,
                                placeholder: "Search employees..."
                            }}
                            actions={
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        <span className="text-sm font-medium text-slate-500">Date:</span>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="bg-transparent border-none p-0 text-sm font-medium text-slate-900 dark:text-white focus:ring-0 outline-none"
                                        />
                                    </div>
                                </div>
                            }
                            embedded={true}
                        />
                    }
                />
            )}

            {viewMode === 'mark' && !loading && (
                <div className="flex justify-end pt-4 pb-8 animate-fadeIn">
                    <Button
                        variant="primary"
                        onClick={submitAttendance}
                        disabled={submitting}
                        className="w-full sm:w-auto min-w-[200px] !py-3 !text-base shadow-lg shadow-blue-500/20"
                    >
                        {submitting ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined mr-2">save</span>
                                Save Daily Attendance
                            </>
                        )}
                    </Button>
                </div>
            )}
        </UniversalListPage>
    );
}
