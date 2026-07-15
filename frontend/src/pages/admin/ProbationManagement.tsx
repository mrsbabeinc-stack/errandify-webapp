import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

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
  const [viewMode, setViewMode] = useState<'overview' | 'create'>('overview');
  const [formData, setFormData] = useState({
    staff_id: '',
    staff_name: '',
    start_date: new Date().toISOString().split('T')[0],
    probation_length_days: '90',
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const saved = localStorage.getItem('probations');
    let mockRecords: ProbationRecord[] = [
      { probation_id: 1, staff_id: 'EMP-050', staff_name: 'Sarah Johnson', start_date: '2026-04-15', end_date: '2026-07-15', status: 'active', probation_length_days: 90, days_remaining: 15, review_score: null, reviewer_notes: '', created_date: new Date().toISOString() },
      { probation_id: 2, staff_id: 'EMP-051', staff_name: 'Michael Lee', start_date: '2026-01-15', end_date: '2026-04-15', status: 'passed', probation_length_days: 90, days_remaining: 0, review_score: 85, reviewer_notes: 'Excellent performance', created_date: new Date().toISOString() },
    ];
    if (saved) mockRecords = [...mockRecords, ...JSON.parse(saved)];
    setRecords(mockRecords);
  };

  const handleCreate = async () => {
    if (!formData.staff_id || !formData.staff_name) {
      showToast('❌ Please fill required fields', 'error');
      return;
    }
    const endDate = new Date(formData.start_date);
    endDate.setDate(endDate.getDate() + Number(formData.probation_length_days));
    const newRecord: ProbationRecord = {
      probation_id: Date.now(),
      staff_id: formData.staff_id,
      staff_name: formData.staff_name,
      start_date: formData.start_date,
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      probation_length_days: Number(formData.probation_length_days),
      days_remaining: Number(formData.probation_length_days),
      review_score: null,
      reviewer_notes: '',
      created_date: new Date().toISOString(),
    };
    const saved = localStorage.getItem('probations') || '[]';
    JSON.parse(saved).push(newRecord);
    localStorage.setItem('probations', JSON.stringify(JSON.parse(saved)));
    showToast(`✅ Probation record for ${formData.staff_name} created`, 'success');
    setViewMode('overview');
    setFormData({ staff_id: '', staff_name: '', start_date: new Date().toISOString().split('T')[0], probation_length_days: '90' });
    loadRecords();
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
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Staff ID *</label>
                <input type="text" placeholder="EMP-050" value={formData.staff_id} onChange={(e) => setFormData({ ...formData, staff_id: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Staff Name *</label>
                <input type="text" placeholder="Name" value={formData.staff_name} onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
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
                <button onClick={handleCreate} style={{ padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>✓ Start</button>
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
