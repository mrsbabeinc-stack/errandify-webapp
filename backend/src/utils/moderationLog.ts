import db from '../db.js';

/**
 * Recording and classifying moderation decisions.
 *
 * Two ideas here:
 *
 * 1. Everything is logged, including passes, so the block rate is a number
 *    rather than a guess. You cannot tune a filter you cannot measure.
 *
 * 2. Not every "unsafe" verdict deserves the same response. Deterministic rules
 *    (a phone number, an address) are certain, so they hard block. The model's
 *    judgement is not certain — on serious categories it still blocks, because
 *    the cost of publishing genuinely illegal content is far higher than the
 *    cost of a false positive. On everything else it publishes and flags, so an
 *    ordinary errand is never silently killed by a model's bad day.
 */

export type ModerationLayer = 'keyword' | 'ai' | 'combined';
export type ModerationDecision = 'passed' | 'flagged' | 'blocked';

/**
 * Categories where a false negative is worse than a false positive. Anything
 * here blocks even on the model's word alone.
 */
const ALWAYS_BLOCK = [
  'illegal', 'drug', 'weapon', 'sexual', 'adult', 'violence', 'harm',
  'abuse', 'exploit', 'minor', 'child', 'trafficking', 'hate',
  'scam', 'phish', 'launder', 'fraud',
];

export function isSeriousCategory(category?: string | null, flags?: string[] | null): boolean {
  const haystack = `${category || ''} ${(flags || []).join(' ')}`.toLowerCase();
  return ALWAYS_BLOCK.some((term) => haystack.includes(term));
}

/**
 * What should happen given who flagged it and why.
 *
 * A model saying "unsafe" about something that is not in a serious category is
 * exactly the case that used to block an innocent errand with no record and no
 * appeal. Those now publish and sit in a review queue instead.
 */
export function decideAction(params: {
  layer: ModerationLayer;
  isSafe: boolean;
  category?: string | null;
  flags?: string[] | null;
}): ModerationDecision {
  if (params.isSafe) return 'passed';
  if (params.layer === 'keyword') return 'blocked';
  return isSeriousCategory(params.category, params.flags) ? 'blocked' : 'flagged';
}

export async function recordModerationEvent(params: {
  userId?: number | null;
  errandId?: number | null;
  surface: string;
  layer: ModerationLayer;
  decision: ModerationDecision;
  category?: string | null;
  reason?: string | null;
  flags?: string[] | null;
  confidence?: number | null;
  content: string;
}): Promise<number | null> {
  try {
    const result = await db.query(
      `INSERT INTO moderation_events
         (user_id, errand_id, surface, layer, decision, category, reason, flags, confidence, content_excerpt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        params.userId ?? null,
        params.errandId ?? null,
        params.surface,
        params.layer,
        params.decision,
        params.category ?? null,
        params.reason ?? null,
        params.flags && params.flags.length ? params.flags : null,
        params.confidence ?? null,
        (params.content || '').slice(0, 300),
      ]
    );
    return result.rows[0]?.id ?? null;
  } catch (err) {
    // Logging must never be the reason a post fails
    console.error('[Moderation] Could not record event:', err);
    return null;
  }
}

/** The message shown when something is blocked — always with a way back. */
export function blockedMessage(reason: string, eventId: number | null): {
  error: string;
  reason: string;
  moderationEventId: number | null;
  canRequestReview: boolean;
} {
  return {
    error: `${reason} If you think we've got this wrong, ask us to take a look and a person will review it.`,
    reason,
    moderationEventId: eventId,
    canRequestReview: eventId !== null,
  };
}
