import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Vendor {
  id: string;
  name: string;
  uén?: string;
  businessType: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string;
  paymentTerms: 'cod' | 'net30' | 'net60' | 'net90' | 'custom';
  customTermsDays?: number;
  category: string;
  isActive: boolean;
  creditLimit?: number;
  taxId?: string;
  website?: string;
  notes?: string;
  createdAt: string;
  lastModified: string;
  lastPaymentDate?: string;
  totalPaid: number;
  outstandingBalance: number;
  paymentStatus: 'good-standing' | 'pending' | 'overdue';
}

interface VendorPayment {
  id: string;
  vendorId: string;
  amount: number;
  date: string;
  reference: string;
  paymentMethod: 'bank-transfer' | 'cheque' | 'cash' | 'credit-card';
  invoiceRef?: string;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt: string;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  paymentsPending: number;
  paymentsFailed: number;
  totalOutstanding: number;
  totalPaid: number;
}

const VendorManagementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'payments' | 'analytics'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const [vendorForm, setVendorForm] = useState({
    name: '',
    uén: '',
    businessType: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'Singapore',
    bankAccount: '',
    bankName: '',
    accountHolder: '',
    paymentTerms: 'net30' as const,
    customTermsDays: 30,
    category: '',
    creditLimit: 0,
    taxId: '',
    website: '',
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    vendorId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    paymentMethod: 'bank-transfer' as const,
    invoiceRef: '',
    notes: '',
  });

  // Demo data
  useEffect(() => {
    const demoVendors: Vendor[] = [
      {
        id: 'v_1',
        name: 'PropertyCo Singapore',
        uén: '201234567A',
        businessType: 'Real Estate',
        contactPerson: 'Mr. Lee Chong',
        email: 'lease@propertyco.sg',
        phone: '+65-6800-1234',
        address: '123 Marina Bay Link, Level 15',
        postalCode: '018968',
        city: 'Singapore',
        country: 'Singapore',
        bankAccount: '001-234567-001',
        bankName: 'DBS Bank',
        accountHolder: 'PropertyCo Singapore Pte Ltd',
        paymentTerms: 'net30',
        category: 'Office Rent',
        isActive: true,
        creditLimit: 50000,
        taxId: 'GST123456789A',
        website: 'www.propertyco.sg',
        notes: 'Long-term office lease at Marina Bay',
        createdAt: '2026-01-01',
        lastModified: '2026-07-15',
        lastPaymentDate: '2026-07-01',
        totalPaid: 35000,
        outstandingBalance: 5000,
        paymentStatus: 'pending',
      },
      {
        id: 'v_2',
        name: 'Singtel Singapore',
        uén: '200212654D',
        businessType: 'Telecommunications',
        contactPerson: 'Ms. Sarah Tan',
        email: 'business@singtel.com.sg',
        phone: '1800-748-3835',
        address: '30 College Road',
        postalCode: '169708',
        city: 'Singapore',
        country: 'Singapore',
        bankAccount: '002-456789-002',
        bankName: 'OCBC Bank',
        accountHolder: 'Singapore Telecommunications Ltd',
        paymentTerms: 'net30',
        category: 'Telecom Services',
        isActive: true,
        creditLimit: 10000,
        taxId: 'GST234567890B',
        website: 'www.singtel.com.sg',
        notes: 'Internet, phone, and mobile services',
        createdAt: '2026-02-01',
        lastModified: '2026-07-10',
        lastPaymentDate: '2026-07-01',
        totalPaid: 2800,
        outstandingBalance: 280,
        paymentStatus: 'good-standing',
      },
      {
        id: 'v_3',
        name: 'SP Group (Singapore Power)',
        uén: '199702018D',
        businessType: 'Utilities',
        contactPerson: 'Customer Service',
        email: 'billdept@spgroup.com.sg',
        phone: '6778-8888',
        address: '278 Middle Road',
        postalCode: '188969',
        city: 'Singapore',
        country: 'Singapore',
        bankAccount: '003-567890-003',
        bankName: 'UOB Bank',
        accountHolder: 'Singapore Power Ltd',
        paymentTerms: 'net30',
        category: 'Utilities',
        isActive: true,
        creditLimit: 5000,
        taxId: 'GST345678901C',
        website: 'www.spgroup.com.sg',
        notes: 'Electricity, water, gas utilities',
        createdAt: '2026-02-15',
        lastModified: '2026-07-11',
        lastPaymentDate: '2026-07-11',
        totalPaid: 2250,
        outstandingBalance: 450,
        paymentStatus: 'good-standing',
      },
      {
        id: 'v_4',
        name: 'Digital Marketing Agency Ltd',
        uén: '202156789F',
        businessType: 'Marketing Services',
        contactPerson: 'Mr. David Ng',
        email: 'invoices@dmasg.com',
        phone: '+65-6312-5678',
        address: '45 Tras Street, Unit 12-05',
        postalCode: '079027',
        city: 'Singapore',
        country: 'Singapore',
        bankAccount: '004-678901-004',
        bankName: 'Maybank',
        accountHolder: 'Digital Marketing Agency Pte Ltd',
        paymentTerms: 'net60',
        customTermsDays: 60,
        category: 'Marketing Services',
        isActive: true,
        creditLimit: 15000,
        taxId: 'GST456789012D',
        website: 'www.dmasg.com',
        notes: 'Social media and digital marketing campaigns',
        createdAt: '2026-05-01',
        lastModified: '2026-07-12',
        lastPaymentDate: '2026-06-15',
        totalPaid: 8000,
        outstandingBalance: 2000,
        paymentStatus: 'pending',
      },
      {
        id: 'v_5',
        name: 'Microsoft Singapore',
        uén: '200008472Z',
        businessType: 'Software & IT',
        contactPerson: 'Enterprise Account Manager',
        email: 'enterprise@microsoft.com',
        phone: '+65-6690-2000',
        address: '1 Marina Boulevard, Level 21',
        postalCode: '018936',
        city: 'Singapore',
        country: 'Singapore',
        bankAccount: '005-789012-005',
        bankName: 'Standard Chartered',
        accountHolder: 'Microsoft Singapore Pte Ltd',
        paymentTerms: 'net30',
        category: 'Software Licenses',
        isActive: true,
        creditLimit: 30000,
        taxId: 'GST567890123E',
        website: 'www.microsoft.com/sg',
        notes: 'Office 365 and enterprise software subscriptions',
        createdAt: '2026-03-01',
        lastModified: '2026-07-15',
        lastPaymentDate: '2026-07-01',
        totalPaid: 4500,
        outstandingBalance: 1500,
        paymentStatus: 'pending',
      },
      {
        id: 'v_6',
        name: 'Singapore Insurance Co',
        uén: '198501234G',
        businessType: 'Insurance',
        contactPerson: 'Corporate Insurance Team',
        email: 'corporate@sginsurance.com',
        phone: '+65-6224-4555',
        address: '50 Raffles Place, Level 30',
        postalCode: '048623',
        city: 'Singapore',
        country: 'Singapore',
        bankAccount: '006-890123-006',
        bankName: 'HSBC Bank',
        accountHolder: 'Singapore Insurance Co Ltd',
        paymentTerms: 'net60',
        customTermsDays: 60,
        category: 'Insurance',
        isActive: true,
        creditLimit: 40000,
        taxId: 'GST678901234F',
        website: 'www.sginsurance.com',
        notes: 'Business liability and property insurance',
        createdAt: '2026-01-15',
        lastModified: '2026-07-15',
        lastPaymentDate: '2026-01-15',
        totalPaid: 3500,
        outstandingBalance: 0,
        paymentStatus: 'good-standing',
      },
    ];

    const demoPay: VendorPayment[] = [
      {
        id: 'pay_1',
        vendorId: 'v_1',
        amount: 5000,
        date: '2026-07-01',
        reference: 'CHQ-2026-001',
        paymentMethod: 'cheque',
        invoiceRef: 'PROP-2026-07',
        status: 'completed',
        notes: 'July office rent payment',
        createdAt: '2026-07-01',
      },
      {
        id: 'pay_2',
        vendorId: 'v_2',
        amount: 280,
        date: '2026-07-01',
        reference: 'BACS-2026-001',
        paymentMethod: 'bank-transfer',
        invoiceRef: 'SINGTEL-2026-07',
        status: 'completed',
        notes: 'Internet and phone services',
        createdAt: '2026-07-01',
      },
      {
        id: 'pay_3',
        vendorId: 'v_3',
        amount: 450,
        date: '2026-07-11',
        reference: 'BACS-2026-002',
        paymentMethod: 'bank-transfer',
        invoiceRef: 'SPG-2026-07',
        status: 'completed',
        notes: 'Utilities bill payment',
        createdAt: '2026-07-11',
      },
      {
        id: 'pay_4',
        vendorId: 'v_5',
        amount: 1500,
        date: '2026-07-01',
        reference: 'BACS-2026-003',
        paymentMethod: 'bank-transfer',
        invoiceRef: 'MS-2026-07',
        status: 'pending',
        notes: 'Software subscription payment pending',
        createdAt: '2026-07-01',
      },
    ];

    setVendors(demoVendors);
    setPayments(demoPay);
  }, []);

  // Calculate stats
  const stats: VendorStats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.isActive).length,
    paymentsPending: payments.filter(p => p.status === 'pending').length,
    paymentsFailed: payments.filter(p => p.status === 'failed').length,
    totalOutstanding: vendors.reduce((sum, v) => sum + v.outstandingBalance, 0),
    totalPaid: vendors.reduce((sum, v) => sum + v.totalPaid, 0),
  };

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       v.phone.includes(searchTerm);
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? v.isActive : !v.isActive);
    const matchCategory = filterCategory === 'all' || v.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const handleAddVendor = () => {
    if (!vendorForm.name || !vendorForm.email || !vendorForm.phone) {
      showToast('❌ Please fill in required fields (name, email, phone)', 'error');
      return;
    }

    const newVendor: Vendor = {
      id: `v_${Date.now()}`,
      ...vendorForm,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      totalPaid: 0,
      outstandingBalance: 0,
      paymentStatus: 'good-standing',
    };

    setVendors([...vendors, newVendor]);
    showToast('✅ Vendor added successfully', 'success');
    setShowVendorForm(false);
    setVendorForm({
      name: '',
      uén: '',
      businessType: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      postalCode: '',
      city: '',
      country: 'Singapore',
      bankAccount: '',
      bankName: '',
      accountHolder: '',
      paymentTerms: 'net30',
      customTermsDays: 30,
      category: '',
      creditLimit: 0,
      taxId: '',
      website: '',
      notes: '',
    });
  };

  const handleRecordPayment = () => {
    if (!paymentForm.vendorId || !paymentForm.amount) {
      showToast('❌ Please select vendor and enter amount', 'error');
      return;
    }

    const newPayment: VendorPayment = {
      id: `pay_${Date.now()}`,
      ...paymentForm,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setPayments([...payments, newPayment]);
    showToast('✅ Payment recorded (pending processing)', 'success');
    setShowPaymentForm(false);
    setPaymentForm({
      vendorId: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reference: '',
      paymentMethod: 'bank-transfer',
      invoiceRef: '',
      notes: '',
    });
  };

  const toggleVendorActive = (vendorId: string) => {
    setVendors(
      vendors.map(v =>
        v.id === vendorId ? { ...v, isActive: !v.isActive, lastModified: new Date().toISOString() } : v
      )
    );
    const vendor = vendors.find(v => v.id === vendorId);
    showToast(`✅ Vendor ${vendor?.isActive ? 'deactivated' : 'activated'}`, 'success');
  };

  const categories = Array.from(new Set(vendors.map(v => v.category))).sort();

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              💳 Vendor Management
            </h1>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#FF6B35',
                fontWeight: '700',
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
            Vendor database, payment tracking, bank details, credit limits
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #4CAF50' }}>
            <div style={{ fontSize: '12px', color: '#2E7D32', marginBottom: '4px' }}>Total Vendors</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#4CAF50' }}>{stats.totalVendors}</div>
            <div style={{ fontSize: '11px', color: '#2E7D32', marginTop: '4px' }}>{stats.activeVendors} active</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E4', borderRadius: '8px', border: '2px solid #F0A81E' }}>
            <div style={{ fontSize: '12px', color: '#B5651D', marginBottom: '4px' }}>Total Paid (YTD)</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F0A81E' }}>SGD {stats.totalPaid.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#B5651D', marginTop: '4px' }}>payments completed</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E0', borderRadius: '8px', border: '2px solid #FF9800' }}>
            <div style={{ fontSize: '12px', color: '#E65100', marginBottom: '4px' }}>Outstanding</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#FF9800' }}>SGD {stats.totalOutstanding.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#E65100', marginTop: '4px' }}>pending payment</div>
          </div>
          <div style={{ padding: '16px', background: '#FCEDE9', borderRadius: '8px', border: '2px solid #E2736B' }}>
            <div style={{ fontSize: '12px', color: '#4A148C', marginBottom: '4px' }}>Payments Pending</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#E2736B' }}>{stats.paymentsPending}</div>
            <div style={{ fontSize: '11px', color: '#4A148C', marginTop: '4px' }}>awaiting processing</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['overview', 'vendors', 'payments', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'vendors' && '💳 Vendors'}
              {tab === 'payments' && '💰 Payments'}
              {tab === 'analytics' && '📈 Analytics'}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Vendor Portfolio Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>🏢 Vendor Statistics</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Vendors:</span>
                    <strong style={{ color: '#333' }}>{stats.totalVendors}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Active:</span>
                    <strong style={{ color: '#4CAF50' }}>{stats.activeVendors}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Inactive:</span>
                    <strong style={{ color: '#999' }}>{stats.totalVendors - stats.activeVendors}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>💰 Payment Summary</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Paid (YTD):</span>
                    <strong style={{ color: '#4CAF50' }}>SGD {stats.totalPaid.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Outstanding:</span>
                    <strong style={{ color: '#FF9800' }}>SGD {stats.totalOutstanding.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending Payments:</span>
                    <strong style={{ color: '#FF9800' }}>{stats.paymentsPending}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>🔝 Top Categories</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '4px' }}>
                  {categories.slice(0, 5).map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{cat}:</span>
                      <strong>{vendors.filter(v => v.category === cat).length}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '12px 16px', background: '#FFF3E4', border: '2px solid #B5651D', borderRadius: '6px', fontSize: '12px', color: '#B5651D' }}>
              <strong>✅ Vendor Management:</strong> Track all suppliers, payment terms, bank details, and outstanding balances. Manage payment approvals and reconciliations.
            </div>
          </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '4px', fontSize: '12px' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '4px', fontSize: '12px' }}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={() => setShowVendorForm(!showVendorForm)}
                style={{
                  padding: '8px 16px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {showVendorForm ? '✕ Cancel' : '+ Add Vendor'}
              </button>
            </div>

            {showVendorForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <input type="text" placeholder="Vendor Name *" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1' }} />
                <input type="text" placeholder="UEN (optional)" value={vendorForm.uén} onChange={e => setVendorForm({ ...vendorForm, uén: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Business Type" value={vendorForm.businessType} onChange={e => setVendorForm({ ...vendorForm, businessType: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Contact Person" value={vendorForm.contactPerson} onChange={e => setVendorForm({ ...vendorForm, contactPerson: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="email" placeholder="Email *" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="tel" placeholder="Phone *" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Address" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1' }} />
                <input type="text" placeholder="Postal Code" value={vendorForm.postalCode} onChange={e => setVendorForm({ ...vendorForm, postalCode: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="City" value={vendorForm.city} onChange={e => setVendorForm({ ...vendorForm, city: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Bank Account" value={vendorForm.bankAccount} onChange={e => setVendorForm({ ...vendorForm, bankAccount: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Bank Name" value={vendorForm.bankName} onChange={e => setVendorForm({ ...vendorForm, bankName: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Account Holder" value={vendorForm.accountHolder} onChange={e => setVendorForm({ ...vendorForm, accountHolder: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <select value={vendorForm.paymentTerms} onChange={e => setVendorForm({ ...vendorForm, paymentTerms: e.target.value as any })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="cod">COD (Cash on Delivery)</option>
                  <option value="net30">Net 30</option>
                  <option value="net60">Net 60</option>
                  <option value="net90">Net 90</option>
                  <option value="custom">Custom</option>
                </select>
                <input type="text" placeholder="Category" value={vendorForm.category} onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="number" placeholder="Credit Limit" value={vendorForm.creditLimit} onChange={e => setVendorForm({ ...vendorForm, creditLimit: parseFloat(e.target.value) || 0 })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Tax ID" value={vendorForm.taxId} onChange={e => setVendorForm({ ...vendorForm, taxId: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <textarea placeholder="Notes" value={vendorForm.notes} onChange={e => setVendorForm({ ...vendorForm, notes: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1', minHeight: '60px' }} />
                <button onClick={handleAddVendor} style={{ gridColumn: '1 / -1', padding: '10px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>✓ Add Vendor</button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {filteredVendors.map(vendor => (
                <div key={vendor.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{vendor.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{vendor.businessType} • {vendor.category}</div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: vendor.isActive ? '#E8F5E9' : '#F5F5F5',
                      color: vendor.isActive ? '#2E7D32' : '#999',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {vendor.isActive ? '✓ Active' : 'Inactive'}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    <div>Contact: <strong>{vendor.contactPerson}</strong></div>
                    <div>Email: <strong>{vendor.email}</strong></div>
                    <div>Phone: <strong>{vendor.phone}</strong></div>
                    <div>Terms: <strong>{vendor.paymentTerms}</strong></div>
                    <div>Outstanding: <strong style={{ color: '#FF9800' }}>SGD {vendor.outstandingBalance.toLocaleString()}</strong></div>
                    <div>Total Paid: <strong style={{ color: '#4CAF50' }}>SGD {vendor.totalPaid.toLocaleString()}</strong></div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                    Bank: {vendor.bankName} | Account: {vendor.bankAccount}
                  </div>
                  <button
                    onClick={() => toggleVendorActive(vendor.id)}
                    style={{
                      padding: '6px 12px',
                      background: vendor.isActive ? '#FF9800' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    {vendor.isActive ? '⏸️ Deactivate' : '✓ Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>Payment Tracking</h3>
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                style={{
                  padding: '8px 16px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {showPaymentForm ? '✕ Cancel' : '+ Record Payment'}
              </button>
            </div>

            {showPaymentForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <select value={paymentForm.vendorId} onChange={e => setPaymentForm({ ...paymentForm, vendorId: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1' }}>
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <input type="number" placeholder="Amount" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Reference (cheque, bank ref)" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <select value={paymentForm.paymentMethod} onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="credit-card">Credit Card</option>
                </select>
                <input type="text" placeholder="Invoice Reference" value={paymentForm.invoiceRef} onChange={e => setPaymentForm({ ...paymentForm, invoiceRef: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <textarea placeholder="Notes" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1', minHeight: '60px' }} />
                <button onClick={handleRecordPayment} style={{ gridColumn: '1 / -1', padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>✓ Record Payment</button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {payments.map(payment => {
                const vendor = vendors.find(v => v.id === payment.vendorId);
                return (
                  <div key={payment.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{vendor?.name || 'Unknown Vendor'}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Payment: SGD {payment.amount.toLocaleString()}</div>
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: payment.status === 'completed' ? '#E8F5E9' : payment.status === 'pending' ? '#FFF3E0' : '#FFEBEE',
                        color: payment.status === 'completed' ? '#2E7D32' : payment.status === 'pending' ? '#E65100' : '#C62828',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {payment.status === 'completed' ? '✓ Completed' : payment.status === 'pending' ? '⏳ Pending' : '✕ Failed'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#666' }}>
                      <div>Date: <strong>{payment.date}</strong></div>
                      <div>Method: <strong>{payment.paymentMethod}</strong></div>
                      <div>Reference: <strong>{payment.reference}</strong></div>
                      <div>Invoice Ref: <strong>{payment.invoiceRef || 'N/A'}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Vendor Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>💳 Payment Status</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Good Standing:</span>
                    <strong style={{ color: '#4CAF50' }}>{vendors.filter(v => v.paymentStatus === 'good-standing').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending:</span>
                    <strong style={{ color: '#FF9800' }}>{vendors.filter(v => v.paymentStatus === 'pending').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Overdue:</span>
                    <strong style={{ color: '#F44336' }}>{vendors.filter(v => v.paymentStatus === 'overdue').length}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>📊 Top Vendors by Spend</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '4px' }}>
                  {vendors
                    .sort((a, b) => b.totalPaid - a.totalPaid)
                    .slice(0, 5)
                    .map((v, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{idx + 1}. {v.name}</span>
                        <strong>SGD {v.totalPaid.toLocaleString()}</strong>
                      </div>
                    ))}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>💰 Payment Terms Distribution</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '4px' }}>
                  {['cod', 'net30', 'net60', 'net90'].map(term => (
                    <div key={term} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{term.toUpperCase()}:</span>
                      <strong>{vendors.filter(v => v.paymentTerms === term).length}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default VendorManagementDashboard;
