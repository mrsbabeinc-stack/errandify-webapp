import db from '../db.js';

/**
 * The metric registry — the whole reason the alerts module is real.
 *
 * An alert rule may only reference a key from here, and every entry is a query
 * over this database. That constraint is the point: the previous screen let you
 * write rules about "API response time" and "failed login attempts per hour",
 * neither of which this application measures, so no rule could ever have fired
 * whatever was stored. A rule can now only be written about something the
 * platform genuinely observes about itself.
 *
 * Adding a metric means adding a query here. If you cannot express it as a
 * number this database can produce, it does not belong in an alert rule.
 */

export interface MetricDef {
  key: string;
  label: string;
  /** What the number means, shown next to the value in the admin screen. */
  description: string;
  unit: 'count' | 'percent';
  sql: string;
}

export const METRICS: MetricDef[] = [
  {
    key: 'open_disputes',
    label: 'Open disputes',
    description: 'Disputes not yet resolved, closed or withdrawn.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM disputes
           WHERE status NOT IN ('resolved', 'closed', 'withdrawn')`,
  },
  {
    key: 'unresolved_safety_flags',
    label: 'Unresolved safety flags',
    description: 'Safety flags raised and not yet actioned.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM safety_flags WHERE resolved_at IS NULL`,
  },
  {
    key: 'critical_safety_flags',
    label: 'Critical safety flags',
    description: 'Unresolved flags at critical severity.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM safety_flags
           WHERE resolved_at IS NULL AND severity = 'critical'`,
  },
  {
    key: 'pending_company_verifications',
    label: 'Pending company verifications',
    description: 'ACRA verifications waiting on an admin decision.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM company_verifications WHERE status = 'pending'`,
  },
  {
    key: 'open_errands_without_offers',
    label: 'Open errands with no offers',
    description: 'Live errands nobody has offered on yet — the supply gap, as it stands.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM errands e
           WHERE e.status = 'open'
             AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.errand_id = e.id)`,
  },
  {
    key: 'errands_expiring_24h',
    label: 'Errands expiring within 24h with no offers',
    description: 'About to expire unfilled. The last moment intervention is still possible.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM errands e
           WHERE e.status = 'open'
             AND e.deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
             AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.errand_id = e.id)`,
  },
  {
    key: 'expired_unfilled_errands',
    label: 'Expired unfilled errands (all time)',
    description: 'Errands that reached their deadline without being done.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM errands WHERE status = 'expired'`,
  },
  {
    key: 'pending_budget_approvals',
    label: 'Budgets awaiting approval',
    description: 'Finance budgets sitting in pending_approval.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM finance_budgets WHERE approval_status = 'pending'`,
  },
  {
    key: 'pending_expense_claims',
    label: 'Expense claims in flight',
    description: 'Staff claims not yet reimbursed or rejected.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM finance_expense_claims
           WHERE status NOT IN ('reimbursed', 'rejected')`,
  },
  {
    key: 'suspended_companies',
    label: 'Suspended companies',
    description: 'Companies currently blocked from trading.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM companies WHERE status = 'suspended'`,
  },
  {
    key: 'restricted_accounts',
    label: 'Suspended or banned accounts',
    description: 'User accounts not in an active state.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM users
           WHERE COALESCE(status, 'active') <> 'active'`,
  },
  {
    key: 'payout_blocked_staff',
    label: 'Staff without a usable payout account',
    description: 'People who cannot be paid — checked at offer time, so this blocks work.',
    unit: 'count',
    sql: `SELECT COUNT(*)::float AS v FROM users
           WHERE role = 'doer'
             AND COALESCE(status, 'active') = 'active'
             AND (stripe_account_id IS NULL OR stripe_payouts_enabled IS NOT TRUE)`,
  },
];

export const METRIC_BY_KEY = new Map(METRICS.map(m => [m.key, m]));

/**
 * Evaluate one metric. Returns null rather than throwing if the query fails, so
 * one broken metric cannot take down the whole evaluation pass — a failed metric
 * must not be silently read as zero, which would look like "all clear".
 */
export async function readMetric(key: string): Promise<number | null> {
  const def = METRIC_BY_KEY.get(key);
  if (!def) return null;
  try {
    const r = await db.query(def.sql);
    const v = Number(r.rows[0]?.v);
    return Number.isFinite(v) ? v : null;
  } catch (err) {
    console.error(`[alerts] metric "${key}" failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Every metric with its current value — what the admin screen shows live. */
export async function readAllMetrics(): Promise<
  { key: string; label: string; description: string; unit: string; value: number | null }[]
> {
  return Promise.all(
    METRICS.map(async m => ({
      key: m.key,
      label: m.label,
      description: m.description,
      unit: m.unit,
      value: await readMetric(m.key),
    }))
  );
}
