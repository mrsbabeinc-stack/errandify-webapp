import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const ActionPlansReport: React.FC = () => {
  const [status, setStatus] = useState('all');

  const actionPlans = [
    { id: 1, title: 'Improve Doer Onboarding', priority: 'high', status: 'in-progress', progress: 65, owner: 'Sarah Chen' },
    { id: 2, title: 'Launch Category Recommendations', priority: 'high', status: 'in-progress', progress: 45, owner: 'Mike Lee' },
    { id: 3, title: 'Reduce Churn Rate by 10%', priority: 'high', status: 'planning', progress: 20, owner: 'Jennifer Wu' },
    { id: 4, title: 'Improve Payment Processing Speed', priority: 'medium', status: 'in-progress', progress: 75, owner: 'Alex Kumar' },
    { id: 5, title: 'Enhance Safety Features', priority: 'high', status: 'in-progress', progress: 55, owner: 'David Zhang' },
    { id: 6, title: 'Mobile App Performance Optimization', priority: 'medium', status: 'completed', progress: 100, owner: 'Emma Davis' },
  ];

  const filtered = status === 'all' ? actionPlans : actionPlans.filter(ap => ap.status === status);

  const getPriorityColor = (priority: string) => {
    return priority === 'high' ? '#F44336' : priority === 'medium' ? '#FF9800' : '#4CAF50';
  };

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            🚀 Action Plans
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Strategic initiatives and projects
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['all', 'planning', 'in-progress', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: '8px 16px',
                background: status === s ? '#FF6B35' : '#f5f5f5',
                color: status === s ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {filtered.map(plan => (
            <div key={plan.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>{plan.title}</h3>
                  <div style={{ fontSize: '11px', color: '#999' }}>Owner: {plan.owner}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    background: getPriorityColor(plan.priority),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {plan.priority.toUpperCase()}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    background: plan.status === 'completed' ? '#E8F5E9' : plan.status === 'in-progress' ? '#FFF3E4' : '#FFF3E0',
                    color: plan.status === 'completed' ? '#2E7D32' : plan.status === 'in-progress' ? '#B5651D' : '#E65100',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {plan.status === 'in-progress' ? 'IN PROGRESS' : plan.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '500', color: '#666' }}>Progress</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35' }}>{plan.progress}%</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: '#FF6B35',
                    width: `${plan.progress}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ActionPlansReport;
