import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Invoice {
  invoice_id: number;
  invoice_number: string;
  party: string;
  party_uen?: string;
  type: 'payable' | 'receivable';
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  days_outstanding: number;
  notes?: string;
  gst_amount?: number;
  document_url?: string;
  document_type?: string;
  created_date: string;
}

const APARDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'all' | 'payable' | 'receivable'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'partial'>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'create'>('overview');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    invoice_number: '',
    party: '',
    party_uen: '',
    type: 'payable' as 'payable' | 'receivable',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: '',
    gst_amount: '',
    paid_amount: '0',
    notes: '',
    currency: 'SGD',
  });

  useEffect(() => {
    loadInvoices();
  }, [invoiceType, selectedStatus]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('invoices');
      let mockInvoices: Invoice[] = [
        {
          invoice_id: 1,
          invoice_number: 'INV-2026-001',
          party: 'TechSupplies Ltd',
          party_uen: 'UEN123456789',
          type: 'payable',
          invoice_date: '2026-07-01',
          due_date: '2026-07-31',
          amount: 5000,
          paid_amount: 0,
          status: 'pending',
          days_outstanding: 14,
          gst_amount: 350,
          created_date: new Date().toISOString(),
        },
        {
          invoice_id: 2,
          invoice_number: 'INV-2026-002',
          party: 'Office Furniture Co',
          party_uen: 'UEN987654321',
          type: 'payable',
          invoice_date: '2026-06-15',
          due_date: '2026-07-15',
          amount: 8500,
          paid_amount: 0,
          status: 'overdue',
          days_outstanding: 30,
          gst_amount: 595,
          created_date: new Date().toISOString(),
        },
        {
          invoice_id: 3,
          invoice_number: 'INV-2026-003',
          party: 'Utilities Provider',
          party_uen: 'UEN555555555',
          type: 'payable',
          invoice_date: '2026-07-05',
          due_date: '2026-07-20',
          amount: 2000,
          paid_amount: 2000,
          status: 'paid',
          days_outstanding: 0,
          gst_amount: 140,
          created_date: new Date().toISOString(),
        },
        {
          invoice_id: 4,
          invoice_number: 'INV-2026-004',
          party: 'Marketing Agency',
          party_uen: 'UEN444444444',
          type: 'payable',
          invoice_date: '2026-06-20',
          due_date: '2026-07-20',
          amount: 12000,
          paid_amount: 6000,
          status: 'partial',
          days_outstanding: 25,
          gst_amount: 840,
          created_date: new Date().toISOString(),
        },
        {
          invoice_id: 5,
          invoice_number: 'INV-2026-AR001',
          party: 'ABC Corporation',
          party_uen: 'UEN111111111',
          type: 'receivable',
          invoice_date: '2026-06-15',
          due_date: '2026-07-15',
          amount: 15000,
          paid_amount: 0,
          status: 'overdue',
          days_outstanding: 30,
          gst_amount: 1050,
          created_date: new Date().toISOString(),
        },
        {
          invoice_id: 6,
          invoice_number: 'INV-2026-AR002',
          party: 'XYZ Services Ltd',
          party_uen: 'UEN222222222',
          type: 'receivable',
          invoice_date: '2026-07-01',
          due_date: '2026-07-31',
          amount: 22000,
          paid_amount: 22000,
          status: 'paid',
          days_outstanding: 0,
          gst_amount: 1540,
          created_date: new Date().toISOString(),
        },
        {
          invoice_id: 7,
          invoice_number: 'INV-2026-AR003',
          party: 'Global Trading Inc',
          party_uen: 'UEN333333333',
          type: 'receivable',
          invoice_date: '2026-07-05',
          due_date: '2026-08-05',
          amount: 18500,
          paid_amount: 0,
          status: 'pending',
          days_outstanding: 10,
          gst_amount: 1295,
          created_date: new Date().toISOString(),
        },
        {
          invoice_id: 8,
          invoice_number: 'INV-2026-AR004',
          party: 'Local Enterprises',
          party_uen: 'UEN666666666',
          type: 'receivable',
          invoice_date: '2026-06-01',
          due_date: '2026-07-01',
          amount: 9000,
          paid_amount: 5000,
          status: 'partial',
          days_outstanding: 45,
          gst_amount: 630,
          created_date: new Date().toISOString(),
        },
      ];

      if (saved) {
        const savedInvoices = JSON.parse(saved);
        mockInvoices = [...mockInvoices, ...savedInvoices];
      }

      let filtered = mockInvoices;
      if (invoiceType !== 'all') {
        filtered = filtered.filter(inv => inv.type === invoiceType);
      }
      if (selectedStatus !== 'all') {
        filtered = filtered.filter(inv => inv.status === selectedStatus);
      }

      setInvoices(filtered);
    } catch (error) {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('❌ File size must be less than 10MB', 'error');
        return;
      }

      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(`📄 ${file.name}`);
      }
    }
  };

  const handleCreateInvoice = async () => {
    // Validate required fields
    if (!formData.invoice_number || !formData.party || !formData.party_uen || !formData.amount) {
      showToast('❌ Please fill all required fields (*)', 'error');
      return;
    }

    if (!selectedFile) {
      showToast('❌ Please attach invoice document', 'error');
      return;
    }

    try {
      // In a real app, you'd upload to a server/cloud storage
      // For now, we'll store as base64 for demo
      const reader = new FileReader();
      reader.onload = async () => {
        const documentUrl = reader.result as string;

        const newInvoice: Invoice = {
          invoice_id: Date.now(),
          invoice_number: formData.invoice_number,
          party: formData.party,
          party_uen: formData.party_uen,
          type: formData.type,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          amount: Number(formData.amount),
          paid_amount: Number(formData.paid_amount),
          gst_amount: Number(formData.gst_amount) || 0,
          status: Number(formData.paid_amount) >= Number(formData.amount)
            ? 'paid'
            : Number(formData.paid_amount) > 0
            ? 'partial'
            : 'pending',
          days_outstanding: Math.floor((new Date(formData.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          document_url: documentUrl,
          document_type: selectedFile.type,
          notes: formData.notes,
          created_date: new Date().toISOString(),
        };

        const saved = localStorage.getItem('invoices') || '[]';
        const allInvoices = JSON.parse(saved);
        allInvoices.push(newInvoice);
        localStorage.setItem('invoices', JSON.stringify(allInvoices));

        showToast(`✅ Invoice ${formData.invoice_number} created successfully`, 'success');

        // Reset form
        setFormData({
          invoice_number: '',
          party: '',
          party_uen: '',
          type: 'payable',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: '',
          gst_amount: '',
          paid_amount: '0',
          notes: '',
          currency: 'SGD',
        });
        setSelectedFile(null);
        setFilePreview('');

        setViewMode('overview');
        loadInvoices();
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      showToast('❌ Failed to create invoice', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string; text: string; icon: string } } = {
      paid: { bg: '#E8F5E9', color: '#2E7D32', text: 'Paid', icon: '✓' },
      pending: { bg: '#FFF3E4', color: '#D98C0C', text: 'Pending', icon: '⏳' },
      overdue: { bg: '#FFEBEE', color: '#C62828', text: 'Overdue', icon: '⚠' },
      partial: { bg: '#FFF3E0', color: '#E65100', text: 'Partial', icon: '◐' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span
        style={{
          padding: '4px 8px',
          background: style.bg,
          color: style.color,
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
        }}
      >
        {style.icon} {style.text}
      </span>
    );
  };

  if (viewMode === 'create') {
    return (
      <AdminLayout>
        <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
          <ToastContainer toasts={toasts} onClose={removeToast} />

          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
                ➕ New Invoice
              </h1>
              <button
                onClick={() => setViewMode('overview')}
                style={{
                  fontSize: '20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#FF6B35',
                  fontWeight: '700',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              {/* Required Fields Notice */}
              <div style={{ padding: '12px', background: '#FFF3E4', borderRadius: '4px', marginBottom: '16px', borderLeft: '4px solid #D98C0C' }}>
                <p style={{ fontSize: '11px', color: '#B5651D', margin: 0 }}>
                  <strong>* = Required fields (Singapore IRAS/MOM compliance)</strong>
                </p>
              </div>

              {/* Type Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  Invoice Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { value: 'payable' as const, label: '📤 Payable (Vendor Invoice)' },
                    { value: 'receivable' as const, label: '📥 Receivable (Customer Invoice)' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFormData({ ...formData, type: opt.value })}
                      style={{
                        padding: '10px',
                        background: formData.type === opt.value ? '#FF6B35' : '#f0f0f0',
                        color: formData.type === opt.value ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Invoice Number */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                  Invoice Number * (e.g., INV-2026-001)
                </label>
                <input
                  type="text"
                  placeholder="INV-2026-001"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Party & UEN */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    {formData.type === 'payable' ? 'Vendor Name' : 'Customer Name'} *
                  </label>
                  <input
                    type="text"
                    placeholder="ABC Suppliers Ltd"
                    value={formData.party}
                    onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    UEN/Registration * (SG)
                  </label>
                  <input
                    type="text"
                    placeholder="UEN123456789"
                    value={formData.party_uen}
                    onChange={(e) => setFormData({ ...formData, party_uen: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    Invoice Date * (IRAS)
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    Due Date * (Payment terms)
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    Amount ({formData.currency}) *
                  </label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    GST/VAT (7%) (IRAS)
                  </label>
                  <input
                    type="number"
                    placeholder="700"
                    value={formData.gst_amount}
                    onChange={(e) => setFormData({ ...formData, gst_amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    Paid Amount
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Document Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  📎 Invoice Document * (MOM/IRAS required)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <label
                    style={{
                      padding: '16px',
                      border: '2px dashed #FF6B35',
                      borderRadius: '4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#FFF3E0',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#E65100',
                    }}
                  >
                    📁 Upload File
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      style={{ display: 'none' }}
                    />
                  </label>
                  <label
                    style={{
                      padding: '16px',
                      border: '2px dashed #F0A81E',
                      borderRadius: '4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#FFF3E4',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#D98C0C',
                    }}
                  >
                    📷 Take Photo
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                {filePreview && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#E8F5E9',
                      borderRadius: '4px',
                      border: '1px solid #4CAF50',
                      fontSize: '12px',
                      color: '#2E7D32',
                    }}
                  >
                    {typeof filePreview === 'string' && filePreview.startsWith('data:image') ? (
                      <img src={filePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                    ) : (
                      <div>✓ {selectedFile?.name} ({(selectedFile?.size || 0 / 1024).toFixed(1)}KB)</div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                  Notes/Reference
                </label>
                <textarea
                  placeholder="Add notes (PO reference, payment terms, etc.)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Compliance Notice */}
              <div style={{ padding: '12px', background: '#FFF3E0', borderRadius: '4px', marginBottom: '24px', borderLeft: '4px solid #FF6B35' }}>
                <p style={{ fontSize: '11px', color: '#E65100', margin: 0, lineHeight: '1.5' }}>
                  <strong>🇸🇬 Singapore Compliance:</strong> This invoice captures all required MOM/IRAS fields: Invoice number, date, party UEN, amounts, GST, and supporting document for audit trail.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => {
                    setViewMode('overview');
                    setSelectedFile(null);
                    setFilePreview('');
                  }}
                  style={{
                    padding: '12px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  style={{
                    padding: '12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  ✓ Create Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const payables = invoices.filter(inv => inv.type === 'payable');
  const receivables = invoices.filter(inv => inv.type === 'receivable');

  const payablesTotal = payables.reduce((sum, inv) => sum + inv.amount, 0);
  const payablesPaid = payables.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const payablesOutstanding = payablesTotal - payablesPaid;

  const receivablesTotal = receivables.reduce((sum, inv) => sum + inv.amount, 0);
  const receivablesPaid = receivables.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const receivablesOutstanding = receivablesTotal - receivablesPaid;

  const overdueAP = payables.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.amount - inv.paid_amount), 0);
  const overdueAR = receivables.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.amount - inv.paid_amount), 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
              💳 Accounts Payable & Receivable
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Track vendor invoices and customer payments (MOM/IRAS Compliant)
            </p>
          </div>
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
          >
            ←
          </button>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Payables Total', value: `SGD ${payablesTotal.toLocaleString()}`, color: '#F44336', icon: '📤' },
            { label: 'Payables Outstanding', value: `SGD ${payablesOutstanding.toLocaleString()}`, color: '#FF9800', icon: '⏳' },
            { label: 'Receivables Total', value: `SGD ${receivablesTotal.toLocaleString()}`, color: '#4CAF50', icon: '📥' },
            { label: 'Receivables Outstanding', value: `SGD ${receivablesOutstanding.toLocaleString()}`, color: '#F0A81E', icon: '⏳' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${stat.color}`,
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Risk Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Overdue Payables', value: `SGD ${overdueAP.toLocaleString()}`, color: '#F44336', icon: '⚠' },
            { label: 'Overdue Receivables', value: `SGD ${overdueAR.toLocaleString()}`, color: '#FF9800', icon: '⚠' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${stat.color}`,
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '28px' }}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>{stat.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>Type:</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { value: 'all' as const, label: 'All' },
              { value: 'payable' as const, label: 'Payables' },
              { value: 'receivable' as const, label: 'Receivables' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setInvoiceType(opt.value)}
                style={{
                  padding: '6px 12px',
                  background: invoiceType === opt.value ? '#FF6B35' : '#f0f0f0',
                  color: invoiceType === opt.value ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginLeft: '16px' }}>Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="partial">Partial</option>
          </select>

          <button
            onClick={() => setViewMode('create')}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ➕ New Invoice
          </button>
        </div>

        {/* Invoices Table */}
        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Invoice #</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Party / UEN</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Invoice Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Due Date</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>GST</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Outstanding</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Doc</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                    No invoices found. Create one to get started!
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.invoice_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>
                      {invoice.invoice_number}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                      {invoice.party}
                      <div style={{ fontSize: '10px', color: '#999' }}>{invoice.party_uen}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                      {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                      {new Date(invoice.due_date).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                      SGD {invoice.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#999' }}>
                      SGD {(invoice.gst_amount || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#F44336' }}>
                      SGD {(invoice.amount - invoice.paid_amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '16px' }}>
                      {invoice.document_url ? '📎' : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info Box */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF6B35' }}>
          <p style={{ fontSize: '12px', color: '#E65100', margin: 0, lineHeight: '1.6' }}>
            <strong>🇸🇬 Compliance Note:</strong> All invoices require: Invoice number, party UEN, dates, amounts, GST, and supporting document for MOM/IRAS audit trail and GST filing.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default APARDashboard;
