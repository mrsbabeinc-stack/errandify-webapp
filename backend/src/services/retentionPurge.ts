import db from '../db.js';

/**
 * Enforces the retention schedule in docs/DATA_RETENTION.md.
 *
 * PDPC Key Concepts 18.8 expects a written retention policy; 18.5 expects the
 * data to be reviewed against it regularly. A schedule nothing enforces is
 * worse than no schedule, because it evidences an intention we are not meeting
 * — it is the document a regulator would read first.
 *
 * This is the second half of account deletion. Anonymisation strips the
 * identity immediately and keeps the transaction for its legal retention
 * period; this removes what is left once that period expires.
 *
 * Deliberately conservative:
 *
 *  - DRY RUN BY DEFAULT. Deleting rows is irreversible and this runs unattended,
 *    so it reports what it would remove and changes nothing unless explicitly
 *    told to. RETENTION_PURGE_ENABLED=true turns it on.
 *  - It only ever touches accounts that were ANONYMISED — never a live user.
 *    anonymised_at is the clock, so an account that was never deleted can never
 *    be caught by this.
 *  - It refuses to run if the retention period looks wrong, rather than
 *    interpreting a misconfiguration as "delete everything".
 */

/**
 * Seven years, from PDPC's own worked example at 18.4(b): the Limitation Act
 * gives six years for contract claims, and the guidance suggests keeping
 * contract records about seven. That is longer than the Income Tax Act and
 * Companies Act five-year requirements, so it covers them too.
 *
 * Confirm against actual obligations before relying on it — see the open
 * questions in docs/DATA_RETENTION.md.
 */
const RETENTION_YEARS = Number(process.env.RETENTION_YEARS || 7);

export interface PurgeReport {
  dryRun: boolean;
  cutoff: string;
  eligibleAccounts: number;
  purged: number;
  skipped: { userId: number; reason: string }[];
}

export async function runRetentionPurge(): Promise<PurgeReport> {
  const enabled = process.env.RETENTION_PURGE_ENABLED === 'true';

  // A misread env var must not become "retain nothing". Anything outside a
  // sane range is a configuration error, not an instruction.
  if (!Number.isFinite(RETENTION_YEARS) || RETENTION_YEARS < 1 || RETENTION_YEARS > 30) {
    throw new Error(
      `RETENTION_YEARS is ${process.env.RETENTION_YEARS} — refusing to run. ` +
      `Expected 1-30. See docs/DATA_RETENTION.md.`
    );
  }

  // to_char, not ::date — a DATE comes back from pg as a JS Date at local
  // midnight, which prints as a full timestamp in the audit log and shifts a
  // day either side of UTC. This log is the evidence that the policy runs, so
  // the date in it should be unambiguous.
  const cutoffRow = await db.query(
    `SELECT to_char(NOW() - ($1 || ' years')::interval, 'YYYY-MM-DD') AS cutoff`,
    [RETENTION_YEARS]
  );
  const cutoff = cutoffRow.rows[0].cutoff;

  // Only anonymised accounts, and only those past the retention period.
  const eligible = await db.query(
    `SELECT id FROM users
      WHERE anonymised_at IS NOT NULL
        AND anonymised_at < $1
      ORDER BY anonymised_at`,
    [cutoff]
  );

  const report: PurgeReport = {
    dryRun: !enabled,
    cutoff: String(cutoff),
    eligibleAccounts: eligible.rows.length,
    purged: 0,
    skipped: [],
  };

  for (const row of eligible.rows) {
    const userId = row.id;

    // Even past the retention period, an account still tangled in something
    // live is not ready to go. This should be impossible — deletion is blocked
    // while any of these are open — but seven years is long enough for a
    // dispute to have been reopened, and the check costs nothing.
    const live = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM errands e
           WHERE e.asker_id = $1
             AND e.status IN ('posted','bidding','open','accepted','confirmed','in_progress','pending_review')) AS errands,
         (SELECT COUNT(*) FROM disputes d
            JOIN errands e2 ON e2.id = d.errand_id
           WHERE (d.raised_by_id = $1 OR d.filed_by_user_id = $1 OR e2.asker_id = $1)
             AND d.status IN ('open','pending_review','under_investigation')) AS disputes`,
      [userId]
    );
    const openErrands = Number(live.rows[0].errands);
    const openDisputes = Number(live.rows[0].disputes);

    if (openErrands > 0 || openDisputes > 0) {
      report.skipped.push({
        userId,
        reason: `still has ${openErrands} open errand(s), ${openDisputes} open dispute(s)`,
      });
      continue;
    }

    if (!enabled) {
      report.purged += 1; // counted as "would purge"
      continue;
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // The user row is the last thing to go, so a failure part-way leaves the
      // account anonymised rather than half-deleted with orphaned rows.
      await client.query('DELETE FROM ratings WHERE rater_id = $1 OR ratee_id = $1', [userId]);
      await client.query('DELETE FROM bids WHERE doer_id = $1', [userId]);
      await client.query('DELETE FROM errand_assignments WHERE doer_id = $1', [userId]);
      await client.query('DELETE FROM errands WHERE asker_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      await client.query('COMMIT');
      report.purged += 1;
      console.log(`[Retention] purged user ${userId} (anonymised > ${RETENTION_YEARS}y ago)`);
    } catch (err: any) {
      await client.query('ROLLBACK');
      // A foreign key we have not accounted for is a schema change, not a
      // reason to give up on the rest of the batch.
      report.skipped.push({ userId, reason: `purge failed: ${err.message.slice(0, 120)}` });
    } finally {
      client.release();
    }
  }

  console.log(
    `[Retention] ${report.dryRun ? 'DRY RUN' : 'LIVE'} — cutoff ${report.cutoff}, ` +
    `${report.eligibleAccounts} eligible, ${report.purged} ${report.dryRun ? 'would be' : ''} purged, ` +
    `${report.skipped.length} skipped`
  );

  return report;
}
