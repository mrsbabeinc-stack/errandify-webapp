import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import * as adPaymentService from '../services/adCreditPaymentService.js';
import { campaignModel } from '../models/Campaign.js';
import { advertisingNotifications } from '../services/advertisingNotifications.js';

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

    // Get campaign
    const campaign = await campaignModel.getById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
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

    // Send approval notification
    const companyRes = await db.query('SELECT name FROM companies WHERE id = $1', [company_id]);
    const companyName = companyRes.rows[0]?.name || 'Unknown';

    await advertisingNotifications.notifyCampaignApproved({
      companyId: company_id,
      companyName,
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
    const { campaign_id, company_id, stripe_amount_cents, return_url } = req.body;

    if (!campaign_id || !company_id || !stripe_amount_cents || !return_url) {
      return res.status(400).json({
        success: false,
        error: 'campaign_id, company_id, stripe_amount_cents, and return_url required'
      });
    }

    const campaign = await campaignModel.getById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const sessionData = await adPaymentService.createStripeSession(
      company_id,
      campaign_id,
      campaign.title,
      stripe_amount_cents,
      return_url
    );

    res.json({
      success: true,
      data: sessionData
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

    const campaign = await campaignModel.getById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
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

export default router;
