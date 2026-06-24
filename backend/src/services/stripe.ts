import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51TPCNWRpPAWSpeM0...', {
  apiVersion: '2024-04-10',
});

export const stripeService = {
  /**
   * Create a payment intent for task payment
   * Called when user tries to pay for a task
   */
  async createPaymentIntent(amount: number, taskId: number, doerId: number): Promise<any> {
    try {
      console.log(`[Stripe] Creating payment intent for task ${taskId}, amount: $${amount}`);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'sgd',
        metadata: {
          taskId,
          doerId,
        },
        description: `Payment for task ${taskId}`,
      });

      console.log(`[Stripe] Payment intent created: ${paymentIntent.id}`);
      return {
        clientSecret: paymentIntent.client_secret,
        intentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('[Stripe] Failed to create payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  },

  /**
   * Confirm payment and update task status
   * Called after user completes payment on frontend
   */
  async confirmPayment(intentId: string): Promise<any> {
    try {
      console.log(`[Stripe] Confirming payment intent: ${intentId}`);

      const paymentIntent = await stripe.paymentIntents.retrieve(intentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
      }

      console.log(`[Stripe] Payment confirmed successfully: ${intentId}`);
      return {
        success: true,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        taskId: paymentIntent.metadata?.taskId,
        doerId: paymentIntent.metadata?.doerId,
      };
    } catch (error) {
      console.error('[Stripe] Failed to confirm payment:', error);
      throw new Error('Failed to confirm payment');
    }
  },

  /**
   * Refund a payment (if user cancels, dispute, etc.)
   */
  async refundPayment(intentId: string, reason: string): Promise<any> {
    try {
      console.log(`[Stripe] Refunding payment: ${intentId}, reason: ${reason}`);

      const refund = await stripe.refunds.create({
        payment_intent: intentId,
        reason: reason as any,
      });

      console.log(`[Stripe] Refund created: ${refund.id}`);
      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      console.error('[Stripe] Failed to refund payment:', error);
      throw new Error('Failed to refund payment');
    }
  },

  /**
   * Create connected account for doer (for payouts)
   * Called when doer first signs up
   */
  async createConnectedAccount(doerId: number, email: string, name: string): Promise<any> {
    try {
      console.log(`[Stripe] Creating connected account for doer ${doerId}`);

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'SG',
        email,
        business_profile: {
          name,
          support_email: email,
        },
      });

      console.log(`[Stripe] Connected account created: ${account.id}`);
      return {
        stripeAccountId: account.id,
        accountLink: account.id,
      };
    } catch (error) {
      console.error('[Stripe] Failed to create connected account:', error);
      throw new Error('Failed to create connected account');
    }
  },

  /**
   * Create payout to doer
   * Called after task completion and rating
   */
  async createPayout(stripeAccountId: string, amount: number, taskId: number): Promise<any> {
    try {
      console.log(`[Stripe] Creating payout to account ${stripeAccountId}, amount: $${amount}`);

      const payout = await stripe.payouts.create(
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'sgd',
          description: `Earnings from task ${taskId}`,
        },
        {
          stripeAccount: stripeAccountId,
        }
      );

      console.log(`[Stripe] Payout created: ${payout.id}`);
      return {
        payoutId: payout.id,
        status: payout.status,
        amount: payout.amount / 100,
      };
    } catch (error) {
      console.error('[Stripe] Failed to create payout:', error);
      throw new Error('Failed to create payout');
    }
  },

  /**
   * Get payout status
   * Check if payout was sent to doer
   */
  async getPayoutStatus(stripeAccountId: string, payoutId: string): Promise<any> {
    try {
      const payout = await stripe.payouts.retrieve(payoutId, {
        stripeAccount: stripeAccountId,
      });

      return {
        payoutId: payout.id,
        status: payout.status,
        amount: payout.amount / 100,
        arrivalDate: new Date(payout.arrival_date * 1000),
      };
    } catch (error) {
      console.error('[Stripe] Failed to get payout status:', error);
      throw new Error('Failed to get payout status');
    }
  },

  /**
   * Handle Stripe webhook events
   * Called by Stripe when payment events occur
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      console.log(`[Stripe] Webhook received: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          console.log('[Stripe] Payment succeeded:', event.data.object.id);
          // Update database: mark payment as completed
          break;

        case 'payment_intent.payment_failed':
          console.log('[Stripe] Payment failed:', event.data.object.id);
          // Update database: mark payment as failed
          break;

        case 'charge.refunded':
          console.log('[Stripe] Charge refunded:', event.data.object.id);
          // Update database: mark refund as processed
          break;

        case 'payout.paid':
          console.log('[Stripe] Payout paid:', event.data.object.id);
          // Update database: mark payout as paid
          break;

        case 'payout.failed':
          console.log('[Stripe] Payout failed:', event.data.object.id);
          // Update database: mark payout as failed, needs retry
          break;

        default:
          console.log('[Stripe] Unhandled event type:', event.type);
      }
    } catch (error) {
      console.error('[Stripe] Webhook handling error:', error);
      throw error;
    }
  },
};
