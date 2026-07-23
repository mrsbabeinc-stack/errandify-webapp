import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import * as adPaymentService from '../services/adCreditPaymentService.js';
import { campaignModel } from '../models/Campaign.js';
import { advertisingNotifications } from '../services/advertisingNotifications.js';
import { requireCompanyRole } from '../utils/companyRole.js';

const router = Router();

/**
 * POST /api/ad-payment/calculate
 * Calculate payment breakdown before user confirms
 * Shows: credits to use, Stripe amount needed, final balance
 */
router.post('/calculate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id, company_id } = req.body;

    if (!campaign_id || !company_id) {
      return res.status(400).json({ success: false, error: 'campaign_id and company_id required' });
    }

    // Only the owner/manager may see another company's credit balance / breakdown.
    const gate = await requireCompanyRole(req.userId!, company_id, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ success: false, error: gate.error });

    // Get campaign
    const campaign = await campaignModel.getById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Calculate payment breakdown
    const budgetInCents = Math.round(campaign.budget * 100);
    const calculation = await adPaymentService.calculateAdPayment(
      company_id,
      campaign_id,
      campaign.title,
      budgetInCents
    );

    res.json({
      success: true,
      data: calculation,
      message: '✅ Payment calculation ready. Review before confirming.',
      next_step: calculation.requires_stripe_payment
        ? 'Proceed to Stripe payment for remaining balance'
        : 'Confirm to deduct from ad credits'
    });
  } catch (error) {
    console.error('Payment calculation error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate payment' });
  }
});

/**
 * POST /api/ad-payment/process
 * Process payment: deduct credits and/or charge Stripe
 * Requires: campaign_id, company_id, stripe_payment_intent_id (if Stripe payment)
 */
router.post('/process', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id, company_id, stripe_payment_intent_id } = req.body;

    if (!campaign_id || !company_id) {
      return res.status(400).json({ success: false, error: 'campaign_id and company_id required' });
    }

    // Authorisation at the point of the write: this endpoint moves money
    // (deducts ad credits and can charge a card). company_id came from the body
    // and was never checked against the caller, so any authenticated user could
    // spend another company's credits. Only the owner/manager may pay.
    const gate = await requireCompanyRole(req.userId!, company_id, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ success: false, error: gate.error });

    // Get campaign
    const campaign = await campaignModel.getById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // The campaign must belong to the paying company.
    if (Number(campaign.company_id) !== Number(company_id)) {
      return res.status(403).json({ success: false, error: 'Campaign does not belong to this company' });
    }

    // Idempotency: processAdPayment deducts credits / charges Stripe and sets the
    // campaign to 'approved'. Without this guard, a retry (or a double-click after
    // a slow response) deducts a second time. Once paid, don't charge again.
    if (['approved', 'active', 'completed'].includes(campaign.status)) {
      return res.status(409).json({ success: false, error: 'Campaign has already been paid and approved' });
    }

    // Calculate what we need to charge
    const budgetInCents = Math.round(campaign.budget * 100);
    const calculation = await adPaymentService.calculateAdPayment(
      company_id,
      campaign_id,
      campaign.title,
      budgetInCents
    );

    // If Stripe payment needed and we have payment intent ID, verify it
    if (calculation.requires_stripe_payment && stripe_payment_intent_id) {
      // Verify Stripe payment was successful (assume already verified)
      // In production, verify the payment intent status
    }

    // Process payment (deduct credits and/or charge Stripe)
    const paymentResult = await adPaymentService.processAdPayment(
      company_id,
      campaign_id,
      campaign.title,
      budgetInCents,
      undefined, // stripeCustomerId handled via payment intent
      stripe_payment_intent_id
    );

    // Create campaign schedules
    const scheduleModel = (await import('../models/Campaign.js')).scheduleModel;
    await scheduleModel.create(campaign_id, campaign.starts_at, 'start');
    await scheduleModel.create(campaign_id, campaign.ends_at, 'end');

    // Send approval notification. `companies` has no `name` column (it is
    // `company_name`) — the old query threw AFTER processAdPayment had already
    // deducted credits, so a successful payment surfaced as a 500 and the user
    // retried into a double charge. notifyCampaignApproved looks the company up
    // itself and doesn't use companyName, so this redundant query is dropped.
    await advertisingNotifications.notifyCampaignApproved({
      companyId: company_id,
      campaignId: campaign_id,
      campaignTitle: campaign.title,
      chargeAmount: campaign.budget
    });

    res.json({
      success: true,
      data: paymentResult
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process payment' });
  }
});

/**
 * GET /api/ad-payment/status/:company_id
 * Get company's current ad credit and subscription status
 */
router.get('/status/:company_id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id } = req.params;

    // The company id came from the URL and was never checked against the caller
    const gate = await requireCompanyRole(req.userId!, company_id, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ success: false, error: gate.error });

    const status = await adPaymentService.getCompanyAdCreditStatus(parseInt(company_id));

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

/**
 * POST /api/ad-payment/stripe-session
 * Create Stripe checkout session for partial payment
 */
router.post('/stripe-session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id, company_id, return_url } = req.body;

    if (!campaign_id || !company_id || !return_url) {
      return res.status(400).json({
        success: false,
        error: 'campaign_id, company_id, and return_url required'
      });
    }

    // Creating a Stripe checkout session charges this company — gate it.
    const gate = await requireCompanyRole(req.userId!, company_id, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ success: false, error: gate.error });

    const campaign = await campaignModel.getById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    if (Number(campaign.company_id) !== Number(company_id)) {
      return res.status(403).json({ success: false, error: 'Campaign does not belong to this company' });
    }
    if (['approved', 'active', 'completed'].includes(campaign.status)) {
      return res.status(409).json({ success: false, error: 'Campaign has already been paid and approved' });
    }

    // Compute the credit/Stripe split server-side — never trust a client-supplied
    // charge amount. Only the balance beyond ad credits goes to the card.
    const budgetInCents = Math.round(campaign.budget * 100);
    const calc = await adPaymentService.calculateAdPayment(company_id, campaign_id, campaign.title, budgetInCents);
    if (!calc.requires_stripe_payment) {
      return res.status(400).json({
        success: false,
        error: 'Ad credits already cover this campaign — use /process instead of Stripe.'
      });
    }

    const sessionData = await adPaymentService.createStripeSession(
      company_id,
      campaign_id,
      campaign.title,
      calc.stripe_amount_cents,
      return_url,
      calc.credits_to_use_cents
    );

    res.json({
      success: true,
      data: { ...sessionData, stripe_amount_cents: calc.stripe_amount_cents, credits_to_use_cents: calc.credits_to_use_cents }
    });
  } catch (error: any) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create Stripe session' });
  }
});

/**
 * POST /api/ad-payment/confirm-approval
 * Final confirmation: update campaign status to approved
 * Called after user confirms payment calculation
 */
router.post('/confirm-approval', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id, company_id, payment_method } = req.body;

    if (!campaign_id || !company_id || !payment_method) {
      return res.status(400).json({
        success: false,
        error: 'campaign_id, company_id, and payment_method required'
      });
    }

    // Marking a campaign approved is a privileged write — gate it.
    const gate = await requireCompanyRole(req.userId!, company_id, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ success: false, error: gate.error });

    const campaign = await campaignModel.getById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (Number(campaign.company_id) !== Number(company_id)) {
      return res.status(403).json({ success: false, error: 'Campaign does not belong to this company' });
    }

    // Update campaign status
    await campaignModel.update(campaign_id, {
      status: 'approved',
      approved_at: new Date().toISOString()
    });

    // Log approval
    await db.query(
      `INSERT INTO ad_credit_usage_log (company_id, campaign_id, amount, action, created_at)
       VALUES ($1, $2, $3, 'campaign_approved_confirmed', NOW())`,
      [company_id, campaign_id, Math.round(campaign.budget * 100)]
    );

    res.json({
      success: true,
      message: '✅ Campaign approved and payment confirmed'
    });
  } catch (error) {
    console.error('Confirm approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm approval' });
  }
});

/**
 * POST /api/ad-payment/verify-session
 * Called when the company returns from Stripe Checkout (success_url carries
 * session_id). Verifies the session was paid and finalizes the campaign:
 * deducts the credit portion, records the charge, and approves — idempotently.
 */
router.post('/verify-session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, company_id } = req.body;
    if (!session_id || !company_id) {
      return res.status(400).json({ success: false, error: 'session_id and company_id required' });
    }

    // Only the owner/manager of the paying company may finalize.
    const gate = await requireCompanyRole(req.userId!, company_id, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ success: false, error: gate.error });

    const result = await adPaymentService.finalizeStripeSession(session_id, Number(company_id));

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Verify session error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to verify payment session' });
  }
});

export default router;
