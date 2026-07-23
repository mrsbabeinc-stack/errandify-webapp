import db from '../db.js';

/**
 * Purge only after an admin approves a report shown a week ahead.
 *
 * The retention purge deletes anonymised accounts permanently. The owner asked
 * that it never run on a timer alone: a week before anything would be removed, a
 * report goes to the Errandify owner admin, and the purge runs only if they
 * approve it. This table is that gate.
 *
 * One row per weekly batch:
 *   status = 'pending'  — report generated, waiting on the admin
 *            'approved' — admin said go; the purge may run this batch
 *            'rejected' — admin held it; nothing is purged
 *            'executed' — the approved purge has run, with a count
 *
 * The report is a snapshot (jsonb) of exactly which accounts were eligible when
 * it was generated, so the admin approves a specific list, not a moving target.
 * The purge re-checks eligibility at execution regardless — approval is a gate,
 * not a bypass of the safety checks in retentionPurge.ts.
 */

export async function up(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS retention_purge_approvals (
        id             SERIAL PRIMARY KEY,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','rejected','executed')),
        cutoff_date    DATE NOT NULL,
        eligible_count INTEGER NOT NULL DEFAULT 0,
        report         JSONB NOT NULL DEFAULT '[]'::jsonb,
        -- The soonest the purge may run: one week after the report is raised.
        purge_not_before TIMESTAMP NOT NULL,
        reviewed_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at    TIMESTAMP,
        review_note    TEXT,
        purged_count   INTEGER,
        executed_at    TIMESTAMP,
        created_at     TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Only one open (pending/approved) batch at a time — a second report while
    // one is unresolved would let the same accounts be approved twice.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_retention_batch
        ON retention_purge_approvals ((status IN ('pending','approved')))
        WHERE status IN ('pending','approved')
    `);

    await client.query('COMMIT');
    console.log('[051] retention_purge_approvals created');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS retention_purge_approvals`);
}
