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
  // 'hired' is terminal: the hire endpoint has created the staff record.
  status: 'submitted' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'offered' | 'rejected' | 'accepted' | 'hired';
  ai_match_score: number;
  submitted_at: string;
  interview_stage?: string;
  reviewed_by?: string;
}

const STATUS_COLORS: { [key: string]: { bg: string; color: string } } = {
  submitted: { bg: '#FFF3E4', color: '#B5651D' },
  under_review: { bg: '#FFF3E0', color: '#E65100' },
  shortlisted: { bg: '#E8F5E9', color: '#1B5E20' },
  interview_scheduled: { bg: '#FCEDE9', color: '#4A148C' },
  offered: { bg: '#FCE4EC', color: '#880E4F' },
  rejected: { bg: '#FFEBEE', color: '#B71C1C' },
  accepted: { bg: '#C8E6C9', color: '#1B5E20' },
  hired: { bg: '#2E7D32', color: '#FFFFFF' },
};

const INTERVIEW_STAGES = ['Round 1 - Phone Screening', 'Round 2 - Technical', 'Round 3 - Manager', 'Round 4 - Final', 'Offer Stage'];

const LBL = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '4px' } as const;
const FLD = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' as const };

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

  // Onboarding details are collected here, at hire — the point at which this
  // person becomes an employee and CPF/IRAS make an NRIC lawful and necessary.
  // The application deliberately never asked for any of it.
  const [showHireModal, setShowHireModal] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [hireForm, setHireForm] = useState({
    nric: '',
    residential_status: 'Citizen',
    department: '',
    position: '',
    hire_date: new Date().toISOString().split('T')[0],
    employment_type: 'Permanent',
    base_salary: '',
    cpf_membership_no: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    fitness_status: 'pending',
    fitness_assessed_on: '',
    fitness_restrictions: '',
  });

  const handleHire = async () => {
    if (!selectedApp) return;
    if (!hireForm.nric.trim()) {
      showToast('❌ NRIC/FIN is required to create the employee record', 'error');
      return;
    }
    try {
      setHiring(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/recruitment/applications/${selectedApp.id}/hire`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...hireForm,
            base_salary: hireForm.base_salary ? Number(hireForm.base_salary) : null,
            fitness_assessed_on: hireForm.fitness_assessed_on || null,
          }),
        }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Could not create the employee record');

      showToast(`✅ ${body.data.first_name} ${body.data.last_name} hired as ${body.data.staff_id}`, 'success');
      setShowHireModal(false);
      setApplications(prev =>
        prev.map(a => (a.id === selectedApp.id ? { ...a, status: 'hired' } : a))
      );
      setSelectedApp(null);
    } catch (error: any) {
      showToast(`❌ ${error.message}`, 'error');
    } finally {
      setHiring(false);
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
                    {/* Creates the staff record directly. Replaces re-typing
                        the whole person, NRIC included, into Staff Manager. */}
                    {app.status !== 'hired' && app.status !== 'rejected' && (
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setHireForm(f => ({
                            ...f,
                            position: app.position_applied || '',
                          }));
                          setShowHireModal(true);
                        }}
                        style={{
                          marginLeft: '6px',
                          padding: '6px 12px',
                          background: '#2E7D32',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        Hire
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Hire modal — onboarding details, collected at the point of hire */}
        {showHireModal && selectedApp && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '620px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#333' }}>
                Hire {selectedApp.first_name} {selectedApp.last_name}
              </h2>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 16px 0' }}>
                These details are collected now rather than on the application form —
                they only become necessary once someone is actually employed.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LBL}>NRIC / FIN * <span style={{ fontWeight: 400, color: '#999' }}>(needed for CPF and IRAS)</span></label>
                  <input value={hireForm.nric} onChange={e => setHireForm({ ...hireForm, nric: e.target.value.toUpperCase() })} style={FLD} />
                </div>
                <div>
                  <label style={LBL}>Residential status</label>
                  <select value={hireForm.residential_status} onChange={e => setHireForm({ ...hireForm, residential_status: e.target.value })} style={FLD}>
                    {['Citizen', 'PR', 'Work Permit', 'S Pass', 'Employment Pass'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Hire date *</label>
                  <input type="date" value={hireForm.hire_date} onChange={e => setHireForm({ ...hireForm, hire_date: e.target.value })} style={FLD} />
                </div>
                <div>
                  <label style={LBL}>Department</label>
                  <input value={hireForm.department} onChange={e => setHireForm({ ...hireForm, department: e.target.value })} style={FLD} />
                </div>
                <div>
                  <label style={LBL}>Position</label>
                  <input value={hireForm.position} onChange={e => setHireForm({ ...hireForm, position: e.target.value })} style={FLD} />
                </div>
                <div>
                  <label style={LBL}>Employment type</label>
                  <select value={hireForm.employment_type} onChange={e => setHireForm({ ...hireForm, employment_type: e.target.value })} style={FLD}>
                    {['Permanent', 'Contract', 'Temporary', 'Intern'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Base salary (SGD)</label>
                  <input type="number" value={hireForm.base_salary} onChange={e => setHireForm({ ...hireForm, base_salary: e.target.value })} style={FLD} />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                  <strong style={{ fontSize: '13px', color: '#333' }}>Emergency contact</strong>
                </div>
                <div>
                  <label style={LBL}>Name</label>
                  <input value={hireForm.emergency_contact_name} onChange={e => setHireForm({ ...hireForm, emergency_contact_name: e.target.value })} style={FLD} />
                </div>
                <div>
                  <label style={LBL}>Phone</label>
                  <input value={hireForm.emergency_contact_phone} onChange={e => setHireForm({ ...hireForm, emergency_contact_phone: e.target.value })} style={FLD} />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                  <strong style={{ fontSize: '13px', color: '#333' }}>Fitness to work</strong>
                  <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0 0' }}>
                    Record whether they are cleared for the role and what to adjust — not a diagnosis.
                  </p>
                </div>
                <div>
                  <label style={LBL}>Status</label>
                  <select value={hireForm.fitness_status} onChange={e => setHireForm({ ...hireForm, fitness_status: e.target.value })} style={FLD}>
                    <option value="pending">Check pending</option>
                    <option value="fit">Fit for the role</option>
                    <option value="fit_with_adjustments">Fit, with adjustments</option>
                    <option value="not_yet_cleared">Not yet cleared</option>
                  </select>
                </div>
                <div>
                  <label style={LBL}>Assessed on</label>
                  <input type="date" value={hireForm.fitness_assessed_on} onChange={e => setHireForm({ ...hireForm, fitness_assessed_on: e.target.value })} style={FLD} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LBL}>Restrictions or adjustments</label>
                  <input value={hireForm.fitness_restrictions} onChange={e => setHireForm({ ...hireForm, fitness_restrictions: e.target.value })} placeholder="e.g. no lifting over 15kg" style={FLD} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '20px' }}>
                <button onClick={() => setShowHireModal(false)} style={{ padding: '10px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button onClick={handleHire} disabled={hiring} style={{ padding: '10px', background: hiring ? '#A5D6A7' : '#2E7D32', color: 'white', border: 'none', borderRadius: '4px', cursor: hiring ? 'default' : 'pointer', fontWeight: 600 }}>
                  {hiring ? 'Creating…' : 'Create employee record'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                    { value: 'schedule_interview', label: '📅 Schedule Interview', color: '#F0A81E' },
                    { value: 'offer', label: '🎁 Send Offer', color: '#E2736B' },
                    // 'approve' used to say "can now be added in Staff Manager",
                    // i.e. re-type everything including the NRIC by hand. The
                    // Hire button below does it properly.
                    { value: 'approve', label: '⭐ Approve', color: '#FF6B35' },
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
