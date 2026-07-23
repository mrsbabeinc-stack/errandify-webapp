import db from '../db.js';

/**
 * Migration 061 — Lead Generation.
 *
 * Supply-side acquisition. At the time of writing 33 of 65 errands had never
 * received a single offer, and 21 of those 33 were home-maintenance or
 * cleaning — trades, not general help. So the module this backs is deliberately
 * narrow: a worklist of unfilled demand, and a place to record the people you
 * called about it. Campaign machinery can come later; a founder making calls
 * cannot.
 *
 * ── One table for both individuals and companies ──────────────────────────
 * `lead_type` splits them. Pipeline, consent, dedupe and conversion are
 * identical for a handyman and a cleaning firm; only the collected fields
 * differ, and a second table would mean writing every query twice.
 *
 * ── Consent is a column, not an assumption ────────────────────────────────
 * `consent_contact` is NOT NULL and the route refuses the insert when it is
 * false, mirroring routes/recruitment.ts, which rejects an application whose
 * declarations are missing rather than storing it and sorting consent out
 * afterwards. `consent_marketing` is separate and defaults FALSE: agreeing to
 * be contacted about a specific errand is not agreement to receive promotions.
 *
 * Business contact information — a firm's advertised office line and generic
 * email — sits outside the PDPA Data Protection provisions under s4(5), so a
 * company lead sourced from a public listing is lawful to hold without prior
 * consent. It is still recorded here with `consent_contact = false` and a
 * source, so the two bases stay distinguishable. The Spam Control Act applies
 * to unsolicited commercial email and SMS regardless of that exemption.
 *
 * ── Retention (PDPA s25) ──────────────────────────────────────────────────
 * A lead that never converts has no purpose once the campaign is over, and a
 * soft-delete flag is not compliance — PDPC 18.11 is explicit that archived or
 * access-limited data is still retained. `purge_after` carries a real date and
 * DELETE on the route is a real DELETE. Default is 12 months; change it in one
 * place below.
 *
 * I am not a lawyer. This relies on PDPA s4(5), s13–15, s18 and s25, and on
 * the Spam Control Act for the email and SMS channels. Confirm with a
 * practitioner before any outbound send.
 */

/** Months an unconverted lead is kept before it is purged. */
export const LEAD_RETENTION_MONTHS = 12;

export async function up() {
  // ------------------------------------------------------------------ leads
  await db.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id                    SERIAL PRIMARY KEY,
      lead_ref              VARCHAR(20) UNIQUE,
      lead_type             VARCHAR(12) NOT NULL DEFAULT 'individual',

      -- contact
      full_name             VARCHAR(160) NOT NULL,
      email                 VARCHAR(200),
      mobile                VARCHAR(30),

      -- company leads only
      company_name          VARCHAR(200),
      uen                   VARCHAR(20),
      contact_person_role   VARCHAR(80),
      staff_count_estimate  INTEGER,

      -- what they can do and where. Matched against the supply gap.
      interested_categories TEXT[] NOT NULL DEFAULT '{}',
      service_areas         TEXT[] NOT NULL DEFAULT '{}',

      -- attribution
      source                VARCHAR(30) NOT NULL DEFAULT 'admin',
      source_detail         VARCHAR(200),

      -- pipeline
      stage                 VARCHAR(20) NOT NULL DEFAULT 'new',
      stage_changed_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      owner_admin_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      disqualify_reason     TEXT,
      notes                 TEXT,

      -- the errand this lead was called about, when they came off the worklist
      sourced_errand_id     INTEGER REFERENCES errands(id) ON DELETE SET NULL,

      -- consent
      consent_contact       BOOLEAN NOT NULL DEFAULT FALSE,
      consent_marketing     BOOLEAN NOT NULL DEFAULT FALSE,
      consent_notice_version VARCHAR(20),
      consent_at            TIMESTAMP,

      -- conversion
      converted_user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      converted_company_id  INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      converted_at          TIMESTAMP,

      -- retention
      purge_after           DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '${LEAD_RETENTION_MONTHS} months'),

      created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Dedupe keys. Stored normalised rather than compared with LOWER() at query
  // time so the unique index actually holds: the same person filling the form
  // twice updates one row instead of creating a second for an admin to
  // reconcile. Partial, because either contact field may legitimately be null.
  await db.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_normalised VARCHAR(200)`);
  await db.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile_normalised VARCHAR(30)`);
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_uniq
       ON leads(email_normalised) WHERE email_normalised IS NOT NULL`
  );
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_mobile_uniq
       ON leads(mobile_normalised) WHERE mobile_normalised IS NOT NULL`
  );
  await db.query(`CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage, created_at DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_leads_purge ON leads(purge_after) WHERE converted_at IS NULL`);

  // ------------------------------------------------------------ lead_events
  //
  // Append-only. Without it there is no answer to "why was this one dropped",
  // and a pipeline you cannot audit is a pipeline you cannot trust.
  await db.query(`
    CREATE TABLE IF NOT EXISTS lead_events (
      id             SERIAL PRIMARY KEY,
      lead_id        INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      kind           VARCHAR(30) NOT NULL,
      note           TEXT,
      actor_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id, created_at DESC)`);

  // lead_ref, generated the way errands.formatted_id is: readable, and safe to
  // say aloud on a phone call.
  await db.query(`
    CREATE SEQUENCE IF NOT EXISTS lead_ref_seq START 1
  `);

  console.log('[061] ✅ Lead generation tables ready');
}

export async function down() {
  await db.query(`DROP TABLE IF EXISTS lead_events`);
  await db.query(`DROP TABLE IF EXISTS leads`);
  await db.query(`DROP SEQUENCE IF EXISTS lead_ref_seq`);
}

if (process.argv[1] && process.argv[1].includes('061_lead_generation')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
