/**
 * The asker pays the Stripe processing fee, so the platform keeps a clean
 * commission and the doer receives their full share.
 *
 * Measured on this account (SGD, test mode): fee = 3.9% + $0.50 on the test
 * Visa, which Stripe treats as an international card. Domestic Singapore cards
 * are 3.4% + $0.50. The card type is not known until the charge is made, so the
 * surcharge is an ESTIMATE — the actual fee is read back from the balance
 * transaction and recorded for the books.
 *
 * Rate is configurable so it can be corrected without a code change. The default
 * is the domestic rate; international cards then cost the platform ~0.5% that
 * the surcharge did not cover. Raising STRIPE_FEE_RATE to 0.039 makes the
 * platform whole on every card at the cost of slightly overcharging domestic
 * askers. That trade-off is the owner's to set.
 */

const RATE = Number(process.env.STRIPE_FEE_RATE ?? 0.034);   // 3.4% domestic default
const FIXED = Number(process.env.STRIPE_FEE_FIXED ?? 0.50);  // $0.50

/**
 * The surcharge to add so that, after Stripe takes its fee on the larger total,
 * the platform still receives the full errand amount.
 *
 * Gross-up, not a flat percentage: the fee applies to the grossed-up total, so
 * charge = (errand + fixed) / (1 - rate). Rounded up to the cent, so rounding
 * never leaves the platform a fraction short.
 */
export function stripeSurcharge(errandAmount: number): number {
  const charge = (errandAmount + FIXED) / (1 - RATE);
  return Math.ceil((charge - errandAmount) * 100) / 100;
}

/** What the asker is actually charged: errand price plus the surcharge. */
export function askerTotal(errandAmount: number): number {
  return Math.round((errandAmount + stripeSurcharge(errandAmount)) * 100) / 100;
}

/** Estimate only — for showing the breakdown before the charge. The real fee is
 *  read from the balance transaction afterwards. */
export function estimatedStripeFee(chargeAmount: number): number {
  return Math.round((chargeAmount * RATE + FIXED) * 100) / 100;
}
