import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Client {
  id: string;
  name: string;
  uén: string;
  businessType: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  billingAddress: string;
  billingPostalCode: string;
  billingCity: string;
  billingCountry: string;
  shippingAddress?: string;
  shippingPostalCode?: string;
  shippingCity?: string;
  department: string;
  industryType: string;
  creditLimit: number;
  creditTerms: 'net30' | 'net60' | 'net90' | 'cod';
  taxExempt: boolean;
  taxId?: string;
  website?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  lastModified: string;
  lastInvoiceDate?: string;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  paymentStatus: 'good-standing' | 'pending' | 'overdue' | 'delinquent';
}

interface ClientInvoice {
  id: string;
  clientId: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  createdAt: string;
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCounts: number;
}

const DEPARTMENTS = [
  'Operations',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
  'IT',
  'Customer Service',
  'Product',
];

const ClientManagementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'invoices' | 'analytics'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [showClientForm, setShowClientForm] = useState(false);

  const [clientForm, setClientForm] = useState({
    name: '',
    uén: '',
    businessType: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    billingAddress: '',
    billingPostalCode: '',
    billingCity: '',
    billingCountry: 'Singapore',
    shippingAddress: '',
    shippingPostalCode: '',
    shippingCity: '',
    department: '',
    industryType: '',
    creditLimit: 50000,
    creditTerms: 'net30' as const,
    taxExempt: false,
    taxId: '',
    website: '',
    notes: '',
  });

  // Demo data
  useEffect(() => {
    const demoClients: Client[] = [
      {
        id: 'c_1',
        name: 'ABC Trading Pte Ltd',
        uén: '201234567B',
        businessType: 'Wholesale & Distribution',
        contactPerson: 'Mr. Tan Wei Ming',
        contactEmail: 'tan.w.ming@abctrading.sg',
        contactPhone: '+65-6234-5678',
        billingAddress: '50 Changi Business Park, Unit 02-15',
        billingPostalCode: '486048',
        billingCity: 'Singapore',
        billingCountry: 'Singapore',
        shippingAddress: '50 Changi Business Park, Unit 02-15',
        shippingPostalCode: '486048',
        shippingCity: 'Singapore',
        department: 'Sales',
        industryType: 'Trading & Distribution',
        creditLimit: 100000,
        creditTerms: 'net60',
        taxExempt: false,
        taxId: 'GST123456789X',
        website: 'www.abctrading.sg',
        isActive: true,
        notes: 'High-volume wholesale client',
        createdAt: '2026-01-15',
        lastModified: '2026-07-15',
        lastInvoiceDate: '2026-07-10',
        totalInvoiced: 450000,
        totalPaid: 425000,
        outstandingBalance: 25000,
        paymentStatus: 'pending',
      },
      {
        id: 'c_2',
        name: 'TechSoft Solutions Inc',
        uén: '202345678C',
        businessType: 'Technology Services',
        contactPerson: 'Ms. Jennifer Lim',
        contactEmail: 'billing@techsoft.sg',
        contactPhone: '+65-6850-2300',
        billingAddress: '1 George Street, Level 45',
        billingPostalCode: '049145',
        billingCity: 'Singapore',
        billingCountry: 'Singapore',
        shippingAddress: '1 George Street, Level 45',
        shippingPostalCode: '049145',
        shippingCity: 'Singapore',
        department: 'Operations',
        industryType: 'Technology',
        creditLimit: 75000,
        creditTerms: 'net30',
        taxExempt: false,
        taxId: 'GST234567890Y',
        website: 'www.techsoft.sg',
        isActive: true,
        notes: 'IT services & consulting client',
        createdAt: '2026-02-10',
        lastModified: '2026-07-14',
        lastInvoiceDate: '2026-07-08',
        totalInvoiced: 320000,
        totalPaid: 320000,
        outstandingBalance: 0,
        paymentStatus: 'good-standing',
      },
      {
        id: 'c_3',
        name: 'Global Logistics Asia',
        uén: '198756789D',
        businessType: 'Logistics & Transport',
        contactPerson: 'Mr. Rajesh Nair',
        contactEmail: 'accounts@globallogistics.sg',
        contactPhone: '+65-6744-1122',
        billingAddress: '8 Kaki Bukit Avenue 1, Level 5',
        billingPostalCode: '417941',
        billingCity: 'Singapore',
        billingCountry: 'Singapore',
        shippingAddress: '8 Kaki Bukit Avenue 1, Level 5',
        shippingPostalCode: '417941',
        shippingCity: 'Singapore',
        department: 'Operations',
        industryType: 'Logistics',
        creditLimit: 150000,
        creditTerms: 'net60',
        taxExempt: false,
        taxId: 'GST345678901Z',
        website: 'www.globallogistics.sg',
        isActive: true,
        notes: 'Major logistics partner',
        createdAt: '2026-01-01',
        lastModified: '2026-07-15',
        lastInvoiceDate: '2026-07-12',
        totalInvoiced: 680000,
        totalPaid: 620000,
        outstandingBalance: 60000,
        paymentStatus: 'overdue',
      },
      {
        id: 'c_4',
        name: 'Retail Express Singapore',
        uén: '201867890E',
        businessType: 'Retail Chain',
        contactPerson: 'Ms. Amy Ooi',
        contactEmail: 'procurement@retailexpress.sg',
        contactPhone: '+65-6883-9999',
        billingAddress: '20 Ubi Road 1, Level 3',
        billingPostalCode: '408844',
        billingCity: 'Singapore',
        billingCountry: 'Singapore',
        shippingAddress: '20 Ubi Road 1, Level 3',
        shippingPostalCode: '408844',
        shippingCity: 'Singapore',
        department: 'Sales',
        industryType: 'Retail',
        creditLimit: 80000,
        creditTerms: 'net45',
        taxExempt: false,
        taxId: 'GST456789012A',
        website: 'www.retailexpress.sg',
        isActive: true,
        notes: 'Multi-store retail partner',
        createdAt: '2026-03-20',
        lastModified: '2026-07-15',
        lastInvoiceDate: '2026-07-05',
        totalInvoiced: 280000,
        totalPaid: 260000,
        outstandingBalance: 20000,
        paymentStatus: 'pending',
      },
      {
        id: 'c_5',
        name: 'Manufacturing Excellence Ltd',
        uén: '198234567F',
        businessType: 'Manufacturing',
        contactPerson: 'Mr. Ong Beng Huat',
        contactEmail: 'purchasing@mfgexcel.sg',
        contactPhone: '+65-6861-2020',
        billingAddress: '60 Paya Lebar Road, Block A',
        billingPostalCode: '409051',
        billingCity: 'Singapore',
        billingCountry: 'Singapore',
        shippingAddress: '60 Paya Lebar Road, Block A',
        shippingPostalCode: '409051',
        shippingCity: 'Singapore',
        department: 'Operations',
        industryType: 'Manufacturing',
        creditLimit: 120000,
        creditTerms: 'net90',
        taxExempt: false,
        taxId: 'GST567890123B',
        website: 'www.mfgexcel.sg',
        isActive: true,
        notes: 'Industrial supplies customer',
        createdAt: '2026-04-10',
        lastModified: '2026-07-12',
        lastInvoiceDate: '2026-07-01',
        totalInvoiced: 550000,
        totalPaid: 550000,
        outstandingBalance: 0,
        paymentStatus: 'good-standing',
      },
      {
        id: 'c_6',
        name: 'Consulting Group Asia',
        uén: '202012345G',
        businessType: 'Business Consulting',
        contactPerson: 'Ms. Catherine Wong',
        contactEmail: 'finance@cgasia.sg',
        contactPhone: '+65-6733-8888',
        billingAddress: '391A Orchard Road, Level 18',
        billingPostalCode: '238873',
        billingCity: 'Singapore',
        billingCountry: 'Singapore',
        shippingAddress: '391A Orchard Road, Level 18',
        shippingPostalCode: '238873',
        shippingCity: 'Singapore',
        department: 'Sales',
        industryType: 'Consulting',
        creditLimit: 90000,
        creditTerms: 'net30',
        taxExempt: false,
        taxId: 'GST678901234C',
        website: 'www.cgasia.sg',
        isActive: true,
        notes: 'Professional services client',
        createdAt: '2026-05-15',
        lastModified: '2026-07-15',
        lastInvoiceDate: '2026-07-09',
        totalInvoiced: 210000,
        totalPaid: 210000,
        outstandingBalance: 0,
        paymentStatus: 'good-standing',
      },
    ];

    const demoInv: ClientInvoice[] = [
      { id: 'inv_1', clientId: 'c_1', invoiceNo: 'INV-2026-0001', date: '2026-07-10', dueDate: '2026-09-08', amount: 45000, paidAmount: 0, status: 'overdue', createdAt: '2026-07-10' },
      { id: 'inv_2', clientId: 'c_2', invoiceNo: 'INV-2026-0002', date: '2026-07-08', dueDate: '2026-08-07', amount: 32000, paidAmount: 32000, status: 'paid', createdAt: '2026-07-08' },
      { id: 'inv_3', clientId: 'c_3', invoiceNo: 'INV-2026-0003', date: '2026-07-12', dueDate: '2026-09-09', amount: 60000, paidAmount: 0, status: 'overdue', createdAt: '2026-07-12' },
      { id: 'inv_4', clientId: 'c_4', invoiceNo: 'INV-2026-0004', date: '2026-07-05', dueDate: '2026-08-19', amount: 20000, paidAmount: 0, status: 'pending', createdAt: '2026-07-05' },
      { id: 'inv_5', clientId: 'c_5', invoiceNo: 'INV-2026-0005', date: '2026-07-01', dueDate: '2026-09-28', amount: 55000, paidAmount: 55000, status: 'paid', createdAt: '2026-07-01' },
      { id: 'inv_6', clientId: 'c_6', invoiceNo: 'INV-2026-0006', date: '2026-07-09', dueDate: '2026-08-08', amount: 21000, paidAmount: 21000, status: 'paid', createdAt: '2026-07-09' },
    ];

    setClients(demoClients);
    setInvoices(demoInv);
  }, []);

  // Calculate stats
  const stats: ClientStats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.isActive).length,
    totalInvoiced: clients.reduce((sum, c) => sum + c.totalInvoiced, 0),
    totalPaid: clients.reduce((sum, c) => sum + c.totalPaid, 0),
    totalOutstanding: clients.reduce((sum, c) => sum + c.outstandingBalance, 0),
    overdueCounts: clients.filter(c => c.paymentStatus === 'overdue' || c.paymentStatus === 'delinquent').length,
  };

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       c.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       c.contactPhone.includes(searchTerm) ||
                       c.uén.includes(searchTerm);
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? c.isActive : !c.isActive);
    const matchDept = filterDepartment === 'all' || c.department === filterDepartment;
    return matchSearch && matchStatus && matchDept;
  });

  const handleAddClient = () => {
    if (!clientForm.name || !clientForm.contactEmail || !clientForm.contactPhone) {
      showToast('❌ Please fill in required fields (name, email, phone)', 'error');
      return;
    }

    const newClient: Client = {
      id: `c_${Date.now()}`,
      ...clientForm,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      totalInvoiced: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      paymentStatus: 'good-standing',
    };

    setClients([...clients, newClient]);
    showToast('✅ Client added successfully', 'success');
    setShowClientForm(false);
    setClientForm({
      name: '',
      uén: '',
      businessType: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      billingAddress: '',
      billingPostalCode: '',
      billingCity: '',
      billingCountry: 'Singapore',
      shippingAddress: '',
      shippingPostalCode: '',
      shippingCity: '',
      department: '',
      industryType: '',
      creditLimit: 50000,
      creditTerms: 'net30',
      taxExempt: false,
      taxId: '',
      website: '',
      notes: '',
    });
  };

  const toggleClientActive = (clientId: string) => {
    setClients(
      clients.map(c =>
        c.id === clientId ? { ...c, isActive: !c.isActive, lastModified: new Date().toISOString() } : c
      )
    );
    const client = clients.find(c => c.id === clientId);
    showToast(`✅ Client ${client?.isActive ? 'deactivated' : 'activated'}`, 'success');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              👥 Client Management
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
            Client database, invoicing, credit tracking, department organization
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #4CAF50' }}>
            <div style={{ fontSize: '12px', color: '#2E7D32', marginBottom: '4px' }}>Total Clients</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#4CAF50' }}>{stats.totalClients}</div>
            <div style={{ fontSize: '11px', color: '#2E7D32', marginTop: '4px' }}>{stats.activeClients} active</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E4', borderRadius: '8px', border: '2px solid #F0A81E' }}>
            <div style={{ fontSize: '12px', color: '#B5651D', marginBottom: '4px' }}>Total Invoiced</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F0A81E' }}>SGD {(stats.totalInvoiced / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K</div>
            <div style={{ fontSize: '11px', color: '#B5651D', marginTop: '4px' }}>YTD revenue</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E0', borderRadius: '8px', border: '2px solid #FF9800' }}>
            <div style={{ fontSize: '12px', color: '#E65100', marginBottom: '4px' }}>Outstanding</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#FF9800' }}>SGD {stats.totalOutstanding.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#E65100', marginTop: '4px' }}>pending payment</div>
          </div>
          <div style={{ padding: '16px', background: '#FFEBEE', borderRadius: '8px', border: '2px solid #F44336' }}>
            <div style={{ fontSize: '12px', color: '#C62828', marginBottom: '4px' }}>Overdue</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F44336' }}>{stats.overdueCounts}</div>
            <div style={{ fontSize: '11px', color: '#C62828', marginTop: '4px' }}>invoices</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['overview', 'clients', 'invoices', 'analytics'] as const).map(tab => (
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
              {tab === 'clients' && '👥 Clients'}
              {tab === 'invoices' && '📄 Invoices'}
              {tab === 'analytics' && '📈 Analytics'}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Client Portfolio Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>👥 Client Statistics</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Clients:</span>
                    <strong>{stats.totalClients}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Active:</span>
                    <strong style={{ color: '#4CAF50' }}>{stats.activeClients}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Inactive:</span>
                    <strong style={{ color: '#999' }}>{stats.totalClients - stats.activeClients}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>💰 Revenue Summary</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Invoiced:</span>
                    <strong style={{ color: '#4CAF50' }}>SGD {stats.totalInvoiced.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Paid:</span>
                    <strong style={{ color: '#F0A81E' }}>SGD {stats.totalPaid.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Outstanding:</span>
                    <strong style={{ color: '#FF9800' }}>SGD {stats.totalOutstanding.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>⚠️ Collections Alert</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Overdue Invoices:</span>
                    <strong style={{ color: '#F44336' }}>{stats.overdueCounts}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Collection Rate:</span>
                    <strong style={{ color: stats.totalInvoiced > 0 ? '#4CAF50' : '#999' }}>
                      {stats.totalInvoiced > 0 ? ((stats.totalPaid / stats.totalInvoiced) * 100).toFixed(1) : 0}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '12px 16px', background: '#FFF3E4', border: '2px solid #B5651D', borderRadius: '6px', fontSize: '12px', color: '#B5651D' }}>
              <strong>✅ Client Management:</strong> Track all B2B clients, invoicing, credit terms, and payment status. Organize by department for better tracking.
            </div>
          </div>
        )}

        {/* CLIENTS TAB */}
        {activeTab === 'clients' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Search clients by name, email, phone, UEN..."
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
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '4px', fontSize: '12px' }}
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <button
                onClick={() => setShowClientForm(!showClientForm)}
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
                {showClientForm ? '✕ Cancel' : '+ Add Client'}
              </button>
            </div>

            {showClientForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <input type="text" placeholder="Client Name *" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1' }} />
                <input type="text" placeholder="UEN" value={clientForm.uén} onChange={e => setClientForm({ ...clientForm, uén: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Business Type" value={clientForm.businessType} onChange={e => setClientForm({ ...clientForm, businessType: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <select value={clientForm.department} onChange={e => setClientForm({ ...clientForm, department: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="">Select Department *</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <input type="text" placeholder="Contact Person" value={clientForm.contactPerson} onChange={e => setClientForm({ ...clientForm, contactPerson: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="email" placeholder="Contact Email *" value={clientForm.contactEmail} onChange={e => setClientForm({ ...clientForm, contactEmail: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="tel" placeholder="Contact Phone *" value={clientForm.contactPhone} onChange={e => setClientForm({ ...clientForm, contactPhone: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Billing Address" value={clientForm.billingAddress} onChange={e => setClientForm({ ...clientForm, billingAddress: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1' }} />
                <input type="text" placeholder="Postal Code" value={clientForm.billingPostalCode} onChange={e => setClientForm({ ...clientForm, billingPostalCode: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="City" value={clientForm.billingCity} onChange={e => setClientForm({ ...clientForm, billingCity: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <select value={clientForm.creditTerms} onChange={e => setClientForm({ ...clientForm, creditTerms: e.target.value as any })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="net30">Net 30</option>
                  <option value="net60">Net 60</option>
                  <option value="net90">Net 90</option>
                  <option value="cod">COD</option>
                </select>
                <input type="number" placeholder="Credit Limit" value={clientForm.creditLimit} onChange={e => setClientForm({ ...clientForm, creditLimit: parseFloat(e.target.value) || 0 })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <textarea placeholder="Notes" value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1', minHeight: '60px' }} />
                <button onClick={handleAddClient} style={{ gridColumn: '1 / -1', padding: '10px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>✓ Add Client</button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {filteredClients.map(client => (
                <div key={client.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{client.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{client.businessType} • {client.department}</div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: client.isActive ? '#E8F5E9' : '#F5F5F5',
                      color: client.isActive ? '#2E7D32' : '#999',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {client.isActive ? '✓ Active' : 'Inactive'}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    <div>Contact: <strong>{client.contactPerson}</strong></div>
                    <div>Email: <strong>{client.contactEmail}</strong></div>
                    <div>Phone: <strong>{client.contactPhone}</strong></div>
                    <div>Terms: <strong>{client.creditTerms.toUpperCase()}</strong></div>
                    <div>Outstanding: <strong style={{ color: '#FF9800' }}>SGD {client.outstandingBalance.toLocaleString()}</strong></div>
                    <div>Total Invoiced: <strong style={{ color: '#4CAF50' }}>SGD {client.totalInvoiced.toLocaleString()}</strong></div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                    Address: {client.billingAddress}, {client.billingPostalCode}
                  </div>
                  <button
                    onClick={() => toggleClientActive(client.id)}
                    style={{
                      padding: '6px 12px',
                      background: client.isActive ? '#FF9800' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    {client.isActive ? '⏸️ Deactivate' : '✓ Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Client Invoices</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {invoices.map(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                return (
                  <div key={inv.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{client?.name || 'Unknown Client'}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Invoice: {inv.invoiceNo}</div>
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: inv.status === 'paid' ? '#E8F5E9' : inv.status === 'pending' ? '#FFF3E0' : inv.status === 'overdue' ? '#FFEBEE' : '#FFF3E4',
                        color: inv.status === 'paid' ? '#2E7D32' : inv.status === 'pending' ? '#E65100' : inv.status === 'overdue' ? '#C62828' : '#B5651D',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {inv.status === 'paid' && '✓ Paid'}
                        {inv.status === 'pending' && '⏳ Pending'}
                        {inv.status === 'overdue' && '⚠️ Overdue'}
                        {inv.status === 'partial' && '📊 Partial'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#666' }}>
                      <div>Date: <strong>{inv.date}</strong></div>
                      <div>Due: <strong>{inv.dueDate}</strong></div>
                      <div>Amount: <strong style={{ color: '#333' }}>SGD {inv.amount.toLocaleString()}</strong></div>
                      <div>Paid: <strong style={{ color: inv.paidAmount > 0 ? '#4CAF50' : '#999' }}>SGD {inv.paidAmount.toLocaleString()}</strong></div>
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
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Client Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>📊 By Department</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '4px' }}>
                  {DEPARTMENTS.filter(d => clients.some(c => c.department === d)).map(dept => (
                    <div key={dept} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{dept}:</span>
                      <strong>{clients.filter(c => c.department === dept).length}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>🏆 Top Clients by Revenue</div>
                <div style={{ fontSize: '12px', color: '#666', display: 'grid', gap: '4px' }}>
                  {clients
                    .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
                    .slice(0, 5)
                    .map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{idx + 1}. {c.name}</span>
                        <strong>SGD {c.totalInvoiced.toLocaleString()}</strong>
                      </div>
                    ))}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>⚠️ Payment Status</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Good Standing:</span>
                    <strong style={{ color: '#4CAF50' }}>{clients.filter(c => c.paymentStatus === 'good-standing').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending:</span>
                    <strong style={{ color: '#FF9800' }}>{clients.filter(c => c.paymentStatus === 'pending').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Overdue:</span>
                    <strong style={{ color: '#F44336' }}>{clients.filter(c => c.paymentStatus === 'overdue' || c.paymentStatus === 'delinquent').length}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClientManagementDashboard;
