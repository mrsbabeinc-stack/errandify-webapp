import db from '../db.js';
import { disputeConfig } from '../config/disputes.js';
import { calculateSettlementFee, resolvePayee, type CommissionBreakdown } from '../utils/commissionRate.js';

/**
 * Everything between "the admin decided" and "the money moved".
 *
 * The ordering rule that matters: money NEVER moves while an appeal is possible
 * or pending. Resolution records a decision and opens an appeal window;
 * settlement can only run once that window has closed. That makes the sequence
 * the product was worried about — release, then appeal — impossible by
 * construction rather than by anyone remembering to check.
 */

export interface AppealEligibility {
  claimantCanAppeal: boolean;
  defendantCanAppeal: boolean;
  windowClosesAt: Date;
  /** true when nobody may appeal, so it can settle straight away */
  immediate: boolean;
  reason: string;
}

/**
 * Who may appeal an admin decision, and until when.
 *
 * The rule is participation: you may appeal only if you engaged with the
 * process. The claimant filed, so they always qualify. The defendant qualifies
 * only if they submitted a response — forfeiting means forfeiting the appeal
 * too. And if nobody eligible has anything to complain about (the defendant
 * forfeited AND the claimant got what they asked for), the window is zero and
 * it settles immediately.
 */
export function determineAppealEligibility(params: {
  responseStatus: string | null;
  decision: 'approved' | 'rejected' | 'partial';
  /** did the claimant file as the doer? decides who "won" */
  claimantIsDoer: boolean;
}): AppealEligibility {
  const defendantResponded = params.responseStatus === 'received';

  // Did the claimant get everything they asked for?
  const claimantFullyWon = params.claimantIsDoer
    ? params.decision === 'approved'
    : params.decision === 'rejected';

  const claimantCanAppeal = !claimantFullyWon;
  const defendantCanAppeal = defendantResponded;

  const noOneCanAppeal = !claimantCanAppeal && !defendantCanAppeal;
  const windowSeconds = noOneCanAppeal ? 0 : disputeConfig.timing.appealWindow;

  return {
    claimantCanAppeal,
    defendantCanAppeal,
    windowClosesAt: new Date(Date.now() + windowSeconds * 1000),
    immediate: noOneCanAppeal,
    reason: noOneCanAppeal
      ? defendantResponded
        ? 'Both sides got the outcome they asked for.'
        : 'The other side never responded, and the claimant got what they asked for.'
      : `Appeal open for ${Math.round(windowSeconds / 3600)}h.`,
  };
}

/** The fee for a decided dispute, based on the doer's share only. */
export async function calculateDisputeFee(params: {
  errandId: number;
  doerAmount: number;
  waived?: boolean;
}): Promise<CommissionBreakdown> {
  const payee = await resolvePayee(params.errandId);
  return calculateSettlementFee({
    doerGrossAmount: params.doerAmount,
    doerId: payee.doerId,
    companyId: payee.companyId,
    waived: params.waived,
  });
}

export interface SettlementReadiness {
  ready: boolean;
  reason: string;
  windowClosesAt: Date | null;
  secondsRemaining: number;
}

/** Can this dispute have its money moved yet? */
export async function checkSettlementReadiness(disputeId: number): Promise<SettlementReadiness> {
  const result = await db.query(
    `SELECT status, resolution, appeal_window_closes_at, has_appeal, appeal_submitted_at,
            appeal_reviewed_at, settlement_status
       FROM disputes WHERE id = $1`,
    [disputeId]
  );
  if (result.rows.length === 0) {
    return { ready: false, reason: 'Dispute not found.', windowClosesAt: null, secondsRemaining: 0 };
  }
  const d = result.rows[0];

  if (!d.resolution) {
    return { ready: false, reason: 'No decision has been made yet.', windowClosesAt: null, secondsRemaining: 0 };
  }
  if (['pending', 'settled'].includes(d.settlement_status)) {
    return {
      ready: false,
      reason: `Already ${d.settlement_status} — settling again would risk paying twice.`,
      windowClosesAt: null,
      secondsRemaining: 0,
    };
  }

  // An appeal that has been filed but not yet reviewed freezes everything,
  // regardless of where the clock is.
  if ((d.has_appeal || d.appeal_submitted_at) && !d.appeal_reviewed_at) {
    return {
      ready: false,
      reason: 'An appeal is waiting to be reviewed. Nothing can be released until it is decided.',
      windowClosesAt: null,
      secondsRemaining: 0,
    };
  }

  const closesAt = d.appeal_window_closes_at ? new Date(d.appeal_window_closes_at) : null;
  if (!closesAt) {
    return { ready: false, reason: 'No appeal window recorded for this decision.', windowClosesAt: null, secondsRemaining: 0 };
  }

  const remaining = Math.ceil((closesAt.getTime() - Date.now()) / 1000);
  if (remaining > 0) {
    const hours = Math.floor(remaining / 3600);
    const mins = Math.ceil((remaining % 3600) / 60);
    return {
      ready: false,
      reason: `The appeal window is still open for ${hours > 0 ? `${hours}h ` : ''}${mins}m.`,
      windowClosesAt: closesAt,
      secondsRemaining: remaining,
    };
  }

  return { ready: true, reason: 'Appeal window closed — ready to release.', windowClosesAt: closesAt, secondsRemaining: 0 };
}

/**
 * Create the settlement legs for a decided dispute, without moving anything.
 *
 * Each leg carries its own idempotency key so a retry resumes only what failed,
 * and the unique index on that key is what stops a double-click producing two
 * transfers.
 */
export async function prepareSettlementLegs(disputeId: number): Promise<void> {
  const result = await db.query(
    `SELECT settlement_doer_amount, settlement_asker_amount, settlement_fee
       FROM disputes WHERE id = $1`,
    [disputeId]
  );
  if (result.rows.length === 0) return;

  const d = result.rows[0];
  const doerGross = Number(d.settlement_doer_amount ?? 0);
  const fee = Number(d.settlement_fee ?? 0);
  const doerNet = Math.max(0, Math.round((doerGross - fee) * 100) / 100);
  const askerAmount = Number(d.settlement_asker_amount ?? 0);

  const legs: { leg: string; amount: number }[] = [
    { leg: 'doer_transfer', amount: doerNet },
    { leg: 'asker_refund', amount: askerAmount },
  ];

  for (const l of legs) {
    await db.query(
      `INSERT INTO dispute_settlement_legs (dispute_id, leg, amount, status, idempotency_key)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dispute_id, leg) DO UPDATE
         SET amount = EXCLUDED.amount,
             status = EXCLUDED.status,
             updated_at = NOW()
         WHERE dispute_settlement_legs.status IN ('pending', 'skipped')`,
      [
        disputeId,
        l.leg,
        l.amount,
        // A zero leg is nothing to do, not a failure
        l.amount > 0 ? 'pending' : 'skipped',
        `dispute-${disputeId}-${l.leg}`,
      ]
    );
  }
}

export interface PreflightResult {
  ok: boolean;
  blockers: string[];
  warnings: string[];
}

/**
 * Check the money can actually move BEFORE moving any of it.
 *
 * Most half-settled states come from discovering a problem after the first leg
 * has already gone through. Checking up front converts those into "never
 * started", which is the recoverable case.
 */
export async function preflightSettlement(disputeId: number): Promise<PreflightResult> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const result = await db.query(
    `SELECT d.settlement_doer_amount, d.settlement_asker_amount,
            e.id AS errand_id, ab.doer_id, ab.company_id,
            u.stripe_account_id AS doer_stripe_account
       FROM disputes d
       JOIN errands e ON e.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
       LEFT JOIN users u ON u.id = ab.doer_id
      WHERE d.id = $1`,
    [disputeId]
  );
  if (result.rows.length === 0) {
    return { ok: false, blockers: ['Dispute not found.'], warnings: [] };
  }
  const d = result.rows[0];
  const doerAmount = Number(d.settlement_doer_amount ?? 0);

  if (doerAmount > 0) {
    if (!d.doer_stripe_account) {
      blockers.push('The doer has not connected a payout account yet, so they cannot be paid.');
    } else {
      try {
        const { stripeService } = await import('./stripe.js');
        const account = await stripeService.getAccountStatus(d.doer_stripe_account);
        if (!account?.payoutsEnabled) {
          blockers.push("The doer's payout account cannot receive money yet (Stripe payouts are not enabled).");
        }
        if (account?.requirements?.length) {
          warnings.push(
            `Stripe still needs ${account.requirements.length} item(s) from the doer: ${account.requirements.slice(0, 3).join(', ')}.`
          );
        }
      } catch (err: any) {
        // Never let a status lookup failure look like a settled question
        warnings.push(`Could not check the doer's payout account: ${err?.message || 'unknown error'}.`);
      }
    }
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

/**
 * Actually pays the settlement legs. This is the step that was missing: legs
 * were prepared with status 'pending' and nothing ever moved money, so a
 * disputed errand computed a correct split and then paid nobody.
 *
 * Per leg:
 *   doer_transfer -> Stripe transfer to the doer's connected account
 *   asker_refund  -> partial refund against the errand's original payment intent
 *
 * Each leg carries an idempotency_key, so a retry after a crash returns the
 * original Stripe object instead of paying twice. A leg that fails records the
 * error and its attempt count and does not block the others — a doer whose
 * payout account is not ready should not hold up the asker's refund.
 *
 * Only runs from an admin-approved resolution (POST /:id/resolve), never on its
 * own. Not called automatically anywhere yet — see the note in
 * DISPUTE_FINDINGS.md about /verdict vs /resolve.
 */
export interface SettlementExecutionResult {
  disputeId: number;
  legs: { leg: string; status: string; reference?: string; error?: string }[];
  allSettled: boolean;
}

export async function executeSettlement(disputeId: number): Promise<SettlementExecutionResult> {
  const { stripeService } = await import('./stripe.js');

  // Everything needed to pay: the doer's connected account, and the errand's
  // original payment intent to refund against.
  const ctx = await db.query(
    `SELECT d.id, d.errand_id,
            e.payment_intent_id,
            u.stripe_account_id AS doer_stripe_account
       FROM disputes d
       JOIN errands e ON e.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
       LEFT JOIN users u ON u.id = ab.doer_id
      WHERE d.id = $1`,
    [disputeId]
  );
  if (ctx.rows.length === 0) {
    return { disputeId, legs: [], allSettled: false };
  }
  const { errand_id, payment_intent_id, doer_stripe_account } = ctx.rows[0];

  const legsRes = await db.query(
    `SELECT id, leg, amount, status, idempotency_key
       FROM dispute_settlement_legs
      WHERE dispute_id = $1 AND status IN ('pending', 'failed')
      ORDER BY leg`,
    [disputeId]
  );

  const out: SettlementExecutionResult = { disputeId, legs: [], allSettled: true };

  for (const leg of legsRes.rows) {
    const amount = Number(leg.amount);

    // A zero leg has nothing to pay — mark it settled and move on.
    if (amount <= 0) {
      await db.query(
        `UPDATE dispute_settlement_legs SET status = 'skipped', updated_at = NOW() WHERE id = $1`,
        [leg.id]
      );
      out.legs.push({ leg: leg.leg, status: 'skipped' });
      continue;
    }

    try {
      let reference: string;

      if (leg.leg === 'doer_transfer') {
        if (!doer_stripe_account) throw new Error('doer has no connected payout account');
        const tr = await stripeService.createTransfer(
          amount, doer_stripe_account, String(errand_id), `dispute ${disputeId} settlement`, leg.idempotency_key
        );
        reference = tr.id;
      } else if (leg.leg === 'asker_refund') {
        if (!payment_intent_id) throw new Error('errand has no payment intent to refund');
        const rf = await stripeService.refundPayment(
          payment_intent_id, `dispute ${disputeId} settlement`, amount, leg.idempotency_key
        );
        reference = rf.refundId;
      } else {
        throw new Error(`unknown leg type: ${leg.leg}`);
      }

      await db.query(
        `UPDATE dispute_settlement_legs
            SET status = 'succeeded', stripe_reference = $2, succeeded_at = NOW(),
                attempts = COALESCE(attempts, 0) + 1, last_attempt_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [leg.id, reference]
      );
      out.legs.push({ leg: leg.leg, status: 'succeeded', reference });
    } catch (err: any) {
      out.allSettled = false;
      await db.query(
        `UPDATE dispute_settlement_legs
            SET status = 'failed', error_message = $2,
                attempts = COALESCE(attempts, 0) + 1, last_attempt_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [leg.id, String(err.message).slice(0, 240)]
      );
      out.legs.push({ leg: leg.leg, status: 'failed', error: String(err.message).slice(0, 120) });
    }
  }

  // The dispute is fully settled only when every leg is paid.
  if (out.allSettled && out.legs.length > 0) {
    await db.query(
      `UPDATE disputes SET settlement_status = 'settled', settled_at = NOW() WHERE id = $1`,
      [disputeId]
    );
  }

  return out;
}
