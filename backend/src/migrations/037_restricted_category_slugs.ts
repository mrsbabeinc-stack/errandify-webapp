import db from '../db.js';

/**
 * Migration 037 — map restricted categories onto real errand categories.
 *
 * GET /api/screening/categories/accessible decides what a screened user may
 * take on. It filters like this:
 *
 *   restrictedCategories = rows of restricted_categories.category_name
 *   accessible = all errands.category NOT IN restrictedCategories
 *
 * but those two sides speak different languages. category_name holds display
 * labels — 'Childcare', 'Home Repairs' — while errands.category holds slugs —
 * 'childcare-education', 'home-maintenance'. No label has ever equalled a slug,
 * so the filter removed nothing and every category stayed accessible.
 *
 * The effect: a user who declares a conviction gets ten restriction rows
 * written, sees them listed on their own restrictions screen, and is still
 * offered childcare work. The protection existed everywhere except where it
 * had to bite.
 *
 * The mapping lives here as a column rather than in code so it can be corrected
 * without a deploy, and because it is a safety decision that deserves to be
 * visible and reviewable rather than buried in a filter.
 *
 * ⚠️ REVIEW THIS MAPPING. It is inferred from the names and errs toward
 * restricting: where a restricted category could plausibly cover a slug, it
 * does. Two judgement calls in particular are worth a second opinion:
 *   - 'Elderly Care' and 'Live-in Care' are mapped to personal-care; there is
 *     no dedicated eldercare slug.
 *   - travel-mobility is NOT restricted, though it can mean driving vulnerable
 *     passengers. If that is the intent, add it to Elderly Care below.
 */
const MAPPING: Record<string, string> = {
  'Childcare': 'childcare-education',
  'Babysitting': 'childcare-education',
  'Tutoring (Home)': 'childcare-education',
  'Elderly Care': 'personal-care',
  'Live-in Care': 'personal-care',
  'Personal Assistant': 'personal-care',
  'Home Cleaning': 'cleaning-household',
  'Home Organization': 'cleaning-household',
  'Home Repairs': 'home-maintenance',
  'Pet Sitting': 'pet-care',
};

export async function up() {
  await db.query(`ALTER TABLE restricted_categories ADD COLUMN IF NOT EXISTS category_slug VARCHAR(60)`);

  for (const [name, slug] of Object.entries(MAPPING)) {
    await db.query('UPDATE restricted_categories SET category_slug = $1 WHERE category_name = $2', [slug, name]);
  }

  const unmapped = await db.query(
    'SELECT category_name FROM restricted_categories WHERE category_slug IS NULL'
  );
  if (unmapped.rows.length > 0) {
    // Loud, but not fatal: an unmapped row restricts nothing, which is the
    // failure direction that matters here.
    console.warn(
      '[037] ⚠️  No errand category mapped for: ' +
      unmapped.rows.map((r: any) => r.category_name).join(', ') +
      ' — these will not restrict anything until mapped.'
    );
  }

  await db.query(`CREATE INDEX IF NOT EXISTS idx_restricted_categories_slug ON restricted_categories(category_slug)`);
  console.log('[037] ✅ restricted_categories.category_slug populated');
}

export async function down() {
  await db.query('ALTER TABLE restricted_categories DROP COLUMN IF EXISTS category_slug');
}

if (process.argv[1] && process.argv[1].includes('037_restricted_category_slugs')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
