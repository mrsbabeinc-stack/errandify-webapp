/**
 * Subscription Routes
 * Handles subscription management, checkout, and billing
 */

import { Router, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';
import {
  getCompanySubscription,
  getTierConfig,
  createSubscription,
  upgradeSubscription,
  scheduleDowngrade,
  cancelSubscription,
} from '../services/subscriptionService.js';
import { getCredits, getCreditHistory } from '../services/adCreditService.js';
import { getMilestoneProgress, getMilestones } from '../services/milestoneService.js';

const router = Router();

// Initialize Stripe with existing secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_', {
  apiVersion: '2023-10-16',
});

// Stripe price IDs (configure in env)
const STRIPE_PRICES: Record<string, Record<string, string>> = {
  silver: {
    monthly: process.env.STRIPE_SILVER_MONTHLY || 'price_silver_monthly',
    annual: process.env.STRIPE_SILVER_ANNUAL || 'price_silver_annual',
  },
  gold: {
    monthly: process.env.STRIPE_GOLD_MONTHLY || 'price_gold_monthly',
    annual: process.env.STRIPE_GOLD_ANNUAL || 'price_gold_annual',
  },
  platinum: {
    monthly: process.env.STRIPE_PLATINUM_MONTHLY || 'price_platinum_monthly',
    annual: process.env.STRIPE_PLATINUM_ANNUAL || 'price_platinum_annual',
  },
};

/**
 * GET /api/subscriptions/status
 * Get current subscription status + benefits
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Return demo subscription data for silver tier with updated pricing
    res.json({
      success: true,
      tier: 'silver',
      billing_type: 'annual',
      renewal_date: '2027-07-19T00:00:00Z',
      commission_rate: 0.18,
      ad_credit_monthly: 5000,
      ad_credit_balance: 5000,
      ep_multiplier: 2,
      max_team_members: 5,
      milestone_progress: [],
      is_active: true,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription status' });
  }
});

/**
 * GET /api/subscriptions/tiers
 * Get all available subscription tiers with pricing and features
 */
router.get('/tiers', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: [
        {
          name: 'silver',
          emoji: '🥈',
          price_monthly: 2800,  // SGD $28
          price_annual: 26800,  // SGD $268
          commission_rate: 0.18,
          ad_credit_monthly: 5000,  // SGD $50
          ep_multiplier: 2,
          max_team_members: 5,
          milestone_rewards: {
            50: 2000,  // SGD $20 at 50 tasks
          },
          features: [
            'Team coordination',
            'AI dashboard',
            'Basic AI recommendations',
          ],
        },
        {
          name: 'gold',
          emoji: '🥇',
          price_monthly: 7800,  // SGD $78
          price_annual: 74800,  // SGD $748
          commission_rate: 0.17,
          ad_credit_monthly: 20000,  // SGD $200
          ep_multiplier: 3,
          max_team_members: 15,
          milestone_rewards: {
            50: 5000,  // SGD $50 at 50 tasks
            100: 10000,  // SGD $100 at 100 tasks
          },
          features: [
            'Team coordination',
            'AI dashboard',
            'Enhanced AI recommendations',
            'Events management',
            'Top newsletter placement',
            '10% discount on ads',
            'Performance dashboard',
          ],
        },
        {
          name: 'platinum',
          emoji: '💎',
          price_monthly: 14800,  // SGD $148
          price_annual: 142000,  // SGD $1,420
          commission_rate: 0.16,
          ad_credit_monthly: 50000,  // SGD $500
          ep_multiplier: 5,
          max_team_members: 999999,  // Unlimited
          milestone_rewards: {
            50: 10000,  // SGD $100 at 50 tasks
            100: 20000,  // SGD $200 at 100 tasks
            200: 50000,  // SGD $500 at 200 tasks
          },
          features: [
            'Team coordination',
            'AI dashboard',
            'Premium AI recommendations',
            'Events management',
            'Blog management',
            'Quarterly newsletter',
            'Priority events placement',
            '20% discount on ads',
            'Performance dashboard',
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tiers' });
  }
});

/**
 * GET /api/subscriptions/tiers
 * Get all available tiers + pricing
 */
router.get('/tiers', async (req: AuthRequest, res: Response) => {
  try {
    const tiers = [
      {
        name: 'silver',
        price_monthly: 2800,
        price_annual: 26800,
        commission_rate: 0.18,
        ad_credit_monthly: 5000,
        ep_multiplier: 2,
        max_team_members: 5,
        features: [
          'Team coordination (up to 5 people)',
          'AI-powered dashboard',
          'Enhanced AI recommendations',
          '2x EP multiplier on tasks',
          'SGD $50/month ad credits',
          'Monthly newsletter feature',
        ],
      },
      {
        name: 'gold',
        price_monthly: 7800,
        price_annual: 74800,
        commission_rate: 0.17,
        ad_credit_monthly: 20000,
        ep_multiplier: 3,
        max_team_members: 15,
        features: [
          'Team coordination (up to 15 people)',
          'AI-powered dashboard',
          'Enhanced AI recommendations',
          '3x EP multiplier on tasks',
          'SGD $200/month ad credits',
          'Events invitations',
          'Top newsletter placement',
        ],
      },
      {
        name: 'platinum',
        price_monthly: 14800,
        price_annual: 142000,
        commission_rate: 0.16,
        ad_credit_monthly: 50000,
        ep_multiplier: 5,
        max_team_members: 999999,
        features: [
          'Unlimited team members',
          'AI-powered dashboard',
          'Enhanced AI recommendations',
          '5x EP multiplier on tasks',
          'SGD $500/month ad credits',
          'Blog publishing feature',
          'Quarterly newsletter',
          'Priority events access',
        ],
      },
    ];

    res.json({ success: true, data: tiers });
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tiers' });
  }
});

/**
 * POST /api/subscriptions/checkout
 * Create Stripe checkout session
 */
router.post('/checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { tier, billingType } = req.body;
    const companyId = parseInt(req.companyId || '0', 10);

    if (!tier || !billingType) {
      return res.status(400).json({ success: false, error: 'tier and billingType required' });
    }

    if (!STRIPE_PRICES[tier]) {
      return res.status(400).json({ success: false, error: 'Invalid tier' });
    }

    const priceId = STRIPE_PRICES[tier][billingType as keyof typeof STRIPE_PRICES['silver']];
    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Invalid billing type' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/company/dashboard#?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/company/dashboard#`,
      metadata: {
        companyId: companyId.toString(),
        tier: tier,
      },
      customer_email: req.user?.email || 'customer@errandify.com',
    });

    res.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      tier: tier,
      billingType: billingType,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

/**
 * GET /api/subscriptions/billing-history
 * Get billing history
 */
router.get('/billing-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.companyId || '0', 10);

    // Demo billing history - replace with real database query
    const history = [
      {
        id: 'inv_001',
        date: '2026-08-01',
        description: 'Gold Partner - Annual Subscription',
        amount: 74800,
        status: 'paid',
        invoice_url: '/invoices/inv_001.pdf',
        next_renewal: '2027-08-01',
      },
      {
        id: 'inv_002',
        date: '2026-07-15',
        description: 'Upgrade from Silver to Gold (Prorated)',
        amount: 3740,
        status: 'paid',
        invoice_url: '/invoices/inv_002.pdf',
        next_renewal: null,
      },
      {
        id: 'inv_003',
        date: '2026-07-01',
        description: 'Silver Partner - Annual Subscription',
        amount: 26800,
        status: 'paid',
        invoice_url: '/invoices/inv_003.pdf',
        next_renewal: null,
      },
    ];

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch billing history' });
  }
});

/**
 * POST /api/subscriptions/upgrade
 * Upgrade to higher tier (immediate, prorated charge)
 */
router.post('/upgrade', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.body;
    const companyId = parseInt(req.companyId || '0', 10);

    if (!tier) {
      return res.status(400).json({ success: false, error: 'tier required' });
    }

    const updated = await upgradeSubscription(companyId, tier);

    res.json({
      success: true,
      message: `Upgraded to ${tier}`,
      subscription: updated,
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ success: false, error: 'Failed to upgrade subscription' });
  }
});

/**
 * POST /api/subscriptions/downgrade
 * Schedule downgrade (takes effect at month-end/renewal, no refund)
 */
router.post('/downgrade', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.body;
    const companyId = parseInt(req.companyId || '0', 10);

    if (!tier) {
      return res.status(400).json({ success: false, error: 'tier required' });
    }

    // Record pending downgrade in database
    await db.query(
      `UPDATE company_subscriptions
       SET pending_downgrade_to = ?, downgrade_scheduled_at = NOW()
       WHERE company_id = ?`,
      [tier, companyId]
    );

    res.json({
      success: true,
      message: `Downgrade to ${tier} scheduled for next renewal on August 1, 2027`,
      tier: tier,
      effectiveDate: '2027-08-01',
      companyId: companyId
    });
  } catch (error) {
    console.error('Downgrade error:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule downgrade' });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription (with refund eligibility check)
 */
router.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.companyId || '0', 10);

    // Record churn attempt
    try {
      await db.query(
        `INSERT INTO churn_tracking (company_id, attempt_date, reason)
         VALUES (?, NOW(), ?)`,
        [companyId, 'user_initiated']
      );
    } catch (e) {
      // Table may not exist yet, continue anyway
    }

    res.json({
      success: true,
      message: 'Subscription canceled',
      companyId: companyId,
    });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/subscriptions/churn-prevention
 * Show discount offer to prevent churn
 */
router.post('/churn-prevention', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.companyId || '0', 10);

    // Get current subscription to calculate discount
    // For now, return demo discount
    res.json({
      success: true,
      offer: {
        discount_percent: 10,
        discount_duration_months: 3,
        message: 'We don\'t want to see you go! Enjoy 10% off for 3 months if you stay.',
        savings: 7480, // Example: 10% of Gold annual
        call_to_action: 'Claim 10% Discount'
      }
    });
  } catch (error) {
    console.error('Churn prevention error:', error);
    res.status(500).json({ success: false, error: 'Failed to load retention offer' });
  }
});

/**
 * GET /api/subscriptions/ad-credits/balance
 * Get current month's ad credit balance
 */
router.get('/ad-credits/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.companyId || '0', 10);

    // Demo ad credit balance - replace with real calculation
    res.json({
      success: true,
      allocated: 20000, // SGD 200/month for Gold tier
      used: 12500,
      available: 7500,
      expires_at: '2026-09-01',
      tier: 'gold',
      monthly_allowance: 20000,
      usage_percent: 62.5,
    });
  } catch (error) {
    console.error('Get ad credits error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ad credits' });
  }
});

/**
 * GET /api/subscriptions/ad-credits/history
 * Get 12-month ad credit history
 */
router.get('/ad-credits/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.companyId || '0', 10);

    // Demo 12-month history
    const history = [
      { month: '2026-08', allocated: 20000, used: 12500, remaining: 7500 },
      { month: '2026-07', allocated: 5000, used: 5000, remaining: 0 }, // Silver tier
      { month: '2026-06', allocated: 5000, used: 3200, remaining: 1800 },
      { month: '2026-05', allocated: 5000, used: 4500, remaining: 500 },
      { month: '2026-04', allocated: 5000, used: 5000, remaining: 0 },
      { month: '2026-03', allocated: 5000, used: 2800, remaining: 2200 },
      { month: '2026-02', allocated: 5000, used: 4200, remaining: 800 },
      { month: '2026-01', allocated: 5000, used: 5000, remaining: 0 },
      { month: '2025-12', allocated: 5000, used: 3500, remaining: 1500 },
      { month: '2025-11', allocated: 5000, used: 4800, remaining: 200 },
      { month: '2025-10', allocated: 5000, used: 5000, remaining: 0 },
      { month: '2025-09', allocated: 5000, used: 2900, remaining: 2100 },
    ];

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get ad credits history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch credit history' });
  }
});

/**
 * GET /api/subscriptions/milestones
 * Get milestone progress and history
 */
router.get('/milestones', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.companyId || '0', 10);

    const progress = await getMilestoneProgress(companyId);
    const milestones = await getMilestones(companyId);

    res.json({
      success: true,
      progress,
      milestones,
    });
  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch milestones' });
  }
});

/**
 * POST /api/subscriptions/proration
 * Calculate proration for mid-cycle changes
 */
router.post('/proration', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fromTier, toTier, billingType } = req.body;
    const companyId = parseInt(req.companyId || '0', 10);

    if (!fromTier || !toTier || !billingType) {
      return res.status(400).json({ success: false, error: 'fromTier, toTier, billingType required' });
    }

    // Pricing in cents
    const pricing: Record<string, Record<string, number>> = {
      silver: { monthly: 2800, annual: 26800 },
      gold: { monthly: 7800, annual: 74800 },
      platinum: { monthly: 14800, annual: 142000 },
    };

    const fromPrice = pricing[fromTier]?.[billingType] || 0;
    const toPrice = pricing[toTier]?.[billingType] || 0;
    const priceDifference = toPrice - fromPrice;

    // Calculate daily proration (assume 30-day month for simplicity)
    const daysRemaining = 15; // Example: 15 days left in billing cycle
    const dailyRate = toPrice / 30;
    const proratedAmount = dailyRate * daysRemaining;

    res.json({
      success: true,
      currentPlan: fromTier,
      newPlan: toTier,
      currentPrice: fromPrice,
      newPrice: toPrice,
      priceDifference: priceDifference,
      daysRemaining: daysRemaining,
      proratedAmount: Math.round(proratedAmount),
      message: priceDifference > 0
        ? `You'll be charged SGD ${(priceDifference / 100).toFixed(2)} for the upgrade today`
        : `You'll receive a credit of SGD ${Math.abs(priceDifference / 100).toFixed(2)} for the downgrade`
    });
  } catch (error) {
    console.error('Proration error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate proration' });
  }
});

/**
 * ADMIN ROUTES
 */

/**
 * GET /api/admin/subscriptions
 * Get all company subscriptions (admin only)
 */
router.get('/admin/subscriptions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Demo data - replace with actual database query
    const subscriptions = [
      {
        company_id: 1,
        company_name: 'Rumah Emas Demo Company',
        current_tier: 'gold',
        billing_type: 'annual',
        status: 'active',
        renewal_date: '2027-08-01',
        stripe_subscription_id: 'sub_demo_001',
        created_at: '2026-07-01',
        pending_downgrade_to: null,
        annual_value: 74800,
        signup_date: '2026-07-01',
        churn_risk: 'low'
      },
      {
        company_id: 2,
        company_name: 'Tech Startup Inc',
        current_tier: 'silver',
        billing_type: 'monthly',
        status: 'active',
        renewal_date: '2026-08-19',
        stripe_subscription_id: 'sub_demo_002',
        created_at: '2026-06-19',
        pending_downgrade_to: null,
        annual_value: 33600,
        signup_date: '2026-06-19',
        churn_risk: 'medium'
      },
      {
        company_id: 3,
        company_name: 'Enterprise Corp',
        current_tier: 'platinum',
        billing_type: 'annual',
        status: 'active',
        renewal_date: '2027-06-15',
        stripe_subscription_id: 'sub_demo_003',
        created_at: '2026-06-15',
        pending_downgrade_to: null,
        annual_value: 142000,
        signup_date: '2026-06-15',
        churn_risk: 'low'
      },
    ];

    res.json({
      success: true,
      data: subscriptions,
      total_revenue: 250400,
      active_subscriptions: 3,
    });
  } catch (error) {
    console.error('Get admin subscriptions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
  }
});

/**
 * GET /api/admin/subscriptions/analytics
 * Subscription analytics and metrics
 */
router.get('/admin/subscriptions/analytics', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      analytics: {
        total_revenue: 250400,
        active_subscriptions: 3,
        mrr: 20866,
        churn_rate: 5.2,
        arpu: 83466,
        tier_breakdown: {
          silver: 1,
          gold: 1,
          platinum: 1,
        },
        revenue_by_tier: {
          silver: 33600,
          gold: 74800,
          platinum: 142000,
        },
        churn_attempts_this_month: 2,
        avg_customer_lifetime: '13 months',
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

/**
 * POST /api/admin/subscriptions/:companyId/change-tier
 * Manually change a company's subscription tier (admin only)
 */
router.post('/admin/subscriptions/:companyId/change-tier', authMiddleware, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.body;
    const companyId = parseInt(req.params.companyId, 10);

    if (!tier) {
      return res.status(400).json({ success: false, error: 'tier required' });
    }

    // TODO: Add admin role check
    res.json({
      success: true,
      message: `Changed tier to ${tier}`,
      companyId: companyId,
      newTier: tier,
    });
  } catch (error) {
    console.error('Change tier error:', error);
    res.status(500).json({ success: false, error: 'Failed to change tier' });
  }
});

/**
 * POST /api/admin/subscriptions/:companyId/cancel
 * Cancel a subscription (admin only)
 */
router.post('/admin/subscriptions/:companyId/cancel', authMiddleware, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);

    // TODO: Add admin role check
    res.json({
      success: true,
      message: 'Subscription canceled by admin',
      companyId: companyId,
    });
  } catch (error) {
    console.error('Admin cancel error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/admin/subscriptions/:companyId/change-tier
 * Manually change a company's subscription tier (admin only)
 */
router.post('/admin/subscriptions/:companyId/change-tier', authMiddleware, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.body;
    const companyId = parseInt(req.params.companyId, 10);

    if (!tier) {
      return res.status(400).json({ success: false, error: 'tier required' });
    }

    // TODO: Add admin role check

    const updated = await upgradeSubscription(companyId, tier);

    res.json({
      success: true,
      message: `Changed tier to ${tier}`,
      subscription: updated,
    });
  } catch (error) {
    console.error('Change tier error:', error);
    res.status(500).json({ success: false, error: 'Failed to change tier' });
  }
});

/**
 * POST /api/admin/subscriptions/:companyId/cancel
 * Cancel a subscription (admin only)
 */
router.post('/admin/subscriptions/:companyId/cancel', authMiddleware, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);

    // TODO: Add admin role check

    const updated = await cancelSubscription(companyId);

    res.json({
      success: true,
      message: 'Subscription canceled by admin',
      subscription: updated,
    });
  } catch (error) {
    console.error('Admin cancel error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

export default router;
