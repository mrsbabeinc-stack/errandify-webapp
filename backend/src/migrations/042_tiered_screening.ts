import db from '../db.js';

/**
 * Migration 042 — tiered, progressive criminal screening.
 *
 * Replaces a blanket rule with the tiered model LTA actually uses: some
 * offences bar a person for life, others only until a debarment period after
 * their sentence has passed, and some need a human to look.
 *
 * What was wrong before:
 *   - Every conviction produced the same permanent ban on all seven categories,
 *     with restriction_end always NULL. Nothing ever lapsed and there was no
 *     way back, which is stricter than the law requires.
 *   - Severity was never captured. penal_code_conviction is one boolean
 *     covering murder through petty theft, so tiering was impossible.
 *   - A debarment period runs from completion of sentence, and that date was
 *     never asked for.
 *
 * The declaration also asked all five statutory questions of every user. Now
 * one question is asked of everyone, and the specific ones only of the small
 * number who answer yes — the legal precision is kept for the population it
 * applies to.
 *
 * debarment_months is deliberately left NULL. The periods are a legal schedule,
 * not something to invent: the resolver treats a NULL period as "needs review"
 * rather than guessing a number, so an unfilled table fails safe.
 */
export async function up() {
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS offence_types JSONB DEFAULT '[]'::jsonb`);
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS sentence_completed_on DATE`);
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS under_monitoring BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.query(`
    ALTER TABLE screening_declarations
      ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'auto'
  `);
  await db.query('ALTER TABLE screening_declarations DROP CONSTRAINT IF EXISTS screening_review_status_check');
  await db.query(`
    ALTER TABLE screening_declarations ADD CONSTRAINT screening_review_status_check
      CHECK (review_status IN ('auto', 'pending_review', 'cleared', 'barred'))
  `);
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`);
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS review_note TEXT`);

  /**
   * The policy, as data. Editing a row here changes who is barred and for how
   * long — no deploy needed, same property as restricted_categories.
   *
   * tier:
   *   lifetime  — permanent bar, no expiry
   *   temporary — barred until sentence_completed_on + debarment_months
   *   review    — a person decides; restrictions apply meanwhile
   */
  await db.query(`
    CREATE TABLE IF NOT EXISTS debarment_rules (
      id SERIAL PRIMARY KEY,
      offence_type VARCHAR(40) NOT NULL UNIQUE,
      label VARCHAR(120) NOT NULL,
      tier VARCHAR(20) NOT NULL CHECK (tier IN ('lifetime', 'temporary', 'review')),
      -- NULL means the schedule has not been filled in yet. The resolver treats
      -- that as 'review' rather than assuming a length.
      debarment_months INTEGER,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Tiers follow the shape LTA describes: serious violent and sexual offences,
  // and anything against a child or vulnerable adult, are lifetime. The rest is
  // time-bounded or needs a look. Periods are left for the owner to supply.
  const rules: Array<[string, string, string, string]> = [
    ['violence', 'Violence against a person', 'lifetime', 'Serious violent offences (e.g. murder, grievous hurt) — LTA treats these as a lifetime bar'],
    ['sexual', 'Sexual offence', 'lifetime', 'Includes rape and outrage of modesty'],
    ['against_child', 'Offence involving a child or young person', 'lifetime', 'CYPA and related — governed by MSF, not LTA; kept permanent'],
    ['against_vulnerable_adult', 'Offence against an elderly or vulnerable adult', 'lifetime', 'Elder abuse and related — kept permanent'],
    ['kidnapping', 'Kidnapping or abduction', 'lifetime', 'Named explicitly in LTA lifetime-ban guidance'],
    ['dishonesty', 'Dishonesty, fraud or theft', 'temporary', 'Non-violent — eligible after sentence plus debarment period'],
    ['drug', 'Drug-related offence', 'review', 'LTA may require a monitoring period and proof of rehabilitation'],
    ['other', 'Something else', 'review', 'Cannot be tiered automatically — always goes to a person'],
  ];

  for (const [type, label, tier, notes] of rules) {
    await db.query(
      `INSERT INTO debarment_rules (offence_type, label, tier, debarment_months, notes)
       VALUES ($1, $2, $3, NULL, $4)
       ON CONFLICT (offence_type) DO UPDATE
         SET label = EXCLUDED.label, tier = EXCLUDED.tier, notes = EXCLUDED.notes, updated_at = NOW()`,
      [type, label, tier, notes]
    );
  }

  await db.query(`CREATE INDEX IF NOT EXISTS idx_screening_review_status ON screening_declarations(review_status)`);

  const pending = await db.query("SELECT COUNT(*)::int AS n FROM debarment_rules WHERE tier = 'temporary' AND debarment_months IS NULL");
  console.log('[042] ✅ tiered screening ready');
  if (pending.rows[0].n > 0) {
    console.warn(`[042] ⚠️  ${pending.rows[0].n} temporary rule(s) have no debarment_months yet — those declarations will route to review until set.`);
  }
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS debarment_rules CASCADE');
  for (const c of ['offence_types', 'sentence_completed_on', 'under_monitoring', 'review_status', 'reviewed_by', 'reviewed_at', 'review_note']) {
    await db.query(`ALTER TABLE screening_declarations DROP COLUMN IF EXISTS ${c}`);
  }
}

if (process.argv[1] && process.argv[1].includes('042_tiered_screening')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
