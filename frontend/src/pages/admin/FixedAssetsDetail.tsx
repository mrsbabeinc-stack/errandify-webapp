import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface FixedAsset {
  asset_id: number;
  asset_number: string;
  description: string;
  category: string;
  cost: number;
  purchase_date: string;
  useful_life_years: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  book_value: number;
  status: 'active' | 'disposed' | 'maintenance';
  location: string;
}

interface DepreciationEntry {
  entry_id: number;
  asset_id: number;
  month: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
}

const FixedAssetsDetail: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [schedule, setSchedule] = useState<DepreciationEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'register' | 'schedule'>('register');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    asset_number: '',
    description: '',
    category: 'Buildings',
    cost: 0,
    purchase_date: '',
    useful_life_years: 5,
    depreciation_method: 'Straight-line',
    location: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const saved = localStorage.getItem('fixed_assets') || '[]';
    const savedSchedule = localStorage.getItem('depreciation_schedule') || '[]';

    let mockAssets: FixedAsset[] = [
      { asset_id: 1, asset_number: 'FA-2026-001', description: 'Office Building', category: 'Buildings', cost: 500000, purchase_date: '2024-01-01', useful_life_years: 50, depreciation_method: 'Straight-line', accumulated_depreciation: 20000, book_value: 480000, status: 'active', location: 'Singapore' },
      { asset_id: 2, asset_number: 'FA-2026-002', description: 'Company Vehicles', category: 'Vehicles', cost: 80000, purchase_date: '2024-06-01', useful_life_years: 5, depreciation_method: 'Straight-line', accumulated_depreciation: 8000, book_value: 72000, status: 'active', location: 'Singapore' },
    ];
    let mockSchedule: DepreciationEntry[] = [
      { entry_id: 1, asset_id: 1, month: '2026-07', depreciation_amount: 833.33, accumulated_depreciation: 20833.33, book_value: 479166.67 },
      { entry_id: 2, asset_id: 2, month: '2026-07', depreciation_amount: 1333.33, accumulated_depreciation: 9333.33, book_value: 70666.67 },
    ];

    if (saved !== '[]') mockAssets = JSON.parse(saved);
    if (savedSchedule !== '[]') mockSchedule = [...mockSchedule, ...JSON.parse(savedSchedule)];

    setAssets(mockAssets);
    setSchedule(mockSchedule);
  };

  const handleAddAsset = () => {
    if (!formData.asset_number || !formData.description || !formData.cost || !formData.purchase_date) {
      showToast('❌ Please fill required fields', 'error');
      return;
    }

    const monthlyDepreciation = formData.cost / (formData.useful_life_years * 12);
    const newAsset: FixedAsset = {
      asset_id: Date.now(),
      asset_number: formData.asset_number,
      description: formData.description,
      category: formData.category,
      cost: formData.cost,
      purchase_date: formData.purchase_date,
      useful_life_years: formData.useful_life_years,
      depreciation_method: formData.depreciation_method,
      accumulated_depreciation: 0,
      book_value: formData.cost,
      status: 'active',
      location: formData.location,
    };

    const saved = localStorage.getItem('fixed_assets') || '[]';
    const updated = [...JSON.parse(saved), newAsset];
    localStorage.setItem('fixed_assets', JSON.stringify(updated));

    const newEntry: DepreciationEntry = {
      entry_id: Date.now(),
      asset_id: newAsset.asset_id,
      month: new Date().toISOString().split('T')[0].substring(0, 7),
      depreciation_amount: monthlyDepreciation,
      accumulated_depreciation: monthlyDepreciation,
      book_value: formData.cost - monthlyDepreciation,
    };

    const savedSchedule = localStorage.getItem('depreciation_schedule') || '[]';
    const updatedSchedule = [...JSON.parse(savedSchedule), newEntry];
    localStorage.setItem('depreciation_schedule', JSON.stringify(updatedSchedule));

    showToast(`✅ Fixed asset ${formData.description} registered`, 'success');
    setShowForm(false);
    setFormData({ asset_number: '', description: '', category: 'Buildings', cost: 0, purchase_date: '', useful_life_years: 5, depreciation_method: 'Straight-line', location: '' });
    loadData();
  };

  const totalCost = assets.reduce((sum, a) => sum + a.cost, 0);
  const totalAccumulated = assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0);
  const totalBookValue = assets.reduce((sum, a) => sum + a.book_value, 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>🏭 Fixed Assets & Depreciation</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Asset register, depreciation schedule & book values (ACRA compliance)</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Cost', value: `SGD ${totalCost.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Accumulated Depreciation', value: `SGD ${totalAccumulated.toLocaleString()}`, color: '#E65100' },
            { label: 'Total Book Value', value: `SGD ${totalBookValue.toLocaleString()}`, color: '#4CAF50' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['register', 'schedule'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '8px 16px', background: activeTab === tab ? '#FF6B35' : '#f0f0f0', color: activeTab === tab ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab === 'register' ? '📋 Asset Register' : '📊 Depreciation Schedule'}
            </button>
          ))}
        </div>

        {activeTab === 'register' && (
          <div>
            <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: '24px', padding: '6px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>➕ Register Asset</button>

            {showForm && (
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Asset Number * (FA-2026-XXX)</label>
                    <input type="text" placeholder="FA-2026-003" value={formData.asset_number} onChange={(e) => setFormData({ ...formData, asset_number: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Category *</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option>Buildings</option>
                      <option>Vehicles</option>
                      <option>Equipment</option>
                      <option>Furniture</option>
                      <option>IT Equipment</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Description *</label>
                  <input type="text" placeholder="Asset description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Cost (SGD) *</label>
                    <input type="number" min="0" step="100" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Purchase Date *</label>
                    <input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Useful Life (Years)</label>
                    <input type="number" min="1" max="100" value={formData.useful_life_years} onChange={(e) => setFormData({ ...formData, useful_life_years: parseInt(e.target.value) })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Method</label>
                    <select value={formData.depreciation_method} onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option>Straight-line</option>
                      <option>Declining Balance</option>
                      <option>Units of Production</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Location</label>
                  <input type="text" placeholder="Singapore / Warehouse A" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => setShowForm(false)} style={{ padding: '12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  <button onClick={handleAddAsset} style={{ padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>✓ Register</button>
                </div>
              </div>
            )}

            <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Asset #</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Description / Category</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Cost</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Accumulated Depr.</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Book Value</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.asset_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{asset.asset_number}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}><div style={{ fontWeight: '600', color: '#333' }}>{asset.description}</div><div style={{ fontSize: '11px', color: '#666' }}>{asset.category}</div></td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {asset.cost.toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#E65100' }}>SGD {asset.accumulated_depreciation.toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4CAF50' }}>SGD {asset.book_value.toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: asset.status === 'active' ? '#E8F5E9' : '#FFF3E0', color: asset.status === 'active' ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>✓ {asset.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Month</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Depreciation Amount</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Accumulated Depreciation</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Book Value</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((entry) => (
                  <tr key={entry.entry_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{entry.month}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#E65100' }}>SGD {entry.depreciation_amount.toFixed(2)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {entry.accumulated_depreciation.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4CAF50' }}>SGD {entry.book_value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default FixedAssetsDetail;
