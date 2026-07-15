import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface AttendanceLog {
  log_id: number;
  staff_id: string;
  staff_name: string;
  clock_in_time: string;
  clock_out_time: string | null;
  date: string;
  location: string;
  status: 'present' | 'late' | 'absent' | 'half_day';
  notes: string;
}

interface DailyStats {
  present: number;
  late: number;
  absent: number;
  half_day: number;
  on_leave: number;
}

const AttendanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    present: 18,
    late: 3,
    absent: 2,
    half_day: 1,
    on_leave: 0,
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockData: AttendanceLog[] = [
        {
          log_id: 1,
          staff_id: 'S001',
          staff_name: 'John Doe',
          clock_in_time: '09:15:00',
          clock_out_time: '18:30:00',
          date: selectedDate,
          location: 'Office - Desk 5',
          status: 'present',
          notes: '',
        },
        {
          log_id: 2,
          staff_id: 'S002',
          staff_name: 'Jane Smith',
          clock_in_time: '09:22:00',
          clock_out_time: '18:45:00',
          date: selectedDate,
          location: 'Office - Desk 3',
          status: 'late',
          notes: 'Traffic',
        },
        {
          log_id: 3,
          staff_id: 'S003',
          staff_name: 'Bob Wilson',
          clock_in_time: null,
          clock_out_time: null,
          date: selectedDate,
          location: '',
          status: 'absent',
          notes: 'Sick leave',
        },
        {
          log_id: 4,
          staff_id: 'S004',
          staff_name: 'Alice Brown',
          clock_in_time: '09:05:00',
          clock_out_time: '13:00:00',
          date: selectedDate,
          location: 'Office - Desk 1',
          status: 'half_day',
          notes: 'Doctor appointment',
        },
      ];
      setAttendanceLogs(mockData);
    } catch (error) {
      showToast('Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = attendanceLogs.filter(log =>
    log.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.staff_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#4CAF50';
      case 'late':
        return '#FF9800';
      case 'absent':
        return '#F44336';
      case 'half_day':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return '✓ Present';
      case 'late':
        return '⏱ Late';
      case 'absent':
        return '✗ Absent';
      case 'half_day':
        return '⊙ Half-day';
      default:
        return status;
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
              📊 Attendance Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Real-time staff attendance tracking and timesheet management
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
            }}
          >
            ←
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {/* Stats Cards */}
          {[
            { label: 'Present', value: dailyStats.present, color: '#4CAF50', icon: '✓' },
            { label: 'Late', value: dailyStats.late, color: '#FF9800', icon: '⏱' },
            { label: 'Absent', value: dailyStats.absent, color: '#F44336', icon: '✗' },
            { label: 'Half-day', value: dailyStats.half_day, color: '#2196F3', icon: '⊙' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${stat.color}`,
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: stat.color, marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Date Selector and Search */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <input
            type="text"
            placeholder="Search by name or staff ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <button
            onClick={() => navigate('/admin/timesheet-approvals')}
            style={{
              padding: '8px 16px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            📋 Timesheet Approvals
          </button>
          <button
            onClick={() => navigate('/admin/attendance-reports')}
            style={{
              padding: '8px 16px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            📊 Reports
          </button>
        </div>

        {/* Attendance Table */}
        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  Staff Name
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  Staff ID
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  Clock In
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  Clock Out
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  Location
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  Status
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.log_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>{log.staff_name}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{log.staff_id}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>
                    {log.clock_in_time ? log.clock_in_time : '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>
                    {log.clock_out_time ? log.clock_out_time : '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{log.location || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        background: getStatusColor(log.status),
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      {getStatusLabel(log.status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF6B35' }}>
          <p style={{ fontSize: '13px', color: '#E65100', margin: 0, lineHeight: '1.6' }}>
            <strong>Summary:</strong> {filteredLogs.length} staff records for {selectedDate}.
            {dailyStats.late > 0 && ` ${dailyStats.late} late arrivals detected.`}
            {dailyStats.absent > 0 && ` ${dailyStats.absent} absent.`}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AttendanceDashboard;
