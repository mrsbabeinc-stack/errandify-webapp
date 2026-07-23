import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../components/Toast';
import { staffAttendanceAPI } from '../services/staffAttendanceAPI';

interface AttendanceRecord {
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'on_leave' | 'holiday';
  hours_worked: number;
  notes: string;
}

/** Timestamps -> wall-clock HH:MM. */
const hhmm = (v: string | null): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toTimeString().slice(0, 5);
};

const StaffAttendanceHistory: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    loadAttendanceHistory();
  }, [selectedMonth]);

  const loadAttendanceHistory = async () => {
    try {
      setLoading(true);
      // Was five hardcoded days. These are the caller's own records; the
      // server scopes them by login, so no staff id is sent.
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const res = await staffAttendanceAPI.history(
        `${selectedMonth}-01`,
        `${selectedMonth}-${String(lastDay).padStart(2, '0')}`
      );

      setRecords(
        (res.data?.records || []).map((r: any) => ({
          date: r.work_date,
          clock_in: hhmm(r.clock_in),
          clock_out: hhmm(r.clock_out),
          // 'half-day' server-side, 'half_day' in this screen's union.
          status: String(r.status).replace('-', '_') as AttendanceRecord['status'],
          hours_worked: Number(r.total_hours) || 0,
          notes: r.notes || '',
        }))
      );
      setLinkError(null);
    } catch (error: any) {
      setRecords([]);
      setLinkError(error.message || 'Could not load your attendance history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string; text: string; icon: string } } = {
      present: { bg: '#E8F5E9', color: '#2E7D32', text: 'Present', icon: '✓' },
      late: { bg: '#FFF3E0', color: '#E65100', text: 'Late', icon: '⏱' },
      half_day: { bg: '#E3F2FD', color: '#1565C0', text: 'Half Day', icon: '⊙' },
      absent: { bg: '#FFEBEE', color: '#C62828', text: 'Absent', icon: '✗' },
    };
    const style = styles[status] || styles.present;
    return (
      <span
        style={{
          padding: '4px 8px',
          background: style.bg,
          color: style.color,
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
        }}
      >
        {style.icon} {style.text}
      </span>
    );
  };

  const totalHours = records.reduce((sum, r) => sum + r.hours_worked, 0);
  const presentDays = records.filter(r => r.status === 'present').length;
  const lateDays = records.filter(r => r.status === 'late').length;
  const halfDays = records.filter(r => r.status === 'half_day').length;
  const absentDays = records.filter(r => r.status === 'absent').length;

  return (
    <>
      <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
              📊 My Attendance History
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Track your attendance records and working hours
            </p>
          </div>
          <button
            onClick={() => navigate('/staff/clock-in')}
            style={{
              padding: '8px 16px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ⏰ Clock In/Out
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Present', value: presentDays, color: '#4CAF50', icon: '✓' },
            { label: 'Late', value: lateDays, color: '#FF9800', icon: '⏱' },
            { label: 'Half Day', value: halfDays, color: '#2196F3', icon: '⊙' },
            { label: 'Absent', value: absentDays, color: '#F44336', icon: '✗' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                background: 'white',
                border: `2px solid ${stat.color}`,
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Total Hours */}
        <div style={{ padding: '16px', background: '#FFF3E0', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', borderLeft: '4px solid #FF6B35' }}>
          <div style={{ fontSize: '12px', color: '#E65100', marginBottom: '4px' }}>Total Hours Worked (This Month)</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#FF6B35' }}>
            {totalHours.toFixed(1)}h
          </div>
        </div>

        {/* View Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>Period:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {['month', 'week'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as 'month' | 'week')}
                style={{
                  padding: '6px 12px',
                  background: viewMode === mode ? '#FF6B35' : '#f0f0f0',
                  color: viewMode === mode ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {mode === 'month' ? '📅 Month' : '📆 Week'}
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Table */}
        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  Date
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  Clock In
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  Clock Out
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  Hours
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  {/* Was "Location" — nothing captures one. Notes is a real
                      stored field. */}
                  Notes
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                    {new Date(record.date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {record.clock_in || '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {record.clock_out || '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                    {record.hours_worked > 0 ? `${record.hours_worked.toFixed(1)}h` : '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {record.notes || '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {getStatusBadge(record.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes Section */}
        {records.some(r => r.notes) && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              📝 Notes
            </h3>
            <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px', fontSize: '12px' }}>
              {records
                .filter(r => r.notes)
                .map((record, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #ddd' }}>
                    <div style={{ fontWeight: '600', color: '#333' }}>
                      {new Date(record.date).toLocaleDateString('en-GB')} - {record.notes}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StaffAttendanceHistory;
