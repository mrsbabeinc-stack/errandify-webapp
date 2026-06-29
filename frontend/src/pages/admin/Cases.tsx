import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

interface Case {
  id: number;
  case_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  subject: string;
  complainant_user_id: number;
  respondent_user_id: number;
  errand_id?: number;
  tags: string[];
  ai_confidence: number;
  created_at: string;
}

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    case_type: 'dispute',
    severity: 'medium',
    complainant_user_id: '',
    respondent_user_id: '',
    errand_id: '',
    subject: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: 'all', severity: 'all' });

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          complainant_user_id: parseInt(formData.complainant_user_id),
          respondent_user_id: parseInt(formData.respondent_user_id),
          errand_id: formData.errand_id ? parseInt(formData.errand_id) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Case created successfully!');
        setFormData({
          case_type: 'dispute',
          severity: 'medium',
          complainant_user_id: '',
          respondent_user_id: '',
          errand_id: '',
          subject: '',
          description: ''
        });
        setShowCreateForm(false);
        // Reload cases
        fetchCases();
      } else {
        alert(data.error || 'Failed to create case');
      }
    } catch (error) {
      console.error('Create case error:', error);
      alert('Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        status: filter.status,
        severity: filter.severity
      });

      const response = await fetch(`/api/cases?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Fetch cases error:', error);
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <AdminLayout>
      <div className="cases-page">
        <header className="page-header">
          <div>
            <h1>Case Management</h1>
            <p>Create, manage, and resolve disputes (L1 Auto-Resolution)</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '✕ Cancel' : '+ New Case'}
          </button>
        </header>

        {/* Create Case Form */}
        {showCreateForm && (
          <div className="create-form-container">
            <form onSubmit={handleCreateCase} className="create-form">
              <h2>Create New Case</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Case Type</label>
                  <select
                    value={formData.case_type}
                    onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                  >
                    <option value="dispute">Dispute</option>
                    <option value="complaint">Complaint</option>
                    <option value="refund_request">Refund Request</option>
                    <option value="safety_concern">Safety Concern</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Complainant User ID</label>
                  <input
                    type="number"
                    value={formData.complainant_user_id}
                    onChange={(e) => setFormData({ ...formData, complainant_user_id: e.target.value })}
                    placeholder="e.g., 123"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Respondent User ID</label>
                  <input
                    type="number"
                    value={formData.respondent_user_id}
                    onChange={(e) => setFormData({ ...formData, respondent_user_id: e.target.value })}
                    placeholder="e.g., 456"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Errand ID (Optional)</label>
                  <input
                    type="number"
                    value={formData.errand_id}
                    onChange={(e) => setFormData({ ...formData, errand_id: e.target.value })}
                    placeholder="e.g., 789"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief case subject"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description (AI will auto-tag and generate recommendation)"
                  rows={5}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? '⏳ Creating...' : '✓ Create Case'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Severity:</label>
            <select
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button className="btn-secondary" onClick={fetchCases}>
            🔄 Refresh
          </button>
        </div>

        {/* Cases List */}
        <div className="cases-list">
          {loading ? (
            <div className="loading">⏳ Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <p>No cases found. Create your first case above! 👆</p>
            </div>
          ) : (
            cases.map((caseItem) => (
              <div key={caseItem.id} className="case-card">
                <div className="case-header">
                  <div className="case-title">
                    <span className="severity" style={{ borderLeftColor: getSeverityColor(caseItem.severity) }}>
                      {getSeverityIcon(caseItem.severity)} {caseItem.severity.toUpperCase()}
                    </span>
                    <h3>Case #{caseItem.id}: {caseItem.subject}</h3>
                  </div>
                  <span className={`status status-${caseItem.status}`}>{caseItem.status}</span>
                </div>

                <div className="case-body">
                  <div className="case-info">
                    <span>Type: <strong>{caseItem.case_type}</strong></span>
                    <span>Complainant: <strong>User #{caseItem.complainant_user_id}</strong></span>
                    <span>Respondent: <strong>User #{caseItem.respondent_user_id}</strong></span>
                    {caseItem.errand_id && <span>Errand: <strong>#{caseItem.errand_id}</strong></span>}
                  </div>

                  <div className="case-tags">
                    {caseItem.tags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>

                  <div className="case-confidence">
                    AI Confidence: <strong>{(caseItem.ai_confidence * 100).toFixed(0)}%</strong>
                  </div>

                  <div className="case-date">
                    Created: {new Date(caseItem.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="case-actions">
                  <button className="btn-small btn-view">👁️ View Details</button>
                  <button className="btn-small btn-resolve">✓ Resolve</button>
                  <button className="btn-small btn-escalate">⬆️ Escalate</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .cases-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #e2e8f0;
        }

        .page-header p {
          font-size: 14px;
          color: #a0aec0;
          margin: 0;
        }

        .btn-primary, .btn-secondary, .btn-small {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #4a5568;
          color: white;
        }

        .btn-secondary:hover {
          background: #5a6578;
        }

        .create-form-container {
          background: linear-gradient(135deg, #1a1f2e, #252d3d);
          border: 1px solid #2d3748;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .create-form h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: #e2e8f0;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          background: #0f1419;
          border: 1px solid #2d3748;
          color: #e2e8f0;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .filters {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .filter-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .filter-group label {
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e0;
        }

        .filter-group select {
          background: #1a1f2e;
          border: 1px solid #2d3748;
          color: #e2e8f0;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .cases-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .loading, .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #a0aec0;
          font-size: 14px;
        }

        .case-card {
          background: linear-gradient(135deg, #1a1f2e, #252d3d);
          border: 1px solid #2d3748;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .case-card:hover {
          border-color: #4a5568;
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }

        .case-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #2d3748;
        }

        .case-title {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          flex: 1;
        }

        .severity {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-left: 3px solid;
        }

        .case-title h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-open {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
        }

        .status-closed {
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
        }

        .case-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .case-info {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: #a0aec0;
        }

        .case-info strong {
          color: #cbd5e0;
        }

        .case-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag {
          display: inline-block;
          padding: 4px 8px;
          background: rgba(37, 99, 235, 0.1);
          color: #60a5fa;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .case-confidence {
          font-size: 13px;
          color: #a0aec0;
        }

        .case-date {
          font-size: 12px;
          color: #718096;
        }

        .case-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #2d3748;
        }

        .btn-small {
          flex: 1;
          padding: 8px 12px;
          font-size: 12px;
          background: #2d3748;
          color: #cbd5e0;
        }

        .btn-small:hover {
          background: #4a5568;
          color: #e2e8f0;
        }

        .btn-view { }
        .btn-resolve { background: #10b981; color: white; }
        .btn-escalate { background: #f97316; color: white; }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .case-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .case-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default CasesPage;
