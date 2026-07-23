import db from '../db.js';

/**
 * Migration 072 — somewhere to actually put dispute evidence.
 *
 * `dispute_evidence` had `photo_url VARCHAR(255)` and nothing ever wrote to it:
 * the upload handler read `req.files` with no multipart parser mounted, so every
 * upload failed. There is no object storage in this app either — `uploads.ts` is
 * still a stub returning a placeholder URL.
 *
 * So this follows the pattern the codebase already uses for the one file upload
 * that does work, the ACRA company document: a base64 data URL in a TEXT column,
 * with the mime type whitelisted and the size capped at the route. No new
 * dependency, no storage target to provision, and the bytes live under the same
 * backup and retention rules as the dispute they belong to.
 *
 * Retention: evidence sits under the resolved-dispute schedule in
 * docs/DATA_RETENTION.md — 7 years, because it is the substance of any later
 * claim and the counterparty relies on it too (PDPC Key Concepts 18.4(b)).
 * `photo_data` is the column to null out when that window closes; the row keeps
 * who submitted what and when, which is the record, without the image itself.
 */
export async function up() {
  await db.query(`
    ALTER TABLE dispute_evidence
      ADD COLUMN IF NOT EXISTS photo_data TEXT,
      ADD COLUMN IF NOT EXISTS photo_mime VARCHAR(100),
      ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS photo_bytes INTEGER
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute
      ON dispute_evidence (dispute_id, submitted_at DESC)
  `);

  console.log('[072] ✅ dispute_evidence file columns added');
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_dispute_evidence_dispute`);
  await db.query(`
    ALTER TABLE dispute_evidence
      DROP COLUMN IF EXISTS photo_data,
      DROP COLUMN IF EXISTS photo_mime,
      DROP COLUMN IF EXISTS photo_filename,
      DROP COLUMN IF EXISTS photo_bytes
  `);
}

if (process.argv[1] && process.argv[1].includes('072_dispute_evidence_files')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
