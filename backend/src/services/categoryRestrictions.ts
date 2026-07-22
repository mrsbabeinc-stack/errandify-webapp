import db from '../db.js';

/**
 * Category restrictions for screened users.
 *
 * Someone who declares a conviction can use Errandify, but the categories that
 * involve vulnerable people or home access are closed to them. This is the one
 * place that decides which, so browse, recommendations and offer submission
 * cannot drift apart — a category hidden from a list but still accepting offers
 * would be no protection at all.
 *
 * Restrictions are matched on restricted_categories.category_slug, which is the
 * same vocabulary as errands.category. The display labels ('Childcare') are not
 * usable for this: they never equal a slug ('childcare-education'). See
 * migration 037.
 */

/** Slugs this user may not work in. Empty for everyone unrestricted. */
export async function getRestrictedSlugs(userId: number): Promise<string[]> {
  if (!userId) return [];
  const result = await db.query(
    `SELECT DISTINCT rc.category_slug
       FROM user_category_restrictions ucr
       JOIN restricted_categories rc ON rc.id = ucr.restricted_category_id
      WHERE ucr.user_id = $1
        AND ucr.is_active = true
        AND (ucr.restriction_end IS NULL OR ucr.restriction_end > NOW())
        AND rc.category_slug IS NOT NULL`,
    [userId]
  );
  return result.rows.map((r: any) => r.category_slug);
}

/**
 * Whether this user may take on work in a category.
 * Unknown or unmapped categories are allowed — a category nobody has marked
 * restricted is not restricted.
 */
export async function isCategoryAllowed(userId: number, category?: string | null): Promise<boolean> {
  if (!category) return true;
  const restricted = await getRestrictedSlugs(userId);
  return !restricted.includes(category);
}

/**
 * Whether this category needs a declaration this person has not made.
 *
 * The absence of a restriction row is not evidence of a clean record — it is
 * equally the state of someone who has never been asked. Until this existed,
 * the two were indistinguishable and both read as "allowed", so every account
 * predating the declaration could take eldercare and childcare work
 * unscreened. The declaration was added to signup, which by definition only
 * reaches people who have not signed up yet.
 *
 * So the gate is asked at the point of the work rather than the point of
 * joining: a slug in restricted_categories with no declaration on file stops
 * here and gets asked, once. This is also the data-minimising order — nobody
 * is asked about a conviction until they choose work where the answer could
 * matter.
 */
export async function needsDeclaration(userId: number, category?: string | null): Promise<boolean> {
  if (!category || !userId) return false;
  const result = await db.query(
    `SELECT EXISTS (SELECT 1 FROM restricted_categories WHERE category_slug = $2) AS restricted,
            EXISTS (SELECT 1 FROM screening_declarations WHERE user_id = $1) AS declared`,
    [userId, category]
  );
  const row = result.rows[0];
  return Boolean(row?.restricted) && !row?.declared;
}

/**
 * The human-readable reason a category is closed, for telling someone why their
 * offer was refused. Returns null when nothing blocks them.
 */
export async function getRestrictionReason(
  userId: number,
  category?: string | null
): Promise<string | null> {
  if (!category || !userId) return null;
  const result = await db.query(
    `SELECT rc.category_name, rc.reason
       FROM user_category_restrictions ucr
       JOIN restricted_categories rc ON rc.id = ucr.restricted_category_id
      WHERE ucr.user_id = $1
        AND rc.category_slug = $2
        AND ucr.is_active = true
        AND (ucr.restriction_end IS NULL OR ucr.restriction_end > NOW())
      LIMIT 1`,
    [userId, category]
  );
  if (result.rows.length === 0) return null;
  // Read by someone who has just tried to make an offer. Explain the rule,
  // not the person — and point at the rest of the platform rather than
  // leaving them at a dead end.
  return (
    `${result.rows[0].category_name} errands aren't open to you at the moment. ` +
    `These categories need a background check because of who they involve. ` +
    `Everything else on Errandify is available as normal.`
  );
}
