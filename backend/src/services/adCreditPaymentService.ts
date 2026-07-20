/**
 * Ad Credit Payment Service
 * Handles credit deduction, Stripe fallback, and balance updates
 */

import db from '../db.js';
import * as adCreditService from './adCreditService.js';
import { getCompanySubscription, getTierConfig } from './subscriptionService.js';
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
  returnUrl: string
): Promise<{ session_id: string; client_secret: string }> {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
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
      cancel_url: returnUrl,
      metadata: {
        campaign_id: campaignId.toString(),
        company_id: companyId.toString()
      }
    });

    return {
      session_id: session.id,
      client_secret: session.client_secret || ''
    };
  } catch (error) {
    console.error('Stripe session creation error:', error);
    throw error;
  }
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
