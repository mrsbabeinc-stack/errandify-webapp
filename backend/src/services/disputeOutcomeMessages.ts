import db from '../db.js';
import { QwenAI } from './qwenService.js';

/**
 * After an admin decides, Hana writes what each neighbour is told.
 *
 * She reads the whole case — both statements, the defence, her own earlier
 * suggestion, and crucially the ADMIN's decision, amounts and notes — and
 * drafts a separate message for each side. Separate matters: the person being
 * refunded and the person losing part of their payment need different words,
 * and a single broadcast message reads as cold to at least one of them.
 *
 * These are DRAFTS. Nothing is sent until an admin has read and approved it.
 */

export interface OutcomeMessages {
  asker: string;
  doer: string;
  generatedByAi: boolean;
}

/** The house voice. Kept here so the tone lives in one place. */
const TONE = `You are Hana, writing on behalf of Errandify — a Singapore errand marketplace where neighbours help each other out.

How Errandify speaks:
- Warm and plain, like a helpful neighbour, never like a bank or a legal notice
- Short sentences. No jargon, no "we regret to inform you", no "as per our policy"
- Say what was decided and why, in the words a person would actually use
- Be kind to the person who did not get what they wanted — they are still a neighbour, and they will use Errandify again
- Never blame or scold. Never imply someone lied
- Do not promise timings we have not been given. If you do not know when money arrives, say the team will confirm
- Singapore English is fine. Do not force slang`;

function fallbackMessage(role: 'asker' | 'doer', decision: string, notes: string): string {
  // Used when the AI is unavailable. Deliberately plain rather than cheerful —
  // better a flat honest message than a wrong warm one.
  const opening = role === 'asker' ? 'Hi there,' : 'Hi there,';
  const outcome =
    decision === 'approved'
      ? role === 'doer'
        ? 'The errand has been resolved in your favour and your payment is going ahead.'
        : 'After looking at this, we found the work was completed as agreed, so payment is going ahead to the doer.'
      : decision === 'rejected'
      ? role === 'asker'
        ? 'After looking at this, we are refunding you.'
        : 'After looking at this, the payment is being returned to the asker.'
      : 'After looking at this, we have split the payment between both of you.';

  return `${opening}\n\n${outcome}\n\n${notes}\n\nIf something here does not look right, reply to this message and we will take another look.\n\n— The Errandify team`;
}

export async function composeOutcomeMessages(disputeId: number): Promise<OutcomeMessages | null> {
  const result = await db.query(
    `SELECT d.id, d.description, d.dispute_type, d.defendant_response, d.response_status,
            d.resolution, d.resolution_notes,
            d.settlement_doer_amount, d.settlement_asker_amount, d.settlement_fee,
            d.hana_proposal, d.hana_recommended_action,
            d.appeal_window_closes_at, d.claimant_can_appeal, d.defendant_can_appeal,
            d.filed_by_user_id,
            e.title, e.formatted_id,
            e.asker_id, ab.doer_id,
            COALESCE(ua.alias, ua.display_name) AS asker_name,
            COALESCE(ud.alias, ud.display_name) AS doer_name
       FROM disputes d
       JOIN errands e ON e.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
       LEFT JOIN users ua ON ua.id = e.asker_id
       LEFT JOIN users ud ON ud.id = ab.doer_id
      WHERE d.id = $1`,
    [disputeId]
  );
  if (result.rows.length === 0) return null;

  const d = result.rows[0];
  if (!d.resolution) return null;

  const toDoer = Number(d.settlement_doer_amount ?? 0);
  const toAsker = Number(d.settlement_asker_amount ?? 0);
  const fee = Number(d.settlement_fee ?? 0);
  const filedByDoer = Number(d.filed_by_user_id) === Number(d.doer_id);

  const appealLine =
    d.claimant_can_appeal || d.defendant_can_appeal
      ? `Either side can ask us to look again until ${new Date(d.appeal_window_closes_at).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}.`
      : 'This decision is final.';

  const prompt = `${TONE}

A dispute has been decided by an Errandify admin. Write the message each side receives.

ERRAND: "${d.title}" (${d.formatted_id})
RAISED BY: the ${filedByDoer ? 'doer' : 'asker'}

WHAT THE CLAIMANT SAID:
${d.description}

WHAT THE OTHER SIDE SAID:
${d.response_status === 'received' && d.defendant_response ? d.defendant_response : d.response_status === 'forfeited' ? '(They did not respond in time.)' : '(They had not replied.)'}

THE ADMIN'S DECISION: ${d.resolution}
AMOUNT TO THE DOER: SGD ${toDoer.toFixed(2)}${fee > 0 ? ` (before the SGD ${fee.toFixed(2)} platform fee, so they receive SGD ${(toDoer - fee).toFixed(2)})` : ''}
AMOUNT BACK TO THE ASKER: SGD ${toAsker.toFixed(2)}

THE ADMIN'S OWN WORDS TO BOTH PARTIES:
${d.resolution_notes}

APPEAL: ${appealLine}

Write two messages. Use the admin's reasoning — do not invent new reasons or contradict them. Address each person as "you". Mention the specific amount that affects that person. Keep each message under 130 words.

Return ONLY JSON:
{
  "asker": "message to ${d.asker_name || 'the asker'}",
  "doer": "message to ${d.doer_name || 'the doer'}"
}`;

  try {
    const raw = await QwenAI.call([{ role: 'user', content: prompt }], {
      temperature: 0.6,
      maxTokens: 900,
    });

    const cleaned = String(raw)
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : cleaned);

    if (!parsed.asker || !parsed.doer) throw new Error('Incomplete AI response');

    return {
      asker: String(parsed.asker).slice(0, 2000),
      doer: String(parsed.doer).slice(0, 2000),
      generatedByAi: true,
    };
  } catch (err: any) {
    console.warn('[Outcome] AI drafting failed, using plain fallback:', err?.message || err);
    return {
      asker: fallbackMessage('asker', d.resolution, d.resolution_notes || ''),
      doer: fallbackMessage('doer', d.resolution, d.resolution_notes || ''),
      generatedByAi: false,
    };
  }
}

/** Draft and store. Never sends. */
export async function draftAndStoreOutcomeMessages(disputeId: number): Promise<OutcomeMessages | null> {
  const messages = await composeOutcomeMessages(disputeId);
  if (!messages) return null;

  await db.query(
    `UPDATE disputes
        SET outcome_message_asker = $1,
            outcome_message_doer = $2,
            outcome_messages_drafted_at = NOW()
      WHERE id = $3 AND outcome_messages_sent_at IS NULL`,
    [messages.asker, messages.doer, disputeId]
  );

  return messages;
}
