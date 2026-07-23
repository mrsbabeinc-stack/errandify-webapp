import db from '../db.js';
import { readMetric, METRIC_BY_KEY } from './alertMetrics.js';
import { sendNotification } from '../utils/notificationHelper.js';

/**
 * Evaluates alert rules against live platform metrics and notifies admins.
 *
 * This is the piece that was missing. `alert_rules` had routes writing to it and
 * a screen listing it, but nothing ever read a rule, compared it to anything, or
 * did something when it was breached — so the whole module was a form that
 * stored preferences nobody consulted.
 *
 * Run from cron. Safe to call repeatedly: a rule that stays breached will not
 * re-notify until its cooldown has elapsed.
 */

const compare = (observed: number, comparator: string, threshold: number): boolean => {
  switch (comparator) {
    case '>':  return observed > threshold;
    case '>=': return observed >= threshold;
    case '<':  return observed < threshold;
    case '<=': return observed <= threshold;
    case '=':  return observed === threshold;
    default:   return false;
  }
};

/** Everyone who should hear about an operational alert. */
async function adminRecipients(): Promise<number[]> {
  const r = await db.query(
    `SELECT id FROM users
      WHERE role IN ('admin', 'support_l3')
        AND COALESCE(status, 'active') = 'active'`
  );
  return r.rows.map((x: any) => Number(x.id));
}

export interface EvaluationResult {
  checked: number;
  fired: number;
  skippedCooldown: number;
  metricErrors: number;
}

/**
 * @param opts.dryRun evaluate and report without notifying or recording —
 *        used by the admin "test" button so a rule can be tried without
 *        pushing a notification to every admin.
 */
export async function evaluateAlertRules(opts: { dryRun?: boolean; ruleId?: number } = {}): Promise<
  EvaluationResult & { results: any[] }
> {
  const params: any[] = [];
  let where = 'WHERE enabled = TRUE';
  if (opts.ruleId) {
    params.push(opts.ruleId);
    where = `WHERE id = $1`; // a test runs regardless of enabled state
  }

  const rules = await db.query(
    `SELECT id, name, metric_key, comparator, threshold, severity,
            cooldown_minutes, notify_admins, last_fired_at
       FROM alert_rules ${where} ORDER BY id`,
    params
  );

  const out: EvaluationResult & { results: any[] } = {
    checked: 0, fired: 0, skippedCooldown: 0, metricErrors: 0, results: [],
  };

  let recipients: number[] | null = null;

  for (const rule of rules.rows) {
    out.checked++;
    const observed = await readMetric(rule.metric_key);

    if (observed === null) {
      // Unknown or failing metric. Reported, never treated as "all clear".
      out.metricErrors++;
      out.results.push({ ruleId: rule.id, name: rule.name, error: `metric "${rule.metric_key}" unavailable` });
      continue;
    }

    const threshold = Number(rule.threshold);
    const breached = compare(observed, rule.comparator, threshold);

    // Record the value we saw even when nothing is wrong, so the screen can
    // show that a rule is being evaluated rather than merely existing.
    if (!opts.dryRun) {
      await db.query('UPDATE alert_rules SET last_value = $1, updated_at = NOW() WHERE id = $2',
        [observed, rule.id]);
    }

    if (!breached) {
      out.results.push({ ruleId: rule.id, name: rule.name, observed, threshold, breached: false });
      continue;
    }

    // Breached, but possibly still inside its quiet period. An alert that
    // repeats every tick while a condition persists just teaches people to
    // ignore it.
    const cooled =
      !rule.last_fired_at ||
      Date.now() - new Date(rule.last_fired_at).getTime() >= rule.cooldown_minutes * 60_000;

    if (!cooled) {
      out.skippedCooldown++;
      out.results.push({ ruleId: rule.id, name: rule.name, observed, threshold, breached: true, cooldown: true });
      continue;
    }

    const label = METRIC_BY_KEY.get(rule.metric_key)?.label || rule.metric_key;
    const message = `${label} is ${observed} (alerts when ${rule.comparator} ${threshold}).`;

    if (opts.dryRun) {
      out.fired++;
      out.results.push({ ruleId: rule.id, name: rule.name, observed, threshold, breached: true, wouldNotify: true, message });
      continue;
    }

    if (recipients === null) recipients = await adminRecipients();
    let notified = 0;
    if (rule.notify_admins) {
      for (const userId of recipients) {
        try {
          await sendNotification({
            userId,
            type: 'admin_broadcast',
            title: `${rule.severity === 'critical' ? '🚨' : '⚠️'} ${rule.name}`,
            message,
            data: { alertRuleId: rule.id, metricKey: rule.metric_key, observed, threshold },
          });
          notified++;
        } catch (err) {
          console.error('[alerts] notify failed for user', userId, err instanceof Error ? err.message : err);
        }
      }
    }

    await db.query(
      `INSERT INTO alert_events (rule_id, rule_name, metric_key, observed, threshold, comparator, severity, admins_notified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [rule.id, rule.name, rule.metric_key, observed, threshold, rule.comparator, rule.severity, notified]
    );
    await db.query('UPDATE alert_rules SET last_fired_at = NOW() WHERE id = $1', [rule.id]);

    out.fired++;
    out.results.push({ ruleId: rule.id, name: rule.name, observed, threshold, breached: true, notified });
    console.warn(`[alerts] "${rule.name}" fired — ${message} (${notified} admins notified)`);
  }

  return out;
}
