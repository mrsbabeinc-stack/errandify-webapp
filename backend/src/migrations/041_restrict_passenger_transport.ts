import db from '../db.js';

/**
 * Migration 041 — restrict travel-mobility (passenger transport).
 *
 * Decided by the product owner on 2026-07-22 after the eldercare gap in
 * migration 037: travel-mobility can mean driving a vulnerable passenger
 * alone, unsupervised, often to a medical appointment. That is the same
 * exposure the other restricted categories exist to prevent, and it was the
 * last uncovered one.
 *
 * It needs its own row rather than reusing an existing category, because
 * restricted_categories maps one slug per row and Elderly Care now takes
 * eldercare-healthcare (migration 040).
 *
 * No code change is needed for it to take effect: POST /api/screening/declare
 * applies EVERY row in restricted_categories when any conviction is declared,
 * so adding a row extends the restriction automatically. Existing restricted
 * users are backfilled below so this is not only forward-looking — someone who
 * declared a conviction yesterday should not keep access to transport today.
 */
export async function up() {
  await db.query(
    `INSERT INTO restricted_categories (category_name, reason, requires_home_access, min_age, category_slug)
     VALUES ($1, $2, TRUE, 18, $3)
     ON CONFLICT DO NOTHING`,
    [
      'Passenger Transport',
      'Driving passengers alone, including elderly and children, often to medical appointments - requires background check',
      'travel-mobility',
    ]
  );

  // Backfill: anyone already carrying restrictions gets this one too, or the
  // rule would apply only to people who declare from now on.
  const backfill = await db.query(
    `INSERT INTO user_category_restrictions (user_id, restricted_category_id, reason)
     SELECT DISTINCT ucr.user_id, rc.id, 'Extended restriction - passenger transport'
       FROM user_category_restrictions ucr
       CROSS JOIN restricted_categories rc
      WHERE rc.category_slug = 'travel-mobility'
     ON CONFLICT (user_id, restricted_category_id) DO NOTHING
     RETURNING user_id`
  );

  const slugs = await db.query(
    'SELECT DISTINCT category_slug FROM restricted_categories WHERE category_slug IS NOT NULL ORDER BY 1'
  );
  console.log(`[041] ✅ travel-mobility restricted (${backfill.rows.length} existing user(s) backfilled)`);
  console.log('[041] restricted slugs now:', slugs.rows.map((r: any) => r.category_slug).join(', '));
}

export async function down() {
  await db.query(
    `DELETE FROM user_category_restrictions
      WHERE restricted_category_id IN (SELECT id FROM restricted_categories WHERE category_slug = 'travel-mobility')`
  );
  await db.query("DELETE FROM restricted_categories WHERE category_slug = 'travel-mobility'");
}

if (process.argv[1] && process.argv[1].includes('041_restrict_passenger_transport')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
