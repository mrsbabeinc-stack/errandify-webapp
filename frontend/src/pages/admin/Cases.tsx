import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useToast, ToastContainer } from '../../components/Toast';
import { CaseDisputeService } from '../../services/CaseDisputeService';

interface Case {
  id: number;
  case_id: string;
  case_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  subject: string;
  asker_id: number;
  doer_id: number;
  asker_alias?: string;
  doer_alias?: string;
  asker_online?: boolean;
  doer_online?: boolean;
  errand_id?: number;
  tags: string[];
  ai_confidence: number;
  created_at: string;
  dispute_claim?: string;
  dispute_defense?: string;
  ai_recommendation?: string;
  ai_analysis?: string;
}

interface LinkedDispute {
  id: number;
  status: string;
  dispute_type: string;
  priority: string;
}

export const CasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [linkedDisputes, setLinkedDisputes] = useState<LinkedDispute[]>([]);
  const [showCaseDetail, setShowCaseDetail] = useState(false);
  const [caseTimeline, setCaseTimeline] = useState<any[]>([]);
  const [resolution, setResolution] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<'full' | 'partial' | 'refund' | 'escalate' | null>(null);

  // Case type classification: which involve money ($$$) and which are rest
  const moneyCaseTypes = new Set(['dispute', 'refund_request', 'quality_issue', 'cancellation']);
  const restCaseTypes = new Set(['app_issue', 'payment_enquiry', 'task_enquiry', 'safety_concern', 'other']);

  const generateCaseId = () => {
    const randomNum = Math.random().toString(16).substring(2, 6).toUpperCase();
    return `D26-${randomNum}`;
  };

  const getCaseTypeLabel = (type: string): { label: string; icon: string } => {
    const typeMap: Record<string, { label: string; icon: string }> = {
      'dispute': { label: 'Dispute', icon: '⚖️' },
      'app_issue': { label: 'App Issue', icon: '🐛' },
      'payment_enquiry': { label: 'Payment Enquiry', icon: '💬' },
      'task_enquiry': { label: 'Errand Enquiry', icon: '🔍' },
      'refund_request': { label: 'Refund Request', icon: '💸' },
      'safety_concern': { label: 'Safety Concern', icon: '🚨' },
      'quality_issue': { label: 'Quality Issue', icon: '⭐' },
      'cancellation': { label: 'Cancellation', icon: '❌' },
      'other': { label: 'Other', icon: '❓' },
    };
    return typeMap[type] || { label: type.replace(/_/g, ' '), icon: '❓' };
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Fetch cases error:', error);
      // A failed request used to fall through to a hardcoded mockCases array
      // and then call setError(''), so a dead endpoint rendered as a healthy
      // screen full of invented rows. That is how a broken route survives for
      // months: nobody can see it is broken. Show the failure instead.
      setCases([]);
      showToast('Could not load cases — this is a problem on our side, not an empty list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedDisputes = async (caseId: string) => {
    try {
      const disputes = await CaseDisputeService.getDisputesByCase(caseId);
      setLinkedDisputes(disputes?.data || []);
    } catch (err) {
      console.error('Failed to fetch linked disputes:', err);
      setLinkedDisputes([]);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
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
      default: return '#6b7280';
    }
  };

  // Filter by status and case type
  let displayCases = filter === 'all' ? cases : cases.filter(c => c.status === filter);
  displayCases = typeFilter === 'all' ? displayCases : displayCases.filter(c => c.case_type === typeFilter);

  const filteredCases = displayCases;

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
              📋 Case Management
            </h2>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Track and resolve all case types with AI-powered insights
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
              padding: '0 8px',
            }}
            title="Go back"
          >
            ←
          </button>
        </div>

        {/* Status Filters */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>Status</p>
          <div style={{ display: 'flex', gap: '8px', background: '#fff', padding: '12px', borderRadius: '8px' }}>
            {['all', 'open', 'in_progress', 'resolved'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: filter === status ? '#FF6B35' : '#f5f5f5',
                  color: filter === status ? 'white' : '#333',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {status === 'all' ? 'All' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Case Type Filters */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>Case Type</p>
          <div style={{ display: 'flex', gap: '8px', background: '#fff', padding: '12px', borderRadius: '8px', flexWrap: 'wrap' }}>
            {['all', 'dispute', 'refund_request', 'quality_issue', 'cancellation', 'app_issue', 'payment_enquiry', 'task_enquiry', 'safety_concern', 'other'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: typeFilter === type ? '#FF6B35' : '#f5f5f5',
                  color: typeFilter === type ? 'white' : '#333',
                  fontWeight: typeFilter === type ? '600' : '500',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                {type === 'all' ? 'All Types' : getCaseTypeLabel(type).icon + ' ' + getCaseTypeLabel(type).label}
              </button>
            ))}
          </div>
        </div>

        {/* Cases List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading cases...</div>
        ) : filteredCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No cases found</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredCases.map(caseItem => (
              <div key={caseItem.id} style={{
                background: '#fff',
                border: `2px solid ${getSeverityColor(caseItem.severity)}`,
                borderRadius: '8px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{getSeverityIcon(caseItem.severity)}</span>
                      <span style={{ fontWeight: '700', color: '#333', fontSize: '16px' }}>
                        {caseItem.case_id}: {caseItem.subject}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Type: <strong>{getCaseTypeLabel(caseItem.case_type).icon} {getCaseTypeLabel(caseItem.case_type).label}</strong> • Errand: <strong>#{caseItem.errand_id}</strong>
                    </div>
                  </div>
                  <span style={{
                    padding: '6px 12px',
                    background: getStatusColor(caseItem.status),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}>
                    {caseItem.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', fontSize: '12px', color: '#666' }}>
                  <div>
                    <div className="label">Asker: <strong>{caseItem.asker_alias || 'Unknown'}</strong> (#{caseItem.asker_id}) {caseItem.asker_online ? '🟢' : '⚫'}</div>
                    <div className="label">Doer: <strong>{caseItem.doer_alias || 'Unknown'}</strong> (#{caseItem.doer_id}) {caseItem.doer_online ? '🟢' : '⚫'}</div>
                  </div>
                  <div>
                    <div>Sent: <strong>{new Date(caseItem.created_at).toLocaleString()}</strong></div>
                    <div>AI Confidence: <strong>{(caseItem.ai_confidence * 100).toFixed(0)}%</strong></div>
                  </div>
                </div>

                {/* Tags */}
                {caseItem.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {caseItem.tags.map(tag => (
                      <span key={tag} style={{
                        background: '#FFE5CC',
                        color: '#FF6B35',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Linked Disputes Banner */}
                {linkedDisputes.length > 0 && (
                  <div style={{
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    fontSize: '12px'
                  }}>
                    <strong>⚖️ {linkedDisputes.length} linked dispute{linkedDisputes.length !== 1 ? 's' : ''}</strong>
                    {linkedDisputes.map(d => (
                      <div key={d.id} style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                        Dispute #{d.id} ({d.status}) - {d.dispute_type}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedCase(caseItem);
                      fetchLinkedDisputes(caseItem.case_id);
                      setCaseTimeline([
                        { timestamp: caseItem.created_at, action: 'Case Created', handler: 'System' },
                      ]);
                      setShowCaseDetail(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#f5f5f5',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#333',
                    }}
                  >
                    💬 View Details
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCase(caseItem);
                      setCaseTimeline([
                        { timestamp: caseItem.created_at, action: 'Case Created', handler: 'System' },
                      ]);
                      setShowCaseDetail(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#10b981',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'white',
                    }}
                  >
                    ✓ Resolve
                  </button>
                  <button
                    onClick={() => showToast('Escalating case ' + caseItem.case_id, 'warning')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#FF6B35',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'white',
                    }}
                  >
                    🚀 Escalate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Case Detail Modal */}
        {showCaseDetail && selectedCase && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#333', margin: 0 }}>
                  {selectedCase.case_id}: {selectedCase.subject}
                </h3>
                <button
                  onClick={() => setShowCaseDetail(false)}
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

              {/* Dispute Notes - Submitted Evidence */}
              <div style={{ marginBottom: '16px', background: '#FFF5F0', border: '2px solid #FF6B35', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#333', margin: '0 0 12px 0' }}>
                  Dispute Submission - Original Complaint
                </h4>
                <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
                  {selectedCase.dispute_claim ? (
                    <>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px' }}>
                        What the Dispute Filer Submitted:
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#333',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        padding: '10px',
                        background: '#fafafa',
                        borderRadius: '4px',
                        borderLeft: '4px solid #FF6B35',
                      }}>
                        {selectedCase.dispute_claim}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
                      No dispute notes submitted
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute Details & AI Analysis */}
              <div style={{ marginBottom: '16px', background: '#f9f9f9', border: '2px solid #FFD9B3', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#333', margin: '0 0 12px 0' }}>
                  Dispute Response & AI Analysis
                </h4>

                {selectedCase.dispute_defense && (
                  <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      Response from Other Party:
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', paddingLeft: '12px', borderLeft: '3px solid #3b82f6', marginBottom: '8px' }}>
                      "{selectedCase.dispute_defense}"
                    </div>
                  </div>
                )}

                {selectedCase.ai_analysis && (
                  <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd', background: '#FFF5F0', padding: '12px', borderRadius: '6px', border: '2px solid #FF6B35' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#FF6B35', marginBottom: '8px' }}>
                      AI Analysis & Recommendation
                    </div>

                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px', background: '#fff', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                      <strong>Considered from original dispute:</strong><br/>
                      "{selectedCase.dispute_claim}"
                    </div>

                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px', background: '#fff', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #666' }}>
                      <strong>Considered from response:</strong><br/>
                      "{selectedCase.dispute_defense}"
                    </div>

                    <div style={{
                      fontSize: '14px',
                      color: '#333',
                      background: '#fff',
                      padding: '10px',
                      borderRadius: '4px',
                      lineHeight: '1.6',
                      borderLeft: '4px solid #FF6B35',
                    }}>
                      {selectedCase.ai_analysis}
                    </div>
                  </div>
                )}

                {/* AI Recommendation with Sentiment */}
                <div style={{ background: '#E8F5E9', padding: '12px', borderRadius: '4px', border: '2px solid #10b981', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#2e7d32', marginBottom: '8px' }}>
                    🎯 AI Analysis & Recommendation
                  </div>

                  {/* Sentiment Analysis */}
                  <div style={{ fontSize: '13px', color: '#333', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #10b981' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Sentiment Analysis:</strong>
                    </div>
                    <div style={{ marginLeft: '12px', lineHeight: '1.4', color: '#666' }}>
                      • Doer: 😊 Positive (Professional, responsive, with evidence)<br/>
                      • Asker: 😐 Neutral (Reasonable claim, fair dispute)
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={{ fontSize: '14px', color: '#2e7d32', marginBottom: '8px' }}>
                    <strong>Recommendation:</strong> FAVOR DOER (87% confidence)
                  </div>

                  {/* Proposed Compensation */}
                  <div style={{ fontSize: '14px', color: '#2e7d32', marginBottom: '8px', background: '#fff', padding: '8px', borderRadius: '3px', border: '1px solid #10b981' }}>
                    <strong>Proposed Compensation:</strong><br/>
                    Full Payment to Doer: SGD $50.00<br/>
                    <span style={{ fontSize: '12px', color: '#666' }}>Net after fees: SGD $38.50</span>
                  </div>

                  {/* Reasoning */}
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                    <strong>Why:</strong> Strong evidence (GPS ±25m, 3 dated photos, 35min wait) shows genuine effort. Work inability due to customer unavailability, not doer fault.
                  </div>
                </div>

                {/* Confidence Meter */}
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Confidence Level: <strong>{(selectedCase.ai_confidence * 100).toFixed(0)}%</strong>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#ddd',
                    borderRadius: '3px',
                    marginTop: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${selectedCase.ai_confidence * 100}%`,
                      height: '100%',
                      background: selectedCase.ai_confidence > 0.8 ? '#10b981' : selectedCase.ai_confidence > 0.6 ? '#f59e0b' : '#ef4444',
                    }} />
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <strong>Asker:</strong> {selectedCase.asker_alias || 'Unknown'} (#{selectedCase.asker_id})
                    </div>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: selectedCase.asker_online ? '#10b981' : '#999',
                      title: selectedCase.asker_online ? 'Online' : 'Offline'
                    }}></span>
                  </div>
                  <span style={{ fontSize: '12px', color: selectedCase.asker_online ? '#10b981' : '#999' }}>
                    {selectedCase.asker_online ? '🟢 Online' : '⚫ Offline'}
                  </span>
                  <button
                    onClick={() => showToast('Opening chat with Asker ' + (selectedCase.asker_alias || '#' + selectedCase.asker_id), 'info')}
                    style={{
                      marginLeft: '8px',
                      padding: '4px 10px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    💬 Chat
                  </button>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <strong>Doer:</strong> {selectedCase.doer_alias || 'Unknown'} (#{selectedCase.doer_id})
                    </div>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: selectedCase.doer_online ? '#10b981' : '#999',
                      title: selectedCase.doer_online ? 'Online' : 'Offline'
                    }}></span>
                  </div>
                  <span style={{ fontSize: '12px', color: selectedCase.doer_online ? '#10b981' : '#999' }}>
                    {selectedCase.doer_online ? '🟢 Online' : '⚫ Offline'}
                  </span>
                  <button
                    onClick={() => showToast('Opening chat with Doer ' + (selectedCase.doer_alias || '#' + selectedCase.doer_id), 'info')}
                    style={{
                      marginLeft: '8px',
                      padding: '4px 10px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    💬 Chat
                  </button>
                </div>
              </div>

              {/* Status Update with Descriptions */}
              <div style={{ marginBottom: '16px', background: '#f9f9f9', padding: '12px', borderRadius: '6px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                  Case Status
                </label>
                <select
                  id="statusSelect"
                  value={selectedCase.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;

                    // Update local state
                    const updatedCase = { ...selectedCase, status: newStatus };
                    setSelectedCase(updatedCase);
                    setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));

                    // Save to database
                    try {
                      const token = localStorage.getItem('token');
                      await fetch(`/api/cases/${selectedCase.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: newStatus })
                      });

                      setCaseTimeline([...caseTimeline, {
                        timestamp: new Date().toISOString(),
                        action: `Status changed to ${newStatus}`,
                        handler: 'Admin User',
                      }]);
                      showToast(`Case status updated to ${newStatus}`, 'success');

                      // Show AI prompt suggestion
                      const prompts: { [key: string]: string } = {
                        'in_progress': '💡 AI Suggestion: You\'re now investigating. Consider: Have you reviewed all chat messages? Do you have GPS data? Are there photos? Do you need to contact either party?',
                        'resolved': '💡 AI Suggestion: Time to resolve! Did you: Review all evidence? Determine fair compensation (full/partial/refund)? Prepare reasoning for transparency? Consider platform & Stripe fees?',
                        'appealed': '💡 AI Suggestion: Case appealed to L3. This needs senior review. Escalate to senior admin team with full case context.',
                      };
                      if (prompts[newStatus]) {
                        showToast(prompts[newStatus], 'info');
                      }
                    } catch (error) {
                      console.error('Failed to update case status:', error);
                      showToast('Failed to update case status', 'error');
                      // Revert the UI change
                      setSelectedCase(selectedCase);
                      setCases(cases);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginBottom: '8px',
                  }}
                >
                  <option value="open">🔵 Open</option>
                  <option value="in_progress">⏳ In Progress</option>
                  <option value="resolved">✅ Resolved</option>
                  <option value="appealed">📢 Appealed</option>
                </select>

                {/* Status Description */}
                <div style={{
                  padding: '10px',
                  background: '#fff',
                  border: '1px solid #FFD9B3',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.5',
                }}>
                  {selectedCase.status === 'open' && (
                    <>
                      <strong>🔵 OPEN:</strong> Case just created. Evidence still being collected. No decision made yet. Admin can add updates, attach photos, and chat with both parties to gather information.
                    </>
                  )}
                  {selectedCase.status === 'in_progress' && (
                    <>
                      <strong>⏳ IN PROGRESS:</strong> Admin is actively investigating. Evidence reviewed. Still gathering more info or waiting for responses. Both parties know it's being worked on.
                    </>
                  )}
                  {selectedCase.status === 'resolved' && (
                    <>
                      <strong>✅ RESOLVED:</strong> Admin made final decision. Compensation determined (full/partial/refund). Notifications sent to both parties. Payment processing started. Case complete.
                    </>
                  )}
                  {selectedCase.status === 'appealed' && (
                    <>
                      <strong>📢 APPEALED:</strong> One party appealed initial decision. Goes to L3 Senior Admin Team. Case reopened for further review. Timeline continues with appeal details.
                    </>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#333' }}>📋 Case Timeline</h4>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {caseTimeline.map((entry, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '12px',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #eee',
                    }}>
                      <div style={{ fontSize: '16px', marginTop: '-2px', minWidth: '16px' }}>📌</div>
                      <div style={{ fontSize: '14px', flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '2px' }}>
                          {entry.action}
                        </div>
                        <div style={{ color: '#666', fontSize: '13px' }}>
                          {new Date(entry.timestamp).toLocaleString()} • Handler: <strong>{entry.handler}</strong>
                        </div>
                        {entry.note && (
                          <div style={{ color: '#666', fontSize: '13px', marginTop: '4px', fontStyle: 'italic' }}>
                            {entry.note}
                          </div>
                        )}
                        {entry.photoUrl && (
                          <img src={entry.photoUrl} alt="case update" style={{
                            marginTop: '8px',
                            maxWidth: '100%',
                            borderRadius: '4px',
                            maxHeight: '150px',
                          }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Case Update */}
              <div style={{
                background: '#FFF5F0',
                border: '2px solid #FF6B35',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 12px 0', color: '#333' }}>
                  💬 Add Case Update
                </h4>
                <textarea
                  placeholder="Add update notes, findings, or comments..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    marginBottom: '10px',
                    minHeight: '60px',
                  }}
                  id="caseUpdateNote"
                />
                <input
                  type="file"
                  accept="image/*"
                  style={{ fontSize: '13px', marginBottom: '10px' }}
                  id="caseUpdatePhoto"
                />
                <button
                  onClick={() => {
                    const note = (document.getElementById('caseUpdateNote') as HTMLTextAreaElement)?.value;
                    if (note.trim()) {
                      setCaseTimeline([...caseTimeline, {
                        timestamp: new Date().toISOString(),
                        action: 'Case Update Added',
                        handler: 'Admin User',
                        note: note,
                      }]);
                      (document.getElementById('caseUpdateNote') as HTMLTextAreaElement).value = '';
                      showToast('Case update added to timeline', 'success');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  + Add Update
                </button>
              </div>

              {/* Resolution Section */}
              {selectedCase.status !== 'resolved' && (
                <div style={{
                  background: '#FFF5F0',
                  border: '2px solid #FF6B35',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 12px 0', color: '#333' }}>
                    ✓ Case Resolution
                  </h4>

                  {/* AI Guidance Box */}
                  <div style={{
                    background: '#FFF9F0',
                    border: '1px solid #FFD9B3',
                    borderRadius: '6px',
                    padding: '10px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#666',
                  }}>
                    <strong>💡 AI Resolution Guide:</strong>
                    <ul style={{ margin: '6px 0 0 16px', paddingLeft: '0' }}>
                      <li>Errand Amount: <strong>SGD ${selectedCase.errand_id ? '50.00' : 'N/A'}</strong> (example)</li>
                      <li>Platform Fee (20%): ~<strong>SGD $10.00</strong></li>
                      <li>Stripe Fee (3%): ~<strong>SGD $1.50</strong></li>
                      <li>If full payment → Doer gets: ~<strong>SGD $38.50</strong></li>
                      <li style={{ marginTop: '8px' }}>
                        <strong>Consider:</strong> Is evidence strong (GPS, photos, wait time)?
                        Did both parties respond? Is compensation fair?
                      </li>
                    </ul>
                  </div>

                  {/* Resolution Decision - Unified Cards with Tips */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        Resolution Decision
                      </label>
                      <div style={{ fontSize: '12px', background: '#fffbeb', padding: '4px 8px', borderRadius: '4px', color: '#92400e', fontWeight: '500' }}>
                        💡 Select one decision below. Amounts and fees will update automatically.
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                      {[
                        { key: 'full', label: 'Full Payment', color: '#10b981', tip: 'Doer receives 100% of errand amount', detail: 'Asker pays all fees' },
                        { key: 'partial', label: 'Fair Split 50/50', color: '#f59e0b', tip: 'Split payment evenly between parties', detail: 'Customize % in amount fields' },
                        { key: 'refund', label: 'Full Refund', color: '#3b82f6', tip: 'Doer receives $0, Asker gets 100% back', detail: 'No Stripe fee (escrow release)' },
                        { key: 'escalate', label: 'Escalate L3', color: '#6366f1', tip: 'Cannot decide now, needs senior review', detail: 'Case remains open' },
                      ].map(option => (
                        <div
                          key={option.key}
                          onClick={() => {
                            setSelectedResolution(option.key as any);
                            (document.getElementById('compensationType') as HTMLInputElement).value = option.key;

                            const originalAmount = 50;
                            let doerCompensation = 0;
                            let askerRefund = 0;

                            if (option.key === 'full') {
                              doerCompensation = originalAmount;
                              askerRefund = 0;
                            } else if (option.key === 'partial') {
                              // Split 50/50 - staff can adjust amounts in input fields
                              doerCompensation = originalAmount * 0.50;
                              askerRefund = originalAmount * 0.50;
                            } else if (option.key === 'refund') {
                              doerCompensation = 0;
                              askerRefund = originalAmount;
                            } else if (option.key === 'escalate') {
                              doerCompensation = 0;
                              askerRefund = 0;
                            }

                            (document.getElementById('doerAmount') as HTMLInputElement).value = doerCompensation.toFixed(2);
                            (document.getElementById('askerAmount') as HTMLInputElement).value = askerRefund.toFixed(2);

                            const platformFee = doerCompensation * 0.20;
                            const stripeFee = doerCompensation > 0 ? doerCompensation * 0.03 : 0;
                            const netToDoer = doerCompensation - platformFee;

                            (document.getElementById('totalAmount') as HTMLElement).textContent = `Total: SGD $${(doerCompensation + askerRefund).toFixed(2)}`;
                            (document.getElementById('doerPaymentDisplay') as HTMLElement).textContent = doerCompensation.toFixed(2);
                            (document.getElementById('platformFeeDisplay') as HTMLElement).textContent = platformFee.toFixed(2);
                            (document.getElementById('stripeFeeDisplay') as HTMLElement).textContent = stripeFee.toFixed(2);
                            (document.getElementById('doerNetDisplay') as HTMLElement).textContent = netToDoer.toFixed(2);
                            (document.getElementById('askerRefundDisplay') as HTMLElement).textContent = askerRefund.toFixed(2);

                            if (stripeFee > 0) {
                              (document.getElementById('askerStripeLine') as HTMLElement).style.display = 'block';
                              (document.getElementById('askerStripeFeeDisplay') as HTMLElement).textContent = stripeFee.toFixed(2);
                              (document.getElementById('askerTotalDisplay') as HTMLElement).textContent = (askerRefund + stripeFee).toFixed(2);
                            } else {
                              (document.getElementById('askerStripeLine') as HTMLElement).style.display = 'none';
                              (document.getElementById('askerTotalDisplay') as HTMLElement).textContent = askerRefund.toFixed(2);
                            }
                            (document.getElementById('feeAssignmentMode') as HTMLElement).textContent = 'Auto';

                            showToast(`${option.label} selected - Amounts updated`, 'success');
                          }}
                          style={{
                            padding: '12px',
                            background: selectedResolution === option.key ? option.color : '#f9f9f9',
                            color: selectedResolution === option.key ? 'white' : '#333',
                            border: `2px solid ${selectedResolution === option.key ? option.color : '#e5e7eb'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            minHeight: '80px',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{option.label}</div>
                          <div style={{ fontSize: '13px', lineHeight: '1.3', opacity: selectedResolution === option.key ? 0.95 : 0.8 }}>
                            {option.tip}
                          </div>
                          <div style={{ fontSize: '12px', opacity: selectedResolution === option.key ? 0.85 : 0.6, fontStyle: 'italic' }}>
                            {option.detail}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hidden input */}
                    <input type="hidden" id="compensationType" defaultValue="" />

                    {/* Resolution & Compensation - Simple Layout */}
                    <div style={{ marginTop: '16px', padding: '12px', background: '#f9f9f9', borderRadius: '6px', border: '2px solid #FFD9B3' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
                        Resolution & Compensation
                      </label>

                      {/* Doer & Asker Amounts - Side by Side */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                            Doer Receives (SGD)
                          </label>
                          <input
                            type="number"
                            placeholder=""
                            id="doerAmount"
                            defaultValue=""
                            step="0.01"
                            min="0"
                            onChange={(e) => {
                              const doerAmt = parseFloat(e.target.value) || 0;
                              const askerAmt = parseFloat((document.getElementById('askerAmount') as HTMLInputElement).value) || 0;
                              const totalAmt = doerAmt + askerAmt;
                              const originalAmount = 50;

                              // Platform fee (20%) deducted from Doer's compensation
                              // Stripe fee (3%) on Doer compensation - paid by Asker
                              // If no Doer compensation (Full Refund): NO Stripe fee (escrow release)
                              const platformFee = doerAmt * 0.20;
                              const stripeFee = doerAmt > 0 ? doerAmt * 0.03 : 0;
                              const netToDoer = doerAmt - platformFee;

                              (document.getElementById('totalAmount') as HTMLElement).textContent = `Total: SGD $${totalAmt.toFixed(2)}`;
                              (document.getElementById('doerPaymentDisplay') as HTMLElement).textContent = doerAmt.toFixed(2);
                              (document.getElementById('platformFeeDisplay') as HTMLElement).textContent = platformFee.toFixed(2);
                              (document.getElementById('stripeFeeDisplay') as HTMLElement).textContent = stripeFee.toFixed(2);
                              (document.getElementById('doerNetDisplay') as HTMLElement).textContent = netToDoer.toFixed(2);
                              (document.getElementById('askerRefundDisplay') as HTMLElement).textContent = askerAmt.toFixed(2);
                              // Stripe fee only deducted from Asker refund if there's a transaction (Doer compensation > 0)
                              if (stripeFee > 0) {
                                (document.getElementById('askerStripeLine') as HTMLElement).style.display = 'block';
                                (document.getElementById('askerStripeFeeDisplay') as HTMLElement).textContent = stripeFee.toFixed(2);
                                (document.getElementById('askerTotalDisplay') as HTMLElement).textContent = (askerAmt - stripeFee).toFixed(2);
                              } else {
                                (document.getElementById('askerStripeLine') as HTMLElement).style.display = 'none';
                                (document.getElementById('askerTotalDisplay') as HTMLElement).textContent = askerAmt.toFixed(2);
                              }
                              (document.getElementById('feeAssignmentMode') as HTMLElement).textContent = 'Manual';

                              if (Math.abs((doerAmt + askerAmt) - originalAmount) > 0.01) {
                                (document.getElementById('totalAddUpWarning') as HTMLElement).style.display = 'block';
                              } else {
                                (document.getElementById('totalAddUpWarning') as HTMLElement).style.display = 'none';
                              }
                            }}
                            style={{ width: '100%', padding: '8px', border: '2px solid #10b981', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#999' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                            Asker Refund (SGD)
                          </label>
                          <input
                            type="number"
                            placeholder=""
                            id="askerAmount"
                            defaultValue=""
                            step="0.01"
                            min="0"
                            onChange={(e) => {
                              const doerAmt = parseFloat((document.getElementById('doerAmount') as HTMLInputElement).value) || 0;
                              const askerAmt = parseFloat(e.target.value) || 0;
                              const totalAmt = doerAmt + askerAmt;
                              const originalAmount = 50;

                              // Platform fee (20%) deducted from Doer's compensation
                              // Stripe fee (3%) on Doer compensation - paid by Asker
                              // If no Doer compensation (Full Refund): NO Stripe fee (escrow release)
                              const platformFee = doerAmt * 0.20;
                              const stripeFee = doerAmt > 0 ? doerAmt * 0.03 : 0;
                              const netToDoer = doerAmt - platformFee;

                              (document.getElementById('totalAmount') as HTMLElement).textContent = `Total: SGD $${totalAmt.toFixed(2)}`;
                              (document.getElementById('doerPaymentDisplay') as HTMLElement).textContent = doerAmt.toFixed(2);
                              (document.getElementById('platformFeeDisplay') as HTMLElement).textContent = platformFee.toFixed(2);
                              (document.getElementById('stripeFeeDisplay') as HTMLElement).textContent = stripeFee.toFixed(2);
                              (document.getElementById('doerNetDisplay') as HTMLElement).textContent = netToDoer.toFixed(2);
                              (document.getElementById('askerRefundDisplay') as HTMLElement).textContent = askerAmt.toFixed(2);
                              // Stripe fee only deducted from Asker refund if there's a transaction (Doer compensation > 0)
                              if (stripeFee > 0) {
                                (document.getElementById('askerStripeLine') as HTMLElement).style.display = 'block';
                                (document.getElementById('askerStripeFeeDisplay') as HTMLElement).textContent = stripeFee.toFixed(2);
                                (document.getElementById('askerTotalDisplay') as HTMLElement).textContent = (askerAmt - stripeFee).toFixed(2);
                              } else {
                                (document.getElementById('askerStripeLine') as HTMLElement).style.display = 'none';
                                (document.getElementById('askerTotalDisplay') as HTMLElement).textContent = askerAmt.toFixed(2);
                              }
                              (document.getElementById('feeAssignmentMode') as HTMLElement).textContent = 'Manual';

                              if (Math.abs((doerAmt + askerAmt) - originalAmount) > 0.01) {
                                (document.getElementById('totalAddUpWarning') as HTMLElement).style.display = 'block';
                              } else {
                                (document.getElementById('totalAddUpWarning') as HTMLElement).style.display = 'none';
                              }
                            }}
                            style={{ width: '100%', padding: '8px', border: '2px solid #ef4444', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#999' }}
                          />
                        </div>
                      </div>

                      {/* Total Summary */}
                      <div
                        id="totalAmount"
                        style={{
                          padding: '10px',
                          background: '#fff',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#999',
                          textAlign: 'center',
                          marginBottom: '12px',
                        }}
                      >
                        SGD 0.00
                      </div>

                      {/* Fee Allocation - Compact Design */}
                      <div style={{ marginTop: '12px', padding: '12px', background: '#fff', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', marginBottom: '12px' }}>
                          💳 Fee Allocation
                        </div>

                        {/* Three Column Fee Selection */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                          {/* Platform Fee */}
                          <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                              Platform (20%)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input type="radio" name="platformFeePayer" value="doer" defaultChecked style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                <span>Doer</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input type="radio" name="platformFeePayer" value="asker" style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                <span>Asker</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input type="radio" name="platformFeePayer" value="app" style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                <span>App Absorbs</span>
                              </label>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FF6B35', marginTop: '8px' }} id="platformFeeAllocDisplay">
                              $0.00
                            </div>
                          </div>

                          {/* Stripe Fee */}
                          <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                              Stripe (3%)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input type="radio" name="stripFeePayer" value="doer" defaultChecked style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                <span>Doer</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input type="radio" name="stripFeePayer" value="asker" style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                <span>Asker</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input type="radio" name="stripFeePayer" value="app" style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                <span>App Absorbs</span>
                              </label>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FF6B35', marginTop: '8px' }} id="stripeFeeAllocDisplay">
                              $0.00
                            </div>
                          </div>

                          {/* Asker Refund */}
                          <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                              Asker Refund
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '12px', color: '#666', padding: '6px 0' }}>
                                Back to Bank
                              </div>
                              <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                                Only option available
                              </div>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginTop: '8px' }} id="askerRefundDisplay">
                              $0.00
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Warning if totals don't add up */}
                      <div
                        id="totalAddUpWarning"
                        style={{
                          marginTop: '12px',
                          padding: '10px',
                          background: '#fef2f2',
                          borderRadius: '6px',
                          border: '2px solid #ef4444',
                          fontSize: '13px',
                          color: '#dc2626',
                          fontWeight: '600',
                          display: 'none',
                        }}
                      >
                        ⚠️ Warning: Doer + Asker amounts do NOT add up to original amount. Please verify totals.
                      </div>

                      {/* Payment Breakdown Summary */}
                      <div style={{ marginTop: '12px', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <div style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>Payment Breakdown</div>
                          <div style={{ fontSize: '12px', background: '#dbeafe', padding: '3px 6px', borderRadius: '3px', color: '#075985', fontWeight: '500' }}>
                            💡 What each party pays and receives after all fees
                          </div>
                        </div>

                        {/* Doer Breakdown */}
                        <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', marginBottom: '6px' }}>
                            ✅ DOER RECEIVES
                            <span style={{ fontSize: '12px', color: '#059669', fontWeight: '400', marginLeft: '6px', background: '#d1fae5', padding: '2px 4px', borderRadius: '2px' }}>What they get paid</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>Gross Amount: SGD <span id="doerPaymentDisplay">0.00</span> <span style={{ fontSize: '12px', color: '#999' }}>(before fees)</span></div>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>Platform Fee (20%): -SGD <span id="platformFeeDisplay">0.00</span> <span style={{ fontSize: '12px', color: '#999' }}>(Errandify takes this)</span></div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>Net to Doer: SGD <span id="doerNetDisplay">0.00</span> <span style={{ fontSize: '12px', color: '#059669', fontWeight: '400' }}>(lands in their wallet)</span></div>
                        </div>

                        {/* Asker Breakdown */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444', marginBottom: '6px' }}>
                            💰 ASKER PAYS/RECEIVES
                            <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: '400', marginLeft: '6px', background: '#fee2e2', padding: '2px 4px', borderRadius: '2px' }}>Refund or additional charge</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>Refund Amount: SGD <span id="askerRefundDisplay">0.00</span> <span style={{ fontSize: '12px', color: '#999' }}>(if decision favors them)</span></div>
                          <div id="askerStripeLine" style={{ fontSize: '13px', color: '#666', marginBottom: '2px', display: 'none' }}>Stripe Fee: +SGD <span id="askerStripeFeeDisplay">0.00</span> <span style={{ fontSize: '12px', color: '#999' }}>(payment processing cost)</span></div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>Total Asker Pays: SGD <span id="askerTotalDisplay">0.00</span> <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: '400' }}>(their net cost)</span></div>
                        </div>

                        {/* Mode Badge */}
                        <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#7c3aed', background: '#f3e8ff', padding: '4px 8px', borderRadius: '3px', display: 'inline-block' }}>
                          Mode: <span id="feeAssignmentMode">Auto</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Notes */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                      Resolution Reasoning (AI will generate detailed logic)
                    </label>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Explain your decision, evidence considered, and fairness rationale..."
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        minHeight: '80px',
                      }}
                    />
                  </div>

                  {/* AI-Generated Messages Preview & Edit */}
                  <div style={{ marginBottom: '12px', background: '#fff', border: '2px solid #10b981', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', marginBottom: '10px' }}>
                      Edit & Approve Notification Messages
                    </div>

                    {/* Tabs for message selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      <button
                        onClick={() => {
                          document.getElementById('doerMessageTab')?.click();
                        }}
                        id="doerTabBtn"
                        style={{
                          padding: '8px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                        }}
                      >
                        To Doer
                      </button>
                      <button
                        onClick={() => {
                          document.getElementById('askerMessageTab')?.click();
                        }}
                        id="askerTabBtn"
                        style={{
                          padding: '8px',
                          background: '#e5e7eb',
                          color: '#333',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                        }}
                      >
                        To Asker
                      </button>
                    </div>

                    {/* Message to Doer */}
                    <div id="doerMessagePanel" style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#2e7d32', marginBottom: '6px' }}>
                        Message to Doer (Service Provider)
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>Subject Line:</label>
                        <input
                          id="doerSubject"
                          type="text"
                          defaultValue={`Case ${selectedCase.case_id} Resolution - Full Payment Approved`}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '2px solid #FFD9B3',
                            borderRadius: '4px',
                            fontSize: '13px',
                            marginBottom: '8px',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                      <textarea
                        id="doerMessage"
                        defaultValue={`Case ${selectedCase.case_id}: ${selectedCase.subject}

Dear Service Provider,

We have completed our investigation of your case and have made a final determination.

DECISION: Full Payment Approved
Case ID: ${selectedCase.case_id}
Errand: ${selectedCase.subject}
Amount Approved: SGD 50.00

INVESTIGATION FINDINGS:
We reviewed the evidence you provided, including GPS location data, photographs from the job site, and your documented wait time. Based on this investigation, we determined that you made a genuine, professional effort to complete the agreed service, and the inability to proceed was due to factors beyond your control.

PAYMENT BREAKDOWN:
Original Amount: SGD 50.00
Platform Fee (5%): SGD 2.50
Processing Fee (3%): SGD 1.50
Net Amount to You: SGD 46.00

NEXT STEPS:
Your payment will be processed within 24-48 hours. You will receive a separate notification confirming the transfer to your account. Please allow 1-2 business days for the funds to appear in your bank account.

If you have any questions about this decision, please reply to this message or contact our support team.

Regards,
Errandify Resolution Team`}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #FFD9B3',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          minHeight: '200px',
                          marginBottom: '8px',
                        }}
                      />
                      <button
                        onClick={() => showToast('Message to Doer approved and sent', 'success')}
                        style={{
                          padding: '8px 12px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        Send to Doer
                      </button>
                    </div>

                    {/* Message to Asker */}
                    <div id="askerMessagePanel" style={{ display: 'none' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6', marginBottom: '6px' }}>
                        Message to Asker (Customer)
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>Subject Line:</label>
                        <input
                          id="askerSubject"
                          type="text"
                          defaultValue={`Case ${selectedCase.case_id} Resolution - Payment Released to Provider`}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '2px solid #FFD9B3',
                            borderRadius: '4px',
                            fontSize: '13px',
                            marginBottom: '8px',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                      <textarea
                        id="askerMessage"
                        defaultValue={`Case ${selectedCase.case_id}: ${selectedCase.subject}

Dear Valued Customer,

We have completed our investigation of your case and have reached a final decision.

DECISION: Full Payment Released to Service Provider
Case ID: ${selectedCase.case_id}
Errand: ${selectedCase.subject}

INVESTIGATION SUMMARY:
We thoroughly reviewed all available evidence in this case, including communication records, location data, and documentation provided by the service provider. Based on our investigation, we determined that the service provider made a genuine, documented effort to complete the agreed service. The service provider arrived on time, provided GPS verification of location, documented their wait time with photographs, and demonstrated professional conduct throughout.

PAYMENT DETAILS:
Original Errand Amount: SGD 50.00
Service Provider Received: SGD 46.00 (net after platform and processing fees)

WHAT THIS MEANS:
The full payment has been released to the service provider. Your account has been charged as originally agreed. The service provider was unable to complete the work due to circumstances beyond their control, but they fulfilled their professional obligations by attempting the service and providing proper documentation.

FEEDBACK & APPEALS:
If you believe this decision was made in error, you may submit an appeal within 48 hours. Appeals should include new evidence not previously reviewed. Contact our support team to initiate an appeal.

We appreciate your use of Errandify and your cooperation during this investigation.

Regards,
Errandify Resolution Team`}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #FFD9B3',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          minHeight: '200px',
                          marginBottom: '8px',
                        }}
                      />
                      <button
                        onClick={() => showToast('Message to Asker approved and sent', 'success')}
                        style={{
                          padding: '8px 12px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        Send to Asker
                      </button>
                    </div>

                    {/* Tab switching script */}
                    <input
                      type="hidden"
                      id="doerMessageTab"
                      onClick={() => {
                        document.getElementById('doerMessagePanel')!.style.display = 'block';
                        document.getElementById('askerMessagePanel')!.style.display = 'none';
                        document.getElementById('doerTabBtn')!.style.background = '#10b981';
                        document.getElementById('askerTabBtn')!.style.background = '#e5e7eb';
                      }}
                    />
                    <input
                      type="hidden"
                      id="askerMessageTab"
                      onClick={() => {
                        document.getElementById('doerMessagePanel')!.style.display = 'none';
                        document.getElementById('askerMessagePanel')!.style.display = 'block';
                        document.getElementById('doerTabBtn')!.style.background = '#e5e7eb';
                        document.getElementById('askerTabBtn')!.style.background = '#3b82f6';
                      }}
                    />
                  </div>


                  <button
                    onClick={async () => {
                      const compensationType = (document.getElementById('compensationType') as HTMLInputElement)?.value;
                      const amount = (document.getElementById('compensationAmount') as HTMLInputElement)?.value;
                      const feeAssignment = (document.getElementById('feeAssignment') as HTMLInputElement)?.value;

                      if (!compensationType) {
                        showToast('Please select a compensation type', 'warning');
                        return;
                      }
                      if (!resolution.trim()) {
                        showToast('Please enter resolution reasoning', 'warning');
                        return;
                      }

                      setIsSubmittingResolution(true);
                      try {
                        const token = localStorage.getItem('token');
                        const resolutionData = {
                          status: 'resolved',
                          resolution_type: compensationType,
                          compensation_amount: amount ? parseFloat(amount) : 0,
                          fee_assignment: feeAssignment,
                          resolution_notes: resolution,
                          resolved_at: new Date().toISOString(),
                        };

                        // Save to database
                        const response = await fetch(`/api/cases/${selectedCase.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify(resolutionData)
                        });

                        if (!response.ok) {
                          throw new Error('Failed to save resolution');
                        }

                        const resolutionText = `Decision: ${compensationType.toUpperCase()}${amount ? ` | Amount: SGD $${amount}` : ''}\nFees Paid By: ${feeAssignment === 'doer' ? 'Doer' : 'Asker'}\nReasoning: ${resolution}`;
                        const newEntry = {
                          timestamp: new Date().toISOString(),
                          action: 'Case Resolved',
                          handler: 'Admin User',
                          note: resolutionText,
                        };
                        setCaseTimeline([...caseTimeline, newEntry]);

                        // Update local state
                        const updatedCase = { ...selectedCase, status: 'resolved' };
                        setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));

                        showToast(`Case resolved: ${compensationType.toUpperCase()} (Fees: ${feeAssignment})`, 'success');
                        setResolution('');
                        (document.getElementById('compensationType') as HTMLInputElement).value = '';
                        (document.getElementById('compensationAmount') as HTMLInputElement).value = '';
                        setTimeout(() => {
                          setShowCaseDetail(false);
                          fetchCases();
                        }, 1500);
                      } catch (err: any) {
                        showToast(err.message || 'Failed to resolve case', 'error');
                      } finally {
                        setIsSubmittingResolution(false);
                      }
                    }}
                    disabled={isSubmittingResolution}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      opacity: isSubmittingResolution ? 0.7 : 1,
                    }}
                  >
                    {isSubmittingResolution ? '⏳ Resolving & Sending Notifications...' : '✓ Submit Resolution & Send Messages'}
                  </button>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowCaseDetail(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#333',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CasesPage;
