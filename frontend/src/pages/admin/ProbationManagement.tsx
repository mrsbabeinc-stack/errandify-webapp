import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { probationAPI, staffAPI } from '../../services/adminAPI';

interface ProbationRecord {
  probation_id: number;
  staff_id: string;
  staff_name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'passed' | 'failed';
  probation_length_days: number;
  days_remaining: number;
  review_score: number | null;
  reviewer_notes: string;
  created_date: string;
}

const ProbationManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [records, setRecords] = useState<ProbationRecord[]>([]);
  const [staffList, setStaffList] = useState<{ staff_id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'create'>('overview');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    staff_name: '',
    start_date: new Date().toISOString().split('T')[0],
    probation_length_days: '90',
  });

  useEffect(() => {
    loadRecords();
  }, []);

  /**
   * Records used to live in localStorage on top of two invented rows, so a
   * probation started by one admin was invisible to everyone else and was lost
   * when the browser was cleared. Both records and the staff list are now read
   * from the API.
   */
  const loadRecords = async () => {
    try {
      const [probationRes, staffRes] = await Promise.all([
        probationAPI.getAll(),
        staffAPI.getAll(),
      ]);
      setRecords(probationRes.data || []);
      setStaffList(
        (staffRes.data || []).map((s: any) => ({
          staff_id: s.staff_id,
          name: `${s.first_name} ${s.last_name}`.trim(),
        }))
      );
    } catch (error: any) {
      console.error('Failed to load probation records:', error);
      showToast(`⚠️ ${error.message || 'Could not load probation records'}`, 'error');
    }
  };

  const handleCreate = async () => {
    if (!formData.staff_id) {
      showToast('❌ Please select a staff member', 'error');
      return;
    }

    const length = Number(formData.probation_length_days);
    if (!length || length <= 0) {
      showToast('❌ Probation length must be greater than zero', 'error');
      return;
    }

    try {
      setSaving(true);
      // The server derives the end date and reads the name from the staff
      // record, so the two can't disagree the way free-typed values could.
      await probationAPI.create({
        staff_id: formData.staff_id,
        start_date: formData.start_date,
        probation_length_days: length,
      });

      showToast('✅ Probation period started', 'success');
      setViewMode('overview');
      setFormData({ staff_id: '', staff_name: '', start_date: new Date().toISOString().split('T')[0], probation_length_days: '90' });
      await loadRecords();
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not start probation'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (id: number, outcome: 'passed' | 'failed') => {
    const scoreInput = window.prompt(
      `Review score for this probation (0-100), or leave blank:`,
      ''
    );
    if (scoreInput === null) return; // cancelled

    const notes = window.prompt('Reviewer notes (optional):', '') ?? '';
    const score = scoreInput.trim() === '' ? null : Number(scoreInput);

    if (score !== null && (Number.isNaN(score) || score < 0 || score > 100)) {
      showToast('❌ Score must be a number between 0 and 100', 'error');
      return;
    }

    try {
      await probationAPI.review(id, {
        status: outcome,
        review_score: score,
        reviewer_notes: notes,
        reviewed_by: 'Admin',
      });
      showToast(`✅ Probation marked ${outcome}`, 'success');
      await loadRecords();
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not record review'}`, 'error');
    }
  };

  if (viewMode === 'create') {
    return (
      <AdminLayout>
        <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
          <ToastContainer toasts={toasts} onClose={removeToast} />
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>➕ Start Probation Period</h1>
              <button onClick={() => setViewMode('overview')} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>✕</button>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              {/* A picker over real staff, not two free-text fields: typing an
                  id and a name separately let the two disagree, and nothing
                  checked the id existed. */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Staff Member *</label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                >
                  <option value="">Select a staff member…</option>
                  {staffList.map(s => (
                    <option key={s.staff_id} value={s.staff_id}>{s.name} ({s.staff_id})</option>
                  ))}
                </select>
                {staffList.length === 0 && (
                  <div style={{ fontSize: '11px', color: '#C62828', marginTop: '6px' }}>
                    No staff records found — add staff under Staff Management first.
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Start Date</label>
                <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Probation Length (days)</label>
                <input type="number" placeholder="90" value={formData.probation_length_days} onChange={(e) => setFormData({ ...formData, probation_length_days: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => setViewMode('overview')} style={{ padding: '12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={handleCreate} disabled={saving} style={{ padding: '12px', background: saving ? '#A5D6A7' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'default' : 'pointer', fontWeight: '600' }}>{saving ? 'Starting…' : '✓ Start'}</button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const activeCount = records.filter(r => r.status === 'active').length;
  const passedCount = records.filter(r => r.status === 'passed').length;
  const failedCount = records.filter(r => r.status === 'failed').length;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>👤 Probation Management</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Track new hire probation periods (MOM compliant)</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Active', value: activeCount, color: '#FF9800' },
            { label: 'Passed', value: passedCount, color: '#4CAF50' },
            { label: 'Failed', value: failedCount, color: '#F44336' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setViewMode('create')} style={{ marginBottom: '24px', padding: '6px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>➕ Start Probation</button>

        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Staff</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Start Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>End Date</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Days Remaining</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Review</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.probation_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>{record.staff_name} ({record.staff_id})</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{new Date(record.start_date).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{new Date(record.end_date).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: record.days_remaining <= 7 ? '#F44336' : '#333' }}>{record.days_remaining}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ padding: '4px 8px', background: record.status === 'active' ? '#FFF3E0' : record.status === 'passed' ? '#E8F5E9' : '#FFEBEE', color: record.status === 'active' ? '#E65100' : record.status === 'passed' ? '#2E7D32' : '#C62828', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                      {record.status === 'active' ? '⏳ Active' : record.status === 'passed' ? '✓ Passed' : '✗ Failed'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {record.status === 'active' ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => handleReview(record.probation_id, 'passed')} style={{ padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Pass</button>
                        <button onClick={() => handleReview(record.probation_id, 'failed')} style={{ padding: '4px 8px', background: '#F44336', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Fail</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {record.review_score !== null ? `Score ${record.review_score}` : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProbationManagement;
