import React, { useState, useEffect } from 'react';
import { useToastNotification } from '../utils/toastNotification';

interface PaymentHold {
  id: string;
  type: 'errand' | 'advertising' | 'dispute';
  referenceId: string;
  amount: number;
  status: 'HOLD' | 'PENDING_REVIEW' | 'APPROVED' | 'RELEASED' | 'REFUNDED';
  heldAt: string;
  releaseDate?: string;
  reason?: string;
  disputedAt?: string;
  adminNotes?: string;
  releasedAt?: string;
}

interface PaymentHoldsStatusProps {
  companyId?: number;
}

export default function PaymentHoldsStatus({ companyId }: PaymentHoldsStatusProps) {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [holds, setHolds] = useState<PaymentHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHold, setSelectedHold] = useState<PaymentHold | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  // Mock data for demo
  const getMockHolds = (): PaymentHold[] => [
    {
      id: '1',
      type: 'errand',
      referenceId: 'ERR-2026-001',
      amount: 750,
      status: 'HOLD',
      heldAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      releaseDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Waiting for errand completion verification',
    },
    {
      id: '2',
      type: 'errand',
      referenceId: 'ERR-2026-002',
      amount: 500,
      status: 'HOLD',
      heldAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      releaseDate: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
      reason: 'Standard 48-hour hold period',
    },
    {
      id: '3',
      type: 'advertising',
      referenceId: 'AD-2026-001',
      amount: 200,
      status: 'PENDING_REVIEW',
      heldAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      reason: 'Waiting for admin approval',
      adminNotes: 'Campaign under review for compliance',
    },
    {
      id: '4',
      type: 'dispute',
      referenceId: 'ERR-2026-003',
      amount: 600,
      status: 'PENDING_REVIEW',
      heldAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      disputedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      reason: 'Errand quality dispute - awaiting admin decision',
      adminNotes: 'Evidence reviewed, decision pending',
    },
    {
      id: '5',
      type: 'errand',
      referenceId: 'ERR-2026-004',
      amount: 450,
      status: 'RELEASED',
      heldAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      releaseDate: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
      releasedAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Auto-released after 48hrs (no dispute)',
    },
  ];

  useEffect(() => {
    fetchHolds();
  }, [companyId]);

  const fetchHolds = async () => {
    try {
      setLoading(true);
      // Mock data for demo
      setHolds(getMockHolds());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching holds:', error);
      setHolds(getMockHolds());
      setLoading(false);
    }
  };

  const getRemainingTime = (releaseDate: string) => {
    const now = new Date().getTime();
    const release = new Date(releaseDate).getTime();
    const diff = release - now;

    if (diff < 0) return 'Ready to release';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const handleDispute = async (holdId: string) => {
    if (!disputeReason.trim()) {
      showError('Reason required', 'Please provide a reason for disputing this hold');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payment/holds/${holdId}/dispute`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: disputeReason }),
      });

      if (response.ok) {
        showSuccess('✅ Dispute Raised', 'Errandify admin will review and make a decision');
        setDisputeReason('');
        setShowDisputeForm(false);
        setSelectedHold(null);
        fetchHolds();
      } else {
        throw new Error('Failed to raise dispute');
      }
    } catch (error: any) {
      showError('Failed to raise dispute', error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HOLD':
        return '#FFC107'; // Yellow
      case 'PENDING_REVIEW':
        return '#FF9800'; // Orange
      case 'RELEASED':
        return '#4CAF50'; // Green
      case 'REFUNDED':
        return '#2196F3'; // Blue
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'HOLD':
        return '⏳ On Hold';
      case 'PENDING_REVIEW':
        return '⚠️ Pending Admin';
      case 'RELEASED':
        return '✅ Released';
      case 'REFUNDED':
        return '💰 Refunded';
      default:
        return status;
    }
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

  const activeHolds = holds.filter(h => h.status === 'HOLD' || h.status === 'PENDING_REVIEW');
  const totalOnHold = holds.filter(h => h.status === 'HOLD').reduce((s, h) => s + h.amount, 0);
  const totalPending = holds.filter(h => h.status === 'PENDING_REVIEW').reduce((s, h) => s + h.amount, 0);

  if (loading) {
    return <div style={{ padding: '20px', color: '#999' }}>Loading payment holds...</div>;
  }

  return (
    <div style={{ padding: '20px', background: '#fff9f5', borderRadius: '12px', border: '2px solid #FFE0B2' }}>
      {/* Header */}
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: '#333' }}>
        💳 Stripe Escrow Holds & Fees
      </h2>
      <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
        💡 <strong>Errand (Asker):</strong> Stripe holds budget + Stripe fee (upfront visible). After 48h → Doer gets (budget - platform commission), Stripe fee → Stripe.
        <strong>Advertising:</strong> Stripe holds (campaign fee + Stripe fee). Approve → both deducted. Reject → both released.
        <strong>Subscription:</strong> Immediately charged on purchase, renewed monthly (company is aware).
      </p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '2px solid #FFC107',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Stripe Holds (Errand Budget + Fee)</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#FFC107' }}>SGD ${totalOnHold.toFixed(2)}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>Budget + Stripe fee • Released to Doer after 48h minus platform commission</p>
        </div>

        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '2px solid #FF9800',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Stripe Holds (Awaiting Admin Decision)</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#FF9800' }}>SGD ${totalPending.toFixed(2)}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>Ads (fee + Stripe fee) & disputes • Deducted on approval, released on rejection</p>
        </div>
      </div>

      {/* No Active Holds */}
      {activeHolds.length === 0 ? (
        <div style={{
          background: '#E8F5E9',
          border: '2px solid #4CAF50',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          color: '#2E7D32',
        }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>✅ No Active Holds</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>All your payments are either released or completed</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeHolds.map((hold) => (
            <div
              key={hold.id}
              style={{
                background: 'white',
                border: `2px solid ${getStatusColor(hold.status)}`,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: selectedHold?.id === hold.id ? 1 : 0.9,
              }}
              onClick={() => setSelectedHold(selectedHold?.id === hold.id ? null : hold)}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* Main Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '20px' }}>{getTypeIcon(hold.type)}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                      {hold.type === 'errand' && `Errand ${hold.referenceId.replace('ERR-', '')}`}
                      {hold.type === 'advertising' && `Campaign ${hold.referenceId.replace('AD-', '')}`}
                      {hold.type === 'dispute' && `Dispute - ${hold.referenceId}`}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>{hold.reason}</p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333' }}>SGD ${hold.amount.toFixed(2)}</p>
                  <span style={{
                    display: 'inline-block',
                    background: getStatusColor(hold.status),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    marginTop: '4px',
                  }}>
                    {getStatusLabel(hold.status)}
                  </span>
                </div>
              </div>

              {/* Timer Row (for HOLD status) */}
              {hold.status === 'HOLD' && hold.releaseDate && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 0 8px 32px',
                  borderTop: '1px solid #eee',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#FF9800',
                  fontWeight: '600',
                }}>
                  ⏱️ {getRemainingTime(hold.releaseDate)} • Auto-releases if no dispute
                </div>
              )}

              {/* Expanded Details */}
              {selectedHold?.id === hold.id && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #eee',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    <strong>Held at:</strong> {new Date(hold.heldAt).toLocaleString()}
                  </p>
                  {hold.adminNotes && (
                    <p style={{ margin: 0, fontSize: '12px', color: '#FF9800' }}>
                      <strong>⚠️ Admin Note:</strong> {hold.adminNotes}
                    </p>
                  )}
                  {hold.status === 'HOLD' && (
                    <button
                      onClick={() => setShowDisputeForm(!showDisputeForm)}
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: '#FF6B35',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      {showDisputeForm ? '✕ Cancel' : '⚔️ Dispute This Hold'}
                    </button>
                  )}
                </div>
              )}

              {/* Dispute Form */}
              {showDisputeForm && selectedHold?.id === hold.id && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Explain why you're disputing this hold..."
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => handleDispute(hold.id)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#FF6B35',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Submit Dispute
                    </button>
                    <button
                      onClick={() => setShowDisputeForm(false)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#f0f0f0',
                        color: '#666',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Released Holds Info */}
      {holds.some(h => h.status === 'RELEASED') && (
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #FFE0B2' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>
            ✅ Recently Released ({holds.filter(h => h.status === 'RELEASED').length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {holds.filter(h => h.status === 'RELEASED').map((hold) => (
              <div
                key={hold.id}
                style={{
                  background: '#E8F5E9',
                  border: '2px solid #4CAF50',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: '#2E7D32', fontWeight: '600' }}>
                  {hold.type === 'errand' && `Errand ${hold.referenceId}`} • Released {new Date(hold.releasedAt || '').toLocaleDateString()}
                </span>
                <span style={{ color: '#2E7D32', fontWeight: '700' }}>+SGD ${hold.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
