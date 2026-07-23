import db from '../db.js';

/**
 * Migration 063 — company referral codes.
 *
 * Individuals could already refer: `users.referral_code`, a link, a QR, and
 * 50 EP on join plus 50 on the referred person's first errand. Companies could
 * not, and not merely because a column was missing — `referral_tracking`
 * declares `referrer_id` NOT NULL against `users(id)`, so a company was
 * literally unrepresentable as a referrer.
 *
 * ── One code table, not a column ─────────────────────────────────────────
 * Every staff member gets their own code and all of them credit the company,
 * so a twenty-person firm is twenty sharers rather than one poster on a wall —
 * and you can see which staff actually drive signups, which is the only reason
 * to track this at all. A `companies.referral_code` column could not express
 * that, and having both a column and a table would be two sources of truth for
 * the same question. So: one table, where `staff_user_id IS NULL` means the
 * company's own code, for print and the public profile.
 *
 * A staff member therefore has two codes: their personal `users.referral_code`
 * which pays them, and a company code which pays the company. That is
 * deliberate — sharing on behalf of your employer and sharing as yourself are
 * different acts and should not silently pay the same party.
 *
 * ── EP goes to the company ───────────────────────────────────────────────
 * `companies.errandify_points` already exists and already receives the 2×/3×/5×
 * subscription tier multipliers, so it is a currency the company can actually
 * spend. `company_point_transactions` records why the balance moved;
 * `company_points_allocation` is not that — it records the company handing
 * points down to staff, which is the opposite direction.
 *
 * ── One referral per person ──────────────────────────────────────────────
 * The old UNIQUE was (referrer_id, referred_user_id), which stopped one
 * referrer claiming the same person twice but happily allowed three different
 * referrers to each claim them once and each be paid. Replaced with a unique
 * index on `referred_user_id` alone: a person can be referred exactly once,
 * which is what the reward assumes.
 *
 * Safe to run: referral_tracking held zero rows when this was written, so no
 * existing attribution is rewritten or lost by the constraint change.
 */
export async function up() {
  // -------------------------------------------------- company_referral_codes
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_referral_codes (
      id            SERIAL PRIMARY KEY,
      company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      -- NULL = the company's own code, for print and the public profile.
      staff_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      code          VARCHAR(20) NOT NULL UNIQUE,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // One code per staff member per company, and one company-level code. Two
  // partial indexes because NULL never equals NULL, so a plain UNIQUE on
  // (company_id, staff_user_id) would let a company collect any number of
  // company-level codes.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_ref_staff
      ON company_referral_codes(company_id, staff_user_id)
      WHERE staff_user_id IS NOT NULL
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_ref_own
      ON company_referral_codes(company_id)
      WHERE staff_user_id IS NULL
  `);

  // ------------------------------------------------------ referral_tracking
  await db.query(`ALTER TABLE referral_tracking ALTER COLUMN referrer_id DROP NOT NULL`);
  await db.query(`
    ALTER TABLE referral_tracking
      ADD COLUMN IF NOT EXISTS referrer_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL
  `);
  // Which staff member's code was used. Credit still goes to the company; this
  // answers "who actually shares", which is what you reward or coach on.
  await db.query(`
    ALTER TABLE referral_tracking
      ADD COLUMN IF NOT EXISTS shared_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);

  // Exactly one referrer, never both and never neither. Without this a row
  // could name a person and a company and be paid twice.
  await db.query(`
    DO $$ BEGIN
      ALTER TABLE referral_tracking ADD CONSTRAINT referral_tracking_one_referrer
        CHECK (
          (referrer_id IS NOT NULL AND referrer_company_id IS NULL)
          OR (referrer_id IS NULL AND referrer_company_id IS NOT NULL)
        );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.query(`
    ALTER TABLE referral_tracking
      DROP CONSTRAINT IF EXISTS referral_tracking_referrer_id_referred_user_id_key
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_once_per_person
      ON referral_tracking(referred_user_id)
  `);
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_referral_company ON referral_tracking(referrer_company_id)`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_referral_shared_by ON referral_tracking(shared_by_user_id)`
  );

  // ------------------------------------------------ company_point_transactions
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_point_transactions (
      id                   SERIAL PRIMARY KEY,
      company_id           INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      points               INTEGER NOT NULL,
      type                 VARCHAR(40) NOT NULL,
      description          TEXT,
      referral_tracking_id INTEGER REFERENCES referral_tracking(id) ON DELETE SET NULL,
      -- The staff member whose code earned it, for attribution only.
      shared_by_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at           TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_company_point_tx ON company_point_transactions(company_id, created_at DESC)`
  );
  // One credit per tracking row per bonus type. Makes a double-award
  // impossible at the database rather than relying on every caller checking.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_point_once
      ON company_point_transactions(referral_tracking_id, type)
      WHERE referral_tracking_id IS NOT NULL
  `);

  console.log('[063] ✅ Company referral codes ready');
}

export async function down() {
  await db.query(`DROP TABLE IF EXISTS company_point_transactions`);
  await db.query(`DROP INDEX IF EXISTS idx_referral_once_per_person`);
  await db.query(`ALTER TABLE referral_tracking DROP CONSTRAINT IF EXISTS referral_tracking_one_referrer`);
  await db.query(`ALTER TABLE referral_tracking DROP COLUMN IF EXISTS shared_by_user_id`);
  await db.query(`ALTER TABLE referral_tracking DROP COLUMN IF EXISTS referrer_company_id`);
  await db.query(`DROP TABLE IF EXISTS company_referral_codes`);
}

if (process.argv[1] && process.argv[1].includes('063_company_referrals')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
