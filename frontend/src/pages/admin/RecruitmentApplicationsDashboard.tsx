import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Application {
  id: number;
  application_id: string;
  job_id: string;
  first_name: string;
  last_name: string;
  email: string;
  position_applied: string;
  years_of_experience: number;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'offered' | 'rejected' | 'accepted';
  ai_match_score: number;
  submitted_at: string;
  interview_stage?: string;
  reviewed_by?: string;
}

const STATUS_COLORS: { [key: string]: { bg: string; color: string } } = {
  submitted: { bg: '#E3F2FD', color: '#0D47A1' },
  under_review: { bg: '#FFF3E0', color: '#E65100' },
  shortlisted: { bg: '#E8F5E9', color: '#1B5E20' },
  interview_scheduled: { bg: '#F3E5F5', color: '#4A148C' },
  offered: { bg: '#FCE4EC', color: '#880E4F' },
  rejected: { bg: '#FFEBEE', color: '#B71C1C' },
  accepted: { bg: '#C8E6C9', color: '#1B5E20' },
};

const INTERVIEW_STAGES = ['Round 1 - Phone Screening', 'Round 2 - Technical', 'Round 3 - Manager', 'Round 4 - Final', 'Offer Stage'];

const RecruitmentApplicationsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'shortlist' | 'reject' | 'schedule_interview' | 'offer' | 'approve'>('shortlist');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/recruitment/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('request failed');
      const result = await response.json();
      // Real applicants only. This list previously showed two invented
      // candidates, which is a poor thing to act on in a hiring queue.
      setApplications(result.applications || []);
    } catch (error) {
      setApplications([]);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;

    try {
      setLoading(true);

      const statusMap: Record<string, string> = {
        shortlist: 'shortlisted',
        reject: 'rejected',
        schedule_interview: 'interview_scheduled',
        offer: 'offered',
        approve: 'accepted',
      };

      // Persist the decision before showing it. This previously only changed
      // local state, so a reviewer's shortlist or rejection vanished on reload
      // and the next reviewer saw an untouched application.
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/recruitment/applications/${selectedApp.id}/${approvalAction}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: notes || undefined }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        showToast(`❌ ${result.error || 'Failed to update application'}`, 'error');
        return;
      }

      const newStatus = statusMap[approvalAction] || selectedApp.status;
      showToast(
        approvalAction === 'approve'
          ? `✅ Application approved — ${selectedApp.first_name} can now be added in Staff Manager`
          : `✅ Application status updated to ${newStatus}`,
        'success'
      );

      setApplications(applications.map(app =>
        app.id === selectedApp.id
          ? { ...app, status: result.data.status, reviewed_by: 'Current User' }
          : app
      ));

      setShowApprovalModal(false);
      setNotes('');
    } catch (error) {
      showToast('Failed to update application', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch = app.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              📋 Job Applications
            </h1>
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
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
            Review and manage job applications. Only approved applications are moved to Staff Manager.
          </p>
        </div>

        {/* Filters & Search */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Status Filter</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="offered">Offered</option>
              <option value="accepted">Accepted (Ready for Staff)</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Stats</label>
            <div style={{ padding: '8px', background: '#f0f0f0', borderRadius: '4px', fontSize: '11px', color: '#333', fontWeight: '600' }}>
              Total: {filteredApplications.length} | Submitted: {applications.filter(a => a.status === 'submitted').length}
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>Applicant</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>Position</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>Experience</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>AI Match</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#333' }}>Submitted</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#333' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map(app => (
                <tr key={app.id} style={{ borderBottom: '1px solid #eee', hover: { background: '#f9f9f9' } }}>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>
                    <div style={{ fontWeight: '600' }}>{app.first_name} {app.last_name}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{app.email}</div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>{app.position_applied}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>{app.years_of_experience} yrs</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: app.ai_match_score > 0.8 ? '#C8E6C9' : app.ai_match_score > 0.6 ? '#FFF9C4' : '#FFCCBC',
                      color: app.ai_match_score > 0.8 ? '#1B5E20' : app.ai_match_score > 0.6 ? '#F57F17' : '#D84315',
                      borderRadius: '3px',
                      fontWeight: '600',
                    }}>
                      {(app.ai_match_score * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: STATUS_COLORS[app.status]?.bg || '#f0f0f0',
                      color: STATUS_COLORS[app.status]?.color || '#666',
                      borderRadius: '3px',
                      fontWeight: '600',
                      fontSize: '11px',
                    }}>
                      {app.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {new Date(app.submitted_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setShowApprovalModal(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#FF6B35',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Approval Modal */}
        {showApprovalModal && selectedApp && (
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
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#333' }}>
                Application Review
              </h3>

              <div style={{ marginBottom: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px 0' }}>
                  <strong>{selectedApp.first_name} {selectedApp.last_name}</strong>
                </p>
                <p style={{ fontSize: '11px', color: '#999', margin: '0' }}>
                  Applying for: {selectedApp.position_applied} | Experience: {selectedApp.years_of_experience} years
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>Action</label>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {[
                    { value: 'shortlist', label: '✅ Shortlist for Interview', color: '#4CAF50' },
                    { value: 'schedule_interview', label: '📅 Schedule Interview', color: '#2196F3' },
                    { value: 'offer', label: '🎁 Send Offer', color: '#9C27B0' },
                    { value: 'approve', label: '⭐ APPROVE & MOVE TO STAFF', color: '#FF6B35' },
                    { value: 'reject', label: '❌ Reject', color: '#f44336' },
                  ].map(action => (
                    <button
                      key={action.value}
                      onClick={() => setApprovalAction(action.value as any)}
                      style={{
                        padding: '10px',
                        background: approvalAction === action.value ? action.color : '#f0f0f0',
                        color: approvalAction === action.value ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Notes (Optional)</label>
                <textarea
                  placeholder="Add any notes about this application..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? '⏳ Processing...' : 'Confirm Action'}
                </button>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
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

              {approvalAction === 'approve' && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: '#E8F5E9',
                  border: '1px solid #4CAF50',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#1B5E20',
                }}>
                  ⭐ This will move {selectedApp.first_name} to the Staff Manager as a new approved hire. Their information will be pre-filled.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RecruitmentApplicationsDashboard;
