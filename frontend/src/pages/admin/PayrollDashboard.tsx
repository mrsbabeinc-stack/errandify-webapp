import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI, { n, PayrollItem, PayrollRun, PaymentBatch, BankReadinessRow, OnboardingStatusRow, OnboardingInvite, CPFSummary, ComplianceStatus } from '../../services/financeAPI';

interface Staff {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  baseSalary: number;
  transportAllowance: number;
  housingAllowance: number;
  otherAllowances: number;
  cpfMembershipNo: string;
  employmentType: 'permanent' | 'contract' | 'part-time' | 'temporary';
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
}

interface CPFPreview {
  ordinaryWage: number;
  additionalWage: number;
  employeeTotal: number;
  employerTotal: number;
  rateEmployee: number;
  rateEmployer: number;
  owCeiling: number;
  ageBand: string;
  cpfStatus: string;
  age: number;
}

interface TaxBreakdown {
  annualGross: number;
  monthlyGross: number;
  annualCPFDeduction: number;
  taxableIncome: number;
  monthlyTax: number;
  annualTax: number;
  taxRate: number;
}

interface Payslip {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  year: number;
  baseSalary: number;
  transportAllowance: number;
  housingAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  cpfEmployee: number;
  incomeTax: number;
  leaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  cpfEmployer: number;
  cpfRateEmployee: number | null;
  taxBreakdown: TaxBreakdown;
  generatedDate: string;
  paymentDate: string;
  status: 'draft' | 'generated' | 'sent' | 'paid';
}

/** "2026-07" -> "July 2026" */
const monthLabel = (period: string): string => {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
};

/** Server payroll item -> the shape this screen renders. */
const toPayslip = (item: PayrollItem & { period?: string; payment_date?: string | null }): Payslip => {
  const period = item.period || '';
  const [year] = period.split('-').map(Number);
  return {
    id: String(item.id),
    staffId: item.staff_id,
    staffName: item.staff_name,
    // Just the month name: the JSX renders `{month} {year}` alongside it.
    month: period ? monthLabel(period).replace(/\s+\d{4}$/, '') : '',
    year: year || new Date().getFullYear(),
    baseSalary: n(item.base_salary),
    transportAllowance: n(item.transport_allowance),
    housingAllowance: n(item.housing_allowance),
    otherAllowances: n(item.other_allowances),
    grossSalary: n(item.gross_salary),
    cpfEmployee: n(item.cpf_employee),
    incomeTax: n(item.income_tax),
    leaveDeduction: n(item.leave_deduction),
    totalDeductions: n(item.total_deductions),
    netSalary: n(item.net_salary),
    cpfEmployer: n(item.cpf_employer),
    cpfRateEmployee: item.cpf_rate_employee != null ? n(item.cpf_rate_employee) : null,
    taxBreakdown: item.tax_breakdown as TaxBreakdown,
    generatedDate: period,
    paymentDate: item.payment_date || '',
    status: (item.status as Payslip['status']) || 'generated',
  };
};

const money = (v: unknown) =>
  (Number(v) || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const thL: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 };
const thC: React.CSSProperties = { ...thL, textAlign: 'center' };
const thR: React.CSSProperties = { ...thL, textAlign: 'right' };
const tdC: React.CSSProperties = { padding: '10px 12px', textAlign: 'center', fontSize: '12px', color: '#666' };
const tdR: React.CSSProperties = { padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#333' };

const BATCH_STEPS: Record<string, { label: string; bg: string; fg: string }> = {
  awaiting_approval: { label: 'AWAITING APPROVAL', bg: '#FFF3E0', fg: '#E65100' },
  approved: { label: 'APPROVED — READY TO SEND', bg: '#E3F2FD', fg: '#0D47A1' },
  exported: { label: 'WITH THE BANK', bg: '#EDE7F6', fg: '#4527A0' },
  settled: { label: 'PAID', bg: '#E8F5E9', fg: '#2E7D32' },
  cancelled: { label: 'CANCELLED', bg: '#FFEBEE', fg: '#C62828' },
};

const btn = (bg: string): React.CSSProperties => ({
  padding: '8px 14px', background: bg, color: 'white', border: 'none',
  borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
});
const btnOutline = (colour: string): React.CSSProperties => ({
  padding: '8px 14px', background: '#fff', color: colour, border: `1px solid ${colour}`,
  borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
});

const PayrollDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'salary-setup' | 'payroll-run' | 'payslips' | 'payments' | 'employer-cost' | 'compliance'>('salary-setup');

  // Staff state
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  // Salary setup form
  const [salaryForm, setSalaryForm] = useState({
    transportAllowance: 0,
    housingAllowance: 0,
    otherAllowances: 0,
  });

  // Payroll run state
  const [payrollMonth, setPayrollMonth] = useState<string>(new Date().toISOString().split('T')[0]);
  const [generatedPayslips, setGeneratedPayslips] = useState<Payslip[]>([]);
  const [currentRun, setCurrentRun] = useState<PayrollRun | null>(null);

  const [loading, setLoading] = useState(true);

  /**
   * Real staff and payslips. This screen used to hold three hardcoded employees
   * and generate payslips into React state — the numbers were never stored, so
   * a payroll "run" was a rendering, not a record.
   */
  const loadAll = async () => {
    try {
      setLoading(true);
      const [staffRows, payslipRows] = await Promise.all([
        financeAPI.payrollStaff(),
        financeAPI.payslips(),
      ]);

      const mapped: Staff[] = staffRows.map(s => ({
        id: String(s.id),
        staffId: s.staff_id,
        firstName: s.first_name,
        lastName: s.last_name,
        baseSalary: n(s.base_salary),
        transportAllowance: n(s.transport_allowance),
        housingAllowance: n(s.housing_allowance),
        otherAllowances: n(s.other_allowances),
        cpfMembershipNo: s.cpf_membership_no || '',
        employmentType: (s.employment_type as Staff['employmentType']) || 'permanent',
        status: (String(s.status || '').toLowerCase() as Staff['status']) || 'active',
      }));
      setStaff(mapped);
      // Seed the edit form from whoever is selected. Without this the three
      // allowance inputs sat at 0 on load, so the "Total Monthly Compensation"
      // preview read zero for a staff member who had allowances, and saving
      // without touching the dropdown would have wiped them.
      const keep = selectedStaff ? mapped.find(m => m.id === selectedStaff.id) : null;
      const active = keep || mapped[0] || null;
      setSelectedStaff(active);
      if (active) {
        setSalaryForm({
          transportAllowance: active.transportAllowance,
          housingAllowance: active.housingAllowance,
          otherAllowances: active.otherAllowances,
        });
      }

      setPayslips(payslipRows.map(toPayslip));
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load payroll'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Preview only. The payslip figures that get stored are computed by
   * services/financeService.ts on the server — this mirrors those rates so the
   * setup screen can show the split live, and must be kept in step with it.
   * Income tax is deliberately not modelled here: Singapore has no PAYE, so
   * nothing is withheld and the old browser-side calculation was subtracting a
   * tax that no employer actually deducts.
   */
  /**
   * CPF preview for the selected employee, computed by the SERVER.
   *
   * There used to be a second implementation of the rates here, in the browser.
   * It disagreed with nothing at the time only because the server copied the
   * same wrong numbers. Statutory rates belong in one place: financeService.ts.
   */
  const [cpfPreview, setCpfPreview] = useState<CPFPreview | null>(null);
  const [cpfPreviewError, setCpfPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStaff) { setCpfPreview(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setCpfPreviewError(null);
        const preview = await financeAPI.cpfPreview(selectedStaff.staffId, payrollMonth.slice(0, 7));
        if (!cancelled) setCpfPreview(preview);
      } catch (err) {
        if (!cancelled) {
          setCpfPreview(null);
          setCpfPreviewError(err instanceof Error ? err.message : 'CPF could not be computed');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedStaff, payrollMonth]);

  /** Downloads the payslip as CSV. The button previously did nothing at all. */
  const downloadPayslip = (payslip: Payslip) => {
    const rows: (string | number)[][] = [
      ['Payslip', `${payslip.staffId} — ${payslip.staffName}`],
      ['Period', `${payslip.month} ${payslip.year}`],
      ['Payment date', payslip.paymentDate],
      [],
      ['Earnings', 'SGD'],
      ['Base salary', payslip.baseSalary],
      ['Transport allowance', payslip.transportAllowance],
      ['Housing allowance', payslip.housingAllowance],
      ['Other allowances', payslip.otherAllowances],
      ['Gross salary', payslip.grossSalary],
      [],
      ['Deductions', 'SGD'],
      ['CPF (employee)', payslip.cpfEmployee],
      ['Unpaid leave', payslip.leaveDeduction],
      ['Total deductions', payslip.totalDeductions],
      [],
      ['Net salary', payslip.netSalary],
      [],
      ['Employer CPF (not deducted from pay)', payslip.cpfEmployer ?? 0],
      ['Projected annual income tax (NOT withheld — no PAYE in Singapore)', payslip.taxBreakdown?.annualTax ?? 0],
    ];
    const escape = (v: string | number) => {
      const str = String(v ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csv = rows.map(r => r.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslip-${payslip.staffId}-${payslip.generatedDate || payslip.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };


  // ---- What the employer pays -------------------------------------------
  const [costPeriod, setCostPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [cpfSummary, setCpfSummary] = useState<CPFSummary | null>(null);
  const [employerProfile, setEmployerProfile] = useState<{ missing: string[] } | null>(null);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [ir8aYear, setIr8aYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    financeAPI.complianceStatus().then(setCompliance).catch(() => setCompliance(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [summary, profile] = await Promise.all([
          financeAPI.cpfSummary(costPeriod),
          financeAPI.employerProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setCpfSummary(summary);
        if (profile) setEmployerProfile({ missing: profile.missing });
      } catch (err) {
        if (!cancelled) showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load costs'}`, 'error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costPeriod]);

  // ---- Paying staff -------------------------------------------------------
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [bankReadiness, setBankReadiness] = useState<BankReadinessRow[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatusRow[]>([]);
  const [inviteLink, setInviteLink] = useState<OnboardingInvite | null>(null);

  const loadPayments = async () => {
    try {
      const [b, r, ready, onb] = await Promise.all([
        financeAPI.paymentBatches(),
        financeAPI.payrollRuns(),
        financeAPI.bankReadiness(),
        financeAPI.onboardingStatus().catch(() => ({ staff: [] as OnboardingStatusRow[] })),
      ]);
      setBatches(b);
      setPayrollRuns(r);
      setBankReadiness(ready.staff);
      setOnboarding(onb.staff);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load payments'}`, 'error');
    }
  };

  /**
   * Issues an onboarding link. The token comes back once and is only hashed
   * server-side, so it is put on screen to copy rather than stored anywhere.
   */
  const handleSendOnboarding = async (row: OnboardingStatusRow) => {
    try {
      const invite = await financeAPI.createOnboardingInvite(row.staff_id);
      setInviteLink(invite);
      showToast(`✅ Link created for ${row.staff_name} — copy it now, it is not shown again`, 'success');
      await loadPayments();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to create invite'}`, 'error');
    }
  };

  const handleCreateBatch = async (run: PayrollRun) => {
    try {
      const batch = await financeAPI.createPaymentBatch(run.id);
      showToast(`✅ ${batch.reference} created — it needs a second admin to approve it`, 'success');
      await loadPayments();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to create batch'}`, 'error');
    }
  };

  const handleApproveBatch = async (batch: PaymentBatch) => {
    try {
      await financeAPI.approvePaymentBatch(batch.id);
      showToast(`✅ ${batch.reference} approved`, 'success');
      await loadPayments();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to approve'}`, 'error');
    }
  };

  const handleCancelBatch = async (batch: PaymentBatch) => {
    const reason = window.prompt(`Cancel ${batch.reference}? Give a reason for the record:`);
    if (reason === null) return;
    try {
      await financeAPI.cancelPaymentBatch(batch.id, reason || undefined);
      showToast(`${batch.reference} cancelled`, 'success');
      await loadPayments();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to cancel'}`, 'error');
    }
  };

  const handleExportBatch = async (batch: PaymentBatch) => {
    try {
      await financeAPI.exportPaymentBatch(batch.id, batch.reference);
      showToast(`📥 ${batch.reference}.csv downloaded — upload it in your bank's portal`, 'success');
      await loadPayments();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to export'}`, 'error');
    }
  };

  const handleSettleBatch = async (batch: PaymentBatch) => {
    const ref = window.prompt(
      `Record settlement for ${batch.reference}.\n\nEnter the reference your bank gave for this batch — it is the evidence the money went out:`
    );
    if (!ref) return;
    try {
      const result = await financeAPI.settlePaymentBatch(batch.id, ref.trim());
      showToast(
        `✅ ${result.paid_count} payment${result.paid_count === 1 ? '' : 's'} settled (SGD ${result.paid_total.toLocaleString('en-SG', { minimumFractionDigits: 2 })}). Net Salaries Payable cleared.`,
        'success'
      );
      await loadPayments();
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to record settlement'}`, 'error');
    }
  };

  // Update salary allowances
  const handleSalaryUpdate = async () => {
    if (!selectedStaff) return;
    try {
      await financeAPI.setAllowances(selectedStaff.staffId, {
        transport_allowance: salaryForm.transportAllowance,
        housing_allowance: salaryForm.housingAllowance,
        other_allowances: salaryForm.otherAllowances,
      });
      showToast('✅ Salary structure updated', 'success');
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to update allowances'}`, 'error');
    }
  };

  // Generate payslips for all active staff
  const handleGeneratePayroll = async () => {
    if (!payrollMonth) {
      showToast('Please select a month', 'error');
      return;
    }
    const period = payrollMonth.slice(0, 7);
    try {
      const result = await financeAPI.generatePayroll(period);
      const items = result.items.map(item => toPayslip({ ...item, period, payment_date: result.run.payment_date }));
      setGeneratedPayslips(items);
      setCurrentRun(result.run);
      showToast(`✅ Generated ${items.length} payslips for ${monthLabel(period)}`, 'success');
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to generate payroll'}`, 'error');
    }
  };

  /** Posts the run to the general ledger and freezes it. */
  const handlePostPayroll = async () => {
    if (!currentRun) return;
    try {
      const run = await financeAPI.postPayroll(currentRun.id);
      setCurrentRun(run);
      showToast(`✅ Payroll ${run.period} posted to the general ledger`, 'success');
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to post payroll'}`, 'error');
    }
  };

  const totalMonthlyPayroll = staff
    .filter(s => s.status === 'active')
    .reduce(
      (sum, s) => sum + (s.baseSalary + s.transportAllowance + s.housingAllowance + s.otherAllowances),
      0
    );

  /**
   * Employer CPF for the headline figure comes from the latest generated run,
   * not from a second calculation in the browser. Nothing here re-derives a
   * statutory rate.
   */
  const latestRun = payrollRuns.length > 0
    ? [...payrollRuns].sort((a, b) => (a.period < b.period ? 1 : -1))[0]
    : null;
  const totalCPFEmployer = latestRun ? n(latestRun.total_cpf_employer) : 0;
  const totalMonthlyOutflow = Math.round((totalMonthlyPayroll + totalCPFEmployer) * 100) / 100;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              💼 Payroll Management
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
            CPF calculations, payslip generation, general-ledger posting
            {loading && <span style={{ marginLeft: '8px', color: '#FF6B35' }}>· loading…</span>}
          </p>
        </div>

        {/* Compliance Banner */}
        <div style={{ padding: '12px 16px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#0D47A1' }}>
          <strong>🇸🇬 CPF &amp; Tax:</strong> CPF at the private-sector rates for employees aged 55 and under, computed on <strong>base salary only</strong> — if any allowance below is a fixed wage component rather than a reimbursement, it is CPF-payable and is currently being missed. Income tax is <strong>not</strong> withheld: Singapore has no PAYE, so the tax figures are an annual projection for the employee, not a deduction. Confirm both with your accountant before running payroll for real.
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Active Staff</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>
              {staff.filter(s => s.status === 'active').length}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Monthly Salary Outflow</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2196F3' }}>SGD ${totalMonthlyOutflow.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              Gross: ${totalMonthlyPayroll.toLocaleString()} + CPF Employer: ${Math.round(totalCPFEmployer * 100) / 100}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Generated Payslips</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>{payslips.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['salary-setup', 'payroll-run', 'payslips', 'payments', 'employer-cost', 'compliance'] as const).map(tab => (
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
              {tab === 'salary-setup' && '⚙️ Salary Setup'}
              {tab === 'payroll-run' && '▶️ Payroll Run'}
              {tab === 'payslips' && '📄 Payslips'}
              {tab === 'payments' && '💳 Payments'}
              {tab === 'employer-cost' && '🏢 Employer Cost'}
              {tab === 'compliance' && '⚖️ Compliance'}
            </button>
          ))}
        </div>

        {/* SALARY SETUP TAB */}
        {activeTab === 'salary-setup' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                Select Staff Member
              </label>
              <select
                value={selectedStaff?.id || ''}
                onChange={(e) => {
                  const selected = staff.find(s => s.id === e.target.value);
                  setSelectedStaff(selected || null);
                  if (selected) {
                    setSalaryForm({
                      transportAllowance: selected.transportAllowance,
                      housingAllowance: selected.housingAllowance,
                      otherAllowances: selected.otherAllowances,
                    });
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.staffId} - {s.firstName} {s.lastName} (${s.baseSalary.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {selectedStaff && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>
                  Edit Allowances for {selectedStaff.firstName} {selectedStaff.lastName}
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Base Salary (Fixed)
                    </label>
                    <div style={{ padding: '10px 12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                      SGD ${selectedStaff.baseSalary.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Transport Allowance (SGD)
                    </label>
                    <input
                      type="number"
                      value={salaryForm.transportAllowance}
                      onChange={(e) => setSalaryForm({ ...salaryForm, transportAllowance: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Housing Allowance (SGD)
                    </label>
                    <input
                      type="number"
                      value={salaryForm.housingAllowance}
                      onChange={(e) => setSalaryForm({ ...salaryForm, housingAllowance: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Other Allowances (SGD)
                    </label>
                    <input
                      type="number"
                      value={salaryForm.otherAllowances}
                      onChange={(e) => setSalaryForm({ ...salaryForm, otherAllowances: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ padding: '12px', background: '#E8F5E9', borderRadius: '6px', border: '2px solid #4CAF50', fontSize: '12px', color: '#2E7D32' }}>
                    <strong>Total Monthly Compensation:</strong> SGD ${(
                      selectedStaff.baseSalary +
                      salaryForm.transportAllowance +
                      salaryForm.housingAllowance +
                      salaryForm.otherAllowances
                    ).toLocaleString()}
                  </div>

                  <button
                    onClick={handleSalaryUpdate}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Update Allowances
                  </button>
                </div>
              </div>
            )}

            {/* CPF Calculation Preview */}
            {selectedStaff && (
              <div style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>
                  CPF for {payrollMonth.slice(0, 7)}
                </h3>
                {cpfPreviewError ? (
                  <div style={{ padding: '12px', background: '#FFEBEE', border: '1px solid #C62828', borderRadius: '6px', fontSize: '12px', color: '#C62828' }}>
                    {cpfPreviewError}
                  </div>
                ) : !cpfPreview ? (
                  <div style={{ fontSize: '12px', color: '#888' }}>Loading…</div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px', fontSize: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '10px', background: '#F5F5F5', borderRadius: '4px' }}>
                        <div style={{ fontSize: '11px', color: '#666' }}>Wages attracting CPF</div>
                        <div style={{ fontWeight: 600, color: '#333' }}>
                          SGD ${cpfPreview.ordinaryWage.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                          Ordinary Wage ceiling ${cpfPreview.owCeiling.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ padding: '10px', background: '#F5F5F5', borderRadius: '4px' }}>
                        <div style={{ fontSize: '11px', color: '#666' }}>Age band</div>
                        <div style={{ fontWeight: 600, color: '#333' }}>{cpfPreview.ageBand}</div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                          Age {cpfPreview.age} · {cpfPreview.cpfStatus}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '2px solid #FFD9B3', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>Employee ({(cpfPreview.rateEmployee * 100).toFixed(1)}%)</span>
                        <strong>SGD ${cpfPreview.employeeTotal.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>Employer ({(cpfPreview.rateEmployer * 100).toFixed(1)}%)</span>
                        <strong>SGD ${cpfPreview.employerTotal.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #DDD', paddingTop: '6px' }}>
                        <span style={{ fontWeight: 600 }}>Total to CPF Board</span>
                        <strong>SGD ${(cpfPreview.employeeTotal + cpfPreview.employerTotal).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.5 }}>
                      Rates from the CPF Board table in force for this month. The split across
                      Ordinary, Special and MediSave accounts is CPF Board's to make and is not
                      shown here — it is not a required payslip item.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAYROLL RUN TAB */}
        {activeTab === 'payroll-run' && (
          <div>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>Generate Payroll</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Select Month & Year
                  </label>
                  <input
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ padding: '12px', background: '#FFF', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '12px', color: '#666' }}>
                  <strong>ℹ️ Payroll Process:</strong>
                  <ul style={{ margin: '8px 0 0 16px', paddingLeft: '0' }}>
                    <li>Generates payslips for all active staff</li>
                    <li>Calculates CPF (OW/AW split) and applies any unpaid-leave deductions</li>
                    <li>Projects annual income tax (IRAS resident bands) — shown, not deducted</li>
                    <li>Salary due within 7 days of the period ending (Employment Act); CPF due by the 14th of the following month (CPF Board)</li>
                  </ul>
                </div>

                <button
                  onClick={handleGeneratePayroll}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ▶️ Generate Payroll
                </button>
              </div>
            </div>

            {/* Generated Payslips Preview */}
            {generatedPayslips.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: 0 }}>
                    Generated Payslips ({generatedPayslips.length})
                  </h3>
                  {currentRun && (
                    currentRun.status === 'posted' ? (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#4CAF50' }}>
                        ✓ Posted to GL{currentRun.posted_at ? ` on ${new Date(currentRun.posted_at).toLocaleDateString('en-SG')}` : ''}
                      </span>
                    ) : (
                      <button
                        onClick={handlePostPayroll}
                        title="Write the double entry to the general ledger and freeze this run"
                        style={{
                          padding: '8px 16px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        📘 Post to General Ledger
                      </button>
                    )
                  )}
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {generatedPayslips.map(payslip => (
                    <div key={payslip.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                            {payslip.staffId} - {payslip.staffName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                            {payslip.month} {payslip.year}
                          </div>
                          <div style={{ fontSize: '11px', color: '#999', display: 'grid', gap: '2px' }}>
                            <div>Gross: SGD ${payslip.grossSalary.toLocaleString()}</div>
                            <div>CPF Employee: SGD ${payslip.cpfEmployee.toLocaleString()}</div>
                            <div>Est. tax (not deducted): SGD ${payslip.incomeTax.toLocaleString()}</div>
                            <div style={{ fontWeight: '600', marginTop: '4px' }}>Net Salary: SGD ${payslip.netSalary.toLocaleString()}</div>
                          </div>
                        </div>
                        <div style={{ background: '#4CAF50', color: 'white', padding: '6px 12px', borderRadius: '3px', fontSize: '11px', fontWeight: '600', height: 'fit-content' }}>
                          {payslip.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAYSLIPS TAB */}
        {activeTab === 'payslips' && (
          <div>
            {payslips.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', background: '#FFF8F5', borderRadius: '8px', border: '2px dashed #FFD9B3' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: '600' }}>No payslips generated yet</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Go to Payroll Run tab to generate payslips</div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                  All Payslips ({payslips.length})
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {payslips.map(payslip => (
                    <div key={payslip.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>
                            {payslip.staffId} - {payslip.staffName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {payslip.month} {payslip.year}
                          </div>
                        </div>
                        <div style={{ background: '#4CAF50', color: 'white', padding: '6px 12px', borderRadius: '3px', fontSize: '11px', fontWeight: '600', height: 'fit-content' }}>
                          {payslip.status.toUpperCase()}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #FFD9B3' }}>
                        <div>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Gross Salary</div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                            SGD ${payslip.grossSalary.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Total Deductions</div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#F44336' }}>
                            SGD ${payslip.totalDeductions.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '11px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ color: '#666', marginBottom: '2px' }}>CPF (Employee)</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>SGD ${payslip.cpfEmployee.toLocaleString()}</div>
                          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                            {payslip.cpfRateEmployee != null
                              ? `${(payslip.cpfRateEmployee * 100).toFixed(1)}% of wages`
                              : ''}<br />
                            Employer: ${payslip.cpfEmployer.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Income Tax (projection)</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>SGD ${payslip.incomeTax.toLocaleString()}</div>
                          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                            Annual: ${payslip.taxBreakdown.annualTax.toLocaleString()}<br />
                            Rate: {payslip.taxBreakdown.taxRate}%
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Net Salary</div>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#4CAF50' }}>
                            SGD ${payslip.netSalary.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                            Payment: {new Date(payslip.paymentDate).toLocaleDateString('en-SG')}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => downloadPayslip(payslip)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        📥 Download payslip (CSV)
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div>
            <div style={{ padding: '12px 16px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#0D47A1' }}>
              <strong>💳 How salary reaches a bank account:</strong> a posted run is turned into a bank
              bulk-credit batch, a <strong>second</strong> admin approves it, the file is downloaded and uploaded to
              your corporate banking portal (DBS IDEAL / OCBC Velocity / UOB BIBPlus), and the bank's
              reference is recorded here — which marks the payslips paid and clears Net Salaries Payable.
              Nothing in this system transmits money on its own.
            </div>

            {/* Onboarding — the employee supplies their own details */}
            <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#333' }}>Staff onboarding</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {onboarding.filter(o => o.complete).length} of {onboarding.length} complete
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px 0', lineHeight: 1.6 }}>
                Send a link and the staff member fills in their own bank details, address and emergency
                contact. Better than typing an account number on their behalf — they can check it against
                their own banking app, and nobody here has to handle it.
              </p>

              {onboarding.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#888' }}>No active staff.</div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {onboarding.map(o => (
                    <div key={o.staff_id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                      padding: '10px 12px', borderRadius: '6px', flexWrap: 'wrap',
                      background: o.complete ? '#F1F8E9' : '#FFF3E0',
                      border: `1px solid ${o.complete ? '#AED581' : '#FFCC80'}`,
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>
                          {o.staff_id} · {o.staff_name}
                        </div>
                        <div style={{ fontSize: '11px', color: o.complete ? '#33691E' : '#E65100', marginTop: '2px' }}>
                          {o.complete
                            ? '✓ Everything on file'
                            : `Still needed: ${o.outstanding.join(', ')}`}
                          {o.invite_status === 'sent' && ' · link sent, not opened yet'}
                          {o.invite_status === 'verified' && ' · started filling it in'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!o.can_be_invited && (
                          <span style={{ fontSize: '11px', color: '#C62828' }}>
                            Needs an NRIC on file first
                          </span>
                        )}
                        {o.can_be_invited && (
                          <button
                            onClick={() => handleSendOnboarding(o)}
                            style={o.complete ? btnOutline('#666') : btn('#FF6B35')}
                          >
                            {o.invite_status ? '↻ New link' : o.complete ? '↻ Re-invite' : '✉️ Send link'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {inviteLink && (
                <div style={{ marginTop: '14px', padding: '12px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0D47A1', marginBottom: '6px' }}>
                    Link for {inviteLink.staff_name} — copy it now, it is not shown again
                  </div>
                  <input
                    readOnly
                    value={`${window.location.origin}${inviteLink.invite_path}`}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{ width: '100%', padding: '8px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid #90CAF9', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '11px', color: '#0D47A1', marginTop: '6px' }}>
                    They will be asked for the last 4 characters of their NRIC before the form opens.
                    Expires {new Date(inviteLink.expires_at).toLocaleDateString('en-SG')}.
                    Only the hash is stored — if this is lost, send a new link.
                  </div>
                  <button onClick={() => setInviteLink(null)} style={{ ...btnOutline('#0D47A1'), marginTop: '8px' }}>
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Create a batch from a posted run */}
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#333' }}>Create a payment batch</h3>
              {payrollRuns.filter(r => r.status === 'posted' && !batches.some(b => b.payroll_run_id === r.id && b.status !== 'cancelled')).length === 0 ? (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  No posted run is waiting to be paid. Generate a run, post it to the general ledger, then pay it.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {payrollRuns
                    .filter(r => r.status === 'posted' && !batches.some(b => b.payroll_run_id === r.id && b.status !== 'cancelled'))
                    .map(run => (
                      <button
                        key={run.id}
                        onClick={() => handleCreateBatch(run)}
                        style={{ padding: '8px 14px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        💳 Pay {run.period} — SGD {n(run.total_net).toLocaleString('en-SG', { minimumFractionDigits: 2 })}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Batches */}
            {batches.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', background: '#FFF8F5', borderRadius: '8px', border: '2px dashed #FFD9B3', fontSize: '13px', color: '#666' }}>
                No payment batches yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {batches.map(batch => {
                  const step = BATCH_STEPS[batch.status];
                  return (
                    <div key={batch.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#333' }}>
                            {batch.reference}
                            <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '3px', fontSize: '11px', background: step.bg, color: step.fg }}>
                              {step.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            {batch.item_count} payment{batch.item_count === 1 ? '' : 's'} · SGD{' '}
                            {n(batch.total_amount).toLocaleString('en-SG', { minimumFractionDigits: 2 })} · value date {batch.value_date}
                          </div>
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                            Created by {batch.created_by_name || '—'}
                            {batch.approved_by_name && ` · approved by ${batch.approved_by_name}`}
                            {batch.bank_reference && ` · bank ref ${batch.bank_reference}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {batch.status === 'awaiting_approval' && (
                            <>
                              <button onClick={() => handleApproveBatch(batch)} style={btn('#4CAF50')}>✓ Approve</button>
                              <button onClick={() => handleCancelBatch(batch)} style={btnOutline('#C62828')}>✗ Cancel</button>
                            </>
                          )}
                          {(batch.status === 'approved' || batch.status === 'exported' || batch.status === 'settled') && (
                            <button onClick={() => handleExportBatch(batch)} style={btn('#2196F3')}>
                              📥 {batch.status === 'approved' ? 'Download bank file' : 'Download again'}
                            </button>
                          )}
                          {batch.status === 'exported' && (
                            <button onClick={() => handleSettleBatch(batch)} style={btn('#FF6B35')}>✓ Record settlement</button>
                          )}
                        </div>
                      </div>
                      {batch.status === 'exported' && (
                        <div style={{ marginTop: '10px', padding: '8px 10px', background: '#FFF3E0', borderRadius: '4px', fontSize: '11px', color: '#E65100' }}>
                          Upload this file in your bank's portal and authorise it there. Once the bank confirms,
                          record its reference here — until then the salaries are still owed.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* EMPLOYER COST TAB */}
        {activeTab === 'employer-cost' && (
          <div>
            {employerProfile && employerProfile.missing.length > 0 && (
              <div style={{ padding: '12px 16px', background: '#FFF3E0', border: '2px solid #E65100', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#E65100' }}>
                <strong>⚠️ Employer details incomplete:</strong> {employerProfile.missing.join(', ')}.
                MOM requires the employer's full name on every payslip, so payslips issued now carry a
                placeholder. Set these under employer settings.
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>Month</label>
              <input
                type="month"
                value={costPeriod}
                onChange={(e) => setCostPeriod(e.target.value)}
                style={{ padding: '8px 10px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>

            {!cpfSummary?.totals ? (
              <div style={{ padding: '32px', textAlign: 'center', background: '#FFF8F5', borderRadius: '8px', border: '2px dashed #FFD9B3', fontSize: '13px', color: '#666' }}>
                No payroll run for {costPeriod}. Generate one to see what it costs.
              </div>
            ) : (
              <>
                {/* What it costs the company */}
                <div style={{ padding: '16px', background: '#fff', border: '2px solid #FF6B35', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', fontWeight: 600 }}>
                    WHAT THIS MONTH COSTS THE COMPANY
                  </div>
                  <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>Gross salaries</span>
                      <span>SGD {money(cpfSummary.totals.grossSalaries)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>
                        Employer CPF <span style={{ color: '#999' }}>(on top of salary)</span>
                      </span>
                      <span style={{ color: '#E65100' }}>+ SGD {money(cpfSummary.totals.cpfEmployer)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #FFD9B3', paddingTop: '8px', marginTop: '4px', fontWeight: 700, fontSize: '15px' }}>
                      <span>Total employment cost</span>
                      <span style={{ color: '#FF6B35' }}>SGD {money(cpfSummary.totals.totalEmploymentCost)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', textAlign: 'right' }}>
                      Employer CPF adds {cpfSummary.totals.employerOnCostPercent}% on top of every salary
                    </div>
                  </div>
                </div>

                {/* Where the money goes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '14px', background: '#E8F5E9', border: '2px solid #4CAF50', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#2E7D32', fontWeight: 600 }}>TO STAFF BANK ACCOUNTS</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#2E7D32', margin: '4px 0' }}>
                      SGD {money(cpfSummary.totals.netToStaff)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#2E7D32' }}>Net pay after CPF and deductions</div>
                  </div>
                  <div style={{ padding: '14px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#0D47A1', fontWeight: 600 }}>TO CPF BOARD</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#0D47A1', margin: '4px 0' }}>
                      SGD {money(cpfSummary.totals.cpfRemittance)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0D47A1' }}>
                      {money(cpfSummary.totals.cpfEmployer)} employer + {money(cpfSummary.totals.cpfEmployee)} withheld from staff
                    </div>
                  </div>
                </div>

                {/* Remittance deadline */}
                {cpfSummary.remittance && (
                  <div style={{
                    padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px',
                    background: cpfSummary.remittance.overdue ? '#FFEBEE' : '#FFF8F5',
                    border: `2px solid ${cpfSummary.remittance.overdue ? '#C62828' : '#FFD9B3'}`,
                    color: cpfSummary.remittance.overdue ? '#C62828' : '#666',
                  }}>
                    <strong>
                      {cpfSummary.remittance.overdue
                        ? `⚠️ CPF for ${costPeriod} was due ${cpfSummary.remittance.dueDate}`
                        : `CPF for ${costPeriod} is due ${cpfSummary.remittance.dueDate}`}
                    </strong>
                    {' '}— {cpfSummary.remittance.note}
                  </div>
                )}

                {/* Per employee */}
                <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                    <thead>
                      <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                        <th style={thL}>Employee</th>
                        <th style={thC}>Age</th>
                        <th style={thR}>Gross</th>
                        <th style={thR}>Employee CPF</th>
                        <th style={thR}>Employer CPF</th>
                        <th style={thR}>Cost to company</th>
                        <th style={thR}>Above ceiling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cpfSummary.staff.map(s => (
                        <tr key={s.staff_id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                            <div style={{ fontWeight: 600, color: '#333' }}>{s.staff_name}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>
                              {s.staff_id} · {s.department}
                              {s.rate_employer != null && ` · ${(s.rate_employer * 100).toFixed(1)}% employer`}
                            </div>
                          </td>
                          <td style={tdC}>{s.age ?? '—'}</td>
                          <td style={tdR}>{money(s.gross_salary)}</td>
                          <td style={{ ...tdR, color: '#888' }}>{money(s.cpf_employee)}</td>
                          <td style={{ ...tdR, color: '#E65100', fontWeight: 600 }}>{money(s.cpf_employer)}</td>
                          <td style={{ ...tdR, fontWeight: 700, color: '#FF6B35' }}>{money(s.total_cost)}</td>
                          <td style={{ ...tdR, color: s.wages_above_ceiling > 0 ? '#888' : '#ccc' }}>
                            {s.wages_above_ceiling > 0 ? money(s.wages_above_ceiling) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '8px', lineHeight: 1.6 }}>
                  "Above ceiling" is salary that attracts no CPF because it exceeds the Ordinary Wage
                  ceiling of ${cpfSummary.staff[0]?.ow_ceiling?.toLocaleString() || '8,000'} — a raise above
                  that line costs less in CPF than one below it.
                </div>

                {/* By department */}
                {cpfSummary.by_department.length > 1 && (
                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ fontSize: '14px', color: '#333', marginBottom: '10px' }}>By department</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {cpfSummary.by_department.map(d => (
                        <div key={d.department} style={{ padding: '12px', background: '#FFF8F5', border: '1px solid #FFD9B3', borderRadius: '6px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{d.department}</div>
                          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                            {d.headcount} {d.headcount === 1 ? 'person' : 'people'}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#FF6B35' }}>
                            SGD {money(d.total_cost)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            incl. {money(d.cpf_employer)} employer CPF
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* COMPLIANCE TAB */}
        {activeTab === 'compliance' && (
          <div>
            <div style={{ padding: '12px 16px', background: '#FFF3E0', border: '2px solid #E65100', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#E65100', lineHeight: 1.6 }}>
              <strong>This is a summary of what the software does, not an assurance that you are compliant.</strong>{' '}
              The screens used to claim compliance they did not have. What follows is the honest version —
              have a practitioner confirm anything you rely on.
            </div>

            {!compliance ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>Loading…</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: 'Covered', n: compliance.counts.ok, bg: '#E8F5E9', fg: '#2E7D32' },
                    { label: 'Partial', n: compliance.counts.partial, bg: '#FFF3E0', fg: '#E65100' },
                    { label: 'Not done', n: compliance.counts.gap, bg: '#FFEBEE', fg: '#C62828' },
                  ].map(c => (
                    <div key={c.label} style={{ padding: '14px', background: c.bg, borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: c.fg }}>{c.n}</div>
                      <div style={{ fontSize: '12px', color: c.fg, fontWeight: 600 }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Data that blocks payroll or filings */}
                {(() => {
                  const g = compliance.staff_data_gaps;
                  const gaps = [
                    g.missing_nric && `${g.missing_nric} without NRIC`,
                    g.missing_date_of_birth && `${g.missing_date_of_birth} without date of birth`,
                    g.missing_cpf_status && `${g.missing_cpf_status} without CPF status`,
                    g.missing_bank_details && `${g.missing_bank_details} without bank details`,
                  ].filter(Boolean);
                  if (gaps.length === 0) return null;
                  return (
                    <div style={{ padding: '12px 16px', background: '#FFEBEE', border: '2px solid #C62828', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#C62828' }}>
                      <strong>Staff records incomplete:</strong> {gaps.join(', ')} (of {g.active_staff} active).
                      Payroll refuses to run for anyone whose CPF cannot be computed.
                    </div>
                  );
                })()}

                {(['MOM', 'CPF', 'IRAS', 'ACRA', 'PDPA'] as const).map(area => {
                  const items = compliance.items.filter(i => i.area === area);
                  if (items.length === 0) return null;
                  return (
                    <div key={area} style={{ marginBottom: '18px' }}>
                      <h3 style={{ fontSize: '14px', color: '#333', margin: '0 0 8px 0' }}>{area}</h3>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {items.map((i, idx) => {
                          const tone = i.status === 'ok'
                            ? { bg: '#F1F8E9', bd: '#AED581', fg: '#33691E', mark: '✓' }
                            : i.status === 'partial'
                            ? { bg: '#FFF8E1', bd: '#FFCC80', fg: '#E65100', mark: '~' }
                            : { bg: '#FFEBEE', bd: '#EF9A9A', fg: '#C62828', mark: '✗' };
                          return (
                            <div key={idx} style={{ padding: '12px', background: tone.bg, border: `1px solid ${tone.bd}`, borderRadius: '6px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: tone.fg }}>
                                {tone.mark} {i.requirement}
                              </div>
                              <div style={{ fontSize: '12px', color: '#555', marginTop: '4px', lineHeight: 1.6 }}>
                                {i.detail}
                              </div>
                              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>
                                {i.authority}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* IR8A */}
                <div style={{ padding: '16px', background: '#fff', border: '2px solid #FFD9B3', borderRadius: '8px', marginTop: '20px' }}>
                  <h3 style={{ fontSize: '14px', color: '#333', margin: '0 0 6px 0' }}>IR8A preparation data</h3>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px 0', lineHeight: 1.6 }}>
                    Employment income for the year, itemised the way IR8A asks for it. Due to IRAS (or to
                    your employees, if you are not on AIS) by 1 March. This is <strong>not</strong> an AIS
                    submission file, and it excludes bonus, director's fees, benefits-in-kind and share
                    gains — none of which this system tracks.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={ir8aYear}
                      onChange={(e) => setIr8aYear(e.target.value)}
                      style={{ padding: '8px 10px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px' }}
                    >
                      {[0, 1, 2].map(back => {
                        const y = String(new Date().getFullYear() - back);
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                    <button
                      onClick={async () => {
                        try {
                          await financeAPI.exportIR8A(ir8aYear);
                          showToast(`📥 IR8A preparation data for ${ir8aYear} downloaded`, 'success');
                        } catch (err) {
                          showToast(`❌ ${err instanceof Error ? err.message : 'Export failed'}`, 'error');
                        }
                      }}
                      style={btn('#2196F3')}
                    >
                      📥 Download IR8A data
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: '#888', marginTop: '16px', lineHeight: 1.6 }}>
                  {compliance.disclaimer}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PayrollDashboard;
