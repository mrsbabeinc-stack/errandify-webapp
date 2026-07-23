import db from '../db.js';

/**
 * Migration 077 — operational alert rules, and the record of them firing.
 *
 * The admin Alerts screen kept invented rules in localStorage: "API response
 * time > 5s", "Failed login attempts > 10/hour". Nothing in this application
 * measures either, so those rules could never have fired even with a table
 * behind them. The `alert_rules` table the old routes wrote to did not exist,
 * and nothing anywhere evaluated a rule.
 *
 * What makes this real is `metric_key`: a rule may only reference a metric from
 * the registry in services/alertMetrics.ts, and every metric there is a query
 * over this database — open disputes, unresolved safety flags, errands expiring
 * unfilled, pending verifications. A rule can therefore only be written about
 * something the platform can actually observe about itself.
 *
 * `cooldown_minutes` exists because an alert that fires every cron tick while a
 * condition persists trains people to ignore it. `alert_events` is what the
 * screen shows as history — actual firings with the value at the time, not a
 * sample list.
 *
 * Retention: alert_events is operational telemetry with no personal data in it
 * (metrics are counts). Trim it on whatever schedule ops wants; nothing in
 * docs/DATA_RETENTION.md compels keeping it.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id               SERIAL PRIMARY KEY,
      name             VARCHAR(160) NOT NULL,
      metric_key       VARCHAR(60)  NOT NULL,
      comparator       VARCHAR(4)   NOT NULL DEFAULT '>',
      threshold        NUMERIC(12,2) NOT NULL,
      severity         VARCHAR(20)  NOT NULL DEFAULT 'warning',
      enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
      cooldown_minutes INTEGER      NOT NULL DEFAULT 60,
      notify_admins    BOOLEAN      NOT NULL DEFAULT TRUE,
      last_fired_at    TIMESTAMP,
      last_value       NUMERIC(12,2),
      created_by       INTEGER REFERENCES users(id),
      created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
      CONSTRAINT alert_rules_comparator_check CHECK (comparator IN ('>', '>=', '<', '<=', '=')),
      CONSTRAINT alert_rules_severity_check   CHECK (severity IN ('info', 'warning', 'critical')),
      CONSTRAINT alert_rules_cooldown_check   CHECK (cooldown_minutes >= 0)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS alert_events (
      id            SERIAL PRIMARY KEY,
      rule_id       INTEGER REFERENCES alert_rules(id) ON DELETE CASCADE,
      rule_name     VARCHAR(160) NOT NULL,
      metric_key    VARCHAR(60)  NOT NULL,
      observed      NUMERIC(12,2) NOT NULL,
      threshold     NUMERIC(12,2) NOT NULL,
      comparator    VARCHAR(4)   NOT NULL,
      severity      VARCHAR(20)  NOT NULL,
      admins_notified INTEGER    NOT NULL DEFAULT 0,
      fired_at      TIMESTAMP    NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_alert_events_fired ON alert_events (fired_at DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules (enabled)`);

  console.log('[077] ✅ alert_rules + alert_events created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS alert_events');
  await db.query('DROP TABLE IF EXISTS alert_rules');
  console.log('[077] ⏪ alert tables dropped');
}
