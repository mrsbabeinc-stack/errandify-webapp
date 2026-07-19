/**
 * Stripe Subscription Webhooks
 * Handles subscription lifecycle events from Stripe
 */

import { Router, Response, Request } from 'express';
import Stripe from 'stripe';
import db from '../db.js';
import {
  createSubscription,
  cancelSubscription,
} from '../services/subscriptionService.js';
import { allocateMonthlyCredits } from '../services/adCreditService.js';

const router = Router();

// Initialize Stripe with existing secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_', {
  apiVersion: '2023-10-16',
});

// Stripe webhook secret
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';

/**
 * POST /webhooks/stripe/subscriptions
 * Main webhook handler for Stripe subscription events
 */
router.post('/stripe/subscriptions', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  try {
    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody || JSON.stringify(req.body),
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    console.log(`🔔 Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(subscription: any): Promise<void> {
  try {
    const { companyId, tier, billingType } = subscription.metadata;

    if (!companyId) {
      console.error('Missing companyId in subscription metadata');
      return;
    }

    // Create subscription in our database
    await createSubscription(
      parseInt(companyId),
      tier,
      billingType,
      subscription.id,
      subscription.customer
    );

    // Allocate first month's ad credits
    await allocateMonthlyCredits(parseInt(companyId));

    console.log(`✅ Subscription created for company ${companyId} (${tier})`);
  } catch (error: any) {
    console.error('Error handling subscription.created:', error);
  }
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  try {
    const { companyId } = subscription.metadata;

    if (!companyId) {
      console.error('Missing companyId in subscription metadata');
      return;
    }

    // Update subscription status in database
    const status = subscription.status === 'active' ? 'active' : 'canceled';

    await db.query(
      'UPDATE company_subscriptions SET status = ? WHERE stripe_subscription_id = ?',
      [status, subscription.id]
    );

    console.log(`✅ Subscription updated: ${subscription.id} -> ${status}`);
  } catch (error: any) {
    console.error('Error handling subscription.updated:', error);
  }
}

/**
 * Handle subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  try {
    const { companyId } = subscription.metadata;

    if (!companyId) {
      console.error('Missing companyId in subscription metadata');
      return;
    }

    // Cancel subscription in our database
    await cancelSubscription(parseInt(companyId));

    console.log(`❌ Subscription deleted: company ${companyId}`);
  } catch (error: any) {
    console.error('Error handling subscription.deleted:', error);
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handlePaymentSucceeded(invoice: any): Promise<void> {
  try {
    if (!invoice.subscription) {
      return; // Not a subscription invoice
    }

    // Log payment success
    const subscription = await db.query(
      'SELECT company_id FROM company_subscriptions WHERE stripe_subscription_id = ?',
      [invoice.subscription]
    );

    if (subscription.length > 0) {
      // Create billing history record
      await db.query(
        `INSERT INTO subscription_billing_history
         (company_id, stripe_invoice_id, amount, status, created_at)
         VALUES (?, ?, ?, 'paid', NOW())`,
        [subscription[0].company_id, invoice.id, invoice.amount_paid]
      );

      console.log(`✅ Payment succeeded: ${invoice.id} (SGD ${(invoice.amount_paid / 100).toFixed(2)})`);
    }
  } catch (error: any) {
    console.error('Error handling invoice.payment_succeeded:', error);
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handlePaymentFailed(invoice: any): Promise<void> {
  try {
    if (!invoice.subscription) {
      return; // Not a subscription invoice
    }

    // Log payment failure
    const subscription = await db.query(
      'SELECT company_id FROM company_subscriptions WHERE stripe_subscription_id = ?',
      [invoice.subscription]
    );

    if (subscription.length > 0) {
      // Create billing history record
      await db.query(
        `INSERT INTO subscription_billing_history
         (company_id, stripe_invoice_id, amount, status, error_message, created_at)
         VALUES (?, ?, ?, 'failed', ?, NOW())`,
        [subscription[0].company_id, invoice.id, invoice.amount_due, invoice.last_payment_error?.message]
      );

      console.error(`❌ Payment failed: ${invoice.id} - ${invoice.last_payment_error?.message}`);
    }
  } catch (error: any) {
    console.error('Error handling invoice.payment_failed:', error);
  }
}

export default router;
