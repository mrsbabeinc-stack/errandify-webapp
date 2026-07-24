import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Asset {
  asset_id: number;
  asset_number: string;
  asset_name: string;
  category: string;
  purchase_date: string;
  purchase_value: number;
  current_value: number;
  assigned_to: string;
  assigned_employee_id: string;
  location: string;
  status: 'active' | 'disposed' | 'maintenance';
  depreciation_method: string;
  useful_life_years: number;
  accumulated_depreciation: number;
  created_date: string;
}

const AssetManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'create'>('overview');
  const [formData, setFormData] = useState({
    asset_number: '',
    asset_name: '',
    category: 'IT Equipment',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_value: '',
    assigned_to: '',
    assigned_employee_id: '',
    location: 'Office',
    useful_life_years: '5',
  });

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    const saved = localStorage.getItem('assets');
    let mockAssets: Asset[] = [
      { asset_id: 1, asset_number: 'AST-2026-001', asset_name: 'Dell Laptop', category: 'IT Equipment', purchase_date: '2026-01-15', purchase_value: 2500, current_value: 2100, assigned_to: 'John Doe', assigned_employee_id: 'EMP-001', location: 'Office', status: 'active', depreciation_method: 'Straight-line', useful_life_years: 5, accumulated_depreciation: 400, created_date: new Date().toISOString() },
      { asset_id: 2, asset_number: 'AST-2026-002', asset_name: 'Office Desk', category: 'Furniture', purchase_date: '2025-06-01', purchase_value: 1200, current_value: 1100, assigned_to: 'Jane Smith', assigned_employee_id: 'EMP-002', location: 'Office', status: 'active', depreciation_method: 'Straight-line', useful_life_years: 10, accumulated_depreciation: 100, created_date: new Date().toISOString() },
    ];
    if (saved) mockAssets = [...mockAssets, ...JSON.parse(saved)];
    setAssets(mockAssets);
  };

  const handleCreate = async () => {
    if (!formData.asset_number || !formData.asset_name || !formData.purchase_value) {
      showToast('❌ Please fill required fields', 'error');
      return;
    }
    const newAsset: Asset = {
      asset_id: Date.now(),
      asset_number: formData.asset_number,
      asset_name: formData.asset_name,
      category: formData.category,
      purchase_date: formData.purchase_date,
      purchase_value: Number(formData.purchase_value),
      current_value: Number(formData.purchase_value),
      assigned_to: formData.assigned_to,
      assigned_employee_id: formData.assigned_employee_id,
      location: formData.location,
      status: 'active',
      depreciation_method: 'Straight-line',
      useful_life_years: Number(formData.useful_life_years),
      accumulated_depreciation: 0,
      created_date: new Date().toISOString(),
    };
    const saved = localStorage.getItem('assets') || '[]';
    JSON.parse(saved).push(newAsset);
    localStorage.setItem('assets', JSON.stringify(JSON.parse(saved)));
    showToast(`✅ Asset ${formData.asset_number} created`, 'success');
    setViewMode('overview');
    setFormData({ asset_number: '', asset_name: '', category: 'IT Equipment', purchase_date: new Date().toISOString().split('T')[0], purchase_value: '', assigned_to: '', assigned_employee_id: '', location: 'Office', useful_life_years: '5' });
    loadAssets();
  };

  if (viewMode === 'create') {
    return (
      <AdminLayout>
        <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
          <ToastContainer toasts={toasts} onClose={removeToast} />
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>➕ Register Asset</h1>
              <button onClick={() => setViewMode('overview')} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>✕</button>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Asset Number * (AST-2026-XXX)</label>
                <input type="text" placeholder="AST-2026-003" value={formData.asset_number} onChange={(e) => setFormData({ ...formData, asset_number: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Asset Name *</label>
                <input type="text" placeholder="e.g., MacBook Pro" value={formData.asset_name} onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Purchase Value (SGD) *</label>
                <input type="number" placeholder="2500" value={formData.purchase_value} onChange={(e) => setFormData({ ...formData, purchase_value: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Assigned To</label>
                <input type="text" placeholder="Employee name" value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => setViewMode('overview')} style={{ padding: '12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={handleCreate} style={{ padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>✓ Register</button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const totalValue = assets.reduce((sum, a) => sum + a.purchase_value, 0);
  const currentValue = assets.reduce((sum, a) => sum + a.current_value, 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>📦 Asset Management</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Fixed assets tracking & depreciation (ACRA compliant)</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Assets', value: assets.length, color: '#F0A81E' },
            { label: 'Book Value', value: `SGD ${totalValue.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Current Value', value: `SGD ${currentValue.toLocaleString()}`, color: '#4CAF50' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setViewMode('create')} style={{ marginBottom: '24px', padding: '6px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>➕ Register Asset</button>

        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Asset #</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Assigned To</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Purchase Value</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Current Value</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.asset_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{asset.asset_number}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>{asset.asset_name}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{asset.assigned_to}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {asset.purchase_value.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4CAF50' }}>SGD {asset.current_value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AssetManagement;
