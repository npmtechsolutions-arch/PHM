import { useState, useEffect } from 'react';
import { employeesApi } from '../../../services/api';
import { useOperationalContext } from '../../../contexts/OperationalContext';
import SearchBar from '../../../components/SearchBar';

export default function AttendanceReport() {
    const { activeEntity } = useOperationalContext();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadAttendance();
    }, [selectedDate, activeEntity]);

    const loadAttendance = async () => {
        try {
            setLoading(true);
            // Entity-specific attendance - pass warehouse_id or shop_id
            const params: { date: string; warehouse_id?: string; shop_id?: string } = { date: selectedDate };
            if (activeEntity?.type === 'warehouse') params.warehouse_id = activeEntity.id;
            if (activeEntity?.type === 'shop') params.shop_id = activeEntity.id;
            
            const response = await employeesApi.getDailyAttendance(selectedDate, params);
            // Filter only marked attendance
            const marked = response.data.attendance.filter((a: any) => a.is_marked);
            setAttendance(marked);
        } catch (error) {
            console.error('Error loading attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
        half_day: attendance.filter(a => a.status === 'half_day').length,
        leave: attendance.filter(a => a.status === 'leave').length
    };

    return (
        <div className="attendance-marker" style={{ padding: '24px' }}>
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1a1a2e' }}>
                        Attendance Report
                        {activeEntity && (
                            <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                                - {activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'}: {activeEntity.name}
                            </span>
                        )}
                    </h2>
                    {activeEntity && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#888' }}>
                            {activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'} employee attendance records
                        </p>
                    )}
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="date-picker"
                    style={{ padding: '10px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
                />
            </div>

            <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#d4edda', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#155724' }}>{stats.present}</div>
                    <div style={{ color: '#155724', marginTop: '8px' }}>Present</div>
                </div>
                <div style={{ background: '#f8d7da', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#721c24' }}>{stats.absent}</div>
                    <div style={{ color: '#721c24', marginTop: '8px' }}>Absent</div>
                </div>
                <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#856404' }}>{stats.half_day}</div>
                    <div style={{ color: '#856404', marginTop: '8px' }}>Half Day</div>
                </div>
                <div style={{ background: '#e2e3e5', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#383d41' }}>{stats.leave}</div>
                    <div style={{ color: '#383d41', marginTop: '8px' }}>Leave</div>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by name, code, or department..."
                />
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="attendance-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Code</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th>Working Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendance
                                .filter((record: any) => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return record.employee_name.toLowerCase().includes(query) ||
                                        record.employee_code.toLowerCase().includes(query) ||
                                        record.department.toLowerCase().includes(query);
                                })
                                .length > 0 ? (
                                attendance
                                    .filter((record: any) => {
                                        if (!searchQuery) return true;
                                        const query = searchQuery.toLowerCase();
                                        return record.employee_name.toLowerCase().includes(query) ||
                                            record.employee_code.toLowerCase().includes(query) ||
                                            record.department.toLowerCase().includes(query);
                                    })
                                    .map((record: any) => (
                                        <tr key={record.employee_id}>
                                            <td>{record.employee_name}</td>
                                            <td>{record.employee_code}</td>
                                            <td>{record.employee_role}</td>
                                            <td>{record.department}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    background: record.status === 'present' ? '#d4edda' :
                                                        record.status === 'absent' ? '#f8d7da' :
                                                            record.status === 'half_day' ? '#fff3cd' : '#e2e3e5',
                                                    color: record.status === 'present' ? '#155724' :
                                                        record.status === 'absent' ? '#721c24' :
                                                            record.status === 'half_day' ? '#856404' : '#383d41'
                                                }}>
                                                    {record.status?.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td>{record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                            <td>{record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                            <td>{record.working_hours ? record.working_hours.toFixed(1) + 'h' : '-'}</td>
                                        </tr>
                                    ))
                            ) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                                        No attendance records found for {selectedDate}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
