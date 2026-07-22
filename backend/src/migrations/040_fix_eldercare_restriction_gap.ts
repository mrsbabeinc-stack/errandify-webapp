import db from '../db.js';

/**
 * Migration 040 — close the eldercare gap in the restriction mapping.
 *
 * Migration 037 mapped 'Elderly Care' and 'Live-in Care' to the `personal-care`
 * slug because I derived the slug list from `SELECT DISTINCT category FROM
 * errands` — what existing rows happened to use. That was the wrong source.
 *
 * The canonical list the app actually offers (utils/categoryCodes.ts, and the
 * Create Errand dropdown) has 16 slugs, and includes **eldercare-healthcare**.
 * No errand had used it yet, so it never appeared in the data I sampled — but
 * it is offered to every user posting an errand.
 *
 * Consequence: a user who declared an elder-abuse conviction was restricted
 * from `personal-care` but could still see and take `eldercare-healthcare`
 * work — the single category that protection most exists for. Found by opening
 * the Create Errand form and reading the dropdown.
 *
 * Elderly Care and Live-in Care now map to eldercare-healthcare. Personal
 * Assistant keeps personal-care, so both slugs remain covered between them.
 *
 * ⚠️ travel-mobility is still NOT restricted. It can mean driving a vulnerable
 * passenger alone. That one is a product decision and is deliberately left for
 * the owner to make rather than assumed here.
 */
const CORRECTIONS: Record<string, string> = {
  'Elderly Care': 'eldercare-healthcare',
  'Live-in Care': 'eldercare-healthcare',
};

export async function up() {
  for (const [name, slug] of Object.entries(CORRECTIONS)) {
    const r = await db.query(
      'UPDATE restricted_categories SET category_slug = $1 WHERE category_name = $2 RETURNING id',
      [slug, name]
    );
    console.log(`[040] ${name} -> ${slug} (${r.rows.length} row)`);
  }

  const covered = await db.query(
    'SELECT DISTINCT category_slug FROM restricted_categories WHERE category_slug IS NOT NULL ORDER BY 1'
  );
  console.log('[040] ✅ restricted slugs now:', covered.rows.map((r: any) => r.category_slug).join(', '));
}

export async function down() {
  // 037's original values
  await db.query("UPDATE restricted_categories SET category_slug = 'personal-care' WHERE category_name IN ('Elderly Care', 'Live-in Care')");
}

if (process.argv[1] && process.argv[1].includes('040_fix_eldercare_restriction_gap')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
