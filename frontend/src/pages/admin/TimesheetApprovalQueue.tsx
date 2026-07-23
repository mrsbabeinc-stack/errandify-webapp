import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { timesheetAPI } from '../../services/adminAPI';

interface ApprovalQueueItem {
  queue_id: number;
  timesheet_id: number;
  staff_id: string;
  staff_name: string;
  week_start: string;
  week_end: string;
  total_hours: number;
  overtime_hours: number;
  submitted_date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

/** ISO weeks start Monday; used to default the generate prompt. */
const mondayOf = (d: Date): string => {
  const copy = new Date(d);
  const offset = (copy.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  copy.setDate(copy.getDate() - offset);
  return copy.toISOString().split('T')[0];
};

const TimesheetApprovalQueue: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [queueItems, setQueueItems] = useState<ApprovalQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ApprovalQueueItem | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadApprovalQueue();
  }, [filterStatus]);

  const loadApprovalQueue = async () => {
    try {
      setLoading(true);
      // Was three hardcoded timesheets, and "approving" one only showed a
      // toast — nothing was written anywhere.
      const res = await timesheetAPI.getAll(filterStatus);
      setQueueItems(
        (res.data || []).map((t: any) => ({
          queue_id: t.id,
          timesheet_id: t.id,
          staff_id: t.staff_id,
          staff_name: t.staff_name,
          week_start: t.week_start,
          week_end: t.week_end,
          total_hours: Number(t.total_hours) || 0,
          overtime_hours: Number(t.overtime_hours) || 0,
          submitted_date: t.submitted_at ? String(t.submitted_at).split('T')[0] : '',
          status: t.status,
          rejection_reason: t.review_notes || undefined,
        }))
      );
    } catch (error: any) {
      console.error('Failed to load approval queue:', error);
      showToast(error.message || 'Failed to load approval queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (item: ApprovalQueueItem) => {
    setSelectedItem(item);
    setApprovalNotes('');
    setIsReviewing(true);
  };

  const handleReject = (item: ApprovalQueueItem) => {
    setSelectedItem(item);
    setApprovalNotes('');
    setIsReviewing(true);
  };

  const submitApproval = async (action: 'approve' | 'reject') => {
    if (!selectedItem) return;
    if (action === 'reject' && !approvalNotes.trim()) {
      showToast('❌ Please provide a reason for rejection', 'error');
      return;
    }

    try {
      await timesheetAPI.review(selectedItem.timesheet_id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: 'Admin',
        review_notes: approvalNotes.trim() || undefined,
      });
      showToast(`✅ Timesheet ${action === 'approve' ? 'approved' : 'rejected'} for ${selectedItem.staff_name}`, 'success');
      setIsReviewing(false);
      setSelectedItem(null);
      await loadApprovalQueue();
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not record decision'}`, 'error');
    }
  };

  /**
   * Builds the week's timesheets from attendance already recorded, so there is
   * something to approve without a staff-facing submit flow.
   */
  const handleGenerateWeek = async () => {
    const weekStart = window.prompt(
      'Generate timesheets for the week starting (YYYY-MM-DD):',
      mondayOf(new Date())
    );
    if (!weekStart) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      showToast('❌ Please use the format YYYY-MM-DD', 'error');
      return;
    }

    try {
      const res = await timesheetAPI.generate(weekStart);
      const count = res.data?.generated ?? 0;
      showToast(
        count > 0
          ? `✅ ${count} timesheet${count === 1 ? '' : 's'} generated for week of ${weekStart}`
          : 'No timesheets generated — that week may already be approved',
        count > 0 ? 'success' : 'error'
      );
      await loadApprovalQueue();
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not generate timesheets'}`, 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string; text: string } } = {
      pending: { bg: '#FFF3E0', color: '#E65100', text: 'Pending' },
      approved: { bg: '#E8F5E9', color: '#2E7D32', text: 'Approved' },
      rejected: { bg: '#FFEBEE', color: '#C62828', text: 'Rejected' },
    };
    const style = styles[status] || styles.pending;
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

  const pendingCount = queueItems.filter(item => item.status === 'pending').length;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
              ✓ Timesheet Approval Queue
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Review and approve submitted timesheets from staff
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

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Pending Approval', value: pendingCount, color: '#FF9800' },
            { label: 'Approved', value: queueItems.filter(i => i.status === 'approved').length, color: '#4CAF50' },
            { label: 'Rejected', value: queueItems.filter(i => i.status === 'rejected').length, color: '#F44336' },
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

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { type: 'all' as const, label: 'All' },
            { type: 'pending' as const, label: 'Pending' },
            { type: 'approved' as const, label: 'Approved' },
            { type: 'rejected' as const, label: 'Rejected' },
          ].map((filter) => (
            <button
              key={filter.type}
              onClick={() => setFilterStatus(filter.type)}
              style={{
                padding: '8px 16px',
                background: filterStatus === filter.type ? '#FF6B35' : '#f0f0f0',
                color: filterStatus === filter.type ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {filter.label}
            </button>
          ))}

          {/* Nothing else creates timesheets — there is no staff-facing submit
              flow yet — so the queue needs a way to roll a week's attendance
              up into approvable sheets. */}
          <button
            onClick={handleGenerateWeek}
            style={{
              padding: '8px 16px',
              marginLeft: 'auto',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            ⚙️ Generate from attendance
          </button>
        </div>

        {!isReviewing ? (
          <>
            {/* Queue List */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {queueItems.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#999',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                  <p style={{ margin: 0, fontSize: '14px' }}>No timesheets found</p>
                </div>
              ) : (
                queueItems.map((item) => (
                  <div
                    key={item.queue_id}
                    style={{
                      padding: '16px',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                      gap: '16px',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                        {item.staff_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{item.staff_id}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Week of</div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>
                        {new Date(item.week_start).toLocaleDateString()} - {new Date(item.week_end).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Total Hours</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>
                        {item.total_hours.toFixed(1)}h
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Submitted</div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>
                        {new Date(item.submitted_date).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                      {getStatusBadge(item.status)}
                      {item.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleApprove(item)}
                            style={{
                              padding: '6px 12px',
                              background: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '600',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleReject(item)}
                            style={{
                              padding: '6px 12px',
                              background: '#F44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '600',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : selectedItem ? (
          <>
            {/* Review Form */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 16px 0' }}>
                Review Timesheet for {selectedItem.staff_name}
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Staff ID</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    {selectedItem.staff_id}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Week</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    {new Date(selectedItem.week_start).toLocaleDateString()} -{' '}
                    {new Date(selectedItem.week_end).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Total Hours</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    {selectedItem.total_hours.toFixed(1)}h
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  Approval Notes (optional for approval, required for rejection)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Enter notes..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    minHeight: '100px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsReviewing(false);
                    setSelectedItem(null);
                  }}
                  style={{
                    padding: '12px 24px',
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
                <button
                  onClick={() => submitApproval('reject')}
                  style={{
                    padding: '12px 24px',
                    background: '#F44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Reject
                </button>
                <button
                  onClick={() => submitApproval('approve')}
                  style={{
                    padding: '12px 24px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Approve
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default TimesheetApprovalQueue;
