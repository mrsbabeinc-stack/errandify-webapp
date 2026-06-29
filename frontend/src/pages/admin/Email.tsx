import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const EmailPage: React.FC = () => {
  const [campaigns] = useState([
    { id: 1, name: 'Weekly Newsletter', recipients: 2847, status: 'scheduled', date: 'Every Sunday' },
    { id: 2, name: 'Welcome Series', recipients: 145, status: 'active', date: 'On signup' },
    { id: 3, name: 'Re-engagement', recipients: 523, status: 'scheduled', date: '2026-07-15' },
  ]);

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>📧 Email Campaigns</h1>
          <button className="btn-primary">+ New Campaign</button>
        </div>

        <div className="campaigns-list">
          {campaigns.map((c) => (
            <div key={c.id} className="campaign-card">
              <div className="campaign-info">
                <h3>{c.name}</h3>
                <p>{c.recipients} recipients • {c.date}</p>
              </div>
              <div className="campaign-status">
                <span className={`badge badge-${c.status}`}>{c.status}</span>
                <button className="btn-small">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .admin-page { display: flex; flex-direction: column; gap: 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; }
        .page-header h1 { font-size: 24px; font-weight: 700; margin: 0; color: #ff6b35; }
        .btn-primary { padding: 10px 16px; background: #ff6b35; color: white; border: none; border-radius: 6px; cursor: pointer; }
        .btn-primary:hover { background: #ff5722; }
        .campaigns-list { display: flex; flex-direction: column; gap: 8px; }
        .campaign-card { background: white; border: 1px solid #ffb88c; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; align-items: center; }
        .campaign-card h3 { margin: 0 0 4px 0; font-size: 14px; color: #333; }
        .campaign-card p { margin: 0; font-size: 12px; color: #888; }
        .campaign-status { display: flex; gap: 8px; align-items: center; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-active { background: #e6f9f0; color: #27b55d; }
        .badge-scheduled { background: #fff9f5; color: #ff6b35; }
        .btn-small { padding: 6px 10px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; }
      `}</style>
    </AdminLayout>
  );
};

export default EmailPage;
