import Stripe from 'stripe';

// This used to set NODE_TLS_REJECT_UNAUTHORIZED = '0' in non-production, which
// disables certificate verification for the ENTIRE Node process — every
// outbound HTTPS call, not just Stripe, including the AI calls that carry
// private chat messages. It was gated on NODE_ENV !== 'production', so a
// 'staging' or unset NODE_ENV would run real money and real personal data over
// unverified TLS. Removed.
//
// Local machines that cannot reach Stripe's TLS should set
// NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem before starting node — that fixes the
// specific missing-CA problem without blinding the whole process. Verified this
// works for live Stripe test-mode calls from this repo.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51TPCNWRpPAWSpeM0...', {
  apiVersion: '2023-10-16',
});

export const stripeService = {
  /**
   * Create a payment intent for task payment
   * Called when user tries to pay for a task
   */
  /**
   * Charge the asker when the offer is accepted.
   *
   * The money settles into the PLATFORM's Stripe balance and stays in Stripe's
   * custody until we transfer it — to the doer's connected account when the
   * work is confirmed, or back to the asker as a refund. It never reaches an
   * Errandify bank account. That is the escrow: a held payout, not a held card
   * authorisation.
   *
   * We used to authorise (capture_method: 'manual') and capture later. That
   * failed on this product: authorisations lapse after ~7 days, and errands
   * here run 8 days on average between acceptance and deadline — so the money
   * would routinely die before the work was even due.
   *
   * Charging at ACCEPTANCE rather than completion is deliberate. A card that
   * declines at acceptance costs nobody anything: the offer simply is not
   * confirmed and the doer never sets off. A card that declines after the work
   * is done leaves an unpaid doer and no leverage.
   */
  async createPaymentIntent(amount: number, taskId: number, doerId: number): Promise<any> {
    try {
      console.log(`[Stripe] Charging for task ${taskId}, amount: $${amount}`);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'sgd',
        metadata: {
          taskId,
          doerId,
        },
        description: `Errand ${taskId} — held in Errandify's Stripe balance pending completion`,
      });

      console.log(`[Stripe] Payment intent created: ${paymentIntent.id}`);
      return {
        clientSecret: paymentIntent.client_secret,
        intentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      console.error('[Stripe] Failed to create payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  },

  /**
   * Capture an authorised payment — this is the moment money actually moves
   * from the asker. Called when an offer is accepted, not when the errand is
   * posted, so unfilled errands never cost a processing fee.
   *
   * `amount` is optional: capturing less than the authorised amount
   * automatically releases the remainder back to the asker, which is exactly
   * what a partial dispute settlement needs.
   */
  async capturePayment(intentId: string, amount?: number): Promise<any> {
    try {
      const params: any = {};
      if (typeof amount === 'number') params.amount_to_capture = Math.round(amount * 100);

      const intent = await stripe.paymentIntents.capture(intentId, params, {
        // Same errand captured twice returns the original rather than charging again
        idempotencyKey: `capture-${intentId}-${params.amount_to_capture ?? 'full'}`,
      });

      console.log(`[Stripe] Captured ${intent.amount_received / 100} of ${intent.amount / 100} on ${intentId}`);
      return {
        intentId: intent.id,
        status: intent.status,
        amountCaptured: intent.amount_received / 100,
      };
    } catch (error: any) {
      console.error('[Stripe] Capture failed:', error?.message || error);
      throw error;
    }
  },

  /**
   * Release an authorisation without taking any money — for an errand that
   * expired, was cancelled, or was fully refunded before capture. Unlike a
   * refund, this costs nothing.
   */
  async cancelAuthorisation(intentId: string, reason = 'requested_by_customer'): Promise<any> {
    try {
      const intent = await stripe.paymentIntents.cancel(intentId, {
        cancellation_reason: reason as any,
      });
      console.log(`[Stripe] Authorisation released: ${intentId}`);
      return { intentId: intent.id, status: intent.status };
    } catch (error: any) {
      console.error('[Stripe] Cancel failed:', error?.message || error);
      throw error;
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
  /**
   * Refund a payment, in full or in part.
   *
   * amountDollars omitted = full refund. Provided = partial, which is what a
   * dispute split needs (refund the asker their share, transfer the rest to the
   * doer). Stripe's `reason` only accepts three enum values, so the real reason
   * goes in metadata and the enum stays 'requested_by_customer'; passing an
   * arbitrary string as reason (as this used to) is rejected by Stripe.
   *
   * idempotencyKey makes a retried settlement leg return the original refund
   * rather than issuing a second one.
   */
  async refundPayment(intentId: string, reason: string, amountDollars?: number, idempotencyKey?: string): Promise<any> {
    try {
      console.log(`[Stripe] Refunding ${amountDollars != null ? '$' + amountDollars : 'full'} on ${intentId}: ${reason}`);

      const refund = await stripe.refunds.create(
        {
          payment_intent: intentId,
          reason: 'requested_by_customer',
          ...(amountDollars != null ? { amount: Math.round(amountDollars * 100) } : {}),
          metadata: { reason },
        },
        idempotencyKey ? { idempotencyKey } : undefined
      );

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
   * Create transfer to doer's connected account
   * Called after task completion and approval
   */
  async createTransfer(amount: number, destinationAccountId: string, taskId: string, reason: string, idempotencyKey?: string): Promise<any> {
    try {
      console.log(`[Stripe] Creating transfer to account ${destinationAccountId}, amount: $${amount}`);

      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'sgd',
          destination: destinationAccountId,
          description: `Payment for task ${taskId}`,
          metadata: {
            taskId,
            reason,
          },
        },
        // A retried settlement leg returns the original transfer, never a second.
        idempotencyKey ? { idempotencyKey } : undefined
      );

      console.log(`[Stripe] Transfer created: ${transfer.id}`);
      return {
        id: transfer.id,
        status: (transfer as any).status,
        amount: transfer.amount / 100,
      };
    } catch (error) {
      console.error('[Stripe] Failed to create transfer:', error);
      throw new Error('Failed to create transfer');
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
   * Create Account Link for Stripe Express onboarding
   * User completes bank verification on Stripe's secure pages
   * This is the easiest & most reliable way for SGD payouts
   */
  async createAccountLink(stripeAccountId: string, returnUrl: string): Promise<any> {
    try {
      console.log(`[Stripe] Creating account link for ${stripeAccountId}`);

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        type: 'account_onboarding',
        refresh_url: returnUrl,
        return_url: returnUrl,
      });

      console.log(`[Stripe] Account link created: ${accountLink.url}`);
      return {
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000),
      };
    } catch (error) {
      console.error('[Stripe] Failed to create account link:', error);
      throw new Error('Failed to create account link');
    }
  },

  /**
   * Get account status - check if bank is linked
   */
  async getAccountStatus(stripeAccountId: string): Promise<any> {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);

      return {
        id: account.id,
        type: account.type,
        country: account.country,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        verified: account.charges_enabled && account.payouts_enabled,
        requirements: account.requirements?.currently_due || [],
      };
    } catch (error) {
      console.error('[Stripe] Failed to get account status:', error);
      throw new Error('Failed to get account status');
    }
  },

  /**
   * Update external account as default for payouts
   */
  async setDefaultPayoutAccount(stripeAccountId: string, externalAccountId: string): Promise<any> {
    try {
      console.log(`[Stripe] Setting default payout account: ${externalAccountId}`);

      await stripe.accounts.update(stripeAccountId, {
        default_external_account: externalAccountId,
      } as any);

      console.log(`[Stripe] Default payout account updated`);
      return {
        success: true,
        message: 'Default payout account updated',
      };
    } catch (error) {
      console.error('[Stripe] Failed to set default payout account:', error);
      throw new Error('Failed to set default payout account');
    }
  },

  /**
   * Get bank account details
   */
  async getBankAccountDetails(stripeAccountId: string, externalAccountId: string): Promise<any> {
    try {
      const bankAccount = await stripe.accounts.retrieveExternalAccount(
        stripeAccountId,
        externalAccountId
      );

      return {
        id: bankAccount.id,
        last4: bankAccount.last4,
        fingerprint: bankAccount.fingerprint,
        status: bankAccount.status,
        verified: (bankAccount as any).verified,
      };
    } catch (error) {
      console.error('[Stripe] Failed to get bank account details:', error);
      throw new Error('Failed to get bank account details');
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

        case 'account.external_account.created':
          console.log('[Stripe] External account created:', event.data.object.id);
          // Update database: mark bank account as linked
          break;

        case 'account.external_account.deleted':
          console.log('[Stripe] External account deleted:', event.data.object.id);
          // Update database: mark bank account as removed
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
