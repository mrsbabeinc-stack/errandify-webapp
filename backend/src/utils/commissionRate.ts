import db from '../db.js';

/**
 * The single source of truth for "what does Errandify take".
 *
 * Two problems this replaces:
 *  - `getCommissionRate(companyId)` only ever handled COMPANY doers. Individual
 *    doers — most of the marketplace — had no commission path at all.
 *  - `Cases.tsx` hardcodes 0.20, which overcharges every subscribed company
 *    (Silver/Gold/Platinum are all below 20%).
 *
 * Deliberately a lookup rather than a constant, so a loyalty taper for
 * high-volume doers can be added later without touching call sites.
 */

/** Standard rate for an individual doer. */
export const INDIVIDUAL_COMMISSION_RATE = 0.2;

/**
 * Entry tier rate, used when a company has no active subscription row yet.
 *
 * There is no free tier — launch offers are handled with discount codes — so
 * falling back to the 20% individual rate would overcharge a company that is
 * simply mid-signup. Silver is the floor a company can be on.
 */
export const ENTRY_TIER_COMMISSION_RATE = 0.18;

export interface CommissionBreakdown {
  /** What the doer's side of the settlement is worth before our cut */
  gross: number;
  rate: number;
  fee: number;
  /** What actually reaches the doer */
  net: number;
  payeeType: 'individual' | 'company';
  waived: boolean;
}

/**
 * Resolve the rate for whoever is receiving the payout. Company doers get their
 * subscription tier rate; individuals get the standard rate.
 */
export async function resolveCommissionRate(params: {
  doerId?: number | null;
  companyId?: number | null;
}): Promise<{ rate: number; payeeType: 'individual' | 'company' }> {
  if (params.companyId) {
    try {
      const { getCommissionRate } = await import('../services/subscriptionService.js');
      const rate = await getCommissionRate(Number(params.companyId));
      return { rate, payeeType: 'company' };
    } catch (err) {
      // Never fail a settlement calculation because the subscription lookup
      // broke — fall back to the standard rate and make the noise visible.
      console.error('[Commission] Tier lookup failed, using entry tier rate:', err);
      return { rate: ENTRY_TIER_COMMISSION_RATE, payeeType: 'company' };
    }
  }
  return { rate: INDIVIDUAL_COMMISSION_RATE, payeeType: 'individual' };
}

/**
 * Work out the fee for a dispute settlement.
 *
 * `gross` is the doer's share of the settlement, not the errand total — the fee
 * only ever applies to money the doer actually receives. A full refund to the
 * asker therefore carries no fee, which is both the industry norm and the right
 * look: charging a cut of a job that failed invites a second complaint.
 */
export async function calculateSettlementFee(params: {
  doerGrossAmount: number;
  doerId?: number | null;
  companyId?: number | null;
  waived?: boolean;
}): Promise<CommissionBreakdown> {
  const gross = Math.max(0, Number(params.doerGrossAmount) || 0);
  const { rate, payeeType } = await resolveCommissionRate(params);

  // Nothing to the doer means nothing to take
  const waived = !!params.waived || gross === 0;
  const fee = waived ? 0 : Math.round(gross * rate * 100) / 100;

  return {
    gross,
    rate: waived ? 0 : rate,
    fee,
    net: Math.round((gross - fee) * 100) / 100,
    payeeType,
    waived,
  };
}

/** Who is being paid on this errand — the company if it was a MyBizOffer, else the individual. */
export async function resolvePayee(errandId: number): Promise<{
  doerId: number | null;
  companyId: number | null;
}> {
  const result = await db.query(
    `SELECT ab.doer_id, ab.company_id
       FROM errands e
       LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
      WHERE e.id = $1`,
    [errandId]
  );
  const r = result.rows[0];
  return {
    doerId: r?.doer_id ?? null,
    companyId: r?.company_id ?? null,
  };
}
