import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

interface DiscountCode {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'inactive';
  createdAt: string;
  description: string;
}

export const DiscountCodesPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [codes, setCodes] = useState<DiscountCode[]>([
    {
      id: 1,
      code: 'WELCOME50',
      type: 'percentage',
      value: 50,
      maxUses: 100,
      usedCount: 45,
      expiresAt: '2026-12-31',
      status: 'active',
      createdAt: '2026-06-01',
      description: 'Welcome offer for new users'
    },
    {
      id: 2,
      code: 'SUMMER20',
      type: 'percentage',
      value: 20,
      maxUses: 500,
      usedCount: 234,
      expiresAt: '2026-08-31',
      status: 'active',
      createdAt: '2026-07-01',
      description: 'Summer seasonal promotion'
    },
    {
      id: 3,
      code: 'FLAT100',
      type: 'fixed',
      value: 100,
      maxUses: 50,
      usedCount: 50,
      expiresAt: '2026-07-15',
      status: 'expired',
      createdAt: '2026-07-01',
      description: 'Fixed SGD 100 discount'
    },
  ]);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as const,
    value: 0,
    maxUses: 0,
    expiresAt: '',
    description: ''
  });

  const handleCreateCode = () => {
    if (!formData.code || !formData.value || !formData.maxUses) {
      alert('Please fill all fields');
      return;
    }

    const newCode: DiscountCode = {
      id: codes.length + 1,
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: formData.value,
      maxUses: formData.maxUses,
      usedCount: 0,
      expiresAt: formData.expiresAt,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      description: formData.description
    };

    setCodes([...codes, newCode]);
    setFormData({ code: '', type: 'percentage', value: 0, maxUses: 0, expiresAt: '', description: '' });
    setShowModal(false);
  };

  const handleDeleteCode = (id: number) => {
    setCodes(codes.filter(c => c.id !== id));
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#4CAF50' : status === 'expired' ? '#F44336' : '#FF9800';
  };

  const getStatusLabel = (status: string) => {
    return status === 'active' ? '✅ Active' : status === 'expired' ? '❌ Expired' : '⏸️ Inactive';
  };

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
              🏷️ Discount Codes
            </h1>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Create and manage promotional discount codes
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '10px 16px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ff5722')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
          >
            + Create Code
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Active Codes</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>
              {codes.filter(c => c.status === 'active').length}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Uses</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>
              {codes.reduce((sum, c) => sum + c.usedCount, 0)}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Codes</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>{codes.length}</div>
          </div>
        </div>

        {/* Codes Table */}
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ffb88c', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fff5f0', borderBottom: '1px solid #ffb88c' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>Code</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666' }}>Discount</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666' }}>Usage</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666' }}>Expires</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(code => (
                <tr key={code.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    <div>{code.code}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{code.description}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                    {code.type === 'percentage' ? `${code.value}%` : `SGD ${code.value}`}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                    {code.usedCount} / {code.maxUses}
                    <div style={{ height: '6px', background: '#f5f5f5', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          background: '#FF6B35',
                          width: `${(code.usedCount / code.maxUses) * 100}%`
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                    {new Date(code.expiresAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: getStatusColor(code.status) + '20',
                        color: getStatusColor(code.status),
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}
                    >
                      {getStatusLabel(code.status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeleteCode(code.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#ffebee',
                        color: '#C62828',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
              Create New Discount Code
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., SUMMER20"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Value
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
                    placeholder={formData.type === 'percentage' ? '50' : '100'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Max Uses
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })}
                  placeholder="100"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Expires At
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this code for?"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 16px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCode}
                style={{
                  padding: '10px 16px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Create Code
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default DiscountCodesPage;
