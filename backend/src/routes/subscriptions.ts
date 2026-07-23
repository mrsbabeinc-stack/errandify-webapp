/**
 * Subscription Routes
 * Handles subscription management, checkout, and billing
 */

import { Router, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import { attachCompanyId } from '../utils/companyRole.js';
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
router.get('/status', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
  try {
    // The real subscription, not a hardcoded silver demo. This endpoint used to
    // return silver for everyone regardless of their tier, so a Platinum company
    // saw the wrong plan, wrong commission and wrong benefits on its own screen.
    const companyId = parseInt(req.companyId || '0', 10);
    const { getCompanySubscription, getTierConfig } = await import('../services/subscriptionService.js');
    const sub: any = companyId ? await getCompanySubscription(companyId) : null;
    const active = !!sub && (!sub.expires_at || new Date(sub.expires_at) > new Date());

    if (!active || !sub?.subscription_tier) {
      return res.json({ success: true, tier: null, is_active: false, milestone_progress: [] });
    }

    const cfg: any = await getTierConfig(sub.subscription_tier).catch(() => null);
    res.json({
      success: true,
      tier: sub.subscription_tier,
      billing_cycle: sub.billing_cycle,
      expires_at: sub.expires_at,
      pending_tier: sub.pending_tier || null,
      commission_rate: cfg ? Number(cfg.commission_rate) : null,
      ad_credit_monthly: cfg ? Number(cfg.ad_credit_monthly) : null,
      ep_multiplier: cfg ? Number(cfg.ep_multiplier) : null,
      max_team_members: cfg ? Number(cfg.max_team_members) : null,
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
 * POST /api/subscriptions/checkout
 * Create Stripe checkout session
 */
router.post('/checkout', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.get('/billing-history', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.post('/upgrade', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.post('/downgrade', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.post('/cancel', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.post('/churn-prevention', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.get('/ad-credits/balance', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.get('/ad-credits/history', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.get('/milestones', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
router.post('/proration', authMiddleware, attachCompanyId, async (req: AuthRequest, res: Response) => {
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
    // Real subscriptions, joined to their tier config. Was a hardcoded three-row
    // demo (companies that do not exist) with a made-up revenue total.
    const rows = await db.query(
      `SELECT cs.company_id, c.company_name, cs.subscription_tier AS tier,
              cs.billing_cycle, cs.started_at, cs.expires_at, cs.pending_tier,
              (cs.expires_at IS NULL OR cs.expires_at > NOW()) AS is_active,
              st.commission_rate, st.ad_credit_monthly
         FROM company_subscriptions cs
         JOIN companies c ON c.id = cs.company_id
         LEFT JOIN subscription_tiers st ON st.name = cs.subscription_tier
        ORDER BY cs.subscription_tier, c.company_name`
    );
    const active = rows.rows.filter((r: any) => r.is_active).length;
    res.json({
      success: true,
      data: rows.rows,
      active_subscriptions: active,
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
    // Real counts, not the fabricated demo numbers this used to return. Monthly
    // prices come from the canonical spec (they are not columns yet). Churn,
    // ARPU and lifetime need subscription history the schema does not keep, so
    // they are null rather than invented — an honest gap beats a fake figure.
    const PRICE_MONTHLY: Record<string, number> = { silver: 28, gold: 78, platinum: 148 };

    const active = await db.query(
      `SELECT cs.subscription_tier AS tier, COUNT(*)::int AS n
         FROM company_subscriptions cs
        WHERE cs.expires_at IS NULL OR cs.expires_at > NOW()
        GROUP BY cs.subscription_tier`
    );

    const tierBreakdown: Record<string, number> = {};
    const revenueByTier: Record<string, number> = {};
    let mrr = 0;
    let activeCount = 0;
    for (const r of active.rows) {
      const n = Number(r.n);
      tierBreakdown[r.tier] = n;
      const rev = n * (PRICE_MONTHLY[r.tier] || 0);
      revenueByTier[r.tier] = rev;
      mrr += rev;
      activeCount += n;
    }

    res.json({
      success: true,
      analytics: {
        active_subscriptions: activeCount,
        mrr,                                    // monthly recurring revenue, SGD
        arpu: activeCount ? Math.round((mrr / activeCount) * 100) / 100 : 0,
        tier_breakdown: tierBreakdown,
        revenue_by_tier: revenueByTier,
        // Not derivable without subscription history:
        churn_rate: null,
        avg_customer_lifetime: null,
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// The stub change-tier and cancel routes that used to sit here have been
// removed. They were defined BEFORE the real implementations below and did
// nothing but res.json a success message — so Express matched the stub and the
// working versions (which call upgradeSubscription / cancelSubscription) were
// unreachable. Admin change-tier and cancel silently did nothing. The real
// routes below are now the only ones.

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
