import db from '../db.js';

/**
 * Works out WHO gets paid for an errand, server-side.
 *
 * The payout endpoint previously took `stripeAccountId` and `amount` straight
 * from the request body, so a caller could pay any account any sum. Both are now
 * derived from the accepted offer.
 *
 * Company offers pay the COMPANY, never the staff member who did the work —
 * staff are paid by their employer through payroll, outside the errand flow.
 */

export interface PayoutRecipient {
  ok: boolean;
  error?: string;
  status?: number;
  /** 'company' when the accepted offer was made on a company's behalf */
  kind?: 'company' | 'individual';
  recipientId?: number;
  recipientName?: string;
  stripeAccountId?: string | null;
  payoutsEnabled?: boolean;
  /** authoritative amount, from the accepted offer — not the caller */
  amount?: number;
  errandTitle?: string;
}

export async function resolvePayoutRecipient(errandId: number | string): Promise<PayoutRecipient> {
  const eid = Number(errandId);
  if (!eid) return { ok: false, status: 400, error: 'Invalid errand' };

  const r = await db.query(
    `SELECT e.id, e.title, e.status AS errand_status, e.asker_id,
            b.id AS bid_id, b.amount, b.doer_id, b.company_id,
            u.display_name AS doer_name, u.stripe_account_id AS doer_stripe,
            c.company_name, c.stripe_account_id AS company_stripe,
            c.stripe_payouts_enabled, c.certified
       FROM errands e
       LEFT JOIN bids b ON b.id = e.accepted_bid_id
       LEFT JOIN users u ON u.id = b.doer_id
       LEFT JOIN companies c ON c.id = b.company_id
      WHERE e.id = $1`,
    [eid]
  );

  if (r.rows.length === 0) return { ok: false, status: 404, error: 'Errand not found' };
  const row = r.rows[0];

  if (!row.bid_id) {
    return { ok: false, status: 409, error: 'No accepted offer on this errand — there is nobody to pay yet' };
  }

  const amount = Number(row.amount);
  if (!amount || amount <= 0) {
    return { ok: false, status: 409, error: 'The accepted offer has no amount' };
  }

  // Company offer -> the company is paid
  if (row.company_id) {
    if (!row.company_stripe) {
      return {
        ok: false,
        status: 409,
        error: `${row.company_name} hasn't finished its Stripe payout setup, so payment can't be released yet.`,
        kind: 'company',
        recipientId: row.company_id,
        recipientName: row.company_name,
        amount,
      };
    }
    if (!row.stripe_payouts_enabled) {
      return {
        ok: false,
        status: 409,
        error: `Stripe has not enabled payouts for ${row.company_name} yet — they need to complete verification with Stripe.`,
        kind: 'company',
        recipientId: row.company_id,
        recipientName: row.company_name,
        stripeAccountId: row.company_stripe,
        payoutsEnabled: false,
        amount,
      };
    }
    return {
      ok: true,
      kind: 'company',
      recipientId: row.company_id,
      recipientName: row.company_name,
      stripeAccountId: row.company_stripe,
      payoutsEnabled: true,
      amount,
      errandTitle: row.title,
    };
  }

  // Individual offer -> the doer is paid
  if (!row.doer_stripe) {
    return {
      ok: false,
      status: 409,
      error: `${row.doer_name || 'The doer'} hasn't finished their payout setup, so payment can't be released yet.`,
      kind: 'individual',
      recipientId: row.doer_id,
      recipientName: row.doer_name,
      amount,
    };
  }

  return {
    ok: true,
    kind: 'individual',
    recipientId: row.doer_id,
    recipientName: row.doer_name,
    stripeAccountId: row.doer_stripe,
    amount,
    errandTitle: row.title,
  };
}

/** Only the asker who posted the errand (or an admin) may release its payment. */
export async function canReleasePayment(errandId: number | string, userId: number | string) {
  const r = await db.query('SELECT asker_id FROM errands WHERE id = $1', [errandId]);
  if (r.rows.length === 0) return false;
  return Number(r.rows[0].asker_id) === Number(userId);
}
