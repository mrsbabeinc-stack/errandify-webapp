import db from '../db.js';

/**
 * Migration 043 — rebuild screening on the Registration of Criminals Act.
 *
 * Migration 042 tiered convictions using categories I invented, with debarment
 * periods left blank because LTA does not publish a schedule. Checking the
 * actual statute showed Singapore already answers all of this.
 *
 * Registration of Criminals Act 1949:
 *   s7B — a criminal record becomes SPENT automatically after a five-year
 *         crime-free period, unless disqualified by s7C.
 *   s7C — a record can never become spent if:
 *           (a) the offence is in the Third Schedule (rape, homicide, gang
 *               robbery, kidnapping and others);
 *           (b) the sentence exceeded 3 months' imprisonment or a $2,000 fine;
 *           (c) the crime was within 5 years of release from a drug or
 *               intoxicating-substances institution;
 *           (d) the person was detained or under police supervision under
 *               Criminal Law (Temporary Provisions) Act s30(1).
 *
 * Two things follow, and both improve on what 042 did:
 *
 * 1. The law supplies the tiering. A record that can never be spent is the
 *    permanent tier; one that will spend is temporary, and the clock is a
 *    statutory five years, not a number anyone has to invent.
 *
 * 2. The question was too broad. A person whose record is spent is treated in
 *    law as having no conviction, so asking "have you EVER been convicted"
 *    collects disclosure the law does not require, and acting on a spent record
 *    is restricted unless a statutory exception applies. The declaration now
 *    asks only about UNSPENT convictions.
 *
 * The s7C(b) test replaces the invented offence taxonomy as the severity
 * signal: sentence length and fine amount are objective, the applicant knows
 * them, and they are the line Parliament drew.
 *
 * NOT legal advice, and the exception for employment "from which the person may
 * be disqualified under any written law" still needs a Singapore lawyer to
 * confirm against Errandify's categories. This mirrors the statute as the safer
 * default until then.
 */
export async function up() {
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS has_unspent_conviction BOOLEAN NOT NULL DEFAULT FALSE`);
  // s7C(a) — Third Schedule offence
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS third_schedule_offence BOOLEAN`);
  // s7C(b) — sentence over 3 months, or fine over $2,000
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS exceeded_sentence_threshold BOOLEAN`);
  // s7C(c)/(d) — drug institution release, or CLTPA supervision
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS other_disqualification BOOLEAN`);
  // The five-year crime-free period runs from conviction, not from sentence
  // completion. 042 counted from the wrong date.
  await db.query(`ALTER TABLE screening_declarations ADD COLUMN IF NOT EXISTS convicted_on DATE`);

  /**
   * The statutory constants, as data so they can be corrected without a deploy
   * — the same property restricted_categories has.
   */
  await db.query(`
    CREATE TABLE IF NOT EXISTS screening_policy (
      key VARCHAR(60) PRIMARY KEY,
      value_int INTEGER,
      source VARCHAR(200),
      notes TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  const policy: Array<[string, number, string, string]> = [
    ['crime_free_years', 5, 'Registration of Criminals Act 1949 s7B',
     'A record becomes spent after this many crime-free years unless s7C disqualifies it.'],
    ['sentence_threshold_months', 3, 'Registration of Criminals Act 1949 s7C(b)',
     'Imprisonment beyond this length prevents a record ever becoming spent.'],
    ['fine_threshold_sgd', 2000, 'Registration of Criminals Act 1949 s7C(b)',
     'A fine beyond this amount prevents a record ever becoming spent.'],
  ];
  for (const [key, value, source, notes] of policy) {
    await db.query(
      `INSERT INTO screening_policy (key, value_int, source, notes)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (key) DO UPDATE SET value_int = EXCLUDED.value_int,
         source = EXCLUDED.source, notes = EXCLUDED.notes, updated_at = NOW()`,
      [key, value, source, notes]
    );
  }

  // 042's debarment_rules is superseded as the tier driver but kept: it still
  // records which offence types exist, and dropping a table nobody asked me to
  // drop would lose that. The resolver no longer reads it for tiering.
  await db.query(`
    COMMENT ON TABLE debarment_rules IS
      'Superseded by the RCA model (migration 043) for tiering. Retained for offence-type labels.'
  `);

  console.log('[043] ✅ RCA spent-conviction model ready');
  const p = await db.query('SELECT key, value_int, source FROM screening_policy ORDER BY key');
  for (const r of p.rows) console.log(`[043]   ${r.key} = ${r.value_int}  (${r.source})`);
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS screening_policy CASCADE');
  for (const c of ['has_unspent_conviction', 'third_schedule_offence', 'exceeded_sentence_threshold', 'other_disqualification', 'convicted_on']) {
    await db.query(`ALTER TABLE screening_declarations DROP COLUMN IF EXISTS ${c}`);
  }
}

if (process.argv[1] && process.argv[1].includes('043_rca_spent_conviction_model')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
