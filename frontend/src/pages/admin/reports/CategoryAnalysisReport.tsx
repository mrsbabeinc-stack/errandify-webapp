import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const CategoryAnalysisReport: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('cleaning');

  const categories = [
    { id: 'cleaning', name: 'Cleaning', revenue: 12500, tasks: 450 },
    { id: 'furniture', name: 'Furniture Assembly', revenue: 8200, tasks: 220 },
    { id: 'delivery', name: 'Delivery & Moving', revenue: 15800, tasks: 380 },
    { id: 'shopping', name: 'Shopping', revenue: 6400, tasks: 310 },
    { id: 'education', name: 'Education', revenue: 9600, tasks: 180 },
  ];

  const selected = categories.find(c => c.id === selectedCategory);

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            🎯 Category Analysis
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Performance metrics by category
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 16px',
                background: selectedCategory === cat.id ? '#FF6B35' : '#f5f5f5',
                color: selectedCategory === cat.id ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {selected && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Category Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>SGD {selected.revenue.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>This month</div>
            </div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Errands</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>{selected.tasks}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Completed this month</div>
            </div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Avg Errand Value</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>SGD {(selected.revenue / selected.tasks).toFixed(2)}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Per errand average</div>
            </div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Growth Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>+18%</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>MoM growth</div>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '300px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Category Performance</h3>
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            [Category performance chart]
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CategoryAnalysisReport;
