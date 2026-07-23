import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import AIAnalysisPanel from '../../../components/admin/reports/AIAnalysisPanel';
import financeAPI, { FinanceSummary, TrendPoint } from '../../../services/financeAPI';

/**
 * Financial health, from the books.
 *
 * Everything on this page used to be a literal: SGD 45,320 of revenue, a
 * ten-point polyline labelled Jan–Oct, and an "AI Analysis" panel asserting
 * IFRS 15 revenue-recognition compliance, "no fraud detected in automated
 * screening" and "no algorithmic bias detected". None of that was computed from
 * anything, and compliance conclusions in particular must not be asserted by a
 * screen that has not checked them — so the safety, legal and bias claims are
 * gone rather than restated. What remains is arithmetic on real rows, labelled
 * as such.
 */
export const FinancialHealthReport: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [s, t] = await Promise.all([
          financeAPI.summary(timeRange),
          financeAPI.trend(12),
        ]);
        if (cancelled) return;
        setSummary(s);
        setTrend(t);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load financial data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [timeRange]);

  const sgd = (v: number) =>
    `SGD ${v.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const margin =
    summary && summary.totalIncome > 0
      ? Math.round((summary.netProfit / summary.totalIncome) * 1000) / 10
      : null;

  // Chart geometry, scaled to whatever the largest month actually is.
  const chartW = 800;
  const chartH = 280;
  const padL = 56;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const maxValue = Math.max(1, ...trend.map(p => Math.max(p.revenue, p.expenses)));
  const x = (i: number) =>
    trend.length <= 1 ? padL : padL + (i * (chartW - padL - padR)) / (trend.length - 1);
  const y = (v: number) => chartH - padB - (v / maxValue) * (chartH - padT - padB);
  const monthShort = (period: string) => {
    const [yy, mm] = period.split('-').map(Number);
    return new Date(yy, (mm || 1) - 1, 1).toLocaleDateString('en-SG', { month: 'short' });
  };
  const axisTick = (fraction: number) => {
    const v = maxValue * fraction;
    return v >= 1000 ? `${Math.round(v / 100) / 10}K` : String(Math.round(v));
  };

  /** Observations, each one traceable to a number on this page. */
  const findings: { title: string; description: string }[] = [];
  if (summary) {
    findings.push({
      title: 'Revenue and expenses',
      description: `${sgd(summary.totalIncome)} recorded against ${sgd(summary.totalExpenses)} of approved expenses this ${timeRange}.`,
    });
    findings.push({
      title: 'Margin',
      description:
        margin == null
          ? 'No revenue recorded in this period, so there is no margin to report.'
          : `Net margin ${margin}% (${sgd(summary.netProfit)} on ${sgd(summary.totalIncome)}).`,
    });
    findings.push({
      title: 'Receivables',
      description:
        summary.receivables > 0
          ? `${sgd(summary.receivables)} invoiced and not yet received.`
          : 'Nothing outstanding — every recorded invoice has been received.',
    });
    findings.push({
      title: 'Awaiting approval',
      description:
        summary.pendingExpenseCount > 0
          ? `${summary.pendingExpenseCount} expense${summary.pendingExpenseCount === 1 ? '' : 's'} worth ${sgd(summary.pendingExpenseValue)} are not in these totals until approved.`
          : 'No expenses are waiting on approval, so the totals above are complete.',
    });
    if (summary.activeRecurring > 0) {
      findings.push({
        title: 'Committed spend',
        description: `${summary.activeRecurring} active recurring rule${summary.activeRecurring === 1 ? '' : 's'}, ${sgd(summary.monthlyRecurringValue)} a month.`,
      });
    }
  }

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            💰 Financial Health
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Revenue, expenses and profitability, from the recorded transactions
            {loading && <span style={{ marginLeft: '8px', color: '#FF6B35' }}>· loading…</span>}
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FFEBEE', border: '1px solid #C62828', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#C62828' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {(['week', 'month', 'quarter', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '8px 16px',
                background: timeRange === range ? '#FF6B35' : '#f5f5f5',
                color: timeRange === range ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Revenue</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>
              {summary ? sgd(summary.totalIncome) : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {summary ? `${sgd(summary.incomeReceived)} received` : `This ${timeRange}`}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Expenses</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>
              {summary ? sgd(summary.totalExpenses) : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {summary && summary.pendingExpenseCount > 0
                ? `${summary.pendingExpenseCount} more awaiting approval`
                : 'Approved expenses only'}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Net Profit</div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: summary && summary.netProfit < 0 ? '#F44336' : '#4CAF50',
            }}>
              {summary ? sgd(summary.netProfit) : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {margin == null ? 'No revenue in this period' : `${margin}% margin`}
            </div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Net GST</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2196F3' }}>
              {summary ? sgd(summary.netGst) : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {summary ? `Output ${sgd(summary.outputGst)} − input ${sgd(summary.inputGst)}` : 'Output less input'}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '350px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
            Revenue vs Expenses (last {trend.length || 12} months)
          </h3>
          {trend.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              {loading ? 'Loading…' : 'No transactions recorded yet.'}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                <span>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#FF6B35', borderRadius: '2px', marginRight: '4px' }} />
                  Revenue
                </span>
                <span>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#9E9E9E', borderRadius: '2px', marginRight: '4px' }} />
                  Expenses
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ marginTop: '12px', minWidth: '520px' }}>
                  <line x1={padL} y1={chartH - padB} x2={chartW - padR} y2={chartH - padB} stroke="#ddd" strokeWidth="2" />
                  <line x1={padL} y1={padT} x2={padL} y2={chartH - padB} stroke="#ddd" strokeWidth="2" />

                  {[0, 0.25, 0.5, 0.75, 1].map(f => (
                    <g key={f}>
                      <line x1={padL} y1={y(maxValue * f)} x2={chartW - padR} y2={y(maxValue * f)} stroke="#f0f0f0" strokeWidth="1" />
                      <text x={padL - 8} y={y(maxValue * f) + 4} fontSize="11" textAnchor="end" fill="#999">
                        {axisTick(f)}
                      </text>
                    </g>
                  ))}

                  <polyline
                    points={trend.map((p, i) => `${x(i)},${y(p.revenue)}`).join(' ')}
                    fill="none"
                    stroke="#FF6B35"
                    strokeWidth="3"
                  />
                  <polyline
                    points={trend.map((p, i) => `${x(i)},${y(p.expenses)}`).join(' ')}
                    fill="none"
                    stroke="#9E9E9E"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />

                  {trend.map((p, i) => (
                    <g key={p.period}>
                      <circle cx={x(i)} cy={y(p.revenue)} r="4" fill="#FF6B35">
                        <title>{`${p.period}: revenue ${sgd(p.revenue)}`}</title>
                      </circle>
                      <circle cx={x(i)} cy={y(p.expenses)} r="3" fill="#9E9E9E">
                        <title>{`${p.period}: expenses ${sgd(p.expenses)}`}</title>
                      </circle>
                      <text x={x(i)} y={chartH - padB + 16} fontSize="11" textAnchor="middle" fill="#999">
                        {monthShort(p.period)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </>
          )}
        </div>

        {summary && (
          <AIAnalysisPanel
            healthScore={margin == null ? 0 : Math.max(0, Math.min(100, Math.round(margin)))}
            healthLabel="Net margin this period"
            healthSentiment={
              margin == null
                ? 'No revenue recorded in this period, so no margin can be computed.'
                : `${sgd(summary.netProfit)} on ${sgd(summary.totalIncome)} of revenue. This is arithmetic on the recorded transactions, not a forecast or an assessment.`
            }
            riskLevel={{
              level: summary.netProfit < 0 ? 'high' : margin != null && margin < 10 ? 'medium' : 'low',
              description:
                summary.netProfit < 0
                  ? 'Expenses exceeded revenue in this period.'
                  : margin != null && margin < 10
                  ? 'Margin under 10% leaves little room for an unexpected cost.'
                  : 'Revenue covered expenses in this period. Based only on recorded rows — commitments not yet entered are not counted.',
            }}
            findings={findings}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default FinancialHealthReport;
