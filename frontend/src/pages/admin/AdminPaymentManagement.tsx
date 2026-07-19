import React, { useState, useEffect } from 'react';
import { useToastNotification } from '../../utils/toastNotification';

interface PaymentHold {
  id: string;
  type: 'errand' | 'advertising' | 'dispute';
  referenceId: string;
  amount: number;
  status: 'HOLD' | 'PENDING_REVIEW' | 'APPROVED' | 'RELEASED' | 'REFUNDED';
  heldAt: string;
  releaseDate?: string;
  reason?: string;
  companyName: string;
  companyId: number;
  disputedAt?: string;
  adminNotes?: string;
}

export default function AdminPaymentManagement() {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [holds, setHolds] = useState<PaymentHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'disputed' | 'advertising' | 'monitoring'>('disputed');
  const [selectedHold, setSelectedHold] = useState<PaymentHold | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'HOLD' | 'PENDING_REVIEW'>('all');

  // Mock data
  const getMockHolds = (): PaymentHold[] => [
    {
      id: '1',
      type: 'dispute',
      referenceId: 'ERR-2026-001',
      amount: 600,
      status: 'PENDING_REVIEW',
      heldAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      disputedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      reason: 'Quality dispute - doer claims payment issue',
      companyName: 'Rumah Emas',
      companyId: 1,
      adminNotes: 'Evidence reviewed - appears to be contractor error',
    },
    {
      id: '2',
      type: 'dispute',
      referenceId: 'ERR-2026-005',
      amount: 500,
      status: 'PENDING_REVIEW',
      heldAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      disputedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      reason: 'Timeline mismatch - errand not completed within agreed time',
      companyName: 'Tech Services SG',
      companyId: 2,
      adminNotes: 'Awaiting additional documentation from both parties',
    },
    {
      id: '3',
      type: 'advertising',
      referenceId: 'AD-2026-001',
      amount: 250,
      status: 'PENDING_REVIEW',
      heldAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      reason: 'Campaign pending admin approval',
      companyName: 'Marketing Pro',
      companyId: 3,
      adminNotes: 'Image quality acceptable, content compliant',
    },
    {
      id: '4',
      type: 'advertising',
      referenceId: 'AD-2026-002',
      amount: 180,
      status: 'PENDING_REVIEW',
      heldAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      reason: 'Campaign pending admin approval',
      companyName: 'Event Planners Inc',
      companyId: 4,
      adminNotes: 'URL validation in progress',
    },
    {
      id: '5',
      type: 'errand',
      referenceId: 'ERR-2026-010',
      amount: 400,
      status: 'HOLD',
      heldAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      releaseDate: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
      reason: 'Standard 48-hour hold (auto-release in 46h)',
      companyName: 'Rumah Emas',
      companyId: 1,
    },
    {
      id: '6',
      type: 'errand',
      referenceId: 'ERR-2026-011',
      amount: 350,
      status: 'HOLD',
      heldAt: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
      releaseDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      reason: 'Standard 48-hour hold (auto-release in 4h)',
      companyName: 'Tech Services SG',
      companyId: 2,
    },
  ];

  useEffect(() => {
    fetchHolds();
  }, []);

  const fetchHolds = async () => {
    try {
      setLoading(false);
      setHolds(getMockHolds());
    } catch (error) {
      console.error('Error fetching holds:', error);
      setHolds(getMockHolds());
      setLoading(false);
    }
  };

  const handleApprove = async (holdId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/payment-holds/${holdId}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (response.ok) {
        showSuccess('✅ Approved', 'Payment approved and released');
        setAdminNotes('');
        setSelectedHold(null);
        fetchHolds();
      } else {
        throw new Error('Failed to approve');
      }
    } catch (error: any) {
      showError('Failed to approve', error.message);
    }
  };

  const handleReject = async (holdId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/payment-holds/${holdId}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes, reason: 'Admin rejected' }),
      });

      if (response.ok) {
        showSuccess('✅ Rejected', 'Payment refunded to company');
        setAdminNotes('');
        setSelectedHold(null);
        fetchHolds();
      } else {
        throw new Error('Failed to reject');
      }
    } catch (error: any) {
      showError('Failed to reject', error.message);
    }
  };

  const getRemainingTime = (releaseDate: string) => {
    const now = new Date().getTime();
    const release = new Date(releaseDate).getTime();
    const diff = release - now;

    if (diff < 0) return 'Ready to release';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'errand':
        return '📦';
      case 'advertising':
        return '📸';
      case 'dispute':
        return '⚔️';
      default:
        return '💰';
    }
  };

  const disputedHolds = holds.filter(h => h.type === 'dispute' && (filterStatus === 'all' || h.status === filterStatus));
  const advertisingHolds = holds.filter(h => h.type === 'advertising' && (filterStatus === 'all' || h.status === filterStatus));
  const holdMonitoring = holds.filter(h => h.type === 'errand' && h.status === 'HOLD');

  const totalDisputed = disputedHolds.reduce((s, h) => s + h.amount, 0);
  const totalAdvertising = advertisingHolds.reduce((s, h) => s + h.amount, 0);
  const totalMonitoring = holdMonitoring.reduce((s, h) => s + h.amount, 0);

  if (loading) {
    return <div style={{ padding: '20px', color: '#999' }}>Loading payment data...</div>;
  }

  return (
    <div style={{ padding: '20px', background: '#fff9f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#333' }}>
          💳 Admin Payment Management
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Monitor holds, approve/reject payments, and manage disputes</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #FFE0B2' }}>
        {[
          { id: 'disputed', label: '⚔️ Disputed Payments', count: disputedHolds.length },
          { id: 'advertising', label: '📸 Advertising Approvals', count: advertisingHolds.length },
          { id: 'monitoring', label: '📊 Hold Monitoring', count: holdMonitoring.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === tab.id ? '#FF6B35' : '#999',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '3px solid #FF6B35' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Disputed Payments Tab */}
      {activeTab === 'disputed' && (
        <div>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            border: '2px solid #FF6B35',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>
              ⚔️ Disputed Errand Payments
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              <strong>Total Amount:</strong> SGD ${totalDisputed.toFixed(2)} • <strong>Cases:</strong> {disputedHolds.length}
            </p>
          </div>

          {disputedHolds.length === 0 ? (
            <div style={{
              background: '#E8F5E9',
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              color: '#2E7D32',
            }}>
              <p style={{ margin: 0, fontWeight: '600' }}>✅ No Disputed Payments</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {disputedHolds.map((hold) => (
                <div
                  key={hold.id}
                  style={{
                    background: 'white',
                    border: selectedHold?.id === hold.id ? '2px solid #FF6B35' : '2px solid #FFE0B2',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setSelectedHold(selectedHold?.id === hold.id ? null : hold)}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#333' }}>
                        {hold.companyName} • {hold.referenceId}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>{hold.reason}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333' }}>SGD ${hold.amount.toFixed(2)}</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#FF9800' }}>⏳ Awaiting Decision</p>
                    </div>
                  </div>

                  {/* Admin Notes Display */}
                  {hold.adminNotes && (
                    <div style={{
                      background: '#FFF3E0',
                      border: '1px solid #FFB74D',
                      borderRadius: '6px',
                      padding: '8px',
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#E65100',
                    }}>
                      <strong>📝 Notes:</strong> {hold.adminNotes}
                    </div>
                  )}

                  {/* Expanded Form */}
                  {selectedHold?.id === hold.id && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #eee',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add admin notes and decision reason..."
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '2px solid #ddd',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '60px',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(hold.id)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ✅ Approve & Release
                        </button>
                        <button
                          onClick={() => handleReject(hold.id)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ❌ Reject & Refund
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Advertising Approvals Tab */}
      {activeTab === 'advertising' && (
        <div>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            border: '2px solid #FF9800',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>
              📸 Advertising Campaign Approvals (Held by Stripe)
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              <strong>Total Held by Stripe:</strong> SGD ${totalAdvertising.toFixed(2)} • <strong>Campaigns Pending:</strong> {advertisingHolds.length}
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#E65100', fontStyle: 'italic' }}>
              ⏳ Funds are held in Stripe escrow. Approve to charge, reject to release hold.
            </p>
          </div>

          {advertisingHolds.length === 0 ? (
            <div style={{
              background: '#E8F5E9',
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              color: '#2E7D32',
            }}>
              <p style={{ margin: 0, fontWeight: '600' }}>✅ No Pending Campaigns</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {advertisingHolds.map((hold) => (
                <div
                  key={hold.id}
                  style={{
                    background: 'white',
                    border: selectedHold?.id === hold.id ? '2px solid #FF9800' : '2px solid #FFE0B2',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setSelectedHold(selectedHold?.id === hold.id ? null : hold)}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#333' }}>
                        {hold.companyName} • {hold.referenceId}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>Campaign in review</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333' }}>SGD ${hold.amount.toFixed(2)}</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#FF9800' }}>⏳ Pending Review</p>
                    </div>
                  </div>

                  {/* Admin Notes Display */}
                  {hold.adminNotes && (
                    <div style={{
                      background: '#FFF3E0',
                      border: '1px solid #FFB74D',
                      borderRadius: '6px',
                      padding: '8px',
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#E65100',
                    }}>
                      <strong>✓ Review Status:</strong> {hold.adminNotes}
                    </div>
                  )}

                  {/* Expanded Form */}
                  {selectedHold?.id === hold.id && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #eee',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add approval notes..."
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '2px solid #ddd',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '60px',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(hold.id)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ✅ Approve & Deduct from Hold
                        </button>
                        <button
                          onClick={() => handleReject(hold.id)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ❌ Reject & Release Hold
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hold Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            border: '2px solid #2196F3',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>
              📊 Active Errand Holds (48-hour monitoring)
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              <strong>Total Amount:</strong> SGD ${totalMonitoring.toFixed(2)} • <strong>Active Holds:</strong> {holdMonitoring.length}
            </p>
          </div>

          {holdMonitoring.length === 0 ? (
            <div style={{
              background: '#E8F5E9',
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              color: '#2E7D32',
            }}>
              <p style={{ margin: 0, fontWeight: '600' }}>✅ No Active Holds</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {holdMonitoring.map((hold) => (
                <div
                  key={hold.id}
                  style={{
                    background: 'white',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#333' }}>
                      {hold.companyName} • {hold.referenceId}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#2196F3', fontWeight: '600' }}>
                      Auto-releases in {hold.releaseDate ? getRemainingTime(hold.releaseDate) : 'N/A'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333' }}>SGD ${hold.amount.toFixed(2)}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#2196F3' }}>⏳ Waiting for auto-release</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
