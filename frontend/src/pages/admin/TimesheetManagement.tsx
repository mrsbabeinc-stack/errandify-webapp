import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface DayEntry {
  day: string;
  date: string;
  hours: number;
  notes: string;
  status: 'working' | 'leave' | 'weekend';
}

interface Timesheet {
  timesheet_id: number;
  staff_id: string;
  staff_name: string;
  week_start: string;
  week_end: string;
  days: DayEntry[];
  total_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approved_by: string | null;
  approval_date: string | null;
  comments: string;
}

const TimesheetManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingHours, setEditingHours] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadTimesheets();
  }, []);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      // Mock data
      const mockData: Timesheet[] = [
        {
          timesheet_id: 1,
          staff_id: 'S001',
          staff_name: 'John Doe',
          week_start: '2026-07-15',
          week_end: '2026-07-19',
          days: [
            { day: 'Monday', date: '2026-07-15', hours: 8.5, notes: '', status: 'working' },
            { day: 'Tuesday', date: '2026-07-16', hours: 9.0, notes: '', status: 'working' },
            { day: 'Wednesday', date: '2026-07-17', hours: 8.0, notes: '', status: 'working' },
            { day: 'Thursday', date: '2026-07-18', hours: 8.5, notes: '', status: 'working' },
            { day: 'Friday', date: '2026-07-19', hours: 8.0, notes: '', status: 'working' },
          ],
          total_hours: 42.0,
          status: 'submitted',
          approved_by: null,
          approval_date: null,
          comments: '',
        },
        {
          timesheet_id: 2,
          staff_id: 'S002',
          staff_name: 'Jane Smith',
          week_start: '2026-07-15',
          week_end: '2026-07-19',
          days: [
            { day: 'Monday', date: '2026-07-15', hours: 8.0, notes: '', status: 'working' },
            { day: 'Tuesday', date: '2026-07-16', hours: 8.0, notes: '', status: 'working' },
            { day: 'Wednesday', date: '2026-07-17', hours: 0, notes: 'Annual leave', status: 'leave' },
            { day: 'Thursday', date: '2026-07-18', hours: 8.0, notes: '', status: 'working' },
            { day: 'Friday', date: '2026-07-19', hours: 8.0, notes: '', status: 'working' },
          ],
          total_hours: 32.0,
          status: 'draft',
          approved_by: null,
          approval_date: null,
          comments: '',
        },
      ];
      setTimesheets(mockData);
    } catch (error) {
      showToast('Failed to load timesheets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setIsEditing(true);
    const initialHours: { [key: string]: number } = {};
    timesheet.days.forEach((day) => {
      initialHours[day.date] = day.hours;
    });
    setEditingHours(initialHours);
  };

  const handleHoursChange = (date: string, hours: number) => {
    setEditingHours({ ...editingHours, [date]: Math.max(0, hours) });
  };

  const calculateTotal = () => {
    return Object.values(editingHours).reduce((sum, h) => sum + h, 0);
  };

  const handleSubmit = () => {
    if (!selectedTimesheet) return;
    showToast('✅ Timesheet submitted for approval', 'success');
    setIsEditing(false);
    setSelectedTimesheet(null);
    loadTimesheets();
  };

  const handleApprove = (timesheet: Timesheet) => {
    showToast(`✅ Timesheet for ${timesheet.staff_name} approved`, 'success');
    loadTimesheets();
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string; text: string } } = {
      draft: { bg: '#E0E0E0', color: '#333', text: 'Draft' },
      submitted: { bg: '#FFF3E0', color: '#E65100', text: 'Submitted' },
      approved: { bg: '#E8F5E9', color: '#2E7D32', text: 'Approved' },
      rejected: { bg: '#FFEBEE', color: '#C62828', text: 'Rejected' },
    };
    const style = styles[status] || styles.draft;
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
        {style.text}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
              📋 Timesheet Management
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              {isEditing ? 'Edit timesheet hours' : 'View and manage staff timesheets'}
            </p>
          </div>
          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
                setSelectedTimesheet(null);
              } else {
                navigate(-1);
              }
            }}
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

        {!isEditing ? (
          <>
            {/* Timesheets List */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {timesheets.map((timesheet) => (
                <div
                  key={timesheet.timesheet_id}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr auto auto',
                    gap: '16px',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                      {timesheet.staff_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{timesheet.staff_id}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Week of</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>
                      {new Date(timesheet.week_start).toLocaleDateString()} - {new Date(timesheet.week_end).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Total Hours</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>
                      {timesheet.total_hours.toFixed(1)}h
                    </div>
                  </div>

                  <div>{getStatusBadge(timesheet.status)}</div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(timesheet.status === 'draft' || timesheet.status === 'submitted') && (
                      <>
                        <button
                          onClick={() => handleEdit(timesheet)}
                          style={{
                            padding: '6px 12px',
                            background: '#F0A81E',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}
                        >
                          Edit
                        </button>
                        {timesheet.status === 'submitted' && (
                          <button
                            onClick={() => handleApprove(timesheet)}
                            style={{
                              padding: '6px 12px',
                              background: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}
                          >
                            Approve
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : selectedTimesheet ? (
          <>
            {/* Edit Form */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 16px 0' }}>
                Timesheet for {selectedTimesheet.staff_name} ({selectedTimesheet.week_start})
              </h2>

              <div style={{ marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                        Day
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                        Date
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                        Hours
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTimesheet.days.map((day) => (
                      <tr key={day.date} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                          {day.day}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <input
                            type="number"
                            min="0"
                            max="12"
                            step="0.5"
                            value={editingHours[day.date] || 0}
                            onChange={(e) => handleHoursChange(day.date, parseFloat(e.target.value))}
                            disabled={day.status === 'leave' || day.status === 'weekend'}
                            style={{
                              padding: '6px 8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '12px',
                              width: '60px',
                              opacity: day.status === 'leave' || day.status === 'weekend' ? 0.5 : 1,
                              cursor: day.status === 'leave' || day.status === 'weekend' ? 'not-allowed' : 'text',
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px', fontSize: '11px' }}>
                          {day.status === 'leave' && (
                            <span
                              style={{
                                padding: '2px 6px',
                                background: '#FFF3E4',
                                color: '#B5651D',
                                borderRadius: '3px',
                              }}
                            >
                              Leave
                            </span>
                          )}
                          {day.status === 'weekend' && (
                            <span style={{ color: '#999' }}>Weekend</span>
                          )}
                          {day.status === 'working' && (
                            <span style={{ color: '#999' }}>Working</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  padding: '12px',
                  background: '#FFF3E0',
                  borderRadius: '6px',
                  borderLeft: '4px solid #FF6B35',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#E65100' }}>
                  Total Hours: {calculateTotal().toFixed(1)}h / 40h
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSubmit}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  ✓ Submit for Approval
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedTimesheet(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default TimesheetManagement;
