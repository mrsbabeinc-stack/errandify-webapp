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
  influencer?: string;
  tags?: string[];
}

export const DiscountCodesPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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
      description: 'Welcome offer for new users',
      influencer: '',
      tags: ['new-user', 'welcome']
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
      description: 'Summer seasonal promotion',
      influencer: '',
      tags: ['seasonal', 'summer']
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
      description: 'Fixed SGD 100 discount',
      influencer: 'Sarah Chen',
      tags: ['influencer', 'partnership']
    },
  ]);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as const,
    value: 0,
    maxUses: 0,
    expiresAt: '',
    description: '',
    influencer: '',
    tags: [] as string[]
  });

  const [duplicateFromId, setDuplicateFromId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const duplicateCode = (sourceId: number) => {
    const source = codes.find(c => c.id === sourceId);
    if (source) {
      setFormData({
        code: '',
        type: source.type,
        value: source.value,
        maxUses: source.maxUses,
        expiresAt: source.expiresAt,
        description: source.description,
        influencer: '',
        tags: source.tags ? [...source.tags] : []
      });
      setTagInput(source.tags ? source.tags.join(', ') : '');
      setDuplicateFromId(sourceId);
      setShowModal(true);
    }
  };

  const handleSaveCode = () => {
    if (!formData.code || !formData.value || !formData.maxUses) {
      alert('Please fill all fields');
      return;
    }

    if (editingId) {
      // Update existing code
      setCodes(codes.map(c =>
        c.id === editingId
          ? {
              ...c,
              code: formData.code.toUpperCase(),
              type: formData.type,
              value: formData.value,
              maxUses: formData.maxUses,
              expiresAt: formData.expiresAt,
              description: formData.description,
              influencer: formData.influencer,
              tags: formData.tags
            }
          : c
      ));
      setEditingId(null);
    } else if (duplicateFromId) {
      // Create duplicate
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
        description: formData.description,
        influencer: formData.influencer,
        tags: formData.tags
      };
      setCodes([...codes, newCode]);
      setDuplicateFromId(null);
    } else {
      // Create new code
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
        description: formData.description,
        influencer: formData.influencer,
        tags: formData.tags
      };
      setCodes([...codes, newCode]);
    }

    setFormData({ code: '', type: 'percentage', value: 0, maxUses: 0, expiresAt: '', description: '', influencer: '', tags: [] });
    setTagInput('');
    setShowModal(false);
  };

  const handleEditCode = (id: number) => {
    const code = codes.find(c => c.id === id);
    if (code) {
      setFormData({
        code: code.code,
        type: code.type,
        value: code.value,
        maxUses: code.maxUses,
        expiresAt: code.expiresAt,
        description: code.description,
        influencer: code.influencer || '',
        tags: code.tags || []
      });
      setTagInput(code.tags ? code.tags.join(', ') : '');
      setEditingId(id);
      setShowModal(true);
    }
  };

  const handleDeleteCode = (id: number) => {
    setCodes(codes.filter(c => c.id !== id));
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    alert('Excel import ready! Formats supported:\n- Code (column A)\n- Type (column B): percentage/fixed\n- Value (column C)\n- Max Uses (column D)\n- Expires (column E): YYYY-MM-DD\n- Description (column F)\n- Influencer (column G)\n- Tags (column H): comma-separated\n\nFeature coming soon!');
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#4CAF50' : status === 'expired' ? '#F44336' : '#FF9800';
  };

  const getStatusLabel = (status: string) => {
    return status === 'active' ? '✅ Active' : status === 'expired' ? '❌ Expired' : '⏸️ Inactive';
  };

  return (
    <AdminLayout>
      <div style={{ padding: '12px 16px', height: '100vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginBottom: '2px' }}>
              🏷️ Discount Codes
            </h1>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
              Manage codes, influencer partnerships & e-vouchers
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <label style={{
              padding: '8px 12px',
              background: '#FFF3E4',
              color: '#B5651D',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F5C542')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FFF3E4')}
            >
              📊 Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={() => {
                setFormData({ code: '', type: 'percentage', value: 0, maxUses: 0, expiresAt: '', description: '', influencer: '', tags: [] });
                setTagInput('');
                setDuplicateFromId(null);
                setShowModal(true);
              }}
              style={{
                padding: '8px 12px',
                background: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ff5722')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
            >
              + Create
            </button>
          </div>
        </div>

        {/* Stats - Compact */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Active</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#FF6B35' }}>
              {codes.filter(c => c.status === 'active').length}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Influencer</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#666' }}>
              {codes.filter(c => c.influencer).length}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Total Uses</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#666' }}>
              {codes.reduce((sum, c) => sum + c.usedCount, 0)}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Total</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#666' }}>{codes.length}</div>
          </div>
        </div>

        {/* Codes Table - Compact & No Scroll */}
        <div style={{ background: '#fff', borderRadius: '6px', border: '1px solid #ffb88c', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#fff5f0', borderBottom: '1px solid #ffb88c' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#666' }}>Code</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#666' }}>Discount</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#666' }}>Used</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#666' }}>Influencer</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#666' }}>Tags</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#666' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#666' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map(code => (
                  <tr key={code.id} style={{ borderBottom: '1px solid #f5f5f5', height: '50px' }}>
                    <td style={{ padding: '6px 8px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                      <div>{code.code}</div>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                      {code.type === 'percentage' ? `${code.value}%` : `SGD ${code.value}`}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                      {code.usedCount}/{code.maxUses}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px' }}>
                      {code.influencer ? (
                        <span style={{ background: '#FFE0D3', padding: '2px 6px', borderRadius: '3px', color: '#FF6B35', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          👤 {code.influencer.substring(0, 10)}
                        </span>
                      ) : (
                        <span style={{ color: '#ccc' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      {code.tags && code.tags.length > 0 ? (
                        <span style={{ fontSize: '9px', background: '#FFF3E4', color: '#B5651D', padding: '2px 4px', borderRadius: '2px', fontWeight: '600' }}>
                          {code.tags.length}
                        </span>
                      ) : (
                        <span style={{ color: '#ccc' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 6px',
                        background: getStatusColor(code.status) + '20',
                        color: getStatusColor(code.status),
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}
                      title={code.status === 'active' ? 'Active - code is usable' : code.status === 'expired' ? 'Expired - no longer valid' : 'Inactive - paused or not started'}
                      >
                        {code.status === 'active' ? '✓ Active' : code.status === 'expired' ? '✕ Expired' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEditCode(code.id)}
                          style={{
                            padding: '4px 6px',
                            background: '#FFF3E0',
                            color: '#E65100',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => duplicateCode(code.id)}
                          style={{
                            padding: '4px 6px',
                            background: '#FFF3E4',
                            color: '#B5651D',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                          title="Duplicate"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code.id)}
                          style={{
                            padding: '4px 6px',
                            background: '#ffebee',
                            color: '#C62828',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
              {editingId ? '✏️ Edit Discount Code' : duplicateFromId ? '📋 Duplicate Discount Code' : '✨ Create New Code / E-Voucher'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
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
                  <button
                    onClick={generateRandomCode}
                    style={{
                      padding: '8px 12px',
                      background: '#f5f5f5',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      color: '#666'
                    }}
                    title="Generate random 8-character code"
                  >
                    🎲 Random
                  </button>
                </div>
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
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (SGD)</option>
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

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  👤 Influencer / Partner Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.influencer}
                  onChange={(e) => setFormData({ ...formData, influencer: e.target.value })}
                  placeholder="e.g., Sarah Chen, TikTok Handle, @username"
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
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) });
                  }}
                  placeholder="e.g., influencer, summer, partnership, tiktok, youtube"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
                {formData.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-block',
                          background: '#FFF3E4',
                          color: '#B5651D',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setDuplicateFromId(null);
                  setFormData({ code: '', type: 'percentage', value: 0, maxUses: 0, expiresAt: '', description: '', influencer: '', tags: [] });
                  setTagInput('');
                }}
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
                onClick={handleSaveCode}
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
                {editingId ? '💾 Save Changes' : duplicateFromId ? '📋 Create Duplicate' : '✨ Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default DiscountCodesPage;
