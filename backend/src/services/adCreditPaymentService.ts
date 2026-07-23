/**
 * Ad Credit Payment Service
 * Handles credit deduction, Stripe fallback, and balance updates
 */

import db from '../db.js';
import * as adCreditService from './adCreditService.js';
import { getCompanySubscription, getTierConfig } from './subscriptionService.js';
import { campaignModel, scheduleModel } from '../models/Campaign.js';
import { advertisingNotifications } from './advertisingNotifications.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

export interface AdPaymentCalculation {
  campaign_id: number;
  campaign_title: string;
  total_cost_sgd: number;
  total_cost_cents: number;

  // Credit offset
  available_credits_cents: number;
  available_credits_sgd: string;
  credits_to_use_cents: number;
  credits_to_use_sgd: string;

  // Stripe payment (if needed)
  requires_stripe_payment: boolean;
  stripe_amount_cents: number;
  stripe_amount_sgd: string;

  // Summary
  payment_method: 'credits_only' | 'credits_and_stripe' | 'stripe_only';
  credits_remaining_after_cents: number;
  credits_remaining_after_sgd: string;

  // Timestamps
  calculation_timestamp: string;
}

export interface PaymentResult {
  success: boolean;
  campaign_id: number;
  payment_method: string;
  credits_deducted_sgd: string;
  stripe_charged_sgd?: string;
  new_credit_balance_sgd: string;
  message: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
}

/**
 * Calculate payment breakdown for a campaign
 */
export async function calculateAdPayment(
  companyId: number,
  campaignId: number,
  campaignTitle: string,
  budgetCents: number
): Promise<AdPaymentCalculation> {
  const budgetSgd = budgetCents / 100;

  // Get current ad credits
  const credits = await adCreditService.getCredits(companyId);
  const availableCredits = credits ? (credits.allocated_amount - credits.used_amount) : 0;

  // Calculate credit usage
  const creditsToUse = Math.min(availableCredits, budgetCents);
  const remainingAfterCredits = budgetCents - creditsToUse;

  // Determine payment method
  let paymentMethod: 'credits_only' | 'credits_and_stripe' | 'stripe_only';
  if (remainingAfterCredits === 0) {
    paymentMethod = 'credits_only';
  } else if (creditsToUse > 0) {
    paymentMethod = 'credits_and_stripe';
  } else {
    paymentMethod = 'stripe_only';
  }

  const creditsRemaining = availableCredits - creditsToUse;

  return {
    campaign_id: campaignId,
    campaign_title: campaignTitle,
    total_cost_sgd: budgetSgd,
    total_cost_cents: budgetCents,

    available_credits_cents: availableCredits,
    available_credits_sgd: (availableCredits / 100).toFixed(2),
    credits_to_use_cents: creditsToUse,
    credits_to_use_sgd: (creditsToUse / 100).toFixed(2),

    requires_stripe_payment: remainingAfterCredits > 0,
    stripe_amount_cents: remainingAfterCredits,
    stripe_amount_sgd: (remainingAfterCredits / 100).toFixed(2),

    payment_method: paymentMethod,
    credits_remaining_after_cents: creditsRemaining,
    credits_remaining_after_sgd: (creditsRemaining / 100).toFixed(2),

    calculation_timestamp: new Date().toISOString()
  };
}

/**
 * Process ad payment: deduct credits and/or charge Stripe
 */
export async function processAdPayment(
  companyId: number,
  campaignId: number,
  campaignTitle: string,
  budgetCents: number,
  stripeCustomerId?: string,
  stripeCardToken?: string
): Promise<PaymentResult> {
  try {
    // Calculate payment breakdown
    const calculation = await calculateAdPayment(companyId, campaignId, campaignTitle, budgetCents);

    let stripeChargeId: string | undefined;
    let stripeAmount = 0;

    // Step 1: Deduct from ad credits if available
    if (calculation.credits_to_use_cents > 0) {
      await adCreditService.deductCredits(companyId, calculation.credits_to_use_cents);

      await db.query(
        `INSERT INTO ad_credit_usage_log (company_id, campaign_id, amount, action, created_at)
         VALUES ($1, $2, $3, 'campaign_approved_credit_deducted', NOW())`,
        [companyId, campaignId, calculation.credits_to_use_cents]
      );
    }

    // Step 2: Charge Stripe if remaining balance exists
    if (calculation.requires_stripe_payment && calculation.stripe_amount_cents > 0) {
      if (!stripeCustomerId || !stripeCardToken) {
        throw new Error('Stripe payment required but no payment method provided');
      }

      try {
        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: calculation.stripe_amount_cents,
          currency: 'sgd',
          customer: stripeCustomerId,
          payment_method: stripeCardToken,
          confirm: true,
          metadata: {
            campaign_id: campaignId.toString(),
            company_id: companyId.toString(),
            campaign_title: campaignTitle
          }
        });

        if (paymentIntent.status !== 'succeeded') {
          throw new Error(`Stripe payment failed: ${paymentIntent.status}`);
        }

        stripeChargeId = paymentIntent.id;
        stripeAmount = calculation.stripe_amount_cents;

        // Log Stripe charge
        await db.query(
          `INSERT INTO ad_credit_usage_log (company_id, campaign_id, amount, action, created_at)
           VALUES ($1, $2, $3, 'campaign_approved_stripe_charged', NOW())`,
          [companyId, campaignId, calculation.stripe_amount_cents]
        );
      } catch (stripeError: any) {
        console.error('Stripe payment failed:', stripeError);
        // Refund credits if Stripe fails
        if (calculation.credits_to_use_cents > 0) {
          await adCreditService.refundCredits(companyId, calculation.credits_to_use_cents);
        }
        throw new Error(`Payment processing failed: ${stripeError.message}`);
      }
    }

    // Step 3: Log campaign approval with payment info
    await db.query(
      `UPDATE campaigns
       SET status = 'approved',
           approved_at = NOW(),
           stripe_charge_id = $1
       WHERE id = $2`,
      [stripeChargeId || null, campaignId]
    );

    // Step 4: Update subscription ad credits balance in subscription table
    const subscription = await getCompanySubscription(companyId);
    if (subscription) {
      await db.query(
        `UPDATE company_subscriptions
         SET updated_at = NOW()
         WHERE company_id = $1`,
        [companyId]
      );
    }

    // Step 5: Get updated balance
    const updatedCredits = await adCreditService.getCredits(companyId);
    const newBalance = updatedCredits ? (updatedCredits.allocated_amount - updatedCredits.used_amount) : 0;

    // Determine payment method summary
    let paymentMethodSummary = '';
    if (calculation.payment_method === 'credits_only') {
      paymentMethodSummary = `Paid from ad credits (${calculation.credits_to_use_sgd})`;
    } else if (calculation.payment_method === 'credits_and_stripe') {
      paymentMethodSummary = `Credits (${calculation.credits_to_use_sgd}) + Stripe (${calculation.stripe_amount_sgd})`;
    } else {
      paymentMethodSummary = `Stripe payment (${calculation.stripe_amount_sgd})`;
    }

    return {
      success: true,
      campaign_id: campaignId,
      payment_method: paymentMethodSummary,
      credits_deducted_sgd: calculation.credits_to_use_sgd,
      stripe_charged_sgd: stripeChargeId ? calculation.stripe_amount_sgd : undefined,
      new_credit_balance_sgd: (newBalance / 100).toFixed(2),
      message: `✅ Campaign approved! Payment processed. New ad credit balance: SGD $${(newBalance / 100).toFixed(2)}`,
      stripe_payment_intent_id: stripeChargeId
    };
  } catch (error) {
    console.error('Ad payment processing error:', error);
    throw error;
  }
}

/**
 * Create Stripe session for partial payment
 * Used when credits aren't enough and user needs Stripe payment
 */
export async function createStripeSession(
  companyId: number,
  campaignId: number,
  campaignTitle: string,
  stripeAmountCents: number,
  returnUrl: string,
  creditsToUseCents: number = 0
): Promise<{ session_id: string; url: string }> {
  try {
    const session = await stripe.checkout.sessions.create({
      // SGD hosted Checkout — 'ideal' is a EUR-only method and errored here.
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'sgd',
            product_data: {
              name: `Ad Campaign: ${campaignTitle}`,
              description: 'Balance payment after ad credits usage'
            },
            unit_amount: stripeAmountCents
          },
          quantity: 1
        }
      ],
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?checkout=cancelled`,
      // The credit split is stamped on the session so finalize deducts exactly
      // the credit portion after Stripe confirms the card charge — the amounts
      // can't be tampered with client-side because only our secret key set them.
      metadata: {
        campaign_id: campaignId.toString(),
        company_id: companyId.toString(),
        credits_to_use_cents: Math.round(creditsToUseCents).toString(),
        stripe_amount_cents: Math.round(stripeAmountCents).toString()
      }
    });

    return {
      session_id: session.id,
      url: session.url || ''
    };
  } catch (error) {
    console.error('Stripe session creation error:', error);
    throw error;
  }
}

/**
 * Finalize an ad campaign after the company completes the Stripe Checkout for the
 * balance beyond their ad credits. Verifies the session was actually paid, then
 * deducts the credit portion, records the charge, and approves the campaign —
 * idempotently, so a page refresh on the return URL can't double-charge.
 *
 * Returns { alreadyFinalized } when the campaign was already approved so the
 * caller can treat a repeat verify as success rather than an error.
 */
export async function finalizeStripeSession(
  sessionId: string,
  expectedCompanyId: number
): Promise<{ success: boolean; campaign_id: number; alreadyFinalized: boolean; message: string }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    throw new Error(`Payment not completed (status: ${session.payment_status}). Please finish the card payment.`);
  }

  const campaignId = parseInt(session.metadata?.campaign_id || '0', 10);
  const companyId = parseInt(session.metadata?.company_id || '0', 10);
  const creditsToUseCents = parseInt(session.metadata?.credits_to_use_cents || '0', 10);
  if (!campaignId || !companyId) {
    throw new Error('Stripe session is missing campaign/company metadata.');
  }

  // The session must belong to the company the caller is authorised for — stops a
  // member of company A finalizing a session that charged company B.
  if (Number(companyId) !== Number(expectedCompanyId)) {
    throw new Error('Payment session does not belong to this company.');
  }

  const campaign = await campaignModel.getById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  // Idempotency: if this campaign is already paid/approved, don't touch credits
  // again — the card was charged once by Stripe and the credit side ran once.
  if (['approved', 'active', 'completed'].includes(campaign.status)) {
    return { success: true, campaign_id: campaignId, alreadyFinalized: true, message: 'Campaign already approved.' };
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // Deduct the credit portion. Clamp to what's actually available now in case a
  // concurrent campaign consumed credits between calculate and payment; the card
  // already covered the Stripe portion so we never over-charge, only under-deduct.
  if (creditsToUseCents > 0) {
    const credits = await adCreditService.getCredits(companyId);
    const available = credits ? credits.allocated_amount - credits.used_amount : 0;
    const deduct = Math.min(creditsToUseCents, available);
    if (deduct > 0) {
      await adCreditService.deductCredits(companyId, deduct);
      await db.query(
        `INSERT INTO ad_credit_usage_log (company_id, campaign_id, amount, action, created_at)
         VALUES ($1, $2, $3, 'campaign_approved_credit_deducted', NOW())`,
        [companyId, campaignId, deduct]
      );
    }
  }

  await db.query(
    `INSERT INTO ad_credit_usage_log (company_id, campaign_id, amount, action, created_at)
     VALUES ($1, $2, $3, 'campaign_approved_stripe_charged', NOW())`,
    [companyId, campaignId, parseInt(session.metadata?.stripe_amount_cents || '0', 10)]
  );

  await db.query(
    `UPDATE campaigns SET status = 'approved', approved_at = NOW(), stripe_charge_id = $1 WHERE id = $2`,
    [paymentIntentId, campaignId]
  );

  await scheduleModel.create(campaignId, campaign.starts_at, 'start').catch(() => {});
  await scheduleModel.create(campaignId, campaign.ends_at, 'end').catch(() => {});

  await advertisingNotifications.notifyCampaignApproved({
    companyId,
    campaignId,
    campaignTitle: campaign.title,
    chargeAmount: campaign.budget
  }).catch(() => {});

  return { success: true, campaign_id: campaignId, alreadyFinalized: false, message: 'Campaign approved and payment confirmed.' };
}

/**
 * Get company ad credits and subscription details
 */
export async function getCompanyAdCreditStatus(companyId: number) {
  try {
    const credits = await adCreditService.getCredits(companyId);

    // Get subscription from database directly
    const subResult = await db.query(
      'SELECT subscription_tier FROM company_subscriptions WHERE company_id = $1 LIMIT 1',
      [companyId]
    );
    const subscription = subResult.rows?.[0];
    const tier = subscription?.subscription_tier || 'free';

    // Get tier config - map tier name to ad credit amount
    let tierAdCredits = 0;
    const tierLower = tier?.toLowerCase() || 'free';

    if (tierLower === 'silver' || tierLower === 'basic') {
      tierAdCredits = 5000; // SGD $50 in cents
    } else if (tierLower === 'gold' || tierLower === 'premium') {
      tierAdCredits = 20000; // SGD $200 in cents
    } else if (tierLower === 'platinum' || tierLower === 'enterprise') {
      tierAdCredits = 50000; // SGD $500 in cents
    }

    return {
      credits: {
        allocated_sgd: credits ? (credits.allocated_amount / 100).toFixed(2) : '0.00',
        used_sgd: credits ? ((credits.used_amount || 0) / 100).toFixed(2) : '0.00',
        available_sgd: credits ? ((credits.allocated_amount - (credits.used_amount || 0)) / 100).toFixed(2) : '0.00',
        usage_percentage: credits && credits.allocated_amount > 0 ? (((credits.used_amount || 0) / credits.allocated_amount) * 100).toFixed(1) : '0',
        expires_at: credits?.expires_at || null
      },
      subscription: {
        tier: tier,
        monthly_credit_allocation_sgd: (tierAdCredits / 100).toFixed(2)
      }
    };
  } catch (error) {
    console.error('Get company ad credit status error:', error);
    throw error;
  }
}

export default {
  calculateAdPayment,
  processAdPayment,
  createStripeSession,
  getCompanyAdCreditStatus
};
