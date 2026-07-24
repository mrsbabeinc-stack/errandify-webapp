import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { attendanceAPI } from '../../services/adminAPI';

interface AttendanceLog {
  log_id: number;
  staff_id: string;
  staff_name: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  date: string;
  total_hours: number;
  status: 'present' | 'late' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
  notes: string;
}

/** Clock times arrive as timestamps; the table wants a wall-clock HH:MM. */
const toClockTime = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toTimeString().slice(0, 5);
};

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
  // Starts empty rather than at invented counts (18 present, 3 late…), which
  // rendered as real figures before the first load resolved.
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    present: 0,
    late: 0,
    absent: 0,
    half_day: 0,
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
      // Was four hardcoded employees. Both the rows and the tiles above them
      // now come from the API for the selected day.
      const [logsRes, summaryRes] = await Promise.all([
        attendanceAPI.getAll({ startDate: selectedDate, endDate: selectedDate }),
        attendanceAPI.getSummary(selectedDate),
      ]);

      setAttendanceLogs(
        (logsRes.data || []).map((r: any) => ({
          log_id: r.id,
          staff_id: r.staff_id,
          staff_name: r.staff_name,
          clock_in_time: toClockTime(r.clock_in),
          clock_out_time: toClockTime(r.clock_out),
          date: r.work_date,
          total_hours: Number(r.total_hours) || 0,
          // The backend spells this 'half-day'; this screen keys off 'half_day'.
          status: String(r.status).replace('-', '_') as AttendanceLog['status'],
          notes: r.notes || '',
        }))
      );

      const s = summaryRes.data || {};
      setDailyStats({
        present: Number(s.present) || 0,
        late: Number(s.late) || 0,
        // Absent is computed server-side across all active staff, so it counts
        // the people with no record at all — which a tally of loaded rows
        // could never see.
        absent: Number(s.absent) || 0,
        half_day: Number(s.half_day) || 0,
        on_leave: Number(s.on_leave) || 0,
      });
    } catch (error: any) {
      console.error('Failed to load attendance:', error);
      showToast(error.message || 'Failed to load attendance data', 'error');
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
        return '#F0A81E';
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
            { label: 'Half-day', value: dailyStats.half_day, color: '#F0A81E', icon: '⊙' },
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
              background: '#F0A81E',
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
                {/* Was "Location". Nothing captures a location — there is no
                    clock-in kiosk or geofence — so the column could only ever
                    show a hardcoded desk number. Hours worked is real, derived
                    from the clock times. */}
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  Hours
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
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#333', fontWeight: '600' }}>
                    {log.total_hours > 0 ? log.total_hours.toFixed(2) : '-'}
                  </td>
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
