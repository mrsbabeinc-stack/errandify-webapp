import db from '../db.js';

/**
 * Turns a declaration into restrictions.
 *
 * The rule used to be: any conviction bars every category, permanently. That
 * is stricter than the law requires and gave people no way back. This applies
 * the tiered model instead — see migration 042 for the policy table.
 *
 * Three outcomes:
 *   lifetime  — every restricted category, no end date
 *   temporary — every restricted category, expiring at
 *               sentence_completed_on + debarment_months
 *   review    — restrictions applied in full, and a human decides
 *
 * It fails safe in every direction it can be uncertain: an unknown offence
 * type, a temporary rule with no period set, or a missing sentence date all
 * produce restrictions plus a review, never open access. The strictest tier
 * among the declared offences wins.
 */

export type Tier = 'lifetime' | 'temporary' | 'review';

export interface ScreeningOutcome {
  tier: Tier;
  restrictionEnd: Date | null;
  reviewStatus: 'auto' | 'pending_review';
  reason: string;
}

const SEVERITY: Record<Tier, number> = { review: 1, temporary: 2, lifetime: 3 };

export async function resolveOutcome(
  offenceTypes: string[],
  sentenceCompletedOn: string | null,
  underMonitoring: boolean
): Promise<ScreeningOutcome> {
  if (!offenceTypes || offenceTypes.length === 0) {
    // Declared a conviction but named no offence — cannot be tiered.
    return {
      tier: 'review',
      restrictionEnd: null,
      reviewStatus: 'pending_review',
      reason: 'Conviction declared without an offence type',
    };
  }

  const rules = await db.query(
    'SELECT offence_type, tier, debarment_months FROM debarment_rules WHERE offence_type = ANY($1::text[])',
    [offenceTypes]
  );

  // An offence type we have no rule for must not slip through as harmless.
  const known = new Set(rules.rows.map((r: any) => r.offence_type));
  const unknown = offenceTypes.filter((t) => !known.has(t));
  if (unknown.length > 0) {
    return {
      tier: 'review',
      restrictionEnd: null,
      reviewStatus: 'pending_review',
      reason: `No debarment rule for: ${unknown.join(', ')}`,
    };
  }

  // Strictest tier wins when several offences are declared.
  let worst: Tier = 'review';
  for (const r of rules.rows) {
    if (SEVERITY[r.tier as Tier] > SEVERITY[worst]) worst = r.tier as Tier;
  }

  if (worst === 'lifetime') {
    return {
      tier: 'lifetime',
      restrictionEnd: null,
      reviewStatus: 'auto',
      reason: 'Offence carries a permanent restriction',
    };
  }

  if (worst === 'temporary') {
    // Longest applicable period governs.
    const months = rules.rows
      .filter((r: any) => r.tier === 'temporary')
      .map((r: any) => r.debarment_months);

    if (months.some((m: any) => m === null || m === undefined)) {
      return {
        tier: 'review',
        restrictionEnd: null,
        reviewStatus: 'pending_review',
        reason: 'Debarment period not configured for this offence — needs a decision',
      };
    }
    if (!sentenceCompletedOn) {
      // The period runs from completion of sentence; without that date there
      // is nothing to count from.
      return {
        tier: 'review',
        restrictionEnd: null,
        reviewStatus: 'pending_review',
        reason: 'Sentence completion date not provided',
      };
    }

    const longest = Math.max(...months.map((m: any) => Number(m)));
    const end = new Date(sentenceCompletedOn);
    end.setMonth(end.getMonth() + longest);

    return {
      tier: 'temporary',
      restrictionEnd: end,
      reviewStatus: 'auto',
      reason: `Restricted for ${longest} months from completion of sentence`,
    };
  }

  return {
    tier: 'review',
    restrictionEnd: null,
    reviewStatus: 'pending_review',
    reason: underMonitoring
      ? 'Under a monitoring or rehabilitation programme — needs a decision'
      : 'Offence cannot be assessed automatically',
  };
}

/** Applies the outcome across every restricted category. */
export async function applyRestrictions(userId: number, outcome: ScreeningOutcome): Promise<number> {
  const result = await db.query(
    `INSERT INTO user_category_restrictions (user_id, restricted_category_id, reason, restriction_end, is_active)
     SELECT $1, id, $2, $3::timestamp, true
       FROM restricted_categories
     ON CONFLICT (user_id, restricted_category_id) DO UPDATE
       SET is_active = true,
           reason = EXCLUDED.reason,
           restriction_end = EXCLUDED.restriction_end,
           updated_at = NOW()
     RETURNING id`,
    [userId, outcome.reason, outcome.restrictionEnd]
  );
  return result.rows.length;
}

/** Clears restrictions — used when a declaration reports no conviction. */
export async function clearRestrictions(userId: number): Promise<void> {
  await db.query('DELETE FROM user_category_restrictions WHERE user_id = $1', [userId]);
}
