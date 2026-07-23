import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { attendanceAPI } from '../../services/adminAPI';

/** "2026-07" -> the first and last dates of that month. */
const monthBounds = (month: string): { start: string; end: string } => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate(); // day 0 of next month = last of this
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
};

interface ReportData {
  staff_id: string;
  staff_name: string;
  present_days: number;
  late_days: number;
  absent_days: number;
  half_days: number;
  total_hours: number;
  on_leave_days: number;
}

const AttendanceReports: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [reportType, setReportType] = useState<'monthly' | 'late-arrivals' | 'absences'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [reportType, selectedMonth]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      // Was three hardcoded employees. Real per-staff totals, aggregated
      // server-side over the selected month.
      const { start, end } = monthBounds(selectedMonth);
      const res = await attendanceAPI.getReport(start, end);

      let rows: ReportData[] = (res.data || []).map((r: any) => ({
        staff_id: r.staff_id,
        staff_name: r.staff_name,
        present_days: Number(r.days_present) || 0,
        late_days: Number(r.days_late) || 0,
        absent_days: Number(r.days_absent) || 0,
        half_days: 0,
        total_hours: Number(r.total_hours) || 0,
        on_leave_days: Number(r.days_on_leave) || 0,
      }));

      // The report type now actually filters, rather than relabelling the
      // same three rows.
      if (reportType === 'late-arrivals') {
        rows = rows.filter(r => r.late_days > 0).sort((a, b) => b.late_days - a.late_days);
      } else if (reportType === 'absences') {
        rows = rows.filter(r => r.absent_days > 0).sort((a, b) => b.absent_days - a.absent_days);
      }

      setReportData(rows);
    } catch (error: any) {
      console.error('Failed to load report:', error);
      showToast(error.message || 'Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Builds the CSV in the browser from the rows on screen and downloads it.
   * This button previously only showed a "downloaded" toast — no file was ever
   * produced.
   */
  const downloadReport = () => {
    if (reportData.length === 0) {
      showToast('Nothing to export for this period', 'error');
      return;
    }

    const headers = ['Staff ID', 'Staff Name', 'Present', 'Late', 'Absent', 'On Leave', 'Total Hours'];
    const escape = (v: string | number) => {
      const str = String(v);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csv = [
      headers.join(','),
      ...reportData.map(r =>
        [r.staff_id, r.staff_name, r.present_days, r.late_days, r.absent_days, r.on_leave_days, r.total_hours]
          .map(escape)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${reportType}-${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${reportData.length} row${reportData.length === 1 ? '' : 's'}`, 'success');
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'monthly':
        return 'Monthly Attendance Report';
      case 'late-arrivals':
        return 'Late Arrivals Report';
      case 'absences':
        return 'Absence Analysis Report';
      default:
        return 'Attendance Report';
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
              📊 Attendance Reports
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Comprehensive attendance analysis and compliance reporting
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

        {/* Report Type Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { type: 'monthly' as const, label: '📋 Monthly Register', icon: '📋' },
            { type: 'late-arrivals' as const, label: '⏱ Late Arrivals', icon: '⏱' },
            { type: 'absences' as const, label: '✗ Absence Analysis', icon: '✗' },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => setReportType(item.type)}
              style={{
                padding: '8px 16px',
                background: reportType === item.type ? '#FF6B35' : '#f0f0f0',
                color: reportType === item.type ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>Period:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {/* The PDF button that sat here produced no file — it only showed
                a "downloaded" toast. Printing the page is a real route to a
                PDF and needs no extra dependency. */}
            <button
              onClick={() => window.print()}
              style={{
                padding: '8px 16px',
                background: '#E91E63',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              🖨️ Print
            </button>
            <button
              onClick={downloadReport}
              style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              📊 CSV
            </button>
          </div>
        </div>

        {/* Report Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Staff', value: reportData.length, color: '#2196F3' },
            { label: 'Avg Attendance', value: '95%', color: '#4CAF50' },
            { label: 'Late Arrivals', value: reportData.reduce((sum, r) => sum + r.late_days, 0), color: '#FF9800' },
            { label: 'Absences', value: reportData.reduce((sum, r) => sum + r.absent_days, 0), color: '#F44336' },
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
              <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color, marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Report Table */}
        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  Staff Name
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Present
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Late
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Absent
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Half-day
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  On Leave
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Total Hours
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Attendance %
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row) => {
                const totalDays = row.present_days + row.late_days + row.absent_days + row.half_days + row.on_leave_days;
                const attendancePercent = ((row.present_days + row.late_days + row.half_days) / totalDays * 100).toFixed(0);
                return (
                  <tr key={row.staff_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                      {row.staff_name}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#4CAF50',
                        fontWeight: '600',
                      }}
                    >
                      {row.present_days}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#FF9800',
                        fontWeight: '600',
                      }}
                    >
                      {row.late_days}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#F44336',
                        fontWeight: '600',
                      }}
                    >
                      {row.absent_days}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#2196F3',
                        fontWeight: '600',
                      }}
                    >
                      {row.half_days}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                      {row.on_leave_days}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#333',
                      }}
                    >
                      {row.total_hours.toFixed(0)}h
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: attendancePercent >= '90' ? '#4CAF50' : '#FF9800',
                      }}
                    >
                      {attendancePercent}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF6B35' }}>
          <p style={{ fontSize: '13px', color: '#E65100', margin: 0, lineHeight: '1.6' }}>
            <strong>Summary:</strong> {reportData.length} employees analyzed for {selectedMonth}. Average attendance rate: 95%.
            Reports can be exported in PDF or CSV format for compliance and archival.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AttendanceReports;
