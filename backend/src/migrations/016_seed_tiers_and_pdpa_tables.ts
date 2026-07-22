import db from '../db.js';

/**
 * Migration 016 — two unrelated gaps that both cause live 500s.
 *
 * 1. `subscription_tiers` was EMPTY, so getTierConfig() threw for every tier and
 *    every company silently fell back to the 20% individual rate. Seeded with
 *    the real tiers. There is no free tier — launch discounts are handled with
 *    discount codes, not a free plan.
 *
 * 2. The PDPA export/erasure route queries three tables that do not exist, so
 *    "download my data" and "delete my data" both 500. Under PDPA a person has a
 *    right to both, so a broken erasure path is a compliance problem, not just a
 *    bug.
 */
export async function up() {
  await db.query(`
    INSERT INTO subscription_tiers (name, commission_rate, ad_credit_monthly, ep_multiplier, max_team_members)
    VALUES
      ('silver',   0.180,  50.00, 2, 5),
      ('gold',     0.170, 200.00, 3, 20),
      ('platinum', 0.160, 500.00, 5, 100)
    ON CONFLICT (name) DO UPDATE
      SET commission_rate = EXCLUDED.commission_rate,
          ad_credit_monthly = EXCLUDED.ad_credit_monthly,
          ep_multiplier = EXCLUDED.ep_multiplier,
          max_team_members = EXCLUDED.max_team_members,
          updated_at = NOW()
  `);

  // Health/background declarations a doer makes before taking certain work
  await db.query(`
    CREATE TABLE IF NOT EXISTS screening_declarations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      declaration_type VARCHAR(60) NOT NULL,
      declared_value BOOLEAN,
      details TEXT,
      declared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_screening_declarations_user ON screening_declarations(user_id)`);

  // Per-channel notification opt-ins. One row per user.
  await db.query(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      email_enabled BOOLEAN DEFAULT true,
      push_enabled BOOLEAN DEFAULT true,
      sms_enabled BOOLEAN DEFAULT false,
      in_app_enabled BOOLEAN DEFAULT true,
      marketing_enabled BOOLEAN DEFAULT false,
      quiet_hours_start TIME,
      quiet_hours_end TIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories a user may not take on — set by admin after a screening outcome
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_category_restrictions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(80) NOT NULL,
      reason TEXT,
      restricted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_category_restrictions_unique
      ON user_category_restrictions (user_id, category) WHERE active = true
  `);

  console.log('[016] ✅ tiers seeded, PDPA tables created');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS user_category_restrictions CASCADE');
  await db.query('DROP TABLE IF EXISTS notification_preferences CASCADE');
  await db.query('DROP TABLE IF EXISTS screening_declarations CASCADE');
  await db.query(`DELETE FROM subscription_tiers WHERE name IN ('silver','gold','platinum')`);
}

if (process.argv[1] && process.argv[1].includes('016_seed_tiers')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
