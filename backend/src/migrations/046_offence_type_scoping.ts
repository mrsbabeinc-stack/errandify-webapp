import db from '../db.js';

/**
 * Scope restrictions to what the person actually did.
 *
 * Until now one declared conviction closed every restricted category, because
 * applyRestrictions inserted a row for all of restricted_categories with no
 * WHERE clause. A four-year-old shoplifting conviction therefore barred someone
 * from pet sitting on identical terms to an offence against a child. That is
 * not a safety measure, it is a blanket exclusion wearing one — and it lands
 * hardest on people trying to get back into work.
 *
 * So the declaration now records an offence type, and each category is closed
 * only by the types that bear on it. The mapping lives in
 * services/offenceScope.ts.
 *
 * Two changes beyond the column:
 *
 * PET CARE is removed from restricted_categories. Its stated ground was "home
 * access, care of animals", which does not justify excluding anyone — and
 * animal cruelty, the one offence genuinely relevant to it, is not something
 * this declaration asks about. A restriction we cannot ground is one we should
 * not impose.
 *
 * EXISTING RESTRICTIONS are left alone rather than recomputed. Nobody has
 * declared yet (0 rows at the time of writing), so there is nothing to
 * recompute; and if that changes, widening someone's access silently on the
 * basis of an offence type they never gave would be a guess. They re-declare,
 * or a reviewer clears them.
 */

export async function up(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE screening_declarations
        ADD COLUMN IF NOT EXISTS offence_type VARCHAR(32)
    `);

    // Null is meaningful here: a declaration made before this column existed,
    // or one where the person could not place their offence. Both are treated
    // as "scope unknown" and go to review rather than to a blanket bar.
    await client.query(`
      COMMENT ON COLUMN screening_declarations.offence_type IS
        'against_child | against_vulnerable | violence | sexual | dishonesty | driving | drugs | other. NULL = not asked or unknown; routes to review.'
    `);

    await client.query(`DELETE FROM restricted_categories WHERE category_slug = 'pet-care'`);

    // Any restriction already applied to pet care goes with it, otherwise the
    // row survives its own justification.
    await client.query(`
      DELETE FROM user_category_restrictions ucr
       WHERE NOT EXISTS (
         SELECT 1 FROM restricted_categories rc WHERE rc.id = ucr.restricted_category_id
       )
    `);

    await client.query('COMMIT');
    console.log('[046] offence_type added; pet-care no longer restricted');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function down(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE screening_declarations DROP COLUMN IF EXISTS offence_type`);
    await client.query(`
      INSERT INTO restricted_categories (category_slug, category_name, reason)
      VALUES ('pet-care', 'Pet Sitting', 'Home access, care of animals - requires background check')
      ON CONFLICT DO NOTHING
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
