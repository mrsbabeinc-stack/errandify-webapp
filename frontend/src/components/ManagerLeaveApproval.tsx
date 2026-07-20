import React, { useState } from 'react';

interface LeaveRequest {
  id: number;
  staffName: string;
  startDate: string;
  endDate: string;
  period: 'full-day' | 'morning' | 'afternoon';
  reason: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  rejectionReason?: string;
}

const ManagerLeaveApproval: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [approving, setApproving] = useState(false);

  // Fetch leave requests on mount
  React.useEffect(() => {
    fetchLeaveRequests();
  }, [tab]);

  const fetchLeaveRequests = async () => {
    try {
      setLoadingRequests(true);
      const companyId = localStorage.getItem('companyId') || localStorage.getItem('current_company_id') || '1';
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/leave/requests?company_id=${companyId}&status=${tab}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRequests(data.data.map((req: any) => ({
          id: req.id,
          staffName: req.staff_name || 'Unknown',
          startDate: req.start_date,
          endDate: req.end_date,
          period: req.period || 'full-day',
          reason: req.reason || 'Not specified',
          notes: req.notes || '',
          status: req.status,
          appliedAt: new Date(req.created_at).toLocaleString(),
          rejectionReason: req.rejected_reason
        })));
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const reasonMap: Record<string, string> = {
    training: '🏋️ Training/Workshop',
    busy: '🛑 Busy with other errands',
    medical: '🏥 Medical/Personal leave',
    education: '📚 Course/Education',
    client: '🤝 Client meeting',
    internal: '💼 Internal meeting',
    travel: '🌍 Travel',
    other: '📝 Other',
  };

  const handleApprove = async (requestId: number) => {
    try {
      setApproving(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/leave/request/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approval_notes: '' })
      });

      const data = await response.json();
      if (data.success) {
        setRequests(
          requests.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
        );
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Error approving leave:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (selectedRequest && rejectionReason.trim()) {
      try {
        setApproving(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/leave/request/${selectedRequest.id}/reject`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rejected_reason: rejectionReason })
        });

        const data = await response.json();
        if (data.success) {
          setRequests(
            requests.map((r) =>
              r.id === selectedRequest.id
                ? { ...r, status: 'rejected', rejectionReason }
                : r
            )
          );
          setShowRejectModal(false);
          setSelectedRequest(null);
          setRejectionReason('');
        }
      } catch (error) {
        console.error('Error rejecting leave:', error);
      } finally {
        setApproving(false);
      }
    }
  };

  const filteredRequests = requests.filter((r) => r.status === tab);

  if (loadingRequests) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading leave requests...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
          📋 Leave Approvals
        </h2>
        <p style={{ fontSize: '15px', color: '#666', margin: 0 }}>
          Review and manage staff leave applications
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e0e0e0', paddingBottom: '12px' }}>
        {(['pending', 'approved', 'rejected'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              background: tab === t ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : 'transparent',
              color: tab === t ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            {t === 'pending' && `⏳ Pending (${requests.filter((r) => r.status === 'pending').length})`}
            {t === 'approved' && `✅ Approved (${requests.filter((r) => r.status === 'approved').length})`}
            {t === 'rejected' && `❌ Rejected (${requests.filter((r) => r.status === 'rejected').length})`}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
          borderRadius: '12px',
          border: '2px solid #FFD9B3',
        }}>
          <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
            {tab === 'pending' && '🎉 No pending applications - all caught up!'}
            {tab === 'approved' && '✅ No approved applications yet'}
            {tab === 'rejected' && '📋 No rejected applications yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              style={{
                padding: '20px',
                background: tab === 'pending'
                  ? 'linear-gradient(135deg, #FFF3E0 0%, #FFE4C4 100%)'
                  : tab === 'approved'
                  ? 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)'
                  : 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
                border: tab === 'pending'
                  ? '2px solid #FFB84D'
                  : tab === 'approved'
                  ? '2px solid #4caf50'
                  : '2px solid #e53935',
                borderRadius: '12px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
                    {request.staffName}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    Applied: {request.appliedAt}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>
                    📅 Dates
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    {new Date(request.startDate).toLocaleDateString()} -{' '}
                    {new Date(request.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>
                    🕐 Period
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333', textTransform: 'capitalize' }}>
                    {request.period.replace('-', ' ')}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>
                    💡 Reason
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    {reasonMap[request.reason] || request.reason}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {request.notes && (
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', borderLeft: '3px solid #FF6B35' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>
                    Staff Notes
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>{request.notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {request.rejectionReason && (
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', borderLeft: '3px solid #e53935' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700', color: '#d32f2f', textTransform: 'uppercase' }}>
                    Rejection Reason
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>{request.rejectionReason}</p>
                </div>
              )}

              {/* Actions */}
              {tab === 'pending' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleApprove(request.id)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleRejectClick(request)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #e53935 0%, #ef5350 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 16px rgba(229, 57, 53, 0.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginBottom: '12px' }}>
              Reject Leave Application?
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              {selectedRequest.staffName} - {new Date(selectedRequest.startDate).toLocaleDateString()}
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a reason for rejection (e.g., 'Busy project period, can you reschedule for August?')"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #FFD9B3',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '100px',
                marginBottom: '20px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #e53935 0%, #ef5350 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Send Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerLeaveApproval;
