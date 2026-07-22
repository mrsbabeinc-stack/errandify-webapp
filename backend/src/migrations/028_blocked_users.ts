import db from '../db.js';

/**
 * Migration 028 — blocked_users.
 *
 * /block-list is a routed, reachable page and GET /api/user/blocked-users had
 * no backend at all. The page caught the failure and rendered a hardcoded
 * "Spam User" instead, so it looked like it worked — which is worse than an
 * error on a safety surface: someone could believe they had blocked a person
 * they had not. The mock fallback is being removed alongside this.
 *
 * Trusted users needs no table: user_favorites already exists and is what
 * POST /api/users/favorite/:userId writes to. The trusted-user endpoints read
 * that rather than introducing a second, competing list.
 *
 * Blocking is directional — A blocking B says nothing about B blocking A — so
 * the key is (user_id, blocked_user_id) and both directions can coexist.
 */
export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, blocked_user_id),
      -- Blocking yourself is always a bug, never an intent
      CHECK (user_id <> blocked_user_id)
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id, created_at DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id)`);
  console.log('[028] ✅ blocked_users created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS blocked_users CASCADE');
}

if (process.argv[1] && process.argv[1].includes('028_blocked_users')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
