import db from '../db.js';

/**
 * Migration 026 — referral_tracking + referral_rewards.
 *
 * These tables were never created, so the entire referral reward system has
 * been failing silently since it was written. Three call sites depend on them:
 *
 *   auth.ts:216        awards the 50-point join bonus at signup
 *   errands.ts:835     awards the first-job bonus on completion
 *   referralService.ts the same two, plus getReferralStats
 *
 * The signup and completion paths sit inside try/catch blocks that swallow the
 * error, so nobody ever noticed — referrers simply never received points.
 * GET /api/users/referrals/stats is the one caller that surfaced it, with
 * "relation referral_tracking does not exist".
 *
 * A schema did exist at db/migrations/create_referral_tables.sql, but it is
 * MySQL: it declares indexes inline inside CREATE TABLE
 * (`INDEX idx_referrer (referrer_id)`), which Postgres rejects outright. That
 * file could never have run against this database. Reproduced here as valid
 * Postgres, with the indexes as separate statements.
 *
 * Columns and values are taken from the queries themselves, not from the old
 * SQL, so that what is created is what the code actually reads and writes:
 *   status          'joined' -> 'first_job_completed'
 *   reward_type     'join' | 'first_job'
 *   UNIQUE(referrer_id, referred_user_id) backs the ON CONFLICT DO NOTHING in
 *                   auth.ts — without it that insert would error on a repeat.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS referral_tracking (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referral_code VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'joined',
      joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
      first_job_completed_at TIMESTAMP,
      bonus_awarded BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(referrer_id, referred_user_id)
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer ON referral_tracking(referrer_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_referral_tracking_referred ON referral_tracking(referred_user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_referral_tracking_status ON referral_tracking(status)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS referral_rewards (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reward_type VARCHAR(50) NOT NULL,
      points_amount INTEGER NOT NULL DEFAULT 0,
      awarded_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_referral_rewards_type ON referral_rewards(reward_type)`);

  // referralService looks users up by this code; it is also what the signup
  // link carries as ?ref=. Unique so two people cannot share one code.
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50)`);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL`);

  console.log('[026] ✅ referral_tracking + referral_rewards created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS referral_rewards CASCADE');
  await db.query('DROP TABLE IF EXISTS referral_tracking CASCADE');
}

if (process.argv[1] && process.argv[1].includes('026_referral_tracking')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
