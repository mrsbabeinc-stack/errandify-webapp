import db from '../db.js';

/**
 * Can this doer actually be paid?
 *
 * Checked when an offer is made rather than when money moves. Discovering at
 * settlement that a doer has no payout account means the work is already done
 * and someone is owed money we cannot send — the worst possible moment. Asking
 * two minutes up front avoids that entirely.
 *
 * The tone of these messages matters: nobody is doing anything wrong by not
 * having set this up yet, so they should read as a nudge from a neighbour, not
 * a rejection.
 */

export type PayoutBlockReason = 'no_account' | 'pending_verification' | 'unknown';

export interface PayoutReadiness {
  ready: boolean;
  reason?: PayoutBlockReason;
  /** Shown directly to the doer */
  title?: string;
  message?: string;
  ctaLabel?: string;
  /** true when the doer is offering on behalf of their company */
  forCompany?: boolean;
}

/** Re-check with Stripe at most once an hour while the answer is still "no". */
const STALE_AFTER_MS = 60 * 60 * 1000;

const NOT_SET_UP: Omit<PayoutReadiness, 'ready' | 'forCompany'> = {
  reason: 'no_account',
  title: 'One small thing first',
  message:
    "Before you make your first offer, let us know where to send your earnings. It takes about two minutes, and once it's done you never have to think about it again — payment just lands in your account after each errand.",
  ctaLabel: 'Set up payouts',
};

const PENDING: Omit<PayoutReadiness, 'ready' | 'forCompany'> = {
  reason: 'pending_verification',
  title: "You're almost there",
  message:
    "Your payout account is set up, but Stripe still needs a couple of details before money can reach you. Finish those off and you're free to start making offers right away.",
  ctaLabel: 'Finish setup',
};

const COMPANY_NOT_SET_UP: Omit<PayoutReadiness, 'ready' | 'forCompany'> = {
  reason: 'no_account',
  title: 'Your company needs payout details',
  message:
    "Offers made as your company are paid to the company, so it needs its own payout account before you can send one. An owner or manager can set this up in Company Profile — about two minutes.",
  ctaLabel: 'Open Company Profile',
};

/**
 * Refresh the cached Stripe status. Best effort: if Stripe cannot be reached we
 * keep whatever we last knew rather than blocking someone over a network blip.
 */
async function refreshStatus(
  table: 'users' | 'companies',
  id: number,
  stripeAccountId: string
): Promise<boolean | null> {
  try {
    const { stripeService } = await import('../services/stripe.js');
    const account = await stripeService.getAccountStatus(stripeAccountId);
    const enabled = !!account?.payoutsEnabled;

    await db.query(
      `UPDATE ${table} SET stripe_payouts_enabled = $1, stripe_status_checked_at = NOW() WHERE id = $2`,
      [enabled, id]
    );
    return enabled;
  } catch (err) {
    console.warn(`[Payouts] Could not refresh Stripe status for ${table} ${id}:`, err);
    return null;
  }
}

export async function checkPayoutReadiness(params: {
  userId: number;
  /** set when the offer is being made on behalf of a company */
  companyId?: number | null;
}): Promise<PayoutReadiness> {
  const table = params.companyId ? 'companies' : 'users';
  const id = params.companyId ? Number(params.companyId) : Number(params.userId);
  const forCompany = !!params.companyId;

  const result = await db.query(
    `SELECT stripe_account_id, stripe_payouts_enabled, stripe_status_checked_at
       FROM ${table} WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];

  if (!row?.stripe_account_id) {
    return { ready: false, forCompany, ...(forCompany ? COMPANY_NOT_SET_UP : NOT_SET_UP) };
  }

  let enabled: boolean | null = row.stripe_payouts_enabled === true;
  const checkedAt = row.stripe_status_checked_at ? new Date(row.stripe_status_checked_at).getTime() : 0;
  const stale = Date.now() - checkedAt > STALE_AFTER_MS;

  // Only talk to Stripe when we would otherwise turn someone away, or when what
  // we know has gone stale. A doer who is already good to go costs no API call.
  if (!enabled || stale) {
    const fresh = await refreshStatus(table, id, row.stripe_account_id);
    if (fresh !== null) enabled = fresh;
  }

  if (!enabled) {
    return { ready: false, forCompany, ...(forCompany ? COMPANY_NOT_SET_UP : PENDING) };
  }

  return { ready: true, forCompany };
}
