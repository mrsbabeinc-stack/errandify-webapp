import db from '../db.js';

/**
 * Migration 076 — let a rated person reply to a review.
 *
 * DoerReviews.tsx has always shipped a complete "Your Response" feature: a
 * modal to write the reply, a "✅ You responded" badge, and a panel rendering
 * it back. None of it was connected to anything — `handleAddResponse` called
 * alert() and `ratings` had nowhere to put the text — so the screen showed
 * hardcoded replies to hardcoded reviews.
 *
 * The reply belongs on the rating rather than in its own table: it is one
 * optional piece of text per rating, written by the person rated, and it has
 * no life of its own once the rating is gone.
 *
 * Retention: a response is personal data authored by the ratee, and it is
 * covered by whatever schedule already applies to `ratings` in
 * docs/DATA_RETENTION.md — it inherits the row's lifecycle and is removed when
 * the rating is (PDPA s25). Anonymising a user must blank `response` along with
 * `review_text`; it is free text and can name people.
 */
export async function up() {
  await db.query(`
    ALTER TABLE ratings
      ADD COLUMN IF NOT EXISTS response      TEXT,
      ADD COLUMN IF NOT EXISTS responded_at  TIMESTAMP;
  `);

  // Only useful for "reviews I still owe a reply to", which is how the screen
  // sorts; partial so it stays small.
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_ratings_awaiting_response
      ON ratings (ratee_id, created_at DESC)
      WHERE response IS NULL;
  `);

  console.log('✅ Migration 076: ratings.response / responded_at added');
}

export async function down() {
  await db.query(`DROP INDEX IF EXISTS idx_ratings_awaiting_response;`);
  await db.query(`
    ALTER TABLE ratings
      DROP COLUMN IF EXISTS response,
      DROP COLUMN IF EXISTS responded_at;
  `);
  console.log('⏪ Migration 076 reverted');
}
