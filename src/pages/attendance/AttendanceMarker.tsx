import { useState, useEffect } from 'react';
import { employeesApi } from '../../services/api';
import { useOperationalContext } from '../../contexts/OperationalContext';
import SearchBar from '../../components/SearchBar';

import './AttendanceMarker.css';

interface AttendanceRecord {
    employee_id: string;
    date: string;
    status: 'present' | 'absent' | 'half_day' | 'leave';
    check_in?: string;
    check_out?: string;
    record_status?: string;
    is_editable?: boolean;
}

interface DailyAttendanceData {
    date: string;
    total_employees: number;
    marked_count: number;
    date_status: 'not_marked' | 'draft' | 'submitted' | 'locked';
    attendance: any[];
}

export default function AttendanceMarker() {
    const { activeEntity } = useOperationalContext();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [attendanceData, setAttendanceData] = useState<DailyAttendanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadAttendanceForDate();
    }, [selectedDate, activeEntity]);

    const loadAttendanceForDate = async () => {
        try {
            setLoading(true);

            // Entity-specific attendance
            const params: { warehouse_id?: string; shop_id?: string } = {};
            if (activeEntity?.type === 'warehouse') params.warehouse_id = activeEntity.id;
            if (activeEntity?.type === 'shop') params.shop_id = activeEntity.id;

            const response = await employeesApi.getDailyAttendance(selectedDate, params);
            const data = response.data;
            setAttendanceData(data);

            // Build attendance state from response
            const attendanceState: Record<string, AttendanceRecord> = {};

            data.attendance.forEach((record: any) => {
                const check_in_time = record.check_in ? record.check_in.split('T')[1]?.substr(0, 5) : '09:00';
                const check_out_time = record.check_out ? record.check_out.split('T')[1]?.substr(0, 5) : '18:00';

                attendanceState[record.employee_id] = {
                    employee_id: record.employee_id,
                    date: selectedDate,
                    status: record.status || 'present',
                    check_in: check_in_time,
                    check_out: check_out_time,
                };
            });

            setAttendance(attendanceState);

        } catch (error) {
            console.error('Error loading attendance:', error);
            setMessage({ type: 'error', text: 'Failed to load attendance records' });
        } finally {
            setLoading(false);
        }
    };

    const updateAttendance = (employeeId: string, field: string, value: string) => {
        setAttendance(prev => ({
            ...prev,
            [employeeId]: {
                ...prev[employeeId],
                [field]: value
            }
        }));
    };

    const saveDraft = async () => {
        setSubmitting(true);
        try {
            const records = Object.values(attendance);
            for (const record of records) {
                const payload = {
                    employee_id: record.employee_id,
                    date: record.date,
                    status: record.status,
                    check_in: record.check_in ? `${record.date}T${record.check_in}:00` : undefined,
                    check_out: record.check_out ? `${record.date}T${record.check_out}:00` : undefined,
                };

                await employeesApi.markAttendance(payload);
            }
            setMessage({ type: 'success', text: 'Attendance saved as draft!' });
            await loadAttendanceForDate(); // Reload to get updated status
        } catch (error: any) {
            let errorMessage = 'Failed to save attendance';
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail)) {
                    errorMessage = detail.map((e: any) => {
                        const field = e.loc?.join('.') || 'Unknown field';
                        return `${field}: ${e.msg}`;
                    }).join(', ');
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }
            }
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setSubmitting(false);
        }
    };



    const getStatusBadge = (status: string) => {
        const config: Record<string, { icon: string; label: string; color: string }> = {
            not_marked: { icon: '', label: 'Not Marked', color: '#f59e0b' },
            draft: { icon: '', label: 'Draft', color: '#3b82f6' },
            submitted: { icon: '', label: 'Submitted', color: '#10b981' },
            locked: { icon: '', label: 'Locked', color: '#ef4444' }
        };

        const { icon, label, color } = config[status] || config.not_marked;

        return (
            <div style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '20px',
                background: color + '20',
                color: color,
                fontWeight: 'bold',
                fontSize: '14px'
            }}>
                {icon} {label}
            </div>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return '#10b981';
            case 'absent': return '#ef4444';
            case 'half_day': return '#f59e0b';
            case 'leave': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    const stats = {
        present: Object.values(attendance).filter(a => a.status === 'present').length,
        absent: Object.values(attendance).filter(a => a.status === 'absent').length,
        half_day: Object.values(attendance).filter(a => a.status === 'half_day').length,
        leave: Object.values(attendance).filter(a => a.status === 'leave').length
    };

    // Force editable at all times as per business requirement
    const isEditable = true;


    return (
        <div className="attendance-marker">
            <div className="header">
                <div>
                    <h2>
                        Attendance Marker
                        {activeEntity && (
                            <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                                - {activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'}: {activeEntity.name}
                            </span>
                        )}
                    </h2>
                    {activeEntity && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#888' }}>
                            {activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'} employee attendance marking
                        </p>
                    )}
                </div>
                <div className="header-controls">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="date-picker"
                    />
                    {attendanceData && getStatusBadge(attendanceData.date_status)}
                </div>
            </div>

            {/* Locking warning removed */}

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="controls-card">
                <div className="stats-row">
                    <div className="stat-item">
                        <div className="stat-value" style={{ color: '#10b981' }}>{stats.present}</div>
                        <div className="stat-label">Present</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value" style={{ color: '#ef4444' }}>{stats.absent}</div>
                        <div className="stat-label">Absent</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.half_day}</div>
                        <div className="stat-label">Half Day</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value" style={{ color: '#8b5cf6' }}>{stats.leave}</div>
                        <div className="stat-label">Leave</div>
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search employees by name or code..."
                />
            </div>

            {loading ? (
                <div className="loading">Loading employees...</div>
            ) : (
                <div className="attendance-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceData?.attendance
                                .filter((employee: any) => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return employee.employee_name.toLowerCase().includes(query) ||
                                        employee.employee_code.toLowerCase().includes(query) ||
                                        employee.department.toLowerCase().includes(query);
                                })
                                .map((employee: any) => (
                                    <tr key={employee.employee_id}>
                                        <td>
                                            <div className="employee-info">
                                                <div className="employee-avatar">
                                                    {employee.employee_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="employee-name">{employee.employee_name}</div>
                                                    <div className="employee-code">{employee.employee_code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{employee.employee_role}</td>
                                        <td>{employee.department}</td>
                                        <td>
                                            <select
                                                className="status-select"
                                                value={attendance[employee.employee_id]?.status || 'present'}
                                                onChange={(e) => updateAttendance(employee.employee_id, 'status', e.target.value)}
                                                disabled={!isEditable}
                                                style={{ borderColor: getStatusColor(attendance[employee.employee_id]?.status || 'present') }}
                                            >
                                                <option value="present">Present</option>
                                                <option value="absent">Absent</option>
                                                <option value="half_day">Half Day</option>
                                                <option value="leave">Leave</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="time"
                                                className="time-input"
                                                value={attendance[employee.employee_id]?.check_in || '09:00'}
                                                onChange={(e) => updateAttendance(employee.employee_id, 'check_in', e.target.value)}
                                                disabled={!isEditable || attendance[employee.employee_id]?.status === 'absent' || attendance[employee.employee_id]?.status === 'leave'}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="time"
                                                className="time-input"
                                                value={attendance[employee.employee_id]?.check_out || '18:00'}
                                                onChange={(e) => updateAttendance(employee.employee_id, 'check_out', e.target.value)}
                                                disabled={!isEditable || attendance[employee.employee_id]?.status === 'absent' || attendance[employee.employee_id]?.status === 'leave'}
                                            />
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    {/* Always show save controls */}
                    <div className="table-footer">
                        <button
                            className="btn-submit"
                            onClick={saveDraft}
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
