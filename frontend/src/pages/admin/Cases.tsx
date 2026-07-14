import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useToast, ToastContainer } from '../../components/Toast';

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

export const CasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseDetail, setShowCaseDetail] = useState(false);
  const [caseTimeline, setCaseTimeline] = useState<any[]>([]);
  const [resolution, setResolution] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<'full' | 'partial' | 'refund' | 'escalate' | null>(null);

  const generateCaseId = () => {
    const randomNum = Math.random().toString(16).substring(2, 6).toUpperCase();
    return `D26-${randomNum}`;
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

      const data = await response.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Fetch cases error:', error);
      // Mock data for demo
      const mockCases: Case[] = [
        {
          id: 1,
          case_id: 'D26-A1B2',
          case_type: 'dispute',
          severity: 'high',
          status: 'open',
          subject: 'Payment not released after task completion',
          asker_id: 5,
          doer_id: 12,
          asker_alias: 'Alex_S',
          doer_alias: 'ProHelper_John',
          asker_online: true,
          doer_online: false,
          errand_id: 123,
          tags: ['payment', 'urgent'],
          ai_confidence: 0.92,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          dispute_claim: "I waited 35 minutes at the location but the customer didn't open the door. I took GPS proof and 3 photos showing I was there on time. The job couldn't be completed because they weren't available.",
          dispute_defense: "No response from customer yet",
          ai_recommendation: "APPROVE - Strong evidence of genuine attempt",
          ai_analysis: "Doer provided GPS location data, 3 photos, and documented 35-minute wait time. This shows professional effort and genuine attempt to complete the work. Customer unavailability is not doer's fault. Confidence: 92%",
        },
        {
          id: 2,
          case_id: 'D26-C3D4',
          case_type: 'complaint',
          severity: 'medium',
          status: 'open',
          subject: 'Low quality work delivery',
          asker_id: 8,
          doer_id: 15,
          asker_alias: 'Sarah_M',
          doer_alias: 'ServicePro_Lee',
          asker_online: true,
          doer_online: true,
          errand_id: 124,
          tags: ['quality', 'service'],
          ai_confidence: 0.85,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          dispute_claim: "The cleaning was incomplete. They missed several rooms and the bathroom wasn't properly cleaned. I expected full service.",
          dispute_defense: "I cleaned all accessible areas. Some rooms were locked and I couldn't access them. I completed the main living areas.",
          ai_recommendation: "PARTIAL - Incomplete work, but communication issue",
          ai_analysis: "Asker claims incomplete work. Doer mentions locked rooms. Both have valid points. Suggests partial refund (60% to doer, 40% to asker). Confidence: 85%",
        },
        {
          id: 3,
          case_id: 'D26-E5F6',
          case_type: 'safety_concern',
          severity: 'critical',
          status: 'open',
          subject: 'Inappropriate behavior during service',
          asker_id: 3,
          doer_id: 20,
          asker_alias: 'Sam_K',
          doer_alias: 'Helper_Mike',
          asker_online: false,
          doer_online: false,
          errand_id: 125,
          tags: ['safety', 'urgent'],
          ai_confidence: 0.95,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 4,
          case_id: 'D26-G7H8',
          case_type: 'refund_request',
          severity: 'low',
          status: 'resolved',
          subject: 'Requesting partial refund',
          asker_id: 10,
          doer_id: 18,
          asker_alias: 'Chen_B',
          doer_alias: 'Quick_Tasks_Linda',
          asker_online: true,
          doer_online: true,
          errand_id: 126,
          tags: ['refund'],
          ai_confidence: 0.78,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setCases(mockCases);
    } finally {
      setLoading(false);
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

  const filteredCases = filter === 'all' ? cases : cases.filter(c => c.status === filter);

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
              Track and manage disputes with auto-generated case IDs
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

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#fff', padding: '12px', borderRadius: '8px' }}>
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
              {status === 'all' ? 'All Cases' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
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
                      Type: <strong>{caseItem.case_type}</strong> • Errand: <strong>#{caseItem.errand_id}</strong>
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

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
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
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#333', margin: 0 }}>
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
                <h4 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '12px', color: '#333', margin: '0 0 12px 0' }}>
                  Dispute Submission - Original Complaint
                </h4>
                <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
                  {selectedCase.dispute_claim ? (
                    <>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px' }}>
                        What the Dispute Filer Submitted:
                      </div>
                      <div style={{
                        fontSize: '11px',
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
                    <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                      No dispute notes submitted
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute Details & AI Analysis */}
              <div style={{ marginBottom: '16px', background: '#f9f9f9', border: '2px solid #FFD9B3', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '12px', color: '#333', margin: '0 0 12px 0' }}>
                  Dispute Response & AI Analysis
                </h4>

                {selectedCase.dispute_defense && (
                  <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      Response from Other Party:
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', paddingLeft: '12px', borderLeft: '3px solid #3b82f6', marginBottom: '8px' }}>
                      "{selectedCase.dispute_defense}"
                    </div>
                  </div>
                )}

                {selectedCase.ai_analysis && (
                  <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd', background: '#FFF5F0', padding: '12px', borderRadius: '6px', border: '2px solid #FF6B35' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#FF6B35', marginBottom: '8px' }}>
                      AI Analysis & Recommendation
                    </div>

                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '10px', background: '#fff', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                      <strong>Considered from original dispute:</strong><br/>
                      "{selectedCase.dispute_claim}"
                    </div>

                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '10px', background: '#fff', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #666' }}>
                      <strong>Considered from response:</strong><br/>
                      "{selectedCase.dispute_defense}"
                    </div>

                    <div style={{
                      fontSize: '11px',
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
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#2e7d32', marginBottom: '8px' }}>
                    🎯 AI Analysis & Recommendation
                  </div>

                  {/* Sentiment Analysis */}
                  <div style={{ fontSize: '10px', color: '#333', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #10b981' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Sentiment Analysis:</strong>
                    </div>
                    <div style={{ marginLeft: '12px', lineHeight: '1.4', color: '#666' }}>
                      • Doer: 😊 Positive (Professional, responsive, with evidence)<br/>
                      • Asker: 😐 Neutral (Reasonable claim, fair dispute)
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={{ fontSize: '11px', color: '#2e7d32', marginBottom: '8px' }}>
                    <strong>Recommendation:</strong> FAVOR DOER (87% confidence)
                  </div>

                  {/* Proposed Compensation */}
                  <div style={{ fontSize: '11px', color: '#2e7d32', marginBottom: '8px', background: '#fff', padding: '8px', borderRadius: '3px', border: '1px solid #10b981' }}>
                    <strong>Proposed Compensation:</strong><br/>
                    Full Payment to Doer: SGD $50.00<br/>
                    <span style={{ fontSize: '10px', color: '#666' }}>Net after fees: SGD $38.50</span>
                  </div>

                  {/* Reasoning */}
                  <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.5' }}>
                    <strong>Why:</strong> Strong evidence (GPS ±25m, 3 dated photos, 35min wait) shows genuine effort. Work inability due to customer unavailability, not doer fault.
                  </div>
                </div>

                {/* Confidence Meter */}
                <div style={{ fontSize: '11px', color: '#666' }}>
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
              <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px' }}>
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
                  <span style={{ fontSize: '10px', color: selectedCase.asker_online ? '#10b981' : '#999' }}>
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
                      fontSize: '11px',
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
                  <span style={{ fontSize: '10px', color: selectedCase.doer_online ? '#10b981' : '#999' }}>
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                  Case Status
                </label>
                <select
                  id="statusSelect"
                  value={selectedCase.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
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
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '12px',
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
                  fontSize: '11px',
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
                <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#333' }}>📋 Case Timeline</h4>
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
                      <div style={{ fontSize: '12px', flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '2px' }}>
                          {entry.action}
                        </div>
                        <div style={{ color: '#666', fontSize: '11px' }}>
                          {new Date(entry.timestamp).toLocaleString()} • Handler: <strong>{entry.handler}</strong>
                        </div>
                        {entry.note && (
                          <div style={{ color: '#666', fontSize: '11px', marginTop: '4px', fontStyle: 'italic' }}>
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
                <h4 style={{ fontSize: '12px', fontWeight: '700', margin: '0 0 12px 0', color: '#333' }}>
                  💬 Add Case Update
                </h4>
                <textarea
                  placeholder="Add update notes, findings, or comments..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    marginBottom: '10px',
                    minHeight: '60px',
                  }}
                  id="caseUpdateNote"
                />
                <input
                  type="file"
                  accept="image/*"
                  style={{ fontSize: '11px', marginBottom: '10px' }}
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
                    fontSize: '12px',
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
                  <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 12px 0', color: '#333' }}>
                    ✓ Case Resolution
                  </h4>

                  {/* AI Guidance Box */}
                  <div style={{
                    background: '#FFF9F0',
                    border: '1px solid #FFD9B3',
                    borderRadius: '6px',
                    padding: '10px',
                    marginBottom: '16px',
                    fontSize: '11px',
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

                  {/* Unified Decision & Fee Assignment Cards */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: '#333' }}>
                      Decision & Fee Assignment (Select One)
                    </label>

                    {/* Decision + Fee Cards - Each Shows Both */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                      {[
                        {
                          key: 'full',
                          label: 'Full Payment',
                          color: '#10b981',
                          feeDisplay: (amount: number) => `Gross: $${amount.toFixed(2)} | Platform: -$${(amount*0.20).toFixed(2)} | Stripe: -$${(amount*0.03).toFixed(2)} = $${(amount*0.77).toFixed(2)}`
                        },
                        {
                          key: 'partial',
                          label: 'Split 60/40',
                          color: '#f59e0b',
                          feeDisplay: (amount: number) => `Doer 60%: $${(amount*0.60).toFixed(2)} - fees = $${((amount*0.60)*0.77).toFixed(2)} | Asker 40%: $${(amount*0.40).toFixed(2)} refund`
                        },
                        {
                          key: 'refund',
                          label: 'Full Refund',
                          color: '#3b82f6',
                          feeDisplay: (amount: number) => `Asker refund: $${amount.toFixed(2)} | Doer: $0 | No Stripe fee (escrow release)`
                        },
                        {
                          key: 'escalate',
                          label: 'Escalate L3',
                          color: '#6366f1',
                          feeDisplay: () => `No decision yet. Senior admin review required.`
                        },
                      ].map(option => (
                        <button
                          key={option.key}
                          onClick={() => {
                            setSelectedResolution(option.key as any);
                            (document.getElementById('compensationType') as HTMLInputElement).value = option.key;
                            showToast(`${option.label} selected`, 'success');
                          }}
                          style={{
                            padding: '12px',
                            background: selectedResolution === option.key ? option.color : '#fff',
                            color: selectedResolution === option.key ? 'white' : '#333',
                            border: `2px solid ${selectedResolution === option.key ? option.color : '#ddd'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                            {option.label}
                          </div>
                          <div style={{ fontSize: '10px', opacity: 0.9 }}>
                            {option.feeDisplay(50)}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Hidden input */}
                    <input type="hidden" id="compensationType" defaultValue="" />

                    {/* Real-time Fee Breakdown Display */}
                    <div id="feeBreakdown" style={{
                      minHeight: '60px',
                      padding: '10px',
                      background: '#f9f9f9',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#666',
                      border: '1px solid #eee',
                      textAlign: 'center',
                    }}>
                      Select a decision to see fee breakdown
                    </div>

                    {/* Custom Amount Input (for split adjustments) */}
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                        Adjust Amount (for split decisions)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 50.00"
                        id="compensationAmount"
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          const type = (document.getElementById('compensationType') as HTMLInputElement).value;

                          if (type === 'full') {
                            const platformFee = amount * 0.20;
                            const stripeFee = amount * 0.03;
                            const netAmount = amount - platformFee - stripeFee;
                            document.getElementById('feeBreakdown')!.innerHTML = `
                              <div style="font-size: 11px; color: #2e7d32; padding: 10px; background: #E8F5E9; border: 1px solid #10b981; border-radius: 4px;">
                                <strong>Full Payment to Doer</strong><br/>
                                Gross: SGD $${amount.toFixed(2)}<br/>
                                Platform Fee (20%): -SGD $${platformFee.toFixed(2)}<br/>
                                Stripe Fee (3%): -SGD $${stripeFee.toFixed(2)}<br/>
                                <strong style="border-top: 1px solid #10b981; padding-top: 6px; margin-top: 6px; display: block;">
                                  Net to Doer: SGD $${netAmount.toFixed(2)}
                                </strong>
                              </div>
                            `;
                          } else if (type === 'partial') {
                            const doerPercent = 60;
                            const doerAmount = (amount * doerPercent) / 100;
                            const askerAmount = amount - doerAmount;
                            const platformFee = doerAmount * 0.20;
                            const stripeFee = doerAmount * 0.03;
                            const netDoer = doerAmount - platformFee - stripeFee;
                            document.getElementById('feeBreakdown')!.innerHTML = `
                              <div style="font-size: 11px; color: #333; padding: 10px; background: #FFF3E0; border: 1px solid #FFB74D; border-radius: 4px;">
                                <strong>Split (60/40)</strong><br/>
                                Doer: SGD $${doerAmount.toFixed(2)} - Platform/Stripe fees = SGD $${netDoer.toFixed(2)}<br/>
                                Asker Refund: SGD $${askerAmount.toFixed(2)}
                              </div>
                            `;
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '2px solid #FFD9B3',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Resolution Notes */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
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
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        minHeight: '80px',
                      }}
                    />
                  </div>

                  {/* AI-Generated Messages Preview & Edit */}
                  <div style={{ marginBottom: '12px', background: '#fff', border: '2px solid #10b981', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#333', marginBottom: '10px' }}>
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
                          fontSize: '11px',
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
                          fontSize: '11px',
                        }}
                      >
                        To Asker
                      </button>
                    </div>

                    {/* Message to Doer */}
                    <div id="doerMessagePanel" style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: '#2e7d32', marginBottom: '6px' }}>
                        Message to Doer (Service Provider)
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>Subject Line:</label>
                        <input
                          id="doerSubject"
                          type="text"
                          defaultValue={`Case ${selectedCase.case_id} Resolution - Full Payment Approved`}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '2px solid #FFD9B3',
                            borderRadius: '4px',
                            fontSize: '11px',
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
                          fontSize: '11px',
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
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        Send to Doer
                      </button>
                    </div>

                    {/* Message to Asker */}
                    <div id="askerMessagePanel" style={{ display: 'none' }}>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: '#3b82f6', marginBottom: '6px' }}>
                        Message to Asker (Customer)
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>Subject Line:</label>
                        <input
                          id="askerSubject"
                          type="text"
                          defaultValue={`Case ${selectedCase.case_id} Resolution - Payment Released to Provider`}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '2px solid #FFD9B3',
                            borderRadius: '4px',
                            fontSize: '11px',
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
                          fontSize: '11px',
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
                          fontSize: '11px',
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

                  {/* Fee Assignment - Separate for each fee type */}
                  <div style={{ marginBottom: '12px', background: '#f9f9f9', padding: '12px', borderRadius: '6px', border: '2px solid #FFD9B3' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
                      Fee Assignment - Who Pays Each Fee?
                    </label>

                    {/* Platform Fee Assignment */}
                    <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                        Platform Fee (5% = SGD 2.50)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          id="platformFeeDoerBtn"
                          onClick={() => {
                            (document.getElementById('platformFeeAssignment') as HTMLInputElement).value = 'doer';
                            document.getElementById('platformFeeDoerBtn')!.style.background = '#10b981';
                            document.getElementById('platformFeeDoerBtn')!.style.color = 'white';
                            document.getElementById('platformFeeAskerBtn')!.style.background = '#e5e7eb';
                            document.getElementById('platformFeeAskerBtn')!.style.color = '#333';
                            showToast('Doer pays platform fee', 'info');
                          }}
                          style={{
                            padding: '8px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '11px',
                          }}
                        >
                          Doer Pays
                        </button>
                        <button
                          id="platformFeeAskerBtn"
                          onClick={() => {
                            (document.getElementById('platformFeeAssignment') as HTMLInputElement).value = 'asker';
                            document.getElementById('platformFeeDoerBtn')!.style.background = '#e5e7eb';
                            document.getElementById('platformFeeDoerBtn')!.style.color = '#333';
                            document.getElementById('platformFeeAskerBtn')!.style.background = '#ef4444';
                            document.getElementById('platformFeeAskerBtn')!.style.color = 'white';
                            showToast('Asker pays platform fee', 'info');
                          }}
                          style={{
                            padding: '8px',
                            background: '#e5e7eb',
                            color: '#333',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '11px',
                          }}
                        >
                          Asker Pays
                        </button>
                      </div>
                      <input type="hidden" id="platformFeeAssignment" defaultValue="doer" />
                    </div>

                    {/* Stripe Fee Assignment */}
                    <div style={{ marginBottom: '0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                        Stripe Processing Fee (3% = SGD 1.50)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          id="stripeFeeDoerBtn"
                          onClick={() => {
                            (document.getElementById('stripeFeeAssignment') as HTMLInputElement).value = 'doer';
                            document.getElementById('stripeFeeDoerBtn')!.style.background = '#10b981';
                            document.getElementById('stripeFeeDoerBtn')!.style.color = 'white';
                            document.getElementById('stripeFeeAskerBtn')!.style.background = '#e5e7eb';
                            document.getElementById('stripeFeeAskerBtn')!.style.color = '#333';
                            showToast('Doer pays Stripe fee', 'info');
                          }}
                          style={{
                            padding: '8px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '11px',
                          }}
                        >
                          Doer Pays
                        </button>
                        <button
                          id="stripeFeeAskerBtn"
                          onClick={() => {
                            (document.getElementById('stripeFeeAssignment') as HTMLInputElement).value = 'asker';
                            document.getElementById('stripeFeeDoerBtn')!.style.background = '#e5e7eb';
                            document.getElementById('stripeFeeDoerBtn')!.style.color = '#333';
                            document.getElementById('stripeFeeAskerBtn')!.style.background = '#ef4444';
                            document.getElementById('stripeFeeAskerBtn')!.style.color = 'white';
                            showToast('Asker pays Stripe fee', 'info');
                          }}
                          style={{
                            padding: '8px',
                            background: '#e5e7eb',
                            color: '#333',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '11px',
                          }}
                        >
                          Asker Pays
                        </button>
                      </div>
                      <input type="hidden" id="stripeFeeAssignment" defaultValue="doer" />
                    </div>

                    <div style={{ fontSize: '10px', color: '#666', marginTop: '12px', background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <strong>Options:</strong><br/>
                      • Both Doer: Standard case (doer earned it, pays fees)<br/>
                      • Both Asker: Refund case (asker error, loses fees)<br/>
                      • Mixed: Platform on Doer, Stripe on Asker (special cases)
                    </div>
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
                        const resolutionText = `Decision: ${compensationType.toUpperCase()}${amount ? ` | Amount: SGD $${amount}` : ''}\nFees Paid By: ${feeAssignment === 'doer' ? 'Doer' : 'Asker'}\nReasoning: ${resolution}`;
                        const newEntry = {
                          timestamp: new Date().toISOString(),
                          action: 'Case Resolved',
                          handler: 'Admin User',
                          note: resolutionText,
                        };
                        setCaseTimeline([...caseTimeline, newEntry]);
                        showToast(`Case resolved: ${compensationType.toUpperCase()} (Fees: ${feeAssignment})`, 'success');
                        setResolution('');
                        (document.getElementById('compensationType') as HTMLInputElement).value = '';
                        (document.getElementById('compensationAmount') as HTMLInputElement).value = '';
                        setTimeout(() => {
                          setShowCaseDetail(false);
                          fetchCases();
                        }, 1500);
                      } catch (err) {
                        showToast('Failed to resolve case', 'error');
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
                      fontSize: '12px',
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
                  fontSize: '12px',
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
