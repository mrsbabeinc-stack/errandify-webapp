import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import DocumentUploadWithOCR from '../../components/DocumentUploadWithOCR';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  dateIssued: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  gstApplicable: boolean; // Ready for Sprint when enabled
  gstAmount: number; // $0 for now, ready to calculate when enabled
  totalAmount: number;
  paymentTerms: string;
  notes: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: string;
  paymentMethod?: string;
  createdDate: string;
  lastModified: string;
}

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  registrationNo?: string; // For future B2B company verification
}

interface ReceivablesReport {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
  invoiceCount: number;
  paidCount: number;
  outstandingCount: number;
  overdueCount: number;
}

const InvoicingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'invoices' | 'create' | 'receivables' | 'clients'>('invoices');

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [receivablesReport, setReceivablesReport] = useState<ReceivablesReport | null>(null);

  // Create invoice form
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [newLineItem, setNewLineItem] = useState({ description: '', quantity: 1, unitPrice: 0 });
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [invoiceForm, setInvoiceForm] = useState({
    dateIssued: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: 'Net 30',
    notes: '',
  });

  // New client form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  // Demo data
  useEffect(() => {
    const demoClients: ClientProfile[] = [
      {
        id: 'client_1',
        name: 'ABC Corporation',
        email: 'accounts@abccorp.sg',
        phone: '+65 6123 4567',
        address: '123 Business Park, Singapore 678901',
        registrationNo: 'UEN123456789A',
      },
      {
        id: 'client_2',
        name: 'XYZ Pte Ltd',
        email: 'finance@xyzcompany.sg',
        phone: '+65 6789 0123',
        address: '456 Enterprise Way, Singapore 567890',
        registrationNo: 'UEN987654321B',
      },
      {
        id: 'client_3',
        name: 'Tech Solutions Ltd',
        email: 'billing@techsolutions.sg',
        phone: '+65 6456 7890',
        registrationNo: 'UEN555666777C',
      },
    ];

    const demoInvoices: Invoice[] = [
      {
        id: 'inv_1',
        invoiceNo: 'INV-2026-0001',
        dateIssued: '2026-07-01',
        dueDate: '2026-07-31',
        clientName: 'ABC Corporation',
        clientEmail: 'accounts@abccorp.sg',
        clientPhone: '+65 6123 4567',
        lineItems: [
          {
            id: 'li_1',
            description: 'Project Management Services (July 2026)',
            quantity: 1,
            unitPrice: 5000,
            amount: 5000,
          },
          {
            id: 'li_2',
            description: 'Development Services (40 hours @ $150/hr)',
            quantity: 40,
            unitPrice: 150,
            amount: 6000,
          },
          {
            id: 'li_3',
            description: 'Support & Maintenance',
            quantity: 1,
            unitPrice: 1000,
            amount: 1000,
          },
        ],
        subtotal: 12000,
        gstApplicable: false,
        gstAmount: 0,
        totalAmount: 12000,
        paymentTerms: 'Net 30',
        notes: 'Monthly retainer agreement. Please remit payment by due date.',
        status: 'sent',
        createdDate: '2026-07-01',
        lastModified: '2026-07-01',
      },
      {
        id: 'inv_2',
        invoiceNo: 'INV-2026-0002',
        dateIssued: '2026-07-05',
        dueDate: '2026-08-04',
        clientName: 'XYZ Pte Ltd',
        clientEmail: 'finance@xyzcompany.sg',
        clientPhone: '+65 6789 0123',
        lineItems: [
          {
            id: 'li_4',
            description: 'Software License (Annual)',
            quantity: 1,
            unitPrice: 8000,
            amount: 8000,
          },
          {
            id: 'li_5',
            description: 'Setup & Configuration',
            quantity: 1,
            unitPrice: 2000,
            amount: 2000,
          },
        ],
        subtotal: 10000,
        gstApplicable: false,
        gstAmount: 0,
        totalAmount: 10000,
        paymentTerms: 'Net 30',
        notes: 'Annual license. Invoice sent as requested.',
        status: 'paid',
        paymentDate: '2026-07-15',
        paymentMethod: 'Bank Transfer',
        createdDate: '2026-07-05',
        lastModified: '2026-07-15',
      },
      {
        id: 'inv_3',
        invoiceNo: 'INV-2026-0003',
        dateIssued: '2026-07-08',
        dueDate: '2026-08-07',
        clientName: 'Tech Solutions Ltd',
        clientEmail: 'billing@techsolutions.sg',
        lineItems: [
          {
            id: 'li_6',
            description: 'Consulting Hours (20 hours @ $200/hr)',
            quantity: 20,
            unitPrice: 200,
            amount: 4000,
          },
        ],
        subtotal: 4000,
        gstApplicable: false,
        gstAmount: 0,
        totalAmount: 4000,
        paymentTerms: 'Net 30',
        notes: 'Consulting services rendered. Payment overdue.',
        status: 'overdue',
        createdDate: '2026-07-08',
        lastModified: '2026-07-08',
      },
    ];

    setClients(demoClients);
    setInvoices(demoInvoices);
    setSelectedClient(demoClients[0]);

    // Calculate receivables report
    const report: ReceivablesReport = {
      totalInvoiced: demoInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalPaid: demoInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalOutstanding: demoInvoices
        .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.totalAmount, 0),
      overdueAmount: demoInvoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.totalAmount, 0),
      invoiceCount: demoInvoices.length,
      paidCount: demoInvoices.filter(inv => inv.status === 'paid').length,
      outstandingCount: demoInvoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length,
      overdueCount: demoInvoices.filter(inv => inv.status === 'overdue').length,
    };
    setReceivablesReport(report);
  }, []);

  // Add line item
  const handleAddLineItem = () => {
    if (!newLineItem.description.trim() || newLineItem.quantity <= 0 || newLineItem.unitPrice <= 0) {
      showToast('Please fill in all line item fields', 'error');
      return;
    }

    const amount = newLineItem.quantity * newLineItem.unitPrice;
    const lineItem: InvoiceLineItem = {
      id: `li_${Date.now()}`,
      description: newLineItem.description,
      quantity: newLineItem.quantity,
      unitPrice: newLineItem.unitPrice,
      amount: Math.round(amount * 100) / 100,
    };

    setLineItems([...lineItems, lineItem]);
    setNewLineItem({ description: '', quantity: 1, unitPrice: 0 });
    showToast('✅ Line item added', 'success');
  };

  // Remove line item
  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(li => li.id !== id));
  };

  // Create invoice
  const handleCreateInvoice = () => {
    if (!selectedClient || lineItems.length === 0) {
      showToast('Select client and add line items', 'error');
      return;
    }

    const subtotal = Math.round(lineItems.reduce((sum, li) => sum + li.amount, 0) * 100) / 100;
    // GST calculation: currently $0, ready for enablement
    const gstAmount = 0; // Will be: subtotal * 0.09 when enabled
    const totalAmount = subtotal + gstAmount;

    const invoiceNo = `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNo,
      dateIssued: invoiceForm.dateIssued,
      dueDate: invoiceForm.dueDate,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      clientPhone: selectedClient.phone,
      lineItems,
      subtotal,
      gstApplicable: false, // Set to true when GST enabled
      gstAmount,
      totalAmount,
      paymentTerms: invoiceForm.paymentTerms,
      notes: invoiceForm.notes,
      status: 'draft',
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setInvoices([...invoices, newInvoice]);
    setLineItems([]);
    setNewLineItem({ description: '', quantity: 1, unitPrice: 0 });
    setInvoiceForm({
      dateIssued: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentTerms: 'Net 30',
      notes: '',
    });
    showToast(`✅ Invoice ${invoiceNo} created (Draft)`, 'success');
    setActiveTab('invoices');
  };

  // Add new client
  const handleAddClient = () => {
    if (!newClientForm.name.trim() || !newClientForm.email.trim()) {
      showToast('Please fill in client name and email', 'error');
      return;
    }

    const newClient: ClientProfile = {
      id: `client_${Date.now()}`,
      name: newClientForm.name,
      email: newClientForm.email,
      phone: newClientForm.phone,
      address: newClientForm.address,
    };

    setClients([...clients, newClient]);
    setNewClientForm({ name: '', email: '', phone: '', address: '' });
    setShowNewClientForm(false);
    showToast('✅ Client added', 'success');
  };

  // Send invoice
  const handleSendInvoice = (invoiceId: string) => {
    setInvoices(
      invoices.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'sent', lastModified: new Date().toISOString() }
          : inv
      )
    );
    showToast('📧 Invoice sent to client', 'success');
  };

  // Mark as paid
  const handleMarkPaid = (invoiceId: string) => {
    setInvoices(
      invoices.map(inv =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'paid',
              paymentDate: new Date().toISOString().split('T')[0],
              paymentMethod: 'Bank Transfer',
              lastModified: new Date().toISOString(),
            }
          : inv
      )
    );
    showToast('✅ Invoice marked as paid', 'success');
  };

  // Export PDF
  const handleExportPDF = (invoiceNo: string) => {
    showToast(`📥 Exporting ${invoiceNo} as PDF...`, 'success');
  };

  // Duplicate invoice
  const handleDuplicateInvoice = (invoiceId: string) => {
    const original = invoices.find(inv => inv.id === invoiceId);
    if (!original) return;

    const invoiceNo = `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`;
    const duplicate: Invoice = {
      ...original,
      id: `inv_${Date.now()}`,
      invoiceNo,
      status: 'draft',
      dateIssued: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setInvoices([...invoices, duplicate]);
    showToast(`✅ Invoice duplicated as ${invoiceNo}`, 'success');
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const gstAmount = 0; // Ready for calculation when enabled
  const totalInvoiceAmount = subtotal + gstAmount;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              📋 Invoicing System
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
            Invoice Generation, Receivables Tracking, Client Management
          </p>
        </div>

        {/* Compliance Banner */}
        <div style={{ padding: '12px 16px', background: '#FFF3E4', border: '2px solid #B5651D', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#B5651D' }}>
          <strong>🇸🇬 ACRA Invoice Compliance:</strong> Sequential invoice numbering maintained. GST fields ready for implementation (currently disabled). All invoices tracked in Accounts Receivable ledger.
        </div>

        {/* KPI Cards */}
        {receivablesReport && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Invoiced</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#F0A81E' }}>
                SGD ${receivablesReport.totalInvoiced.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{receivablesReport.invoiceCount} invoices</div>
            </div>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Paid</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#4CAF50' }}>
                SGD ${receivablesReport.totalPaid.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{receivablesReport.paidCount} invoices paid</div>
            </div>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Outstanding</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF6B35' }}>
                SGD ${receivablesReport.totalOutstanding.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{receivablesReport.outstandingCount} pending</div>
            </div>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Overdue</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#F44336' }}>
                SGD ${receivablesReport.overdueAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{receivablesReport.overdueCount} overdue</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['invoices', 'create', 'receivables', 'clients'] as const).map(tab => (
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
              {tab === 'invoices' && '📋 Invoices'}
              {tab === 'create' && '➕ Create Invoice'}
              {tab === 'receivables' && '💰 Receivables'}
              {tab === 'clients' && '👥 Clients'}
            </button>
          ))}
        </div>

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>All Invoices</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {invoices.map(invoice => (
                  <div key={invoice.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#333', marginBottom: '4px' }}>
                          {invoice.invoiceNo}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                          {invoice.clientName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', display: 'grid', gap: '2px' }}>
                          <div>📅 Issued: {new Date(invoice.dateIssued).toLocaleDateString('en-SG')}</div>
                          <div>🔔 Due: {new Date(invoice.dueDate).toLocaleDateString('en-SG')}</div>
                          {invoice.paymentDate && <div>✓ Paid: {new Date(invoice.paymentDate).toLocaleDateString('en-SG')}</div>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
                          SGD ${invoice.totalAmount.toLocaleString()}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background:
                            invoice.status === 'paid' ? '#E8F5E9' : invoice.status === 'sent' ? '#FFF3E4' : invoice.status === 'overdue' ? '#FFEBEE' : '#F5F5F5',
                          color:
                            invoice.status === 'paid' ? '#2E7D32' : invoice.status === 'sent' ? '#B5651D' : invoice.status === 'overdue' ? '#C62828' : '#666',
                          marginBottom: '8px',
                        }}>
                          {invoice.status === 'paid' && '✓ PAID'}
                          {invoice.status === 'sent' && '📧 SENT'}
                          {invoice.status === 'overdue' && '⚠️ OVERDUE'}
                          {invoice.status === 'draft' && '📝 DRAFT'}
                          {invoice.status === 'cancelled' && '✗ CANCELLED'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleExportPDF(invoice.invoiceNo)}
                        style={{
                          padding: '6px 12px',
                          background: '#F0A81E',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        📄 PDF
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => handleSendInvoice(invoice.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          📧 Send
                        </button>
                      )}
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button
                          onClick={() => handleMarkPaid(invoice.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          ✓ Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicateInvoice(invoice.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#FF9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        📋 Duplicate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CREATE INVOICE TAB */}
        {activeTab === 'create' && (
          <div>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>Create New Invoice</h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Client Selection */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Select Client
                  </label>
                  <select
                    value={selectedClient?.id || ''}
                    onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.dateIssued}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, dateIssued: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Payment Terms */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Payment Terms
                  </label>
                  <select
                    value={invoiceForm.paymentTerms}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentTerms: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Payment instructions, terms, thank you note..."
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '6px',
                      fontSize: '13px',
                      minHeight: '60px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Line Items</h3>

              {/* Add Line Item Form */}
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '12px' }}>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Description (e.g., Project Management Services)"
                    value={newLineItem.description}
                    onChange={(e) => setNewLineItem({ ...newLineItem, description: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Quantity</label>
                      <input
                        type="number"
                        value={newLineItem.quantity}
                        onChange={(e) => setNewLineItem({ ...newLineItem, quantity: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Unit Price (SGD)</label>
                      <input
                        type="number"
                        value={newLineItem.unitPrice}
                        onChange={(e) => setNewLineItem({ ...newLineItem, unitPrice: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Amount</label>
                      <div style={{ padding: '10px 12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        SGD ${(newLineItem.quantity * newLineItem.unitPrice).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={handleAddLineItem}
                      style={{
                        padding: '10px 16px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Line Items List */}
              {lineItems.length > 0 && (
                <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                  {lineItems.map(li => (
                    <div key={li.id} style={{ padding: '12px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '2px' }}>{li.description}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {li.quantity} × SGD ${li.unitPrice.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', minWidth: '100px', textAlign: 'right' }}>
                          SGD ${li.amount.toLocaleString()}
                        </div>
                        <button
                          onClick={() => handleRemoveLineItem(li.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#F44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice Summary */}
            {lineItems.length > 0 && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #FFD9B3' }}>
                    <span>Subtotal</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>SGD ${subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '11px', marginBottom: '8px' }}>
                    <span>GST (Ready for implementation)</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${gstAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #FF6B35', fontWeight: '700', fontSize: '14px', color: '#333' }}>
                    <span>TOTAL</span>
                    <span style={{ fontFamily: 'monospace' }}>SGD ${totalInvoiceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateInvoice}
              disabled={lineItems.length === 0}
              style={{
                width: '100%',
                padding: '12px',
                background: lineItems.length > 0 ? '#FF6B35' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: lineItems.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
              }}
            >
              Create Invoice (Draft)
            </button>
          </div>
        )}

        {/* RECEIVABLES TAB */}
        {activeTab === 'receivables' && receivablesReport && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Aging Report */}
              <div style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Accounts Receivable Aging</h3>
                <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
                  <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px' }}>
                    <div style={{ color: '#666', marginBottom: '4px' }}>Total Outstanding</div>
                    <div style={{ fontWeight: '700', fontSize: '18px', color: '#FF6B35' }}>
                      SGD ${receivablesReport.totalOutstanding.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: '#FFF3E0', borderRadius: '6px', border: '2px solid #FF9800' }}>
                    <div style={{ color: '#666', marginBottom: '4px' }}>🔴 Overdue (30+ days)</div>
                    <div style={{ fontWeight: '700', fontSize: '18px', color: '#F44336' }}>
                      SGD ${receivablesReport.overdueAmount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                      {receivablesReport.overdueCount} invoice(s)
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px' }}>
                    <div style={{ color: '#666', marginBottom: '4px' }}>📧 Pending Payment</div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#F0A81E' }}>
                      SGD ${(receivablesReport.totalOutstanding - receivablesReport.overdueAmount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                      {receivablesReport.outstandingCount - receivablesReport.overdueCount} invoice(s)
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection Metrics */}
              <div style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Collection Metrics</h3>
                <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: '#666', marginBottom: '4px' }}>Collection Rate</div>
                    <div style={{ fontWeight: '700', fontSize: '18px', color: '#4CAF50' }}>
                      {((receivablesReport.totalPaid / receivablesReport.totalInvoiced) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                      {receivablesReport.paidCount} of {receivablesReport.invoiceCount} paid
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#666', marginBottom: '4px' }}>Days Sales Outstanding (DSO)</div>
                    <div style={{ fontWeight: '700', fontSize: '18px', color: '#F0A81E' }}>
                      ~30 days
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                      Average time to collect
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overdue Invoices Alert */}
            {receivablesReport.overdueCount > 0 && (
              <div style={{ padding: '16px', background: '#FFEBEE', borderRadius: '8px', border: '2px solid #F44336', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#C62828', marginBottom: '8px' }}>
                  ⚠️ {receivablesReport.overdueCount} Overdue Invoice(s)
                </div>
                <div style={{ fontSize: '12px', color: '#B71C1C' }}>
                  SGD ${receivablesReport.overdueAmount.toLocaleString()} outstanding. Consider sending payment reminders.
                </div>
              </div>
            )}
          </div>
        )}

        {/* CLIENTS TAB */}
        {activeTab === 'clients' && (
          <div>
            <button
              onClick={() => setShowNewClientForm(!showNewClientForm)}
              style={{
                padding: '10px 16px',
                background: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
                fontSize: '14px',
              }}
            >
              + Add Client
            </button>

            {showNewClientForm && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>Add New Client</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Client Name *"
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <textarea
                    placeholder="Address"
                    value={newClientForm.address}
                    onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '60px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleAddClient}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Save Client
                    </button>
                    <button
                      onClick={() => setShowNewClientForm(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Clients List */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {clients.map(client => (
                <div key={client.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#333', marginBottom: '4px' }}>
                    {client.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', display: 'grid', gap: '2px' }}>
                    <div>📧 {client.email}</div>
                    {client.phone && <div>📱 {client.phone}</div>}
                    {client.address && <div>📍 {client.address}</div>}
                    {client.registrationNo && <div>🔐 UEN: {client.registrationNo}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default InvoicingDashboard;
