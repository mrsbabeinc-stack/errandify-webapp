import db from './../db.js';
import { QwenAI } from './qwenService.js';

/**
 * Hana's role in a dispute: read both sides and PROPOSE a resolution for an
 * admin to accept, change or reject.
 *
 * Hana never decides and never moves money. There is deliberately no code path
 * here that writes to `errands`, releases or splits payment, or sets a dispute
 * to resolved/closed — every one of those belongs to an admin. Keep it that way:
 * the proposal is advice attached to the dispute, nothing more.
 */

export type ProposedAction =
  | 'pay_doer_in_full'
  | 'refund_asker_in_full'
  | 'split_payment'
  | 'redo_the_work'
  | 'no_action_needed'
  | 'needs_more_information';

const ACTIONS: ProposedAction[] = [
  'pay_doer_in_full',
  'refund_asker_in_full',
  'split_payment',
  'redo_the_work',
  'no_action_needed',
  'needs_more_information',
];

export interface HanaProposal {
  action: ProposedAction;
  proposal: string;
  reasoning: string;
  confidence: number;
}

/**
 * Build a proposal and store it on the dispute. Always leaves the dispute in
 * 'admin_review' — whether Hana succeeded, failed, or wasn't confident.
 */
export async function proposeResolution(disputeId: number): Promise<HanaProposal | null> {
  try {
    const result = await db.query(
      `SELECT d.id, d.dispute_type, d.description, d.evidence,
              d.defendant_response, d.response_status, d.filed_by_user_id,
              e.title, e.budget, e.asker_id,
              ab.doer_id, ab.amount AS accepted_amount
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.id = $1`,
      [disputeId]
    );
    if (result.rows.length === 0) return null;

    const d = result.rows[0];
    const filedByDoer = Number(d.filed_by_user_id) === Number(d.doer_id);
    const amount = Number(d.accepted_amount ?? d.budget ?? 0);

    const prompt = `You are Hana, the assistant for Errandify, a Singapore errand marketplace where neighbours help each other.

A dispute has been raised. Your job is to PROPOSE a fair resolution for a human admin to review. You are NOT deciding — an admin makes the final call, and only the admin can move any money. Write warmly and plainly, the way you would speak to a neighbour.

ERRAND: "${d.title}"
AGREED AMOUNT: SGD ${amount.toFixed(2)}
RAISED BY: the ${filedByDoer ? 'doer (the person who did the work)' : 'asker (the person who requested it)'}
ISSUE TYPE: ${d.dispute_type}

WHAT THEY SAID:
${d.description}

${
  d.response_status === 'received' && d.defendant_response
    ? `WHAT THE OTHER SIDE SAID:\n${d.defendant_response}`
    : d.response_status === 'forfeited'
    ? 'The other side was given a chance to reply and did not.'
    : 'The other side has not replied yet.'
}

Choose exactly one action from this list:
- pay_doer_in_full
- refund_asker_in_full
- split_payment
- redo_the_work
- no_action_needed
- needs_more_information

Pick "needs_more_information" if you genuinely cannot tell from what you have been given. That is a good answer, not a failure — it is better than guessing when someone's money is involved.

Return ONLY JSON:
{
  "action": "one of the values above",
  "proposal": "1-2 warm sentences an admin could send to both neighbours",
  "reasoning": "2-3 sentences explaining to the admin why, and what is uncertain",
  "confidence": 0.0-1.0
}`;

    const raw = await QwenAI.call([{ role: 'user', content: prompt }], {
      temperature: 0.3,
      maxTokens: 600,
    });

    // Qwen wraps JSON in ``` fences
    const cleaned = String(raw)
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : cleaned);

    const action: ProposedAction = ACTIONS.includes(parsed.action)
      ? parsed.action
      : 'needs_more_information';

    const proposal: HanaProposal = {
      action,
      proposal: String(parsed.proposal || '').slice(0, 1000),
      reasoning: String(parsed.reasoning || '').slice(0, 2000),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
    };

    await db.query(
      `UPDATE disputes
          SET hana_recommended_action = $1,
              hana_proposal = $2,
              hana_reasoning = $3,
              hana_confidence = $4,
              hana_proposed_at = NOW(),
              hana_failed_reason = NULL,
              -- Only advance the status if the dispute is still waiting on
              -- Hana. She runs in the background, so an admin can resolve it
              -- first — this stops a late proposal dragging a decided dispute
              -- back into the queue. The suggestion is still recorded.
              status = CASE WHEN status = 'hana_reviewing' THEN 'admin_review' ELSE status END,
              updated_at = NOW()
        WHERE id = $5`,
      [proposal.action, proposal.proposal, proposal.reasoning, proposal.confidence, disputeId]
    );

    console.log(`[Hana] Proposed "${proposal.action}" for dispute ${disputeId} (confidence ${proposal.confidence})`);
    return proposal;
  } catch (error: any) {
    // Hana failing must never hold up a dispute — it still goes to the admin,
    // just without a suggestion, and the admin can see why.
    console.error('[Hana] Proposal failed:', error?.message || error);
    try {
      await db.query(
        // Only record the failure if there is no proposal already. A failed
        // RETRY must not stamp an error next to a perfectly good earlier
        // suggestion, or the admin sees both and cannot tell which is current.
        `UPDATE disputes
            SET status = CASE WHEN status = 'hana_reviewing' THEN 'admin_review' ELSE status END,
                hana_failed_reason = $1,
                updated_at = NOW()
          WHERE id = $2 AND hana_proposed_at IS NULL`,
        [String(error?.message || 'Unknown error').slice(0, 500), disputeId]
      );
    } catch (dbErr) {
      console.error('[Hana] Could not record proposal failure:', dbErr);
    }
    return null;
  }
}
