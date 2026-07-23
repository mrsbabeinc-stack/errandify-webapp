import db from '../db.js';

/**
 * Screening invitations sent to candidates, and the answers they give.
 *
 * RecruitmentDashboard modelled an invite flow entirely in component state:
 * it generated an "invite link" containing a `Date.now()` id, showed it, and
 * stored nothing. No link ever resolved to anything.
 *
 * The token is the whole security boundary here — it is an unauthenticated URL
 * that exposes one candidate's application — so it is generated server-side
 * from crypto random bytes, never from a timestamp or a sequential id, and it
 * is unique and indexed for lookup.
 *
 * PDPA note: these rows hold candidate personal data (name, email, free-text
 * answers) collected for one hiring decision. `expires_at` bounds how long a
 * link stays usable, but expiry is not deletion — a retention schedule that
 * actually purges or anonymises completed screenings still needs to be agreed
 * and run. Flagged rather than silently assumed.
 */

export async function up(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS candidate_invites (
      id              SERIAL PRIMARY KEY,
      job_opening_id  INTEGER NOT NULL
                        REFERENCES job_openings(id) ON DELETE CASCADE,
      candidate_name  VARCHAR(255) NOT NULL,
      candidate_email VARCHAR(255) NOT NULL,
      token           VARCHAR(64) NOT NULL UNIQUE,
      status          VARCHAR(20) NOT NULL DEFAULT 'sent',
      score           NUMERIC(5,1),
      scored_count    INTEGER,
      review_count    INTEGER,
      expires_at      TIMESTAMP NOT NULL,
      opened_at       TIMESTAMP,
      completed_at    TIMESTAMP,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT invite_status_valid
        CHECK (status IN ('sent', 'opened', 'completed', 'expired'))
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_candidate_invites_opening
      ON candidate_invites (job_opening_id)
  `);

  // One live invite per candidate per role; re-inviting reuses the row.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_invite_per_candidate_role
      ON candidate_invites (job_opening_id, LOWER(candidate_email))
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS candidate_answers (
      id          SERIAL PRIMARY KEY,
      invite_id   INTEGER NOT NULL
                    REFERENCES candidate_invites(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL
                    REFERENCES job_screening_questions(id) ON DELETE CASCADE,
      answer      TEXT,
      -- NULL where the answer type cannot be objectively scored; those are
      -- counted for human review instead of being given an invented mark.
      awarded     NUMERIC(5,2),
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_answer_per_question
      ON candidate_answers (invite_id, question_id)
  `);

  console.log('[066] candidate_invites + candidate_answers created');
}

export async function down(): Promise<void> {
  await db.query(`DROP TABLE IF EXISTS candidate_answers`);
  await db.query(`DROP TABLE IF EXISTS candidate_invites`);
}
