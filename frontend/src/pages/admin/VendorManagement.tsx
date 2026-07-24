import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Vendor {
  vendor_id: number;
  vendor_number: string;
  vendor_name: string;
  uen: string;
  category: string;
  contact_person: string;
  email: string;
  phone: string;
  payment_terms: string;
  total_invoices: number;
  total_spent: number;
  on_time_delivery_percent: number;
  rating: number;
  status: 'active' | 'inactive';
  created_date: string;
}

const VendorManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'create'>('overview');
  const [formData, setFormData] = useState({
    vendor_number: '',
    vendor_name: '',
    uen: '',
    category: 'Supplies',
    contact_person: '',
    email: '',
    phone: '',
    payment_terms: 'Net 30',
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    const saved = localStorage.getItem('vendors');
    let mockVendors: Vendor[] = [
      { vendor_id: 1, vendor_number: 'VEN-2026-001', vendor_name: 'TechSupplies Ltd', uen: 'UEN123456789', category: 'IT Equipment', contact_person: 'John', email: 'john@tech.sg', phone: '+6512345678', payment_terms: 'Net 30', total_invoices: 12, total_spent: 45000, on_time_delivery_percent: 95, rating: 4.5, status: 'active', created_date: new Date().toISOString() },
      { vendor_id: 2, vendor_number: 'VEN-2026-002', vendor_name: 'Office Supplies Co', uen: 'UEN987654321', category: 'Office Supplies', contact_person: 'Sarah', email: 'sarah@office.sg', phone: '+6587654321', payment_terms: 'Net 45', total_invoices: 8, total_spent: 12500, on_time_delivery_percent: 88, rating: 4.0, status: 'active', created_date: new Date().toISOString() },
    ];
    if (saved) mockVendors = [...mockVendors, ...JSON.parse(saved)];
    setVendors(mockVendors);
  };

  const handleCreate = async () => {
    if (!formData.vendor_number || !formData.vendor_name || !formData.uen) {
      showToast('❌ Please fill required fields', 'error');
      return;
    }
    const newVendor: Vendor = {
      vendor_id: Date.now(),
      vendor_number: formData.vendor_number,
      vendor_name: formData.vendor_name,
      uen: formData.uen,
      category: formData.category,
      contact_person: formData.contact_person,
      email: formData.email,
      phone: formData.phone,
      payment_terms: formData.payment_terms,
      total_invoices: 0,
      total_spent: 0,
      on_time_delivery_percent: 100,
      rating: 0,
      status: 'active',
      created_date: new Date().toISOString(),
    };
    const saved = localStorage.getItem('vendors') || '[]';
    JSON.parse(saved).push(newVendor);
    localStorage.setItem('vendors', JSON.stringify(JSON.parse(saved)));
    showToast(`✅ Vendor ${formData.vendor_name} registered`, 'success');
    setViewMode('overview');
    setFormData({ vendor_number: '', vendor_name: '', uen: '', category: 'Supplies', contact_person: '', email: '', phone: '', payment_terms: 'Net 30' });
    loadVendors();
  };

  if (viewMode === 'create') {
    return (
      <AdminLayout>
        <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
          <ToastContainer toasts={toasts} onClose={removeToast} />
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>➕ Register Vendor</h1>
              <button onClick={() => setViewMode('overview')} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>✕</button>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Vendor Number * (VEN-2026-XXX)</label>
                <input type="text" placeholder="VEN-2026-003" value={formData.vendor_number} onChange={(e) => setFormData({ ...formData, vendor_number: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Vendor Name *</label>
                <input type="text" placeholder="Vendor name" value={formData.vendor_name} onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>UEN * (Singapore)</label>
                <input type="text" placeholder="UEN123456789" value={formData.uen} onChange={(e) => setFormData({ ...formData, uen: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Contact Person</label>
                <input type="text" placeholder="Name" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
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

  const activeCount = vendors.filter(v => v.status === 'active').length;
  const totalSpent = vendors.reduce((sum, v) => sum + v.total_spent, 0);
  const avgRating = vendors.length > 0 ? (vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1) : 0;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>🏢 Vendor Management</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Vendor registration & performance tracking</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Vendors', value: vendors.length, color: '#F0A81E' },
            { label: 'Active', value: activeCount, color: '#4CAF50' },
            { label: 'Total Spent', value: `SGD ${totalSpent.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Avg Rating', value: `${avgRating}/5`, color: '#FFC107' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setViewMode('create')} style={{ marginBottom: '24px', padding: '6px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>➕ Register Vendor</button>

        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Vendor #</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Name / UEN</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Contact</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Total Spent</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.vendor_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{vendor.vendor_number}</td>
                  <td style={{ padding: '12px', fontSize: '12px' }}><div style={{ fontWeight: '600', color: '#333' }}>{vendor.vendor_name}</div><div style={{ fontSize: '11px', color: '#666' }}>{vendor.uen}</div></td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{vendor.contact_person}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {vendor.total_spent.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#FFC107' }}>⭐ {vendor.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default VendorManagement;
