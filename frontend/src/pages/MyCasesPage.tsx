import React, { useState, useEffect } from 'react';
import { CaseReportModal } from '../components/CaseReportModal';
import { useToast, ToastContainer } from '../components/Toast';

interface UserCase {
  id: number;
  case_id: string;
  case_type: string;
  status: 'open' | 'in_progress' | 'resolved' | 'appealed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
  errand_id?: number;
  other_party_alias?: string;
  other_party_online?: boolean;
  resolution?: {
    type: string;
    amount: number;
    reasoning: string;
  };
}

const CASE_TYPE_LABELS = {
  dispute: { icon: '⚔️', label: 'Dispute' },
  app_issue: { icon: '🐛', label: 'App Problem' },
  payment_enquiry: { icon: '💰', label: 'Payment Question' },
  task_enquiry: { icon: '📍', label: 'Lost Contact' },
  refund_request: { icon: '💵', label: 'Refund Request' },
  safety_concern: { icon: '🚨', label: 'Safety Issue' },
  quality_issue: { icon: '⭐', label: 'Quality Issue' },
  cancellation: { icon: '❌', label: 'Cancellation' },
  other: { icon: '❓', label: 'Other' },
};

export const MyCasesPage: React.FC = () => {
  const { toasts, showToast, removeToast } = useToast();
  const [cases, setCases] = useState<UserCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedCase, setSelectedCase] = useState<UserCase | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchMyCases();
  }, []);

  const fetchMyCases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/cases/my-cases`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Fetch cases error:', error);
      // A failed request used to fall through to a hardcoded mockCases array
      // and then call setError(''), so a dead endpoint rendered as a healthy
      // screen full of invented rows. That is how a broken route survives for
      // months: nobody can see it is broken. Show the failure instead.
      setCases([]);
      showToast('Could not load your cases — this is a problem on our side, not an empty list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#84cc16';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'resolved': return '#10b981';
      case 'appealed': return '#a855f7';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return '📋';
      case 'in_progress': return '⏳';
      case 'resolved': return '✅';
      case 'appealed': return '📢';
      default: return '❓';
    }
  };

  // Reporting a new issue belongs here — this is where people come when
  // something has gone wrong and they want to know what happens next.
  const [reportOpen, setReportOpen] = useState(false);

  const filteredCases = filter === 'all' ? cases : cases.filter(c => c.status === filter);

  return (
    <div style={{ padding: '16px', paddingBottom: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div style={{
        marginBottom: '24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginBottom: '4px', margin: 0 }}>
            📋 My Cases
          </h1>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            Track your reported issues and follow their progress
          </p>
        </div>
        <button
          onClick={() => setReportOpen(true)}
          style={{
            background: '#FF6B35', color: 'white', border: 'none', borderRadius: '999px',
            padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Report an issue
        </button>
      </div>

      <CaseReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => fetchMyCases()}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        {['all', 'open', 'in_progress', 'resolved'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filter === status ? '#FF6B35' : '#f5f5f5',
              color: filter === status ? 'white' : '#333',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {status === 'all' ? 'All Cases' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Cases List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          Loading your cases...
        </div>
      ) : filteredCases.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#f9f9f9',
          borderRadius: '8px',
          color: '#666',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>No cases found</p>
          <p style={{ margin: 0, fontSize: '12px' }}>
            {filter !== 'all' ? 'No cases in this status' : 'You haven\'t reported any issues yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredCases.map(caseItem => (
            <div
              key={caseItem.id}
              onClick={() => {
                setSelectedCase(caseItem);
                setShowDetail(true);
              }}
              style={{
                background: '#fff',
                border: `2px solid ${getSeverityColor(caseItem.severity)}`,
                borderRadius: '8px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'start', flex: 1 }}>
                  <div style={{ fontSize: '18px' }}>
                    {CASE_TYPE_LABELS[caseItem.case_type as keyof typeof CASE_TYPE_LABELS]?.icon || '❓'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#333', fontSize: '14px', marginBottom: '2px' }}>
                      {caseItem.case_id}: {caseItem.subject}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {CASE_TYPE_LABELS[caseItem.case_type as keyof typeof CASE_TYPE_LABELS]?.label} • Errand #{caseItem.errand_id}
                    </div>
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  background: getStatusColor(caseItem.status),
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}>
                  {getStatusIcon(caseItem.status)} {caseItem.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              {/* Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                <div>
                  <div>Sent: {new Date(caseItem.created_at).toLocaleString()}</div>
                  {caseItem.other_party_alias && (
                    <div style={{ marginTop: '4px' }}>
                      Other party: <strong>{caseItem.other_party_alias}</strong> {caseItem.other_party_online ? '🟢' : '⚫'}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Updated: {new Date(caseItem.updated_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Resolution Badge (if resolved) */}
              {caseItem.resolution && (
                <div style={{
                  background: '#E8F5E9',
                  border: '1px solid #10b981',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '11px',
                  color: '#2e7d32',
                }}>.
                  <strong>Resolution:</strong> {caseItem.resolution.type === 'partial_refund' ? '💰 Partial Refund' : '✅ Approved'} - SGD ${caseItem.resolution.amount.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Case Detail Modal */}
      {showDetail && selectedCase && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px 16px 0 0',
            width: '100%',
            maxWidth: '500px',
            margin: '0 auto',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>
                  {selectedCase.case_id}
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                  {CASE_TYPE_LABELS[selectedCase.case_type as keyof typeof CASE_TYPE_LABELS]?.label}
                </p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                }}
              >
                ×
              </button>
            </div>

            {/* Status */}
            <div style={{
              padding: '10px',
              background: '#f9f9f9',
              border: `2px solid ${getStatusColor(selectedCase.status)}`,
              borderRadius: '6px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                {getStatusIcon(selectedCase.status)}
              </div>
              <div style={{ fontWeight: '700', color: '#333', fontSize: '14px' }}>
                {selectedCase.status.toUpperCase().replace('_', ' ')}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#333', marginBottom: '8px', margin: '0 0 8px 0' }}>
                Issue Description
              </h3>
              <div style={{
                background: '#f9f9f9',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#666',
                lineHeight: '1.6',
              }}>
                {selectedCase.description}
              </div>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#333', marginBottom: '8px', margin: '0 0 8px 0' }}>
                Timeline
              </h3>
              <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', fontSize: '11px', color: '#666' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Submitted:</strong> {new Date(selectedCase.created_at).toLocaleString()}
                </div>
                <div>
                  <strong>Last Updated:</strong> {new Date(selectedCase.updated_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Resolution (if available) */}
            {selectedCase.resolution && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#333', marginBottom: '8px', margin: '0 0 8px 0' }}>
                  Resolution
                </h3>
                <div style={{
                  background: '#E8F5E9',
                  border: '2px solid #10b981',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#2e7d32',
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Decision:</strong> {selectedCase.resolution.type === 'partial_refund' ? 'Partial Refund' : 'Approved'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Amount:</strong> SGD ${selectedCase.resolution.amount.toFixed(2)}
                  </div>
                  <div>
                    <strong>Reasoning:</strong> {selectedCase.resolution.reasoning}
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowDetail(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
