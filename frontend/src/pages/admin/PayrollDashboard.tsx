import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

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

interface CPFBreakdown {
  ordinaryWage: number; // Min(BaseSalary, $6,000)
  additionalWage: number; // (BaseSalary - OW), max $6,600
  employeeOA: number; // 4.5% of OW
  employeeSA: number; // 4% of OW
  employeeMA: number; // 0.5% of OW
  employeeTotal: number; // OA + SA + MA
  employerOA: number; // 7% of OW
  employerSA: number; // 7% of OW
  employerMA: number; // 0.5% of OW
  employerAW: number; // 8% of AW
  employerTotal: number; // OA + SA + MA + AW
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
  totalDeductions: number;
  netSalary: number;
  cpfBreakdown: CPFBreakdown;
  taxBreakdown: TaxBreakdown;
  generatedDate: string;
  paymentDate: string;
  status: 'draft' | 'generated' | 'sent' | 'paid';
}

const PayrollDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'salary-setup' | 'payroll-run' | 'payslips'>('salary-setup');

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

  // Demo data
  useEffect(() => {
    const demoStaff: Staff[] = [
      {
        id: 'staff_1',
        staffId: 'S001',
        firstName: 'John',
        lastName: 'Tan',
        baseSalary: 4500,
        transportAllowance: 300,
        housingAllowance: 500,
        otherAllowances: 0,
        cpfMembershipNo: 'S1234567A',
        employmentType: 'permanent',
        status: 'active',
      },
      {
        id: 'staff_2',
        staffId: 'S002',
        firstName: 'Sarah',
        lastName: 'Lim',
        baseSalary: 5000,
        transportAllowance: 400,
        housingAllowance: 600,
        otherAllowances: 100,
        cpfMembershipNo: 'S2345678B',
        employmentType: 'permanent',
        status: 'active',
      },
      {
        id: 'staff_3',
        staffId: 'S003',
        firstName: 'Mike',
        lastName: 'Wong',
        baseSalary: 4800,
        transportAllowance: 350,
        housingAllowance: 500,
        otherAllowances: 50,
        cpfMembershipNo: 'S3456789C',
        employmentType: 'permanent',
        status: 'active',
      },
    ];

    setStaff(demoStaff);
    if (demoStaff.length > 0) {
      setSelectedStaff(demoStaff[0]);
    }
  }, []);

  // CPF Calculation Engine (Singapore 2024 rates)
  const calculateCPF = (baseSalary: number): CPFBreakdown => {
    const OW = Math.min(baseSalary, 6000); // Ordinary Wage capped at $6,000
    const AW = Math.min(baseSalary - OW, 6600); // Additional Wage max $6,600

    return {
      ordinaryWage: OW,
      additionalWage: AW,
      // Employee contributions (OW only)
      employeeOA: Math.round(OW * 0.045 * 100) / 100, // 4.5%
      employeeSA: Math.round(OW * 0.04 * 100) / 100, // 4%
      employeeMA: Math.round(OW * 0.005 * 100) / 100, // 0.5%
      employeeTotal: Math.round((OW * 0.045 + OW * 0.04 + OW * 0.005) * 100) / 100,
      // Employer contributions
      employerOA: Math.round(OW * 0.07 * 100) / 100, // 7%
      employerSA: Math.round(OW * 0.07 * 100) / 100, // 7%
      employerMA: Math.round(OW * 0.005 * 100) / 100, // 0.5%
      employerAW: Math.round(AW * 0.08 * 100) / 100, // 8% of AW
      employerTotal: Math.round((OW * 0.07 + OW * 0.07 + OW * 0.005 + AW * 0.08) * 100) / 100,
    };
  };

  // Income Tax Calculation (Singapore 2026 YA rates)
  const calculateTax = (grossSalary: number, cpfDeduction: number): TaxBreakdown => {
    const monthlyGross = grossSalary;
    const annualGross = monthlyGross * 12;
    const annualCPFDeduction = cpfDeduction * 12;
    const taxableIncome = annualGross - annualCPFDeduction;

    let annualTax = 0;
    let taxRate = 0;

    // Singapore tax brackets 2026
    if (taxableIncome <= 20000) {
      annualTax = 0;
      taxRate = 0;
    } else if (taxableIncome <= 30000) {
      annualTax = (taxableIncome - 20000) * 0.05;
      taxRate = 5;
    } else if (taxableIncome <= 40000) {
      annualTax = 500 + (taxableIncome - 30000) * 0.1;
      taxRate = 10;
    } else if (taxableIncome <= 80000) {
      annualTax = 1500 + (taxableIncome - 40000) * 0.15;
      taxRate = 15;
    } else if (taxableIncome <= 120000) {
      annualTax = 7500 + (taxableIncome - 80000) * 0.2;
      taxRate = 20;
    } else {
      annualTax = 15500 + (taxableIncome - 120000) * 0.22;
      taxRate = 22;
    }

    const monthlyTax = Math.round((annualTax / 12) * 100) / 100;

    return {
      annualGross,
      monthlyGross,
      annualCPFDeduction,
      taxableIncome,
      monthlyTax,
      annualTax,
      taxRate,
    };
  };

  // Update salary allowances
  const handleSalaryUpdate = () => {
    if (!selectedStaff) return;

    const updated = staff.map(s =>
      s.id === selectedStaff.id
        ? {
            ...s,
            transportAllowance: salaryForm.transportAllowance,
            housingAllowance: salaryForm.housingAllowance,
            otherAllowances: salaryForm.otherAllowances,
          }
        : s
    );

    setStaff(updated);
    setSelectedStaff(updated.find(s => s.id === selectedStaff.id) || null);
    setSalaryForm({ transportAllowance: 0, housingAllowance: 0, otherAllowances: 0 });
    showToast('✅ Salary structure updated', 'success');
  };

  // Generate payslips for all staff
  const handleGeneratePayroll = () => {
    if (!payrollMonth) {
      showToast('Please select a month', 'error');
      return;
    }

    const [year, month] = payrollMonth.split('-');
    const monthName = new Date(`${year}-${month}-01`).toLocaleDateString('en-SG', {
      month: 'long',
      year: 'numeric',
    });

    const newPayslips: Payslip[] = staff
      .filter(s => s.status === 'active')
      .map(s => {
        const grossSalary =
          s.baseSalary + s.transportAllowance + s.housingAllowance + s.otherAllowances;
        const cpfBreakdown = calculateCPF(s.baseSalary);
        const taxBreakdown = calculateTax(grossSalary, cpfBreakdown.employeeTotal);

        return {
          id: `payslip_${Date.now()}_${s.staffId}`,
          staffId: s.staffId,
          staffName: `${s.firstName} ${s.lastName}`,
          month: monthName,
          year: parseInt(year),
          baseSalary: s.baseSalary,
          transportAllowance: s.transportAllowance,
          housingAllowance: s.housingAllowance,
          otherAllowances: s.otherAllowances,
          grossSalary: Math.round(grossSalary * 100) / 100,
          cpfEmployee: cpfBreakdown.employeeTotal,
          incomeTax: taxBreakdown.monthlyTax,
          totalDeductions: Math.round((cpfBreakdown.employeeTotal + taxBreakdown.monthlyTax) * 100) / 100,
          netSalary: Math.round((grossSalary - cpfBreakdown.employeeTotal - taxBreakdown.monthlyTax) * 100) / 100,
          cpfBreakdown,
          taxBreakdown,
          generatedDate: new Date().toISOString(),
          paymentDate: new Date(parseInt(year), parseInt(month), 28).toISOString(),
          status: 'generated',
        };
      });

    setGeneratedPayslips(newPayslips);
    setPayslips([...payslips, ...newPayslips]);
    showToast(`✅ Generated ${newPayslips.length} payslips for ${monthName}`, 'success');
  };

  const totalMonthlyPayroll = staff
    .filter(s => s.status === 'active')
    .reduce(
      (sum, s) => sum + (s.baseSalary + s.transportAllowance + s.housingAllowance + s.otherAllowances),
      0
    );

  const totalCPFEmployer = staff
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + calculateCPF(s.baseSalary).employerTotal, 0);

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
            CPF Calculations, Payslip Generation, Tax Withholding
          </p>
        </div>

        {/* Compliance Banner */}
        <div style={{ padding: '12px 16px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#0D47A1' }}>
          <strong>🇸🇬 CPF & Tax Compliance:</strong> All calculations per MOM 2024 CPF rates and IRAS 2026 tax brackets. CPF remittance due by 14th of following month. Tax withheld monthly.
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
          {(['salary-setup', 'payroll-run', 'payslips'] as const).map(tab => (
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
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>CPF Calculation Preview</h3>
                {(() => {
                  const cpf = calculateCPF(selectedStaff.baseSalary);
                  return (
                    <div style={{ display: 'grid', gap: '12px', fontSize: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ padding: '10px', background: '#F5F5F5', borderRadius: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Ordinary Wage (OW)</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>SGD ${cpf.ordinaryWage.toLocaleString()}</div>
                        </div>
                        <div style={{ padding: '10px', background: '#F5F5F5', borderRadius: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Additional Wage (AW)</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>SGD ${cpf.additionalWage.toLocaleString()}</div>
                        </div>
                      </div>

                      <div style={{ borderTop: '2px solid #FFD9B3', paddingTop: '12px', marginTop: '8px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>Employee Contributions (Monthly)</div>
                        <div style={{ display: 'grid', gap: '4px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>OA (4.5% of OW):</span>
                            <span>SGD ${cpf.employeeOA.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>SA (4% of OW):</span>
                            <span>SGD ${cpf.employeeSA.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>MA (0.5% of OW):</span>
                            <span>SGD ${cpf.employeeMA.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', borderTop: '1px solid #DDD', paddingTop: '4px', marginTop: '4px' }}>
                            <span>Total Employee:</span>
                            <span>SGD ${cpf.employeeTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '2px solid #FFD9B3', paddingTop: '12px', marginTop: '8px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>Employer Contributions (Monthly)</div>
                        <div style={{ display: 'grid', gap: '4px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>OA (7% of OW):</span>
                            <span>SGD ${cpf.employerOA.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>SA (7% of OW):</span>
                            <span>SGD ${cpf.employerSA.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>MA (0.5% of OW):</span>
                            <span>SGD ${cpf.employerMA.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>AW (8% of AW):</span>
                            <span>SGD ${cpf.employerAW.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', borderTop: '1px solid #DDD', paddingTop: '4px', marginTop: '4px' }}>
                            <span>Total Employer:</span>
                            <span>SGD ${cpf.employerTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                    <li>Calculates CPF (OW/AW splits per MOM 2024)</li>
                    <li>Withholds income tax (IRAS 2026 brackets)</li>
                    <li>Due date: 14th of following month (MOM requirement)</li>
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
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                  Generated Payslips ({generatedPayslips.length})
                </h3>
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
                            <div>Tax Withheld: SGD ${payslip.incomeTax.toLocaleString()}</div>
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
                            OA: ${payslip.cpfBreakdown.employeeOA.toLocaleString()}<br />
                            SA: ${payslip.cpfBreakdown.employeeSA.toLocaleString()}<br />
                            MA: ${payslip.cpfBreakdown.employeeMA.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666', marginBottom: '2px' }}>Income Tax</div>
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
                        📥 Download PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PayrollDashboard;
