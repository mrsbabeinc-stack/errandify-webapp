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

const LOCAL_RATE = Number(process.env.STRIPE_FEE_RATE_LOCAL ?? 0.034);      // SG cards: 3.4%
const OVERSEAS_RATE = Number(process.env.STRIPE_FEE_RATE_OVERSEAS ?? 0.039); // foreign cards: 3.9%
const FIXED = Number(process.env.STRIPE_FEE_FIXED ?? 0.50);                 // $0.50

/**
 * The rate for a card, from its issuing country. Stripe exposes card.country on
 * the payment method BEFORE the charge, so the surcharge can be exact per card:
 * a Singapore card pays the local rate, anything else the overseas rate.
 *
 * When the country is unknown (the charge amount is set before the card is
 * seen), default to OVERSEAS so the platform is never left short — a local card
 * then pays a few cents more, which is refunded/absorbed rather than lost.
 */
export function rateForCountry(cardCountry?: string | null): number {
  if (!cardCountry) return OVERSEAS_RATE;
  return cardCountry.toUpperCase() === 'SG' ? LOCAL_RATE : OVERSEAS_RATE;
}

/**
 * The surcharge to add so that, after Stripe takes its fee on the larger total,
 * the platform still receives the full errand amount.
 *
 * Gross-up, not a flat percentage: the fee applies to the grossed-up total, so
 * charge = (errand + fixed) / (1 - rate). Rounded up to the cent so rounding
 * never leaves the platform a fraction short.
 */
export function stripeSurcharge(errandAmount: number, cardCountry?: string | null): number {
  const rate = rateForCountry(cardCountry);
  const charge = (errandAmount + FIXED) / (1 - rate);
  return Math.ceil((charge - errandAmount) * 100) / 100;
}

/** What the asker is actually charged: errand price plus the surcharge. */
export function askerTotal(errandAmount: number, cardCountry?: string | null): number {
  return Math.round((errandAmount + stripeSurcharge(errandAmount, cardCountry)) * 100) / 100;
}

/**
 * The breakdown to SHOW the asker before they pay, so the processing fee is
 * disclosed rather than buried. isExact is true only when the card country is
 * known; otherwise it is an overseas-rate estimate that may come down for a
 * local card.
 */
export function feeBreakdown(errandAmount: number, cardCountry?: string | null) {
  const rate = rateForCountry(cardCountry);
  const surcharge = stripeSurcharge(errandAmount, cardCountry);
  return {
    errandAmount: Math.round(errandAmount * 100) / 100,
    processingFee: surcharge,
    total: Math.round((errandAmount + surcharge) * 100) / 100,
    ratePercent: Math.round(rate * 1000) / 10,
    cardOrigin: !cardCountry ? 'unknown' : (cardCountry.toUpperCase() === 'SG' ? 'local' : 'overseas'),
    isExact: !!cardCountry,
  };
}

/** Estimate only — for reconciliation. The real fee is read from the balance
 *  transaction after the charge. */
export function estimatedStripeFee(chargeAmount: number, cardCountry?: string | null): number {
  return Math.round((chargeAmount * rateForCountry(cardCountry) + FIXED) * 100) / 100;
}
