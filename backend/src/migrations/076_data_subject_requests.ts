import db from '../db.js';

/**
 * Migration 076 — a record of PDPA data-subject requests.
 *
 * The machinery already works: GET /api/user-data/export serves the s21 right
 * of access, and POST /api/user-data/delete anonymises the account for s25. What
 * did not exist was any record that a request had ever been made. The admin
 * Audit & Compliance screen invented one in localStorage under 'gdprRequests'.
 *
 * That gap matters beyond the screen. PDPC Key Concepts expects an organisation
 * to be able to show how it handled a request — s21 carries a response
 * obligation, and s25 decisions need to be demonstrable after the fact. Doing
 * the anonymisation but keeping no trace of who asked, when, or what was done
 * leaves nothing to show.
 *
 * Deliberately narrow: it records the *handling* of a request, not a second copy
 * of the person's data. `user_id` stays a plain integer with no FK and no ON
 * DELETE, because the row has to outlive the anonymisation it describes — a
 * deletion record that disappears when the account is deleted records nothing.
 * No name, email or NRIC is copied in; the id is enough to tie the request to
 * whatever remains, and after anonymisation there is deliberately nothing left
 * to tie it to.
 *
 * Retention: 7 years alongside the other compliance records in
 * docs/DATA_RETENTION.md — it is the evidence that an obligation was met, and it
 * holds no personal data of its own, so s25 does not require it to be culled.
 *
 * I am not a lawyer; this reflects PDPA ss21/25 and PDPC Key Concepts 18.4(b)
 * as I read them, and should be confirmed with a practitioner.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS data_subject_requests (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER      NOT NULL,
      request_type  VARCHAR(30)  NOT NULL,
      status        VARCHAR(30)  NOT NULL DEFAULT 'completed',
      requested_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
      completed_at  TIMESTAMP,
      outcome       TEXT,
      handled_by    INTEGER,
      notes         TEXT,
      CONSTRAINT data_subject_requests_type_check
        CHECK (request_type IN ('access', 'erasure')),
      CONSTRAINT data_subject_requests_status_check
        CHECK (status IN ('received', 'in_progress', 'completed', 'refused'))
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_dsr_requested_at
      ON data_subject_requests (requested_at DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_dsr_user
      ON data_subject_requests (user_id, requested_at DESC)
  `);

  console.log('[076] ✅ data_subject_requests created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS data_subject_requests');
  console.log('[076] ⏪ data_subject_requests dropped');
}
