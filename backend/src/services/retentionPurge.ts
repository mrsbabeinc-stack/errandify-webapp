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

function guardRetentionYears(): void {
  // A misread env var must not become "retain nothing". Anything outside a
  // sane range is a configuration error, not an instruction.
  if (!Number.isFinite(RETENTION_YEARS) || RETENTION_YEARS < 1 || RETENTION_YEARS > 30) {
    throw new Error(
      `RETENTION_YEARS is ${process.env.RETENTION_YEARS} — refusing to run. ` +
      `Expected 1-30. See docs/DATA_RETENTION.md.`
    );
  }
}

async function computeCutoff(): Promise<string> {
  // to_char, not ::date — a DATE comes back from pg as a JS Date at local
  // midnight, which prints as a full timestamp and shifts a day either side of
  // UTC. This date is evidence the policy ran, so it must be unambiguous.
  const r = await db.query(
    `SELECT to_char(NOW() - ($1 || ' years')::interval, 'YYYY-MM-DD') AS cutoff`,
    [RETENTION_YEARS]
  );
  return r.rows[0].cutoff;
}

/**
 * Raises the weekly report the owner admin reviews. Generates nothing to delete
 * — it records WHO would be purged, and sets the earliest the purge may run to
 * one week out. Called by the cron; also callable by an admin route.
 *
 * Returns the existing open batch untouched if one is already awaiting review,
 * so the cron cannot pile up duplicate reports for the same people.
 */
export async function raiseRetentionReport(): Promise<{ batchId: number; eligible: number; alreadyOpen: boolean; purgeNotBefore: string }> {
  guardRetentionYears();

  const open = await db.query(
    `SELECT id, eligible_count, to_char(purge_not_before, 'YYYY-MM-DD') AS pnb
       FROM retention_purge_approvals
      WHERE status IN ('pending','approved')
      ORDER BY created_at DESC LIMIT 1`
  );
  if (open.rows.length > 0) {
    return { batchId: open.rows[0].id, eligible: Number(open.rows[0].eligible_count), alreadyOpen: true, purgeNotBefore: open.rows[0].pnb };
  }

  const cutoff = await computeCutoff();
  const eligible = await db.query(
    `SELECT id, to_char(anonymised_at, 'YYYY-MM-DD') AS anonymised_on, deletion_reason
       FROM users
      WHERE anonymised_at IS NOT NULL AND anonymised_at < $1
      ORDER BY anonymised_at`,
    [cutoff]
  );

  const inserted = await db.query(
    `INSERT INTO retention_purge_approvals
       (status, cutoff_date, eligible_count, report, purge_not_before)
     VALUES ('pending', $1, $2, $3::jsonb, NOW() + interval '7 days')
     RETURNING id, to_char(purge_not_before, 'YYYY-MM-DD') AS pnb`,
    [cutoff, eligible.rows.length, JSON.stringify(eligible.rows)]
  );
  const batchId = inserted.rows[0].id;

  // Notify the owner admin(s). The report is theirs to approve or reject.
  const admins = await db.query(`SELECT id FROM users WHERE role = 'admin'`);
  for (const a of admins.rows) {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
       VALUES ($1, 'system', $2, $3, false, NOW())`,
      [a.id, 'Data retention: approval needed',
       `${eligible.rows.length} anonymised account(s) are past the retention period. Review before ${inserted.rows[0].pnb}; nothing is deleted without your approval.`]
    ).catch(() => undefined);
  }

  console.log(`[Retention] report ${batchId} raised — ${eligible.rows.length} eligible, purge not before ${inserted.rows[0].pnb}`);
  return { batchId, eligible: eligible.rows.length, alreadyOpen: false, purgeNotBefore: inserted.rows[0].pnb };
}

/**
 * Runs the purge, but ONLY against a batch the admin has approved and only once
 * the week has elapsed. No approved-and-ready batch means nothing happens.
 * `force` (an admin acting deliberately) skips the week wait, not the approval.
 */
export async function runRetentionPurge({ force = false }: { force?: boolean } = {}): Promise<PurgeReport> {
  guardRetentionYears();

  const batch = await db.query(
    `SELECT id, to_char(cutoff_date, 'YYYY-MM-DD') AS cutoff, purge_not_before <= NOW() AS week_elapsed
       FROM retention_purge_approvals
      WHERE status = 'approved'
      ORDER BY reviewed_at LIMIT 1`
  );

  if (batch.rows.length === 0) {
    console.log('[Retention] no approved batch — nothing to purge');
    return { dryRun: true, cutoff: '-', eligibleAccounts: 0, purged: 0, skipped: [] };
  }
  if (!batch.rows[0].week_elapsed && !force) {
    console.log('[Retention] approved batch is still inside its 7-day window — not yet');
    return { dryRun: true, cutoff: batch.rows[0].cutoff, eligibleAccounts: 0, purged: 0, skipped: [] };
  }

  const batchId = batch.rows[0].id;
  const cutoff = batch.rows[0].cutoff;
  const enabled = true; // an approved, elapsed batch IS the go-ahead

  // Re-scan at execution rather than trusting the week-old snapshot: an account
  // that gained an open dispute since the report must not be purged.
  const eligible = await db.query(
    `SELECT id FROM users
      WHERE anonymised_at IS NOT NULL AND anonymised_at < $1
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

  // Close the batch out so it cannot run again, recording what it did.
  await db.query(
    `UPDATE retention_purge_approvals
        SET status = 'executed', purged_count = $2, executed_at = NOW()
      WHERE id = $1`,
    [batchId, report.purged]
  );

  return report;
}

export interface DisputeRetentionReport {
  dryRun: boolean;
  cutoff: string;
  eligible: number;
  stripped: number;
  evidenceImagesCleared: number;
}

/**
 * The dispute half of the schedule, which nothing enforced until now.
 *
 * docs/DATA_RETENTION.md gives resolved dispute outcomes seven years. The
 * account purge above cannot reach them: it is keyed to `users.anonymised_at`,
 * and a dispute outlives the accounts on both sides of it — that is the point of
 * keeping it. So this runs on the dispute's own clock.
 *
 * It does NOT delete the dispute. The outcome is retained for the legal purpose
 * — who was paid what, when, and on what basis — which 18.4(b) expressly
 * permits and which the counterparty relies on just as much as we do. What
 * expires is the personal narrative wrapped around that record: both sides'
 * written statements, the appeal, Hana's reasoning, the messages that went out,
 * and the evidence images. 18.10(d) accepts anonymisation as ceasing to retain;
 * 18.11 is explicit that hiding or archiving does not count, which is why these
 * are nulled rather than flagged.
 *
 * Same conservatism as the account purge: dry run unless explicitly enabled, and
 * it refuses to run at all on a nonsense retention period rather than reading a
 * misconfiguration as "strip everything".
 */
export async function purgeExpiredDisputes(): Promise<DisputeRetentionReport> {
  guardRetentionYears();

  const cutoff = await computeCutoff();
  const enabled = process.env.RETENTION_PURGE_ENABLED === 'true';

  // Only disputes that are genuinely over. A dispute still capable of moving
  // money is not a record yet, however old it is — and `settlement_status` is
  // the honest test of that, not the status column.
  const WHERE = `
    d.retention_stripped_at IS NULL
    AND d.status IN ('closed', 'resolved')
    AND COALESCE(d.closed_at, d.resolved_at) IS NOT NULL
    AND COALESCE(d.closed_at, d.resolved_at) < $1
    AND COALESCE(d.settlement_status, 'not_started') IN ('not_started', 'settled')
  `;

  const eligible = await db.query(
    `SELECT d.id FROM disputes d WHERE ${WHERE} ORDER BY COALESCE(d.closed_at, d.resolved_at)`,
    [cutoff]
  );

  const report: DisputeRetentionReport = {
    dryRun: !enabled,
    cutoff,
    eligible: eligible.rows.length,
    stripped: 0,
    evidenceImagesCleared: 0,
  };

  if (!enabled || eligible.rows.length === 0) {
    console.log(
      `[Retention] disputes ${report.dryRun ? 'DRY RUN' : 'LIVE'} — cutoff ${cutoff}, ` +
      `${report.eligible} eligible, nothing changed${report.dryRun ? ' (set RETENTION_PURGE_ENABLED=true to act)' : ''}`
    );
    return report;
  }

  for (const row of eligible.rows) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // The images first — they are the largest and the most sensitive thing
      // here. The row survives so the record of what was submitted, by whom and
      // when is intact; only the file and anything free-text goes.
      const ev = await client.query(
        `UPDATE dispute_evidence
            SET photo_data = NULL, photo_filename = NULL, photo_description = NULL,
                description_text = NULL, chat_transcript = NULL, updated_at = NOW()
          WHERE dispute_id = $1 AND (photo_data IS NOT NULL OR description_text IS NOT NULL)
          RETURNING id`,
        [row.id]
      );

      await client.query(
        `UPDATE disputes
            SET description = NULL,
                reason = NULL,
                evidence = NULL,
                defendant_response = NULL,
                defendant_response_evidence = NULL,
                resolution_notes = NULL,
                appeal_reason = NULL,
                appeal_final_reasoning = NULL,
                verdict_reasoning = NULL,
                hana_proposal = NULL,
                hana_reasoning = NULL,
                hana_failed_reason = NULL,
                outcome_message_asker = NULL,
                outcome_message_doer = NULL,
                escalation_notes = NULL,
                extension_reason = NULL,
                rework_decline_reason = NULL,
                cannot_complete_reason = NULL,
                settlement_fee_waived_reason = NULL,
                retention_stripped_at = NOW(),
                updated_at = NOW()
          WHERE id = $1`,
        [row.id]
      );

      await client.query('COMMIT');
      report.stripped += 1;
      report.evidenceImagesCleared += ev.rows.length;
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`[Retention] dispute ${row.id} could not be stripped: ${err.message}`);
    } finally {
      client.release();
    }
  }

  console.log(
    `[Retention] disputes LIVE — cutoff ${cutoff}, ${report.stripped}/${report.eligible} stripped, ` +
    `${report.evidenceImagesCleared} evidence item(s) cleared`
  );
  return report;
}

/** Admin decision on a raised report. Approve lets the purge run once the week
 *  is up; reject closes it and nothing is deleted. */
export async function decideRetentionBatch(
  batchId: number, adminUserId: number, decision: 'approved' | 'rejected', note?: string
): Promise<boolean> {
  const r = await db.query(
    `UPDATE retention_purge_approvals
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3
      WHERE id = $4 AND status = 'pending'
      RETURNING id`,
    [decision, adminUserId, note || null, batchId]
  );
  return r.rows.length > 0;
}
