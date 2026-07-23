import db from '../db.js';

/**
 * Migration 062 — public interest capture, and turning a lead into a signup.
 *
 * Two additions to what 061 built:
 *
 * ── `leads.interest` ──────────────────────────────────────────────────────
 * The pre-launch Google Form asked who someone was but never what they wanted,
 * so its 52 rows cannot be told apart: a retiree wanting weekend work and a
 * busy parent wanting their aircon fixed look identical in it. They are
 * opposite sides of the marketplace and must never land in the same campaign —
 * "we're live in your area, start earning" sent to someone who wanted help is
 * simply the wrong message.
 *
 * ── `lead_invites` ────────────────────────────────────────────────────────
 * How a lead becomes a signup at launch, and how you can prove which ones did.
 *
 * The token is stored HASHED. It travels in a URL, so it ends up in browser
 * history, in whatever chat app forwarded it, and in any server log that
 * records query strings; a stolen table should not hand someone a working
 * invite. The lookup hashes the incoming value and compares, the same shape as
 * a password reset token.
 *
 * `used_at` is set once. An invite that stays live after it has been redeemed
 * lets one forwarded WhatsApp message create any number of attributed signups,
 * which would make the conversion figures fiction.
 *
 * PDPA: the invite carries no personal data of its own — it points at a lead
 * row and dies with it (ON DELETE CASCADE), so purging a lead cannot leave an
 * orphaned token that still resolves to a name.
 */
export async function up() {
  // ------------------------------------------------------------- interest
  await db.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS interest VARCHAR(12) NOT NULL DEFAULT 'earn'
  `);
  await db.query(`
    DO $$ BEGIN
      ALTER TABLE leads ADD CONSTRAINT leads_interest_check
        CHECK (interest IN ('earn','get_help','both'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_leads_interest ON leads(interest)`);

  // Free-text "what do you do" from the form. Kept apart from the slug array:
  // an aircon technician typing "aircon servicing" should not be forced into
  // home-maintenance before a human has looked, but the words are worth having
  // when you pick up the phone.
  await db.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS skills_text TEXT`);

  // -------------------------------------------------------- lead_invites
  await db.query(`
    CREATE TABLE IF NOT EXISTS lead_invites (
      id          SERIAL PRIMARY KEY,
      lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      token_hash  VARCHAR(64) NOT NULL UNIQUE,
      channel     VARCHAR(20) NOT NULL DEFAULT 'email',
      expires_at  TIMESTAMP NOT NULL,
      used_at     TIMESTAMP,
      used_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_lead_invites_lead ON lead_invites(lead_id)`);
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_lead_invites_live ON lead_invites(expires_at) WHERE used_at IS NULL`
  );

  console.log('[062] ✅ Lead capture + invites ready');
}

export async function down() {
  await db.query(`DROP TABLE IF EXISTS lead_invites`);
  await db.query(`ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_interest_check`);
  await db.query(`ALTER TABLE leads DROP COLUMN IF EXISTS interest`);
  await db.query(`ALTER TABLE leads DROP COLUMN IF EXISTS skills_text`);
}

if (process.argv[1] && process.argv[1].includes('062_lead_capture')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
