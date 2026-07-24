import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface AIReport {
  id: string;
  title: string;
  type: 'executive-summary' | 'cost-analysis' | 'recommendations' | 'forecast' | 'compliance-alert';
  generatedDate: string;
  content: string;
  metrics: { label: string; value: string }[];
  actionItems?: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface ReportSchedule {
  id: string;
  reportType: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  enabled: boolean;
  lastGenerated: string;
  nextGenerated: string;
}

const AIReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'schedule'>('dashboard');

  // State
  const [reports, setReports] = useState<AIReport[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  // Demo data
  useEffect(() => {
    const demoReports: AIReport[] = [
      {
        id: 'report_1',
        title: 'Executive Summary - July 2026',
        type: 'executive-summary',
        generatedDate: '2026-07-15',
        content: `July 2026 shows SGD 21,000 revenue with SGD 18,400 expenses, resulting in a net profit of SGD 2,600.

Key highlights:
• Revenue increased 15% from service contracts
• Salary costs remain stable at 78% of operating expenses
• Cash runway estimated at 4.2 months at current burn rate
• All staff leave balances within acceptable ranges

The business is on track for profitability with strong cash position. Focus areas: increase service revenue and optimize operational expenses.`,
        metrics: [
          { label: 'Net Profit', value: 'SGD 2,600' },
          { label: 'Profit Margin', value: '12.4%' },
          { label: 'Cash Runway', value: '4.2 months' },
          { label: 'Staff Utilization', value: '92%' },
        ],
        urgency: 'low',
      },
      {
        id: 'report_2',
        title: 'Cost Analysis & Optimization',
        type: 'cost-analysis',
        generatedDate: '2026-07-14',
        content: `Expense breakdown analysis for July 2026:

Top 3 spending categories:
1. Salaries: SGD 14,300 (78%) - Stable, within budget
2. CPF Employer: SGD 2,100 (11%) - On track with MOM requirements
3. Office & Operations: SGD 1,900 (10%) - Slight increase from utilities

Identified savings opportunities:
• Renegotiate office supplies vendor (potential 15% savings)
• Optimize travel expenses through group booking (10% savings potential)
• Consolidate software subscriptions (5% savings potential)

Potential monthly savings: SGD 450-600 (3-4% of operating costs)`,
        metrics: [
          { label: 'Total Expenses', value: 'SGD 18,400' },
          { label: 'Savings Potential', value: 'SGD 450-600' },
          { label: 'Payroll %', value: '78%' },
          { label: 'Savings Potential %', value: '3-4%' },
        ],
        actionItems: [
          'Contact office supplies vendor for renegotiation',
          'Implement group travel booking system',
          'Audit software subscription usage',
        ],
        urgency: 'medium',
      },
      {
        id: 'report_3',
        title: 'Compliance Alert: CPF Remittance Due',
        type: 'compliance-alert',
        generatedDate: '2026-07-15',
        content: `⚠️ IMPORTANT: CPF employer contribution remittance is due on 2026-07-14 (MOM requirement).

July 2026 CPF Summary:
• Total employer contribution: SGD 2,100
• Ordinary Wage (OW) portion: SGD 1,330 (7% + 7% + 0.5%)
• Additional Wage (AW) portion: SGD 770 (8%)
• Status: PENDING REMITTANCE

Action required:
1. Process payment to CPF Board before 2026-08-14 (14th of following month)
2. Obtain CPF payment confirmation
3. File with MOM for compliance records

This is a critical compliance item. Failure to remit on time may result in penalties.`,
        metrics: [
          { label: 'Amount Due', value: 'SGD 2,100' },
          { label: 'Due Date', value: '2026-08-14' },
          { label: 'Days Until Due', value: '30 days' },
          { label: 'Status', value: 'PENDING' },
        ],
        urgency: 'critical',
      },
      {
        id: 'report_4',
        title: 'Cash Flow Forecast & Recommendations',
        type: 'forecast',
        generatedDate: '2026-07-15',
        content: `12-month cash flow projection based on current trends:

Conservative Scenario (no growth):
• Current monthly burn: SGD 62,800
• Projected runway: 4.2 months
• Critical action needed by October 2026

Moderate Growth Scenario (+10% revenue):
• Projected runway: 6.1 months
• Breakeven expected: Q4 2026
• Sustainable growth path

Optimistic Scenario (+20% revenue):
• Projected runway: 8.3 months
• Breakeven expected: Q3 2026
• Strong competitive positioning

Recommendations:
1. TARGET: Achieve 15% revenue growth (realistic & achievable)
2. Invest in sales team expansion (3 new business development roles)
3. Implement cost optimization program (target: 5% operational savings)
4. Monitor cash position weekly; establish alert triggers

Expected outcome: Breakeven by Q4 2026, positive cash flow by Q1 2027`,
        metrics: [
          { label: 'Current Runway', value: '4.2 months' },
          { label: 'Growth Target', value: '+15% revenue' },
          { label: 'Breakeven Timeline', value: 'Q4 2026' },
          { label: 'Recommended Actions', value: '3 major' },
        ],
        actionItems: [
          'Initiate sales team expansion plan',
          'Launch cost optimization program',
          'Establish weekly cash position reviews',
          'Develop Q4 2026 business targets',
        ],
        urgency: 'high',
      },
    ];

    const demoSchedules: ReportSchedule[] = [
      {
        id: 'sched_1',
        reportType: 'Executive Summary',
        frequency: 'monthly',
        recipients: ['admin@errandify.sg', 'cfo@errandify.sg'],
        enabled: true,
        lastGenerated: '2026-07-15',
        nextGenerated: '2026-08-15',
      },
      {
        id: 'sched_2',
        reportType: 'Cost Analysis',
        frequency: 'monthly',
        recipients: ['finance@errandify.sg'],
        enabled: true,
        lastGenerated: '2026-07-14',
        nextGenerated: '2026-08-14',
      },
      {
        id: 'sched_3',
        reportType: 'Compliance Alert',
        frequency: 'weekly',
        recipients: ['admin@errandify.sg', 'hr@errandify.sg'],
        enabled: true,
        lastGenerated: '2026-07-15',
        nextGenerated: '2026-07-22',
      },
      {
        id: 'sched_4',
        reportType: 'Cash Flow Forecast',
        frequency: 'quarterly',
        recipients: ['cfo@errandify.sg', 'board@errandify.sg'],
        enabled: true,
        lastGenerated: '2026-07-15',
        nextGenerated: '2026-10-15',
      },
    ];

    setReports(demoReports);
    setSchedules(demoSchedules);
  }, []);

  // Generate report
  const handleGenerateReport = async (reportType: string) => {
    setGeneratingReport(reportType);
    // Simulate Qwen processing
    setTimeout(() => {
      showToast(`✅ ${reportType} report generated using Qwen AI`, 'success');
      setGeneratingReport(null);
    }, 2000);
  };

  // Toggle schedule
  const handleToggleSchedule = (scheduleId: string) => {
    setSchedules(
      schedules.map(s =>
        s.id === scheduleId ? { ...s, enabled: !s.enabled } : s
      )
    );
    const schedule = schedules.find(s => s.id === scheduleId);
    showToast(
      `✅ ${schedule?.reportType} schedule ${!schedule?.enabled ? 'enabled' : 'disabled'}`,
      'success'
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return { bg: '#FFEBEE', color: '#C62828', label: '🔴 CRITICAL' };
      case 'high':
        return { bg: '#FFF3E0', color: '#E65100', label: '🟠 HIGH' };
      case 'medium':
        return { bg: '#FFF3E4', color: '#B5651D', label: '🟡 MEDIUM' };
      case 'low':
        return { bg: '#E8F5E9', color: '#2E7D32', label: '🟢 LOW' };
      default:
        return { bg: '#F5F5F5', color: '#666', label: '⚪ UNKNOWN' };
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              🤖 AI Reports (Qwen-Powered)
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
            Smart insights, cost analysis, forecasts, and compliance alerts powered by Qwen AI
          </p>
        </div>

        {/* Compliance Banner */}
        <div style={{ padding: '12px 16px', background: '#FFF3E4', border: '2px solid #B5651D', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#B5651D' }}>
          <strong>🤖 Qwen AI Integration:</strong> All reports generated using Alibaba Qwen Turbo API. Compliance alerts auto-generated. Forecasting based on actual financial data. All insights are recommendations only.
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Reports Generated</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>{reports.length}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>This month</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Scheduled Reports</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#F0A81E' }}>
              {schedules.filter(s => s.enabled).length}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Active</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Critical Alerts</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#F44336' }}>
              {reports.filter(r => r.urgency === 'critical').length}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Requiring attention</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Recommendations</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>
              {reports.reduce((sum, r) => sum + (r.actionItems?.length || 0), 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Action items</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['dashboard', 'reports', 'schedule'] as const).map(tab => (
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
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'reports' && '📄 Generated Reports'}
              {tab === 'schedule' && '⏰ Schedule'}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Generate New Reports</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {[
                { type: 'Executive Summary', desc: 'High-level business overview & key metrics', icon: '👔' },
                { type: 'Cost Analysis', desc: 'Spending breakdown & optimization opportunities', icon: '💰' },
                { type: 'Compliance Alert', desc: 'MOM/ACRA/IRAS compliance status & due dates', icon: '⚖️' },
                { type: 'Cash Flow Forecast', desc: '12-month projection & runway analysis', icon: '📈' },
              ].map(({ type, desc, icon }) => (
                <button
                  key={type}
                  onClick={() => handleGenerateReport(type)}
                  disabled={generatingReport === type}
                  style={{
                    padding: '16px',
                    background: generatingReport === type ? '#FFF3E0' : 'white',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    cursor: generatingReport === type ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                    {generatingReport === type ? '⏳ Generating...' : type}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{desc}</div>
                </button>
              ))}
            </div>

            {/* Recent Alerts */}
            <h3 style={{ margin: '24px 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Recent Alerts</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {reports
                .filter(r => r.urgency === 'critical' || r.urgency === 'high')
                .map(report => {
                  const urgency = getUrgencyColor(report.urgency);
                  return (
                    <div key={report.id} style={{ padding: '16px', background: urgency.bg, borderRadius: '8px', border: `2px solid ${urgency.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: urgency.color }}>
                          {urgency.label} • {report.title}
                        </div>
                        <div style={{ fontSize: '11px', color: urgency.color, opacity: 0.7 }}>
                          {new Date(report.generatedDate).toLocaleDateString('en-SG')}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: urgency.color, lineHeight: '1.5', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                        {report.content.split('\n').slice(0, 3).join('\n')}...
                      </div>
                      {report.actionItems && report.actionItems.length > 0 && (
                        <div style={{ fontSize: '12px', color: urgency.color, fontWeight: '600', marginTop: '8px' }}>
                          ✓ {report.actionItems.length} action item(s)
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Generated Reports</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {reports.map(report => {
                const urgency = getUrgencyColor(report.urgency);
                return (
                  <div key={report.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#333', marginBottom: '4px' }}>
                          {report.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Generated: {new Date(report.generatedDate).toLocaleDateString('en-SG')}
                        </div>
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        background: urgency.bg,
                        color: urgency.color,
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {urgency.label}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', marginBottom: '12px', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                      {report.content}
                    </div>

                    {/* Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                      {report.metrics.map((metric, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: '#F5F5F5', borderRadius: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>{metric.label}</div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>{metric.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Action Items */}
                    {report.actionItems && report.actionItems.length > 0 && (
                      <div style={{ padding: '12px', background: '#FFF8F5', borderRadius: '4px', border: '1px solid #FFD9B3' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '6px' }}>
                          📋 Action Items:
                        </div>
                        <ul style={{ margin: '0', paddingLeft: '16px', fontSize: '12px', color: '#666' }}>
                          {report.actionItems.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#F0A81E',
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
                      <button
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        📧 Email
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Automated Report Schedules</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {schedules.map(schedule => (
                <div key={schedule.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                        {schedule.reportType}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', display: 'grid', gap: '2px' }}>
                        <div>📅 Frequency: <strong>{schedule.frequency.toUpperCase()}</strong></div>
                        <div>📨 Recipients: {schedule.recipients.join(', ')}</div>
                        <div>✓ Last: {new Date(schedule.lastGenerated).toLocaleDateString('en-SG')}</div>
                        <div>⏭️ Next: {new Date(schedule.nextGenerated).toLocaleDateString('en-SG')}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleSchedule(schedule.id)}
                      style={{
                        padding: '8px 16px',
                        background: schedule.enabled ? '#4CAF50' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {schedule.enabled ? '✓ ENABLED' : 'DISABLED'}
                    </button>
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

export default AIReportsDashboard;
