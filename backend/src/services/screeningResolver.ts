import db from '../db.js';

/**
 * Turns a declaration into restrictions, following the Registration of
 * Criminals Act 1949 rather than a policy of our own invention.
 *
 * The Act already does the tiering:
 *
 *   s7B  a record becomes SPENT after a five-year crime-free period
 *   s7C  unless it is a Third Schedule offence (a), the sentence exceeded
 *        3 months / $2,000 (b), or (c)/(d) apply — in which case it never
 *        becomes spent
 *
 * So the restriction simply tracks the record:
 *   never spendable  → permanent restriction
 *   will spend       → restriction ends at conviction + five years
 *   already spent    → nothing to declare, nothing to restrict
 *
 * The five years runs from CONVICTION, per s7B. An earlier version of this
 * counted from sentence completion, which is a later date and over-restricted.
 *
 * It still fails safe: anything unanswered or unclear produces restrictions
 * plus a human review, never open access.
 *
 * Not legal advice. The exception permitting spent records to be considered for
 * roles "from which the person may be disqualified under any written law" has
 * not been assessed against Errandify's categories — mirroring the statute is
 * the safer default until a Singapore lawyer confirms.
 */

export type Tier = 'permanent' | 'until_spent' | 'review';

export interface ScreeningInput {
  hasUnspentConviction: boolean;
  thirdScheduleOffence?: boolean | null;
  exceededSentenceThreshold?: boolean | null;
  otherDisqualification?: boolean | null;
  convictedOn?: string | null;
}

export interface ScreeningOutcome {
  tier: Tier;
  restrictionEnd: Date | null;
  reviewStatus: 'auto' | 'pending_review';
  reason: string;
  basis: string;
}

async function policy(key: string, fallback: number): Promise<number> {
  const r = await db.query('SELECT value_int FROM screening_policy WHERE key = $1', [key]);
  const v = r.rows[0]?.value_int;
  return typeof v === 'number' ? v : fallback;
}

export async function resolveOutcome(input: ScreeningInput): Promise<ScreeningOutcome> {
  const {
    hasUnspentConviction,
    thirdScheduleOffence,
    exceededSentenceThreshold,
    otherDisqualification,
    convictedOn,
  } = input;

  // A spent record is treated in law as no record at all.
  if (!hasUnspentConviction) {
    return {
      tier: 'until_spent',
      restrictionEnd: null,
      reviewStatus: 'auto',
      reason: 'No unspent conviction declared',
      basis: 'RCA s7B',
    };
  }

  // s7C(a), (b), (c), (d) — any one means the record never becomes spent.
  const disqualified =
    thirdScheduleOffence === true ||
    exceededSentenceThreshold === true ||
    otherDisqualification === true;

  if (disqualified) {
    const which = [
      thirdScheduleOffence === true ? 's7C(a) Third Schedule offence' : null,
      exceededSentenceThreshold === true ? 's7C(b) sentence above the threshold' : null,
      otherDisqualification === true ? 's7C(c)/(d)' : null,
    ].filter(Boolean).join('; ');

    return {
      tier: 'permanent',
      restrictionEnd: null,
      reviewStatus: 'auto',
      reason: 'Conviction record cannot become spent',
      basis: `RCA ${which}`,
    };
  }

  // Not disqualified, so the record will spend — but only if we know when the
  // clock started. "Don't know" on any s7C question is not a no.
  const unanswered =
    thirdScheduleOffence === null || thirdScheduleOffence === undefined ||
    exceededSentenceThreshold === null || exceededSentenceThreshold === undefined;

  if (unanswered) {
    return {
      tier: 'review',
      restrictionEnd: null,
      reviewStatus: 'pending_review',
      reason: 'Could not determine whether the record can become spent',
      basis: 'RCA s7C — unanswered',
    };
  }

  if (!convictedOn) {
    return {
      tier: 'review',
      restrictionEnd: null,
      reviewStatus: 'pending_review',
      reason: 'Conviction date not provided, so the crime-free period cannot be counted',
      basis: 'RCA s7B',
    };
  }

  const years = await policy('crime_free_years', 5);
  const end = new Date(convictedOn);
  end.setFullYear(end.getFullYear() + years);

  // A date already past means the record has spent — nothing to restrict.
  if (end.getTime() <= Date.now()) {
    return {
      tier: 'until_spent',
      restrictionEnd: null,
      reviewStatus: 'auto',
      reason: `Crime-free period of ${years} years has elapsed — record is spent`,
      basis: 'RCA s7B',
    };
  }

  return {
    tier: 'until_spent',
    restrictionEnd: end,
    reviewStatus: 'auto',
    reason: `Restricted until the ${years}-year crime-free period completes`,
    basis: 'RCA s7B',
  };
}

/**
 * Applies the outcome to the categories the offence actually bears on.
 *
 * This used to have no WHERE clause, so one conviction closed all of them and a
 * shoplifting record barred someone from pet sitting. The scoping now comes
 * from services/offenceScope, and anything outside that list is left open —
 * including on re-declaration, which is what lets a correction give access back.
 */
export async function applyRestrictions(
  userId: number,
  outcome: ScreeningOutcome,
  slugs: string[]
): Promise<number> {
  if (slugs.length === 0) {
    await clearRestrictions(userId);
    return 0;
  }

  const result = await db.query(
    `INSERT INTO user_category_restrictions (user_id, restricted_category_id, reason, restriction_end, is_active)
     SELECT $1, id, $2, $3::timestamp, true
       FROM restricted_categories
      WHERE category_slug = ANY($4::text[])
     ON CONFLICT (user_id, restricted_category_id) DO UPDATE
       SET is_active = true,
           reason = EXCLUDED.reason,
           restriction_end = EXCLUDED.restriction_end,
           updated_at = NOW()
     RETURNING id`,
    [userId, `${outcome.reason} (${outcome.basis})`, outcome.restrictionEnd, slugs]
  );

  // A category no longer in scope must actually reopen. Without this a
  // re-declaration could only ever add restrictions, and correcting a mistake
  // would leave the wrong ones in place.
  await db.query(
    `DELETE FROM user_category_restrictions ucr
      USING restricted_categories rc
      WHERE ucr.restricted_category_id = rc.id
        AND ucr.user_id = $1
        AND NOT (rc.category_slug = ANY($2::text[]))`,
    [userId, slugs]
  );

  return result.rows.length;
}

/** Clears restrictions — used when there is nothing left to restrict. */
export async function clearRestrictions(userId: number): Promise<void> {
  await db.query('DELETE FROM user_category_restrictions WHERE user_id = $1', [userId]);
}

/** True when the outcome should not restrict anything at all. */
export function isUnrestricted(outcome: ScreeningOutcome): boolean {
  return outcome.tier === 'until_spent' && outcome.restrictionEnd === null;
}
