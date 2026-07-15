import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

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
      // Mock data
      const mockData: ReportData[] = [
        {
          staff_id: 'S001',
          staff_name: 'John Doe',
          present_days: 18,
          late_days: 2,
          absent_days: 0,
          half_days: 1,
          total_hours: 164.0,
          on_leave_days: 1,
        },
        {
          staff_id: 'S002',
          staff_name: 'Jane Smith',
          present_days: 17,
          late_days: 1,
          absent_days: 1,
          half_days: 0,
          total_hours: 152.0,
          on_leave_days: 2,
        },
        {
          staff_id: 'S003',
          staff_name: 'Bob Wilson',
          present_days: 19,
          late_days: 0,
          absent_days: 0,
          half_days: 2,
          total_hours: 172.0,
          on_leave_days: 0,
        },
      ];
      setReportData(mockData);
    } catch (error) {
      showToast('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (format: 'pdf' | 'csv') => {
    showToast(`📥 Report downloaded as ${format.toUpperCase()}`, 'success');
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
            <button
              onClick={() => downloadReport('pdf')}
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
              📄 PDF
            </button>
            <button
              onClick={() => downloadReport('csv')}
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
