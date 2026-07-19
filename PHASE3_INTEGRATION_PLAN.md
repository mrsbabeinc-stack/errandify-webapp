# Phase 3 - Integration Plan (Admin + Stripe)

## Overview

This phase integrates:
1. **Subscription management APIs** into the company dashboard
2. **Stripe subscription products** for monthly/annual billing
3. **Admin panel** for managing subscriptions
4. **Automatic cron jobs** for monthly allocations and downgrades
5. **Company operations dashboard** to show current tier + benefits

---

## 1. STRIPE SETUP

### A. Create Stripe Subscription Products

**In Stripe Dashboard:**

1. **Silver Plan**
   - Product Name: "Errandify Silver"
   - Price Monthly: SGD $28.00
   - Price Annual: SGD $268.00
   - Billing: Monthly/Annual recurring
   - Save IDs: `price_silver_monthly`, `price_silver_annual`

2. **Gold Plan**
   - Product Name: "Errandify Gold"
   - Price Monthly: SGD $78.00
   - Price Annual: SGD $748.00
   - Billing: Monthly/Annual recurring
   - Save IDs: `price_gold_monthly`, `price_gold_annual`

3. **Platinum Plan**
   - Product Name: "Errandify Platinum"
   - Price Monthly: SGD $148.00
   - Price Annual: SGD $1,420.00
   - Billing: Monthly/Annual recurring
   - Save IDs: `price_platinum_monthly`, `price_platinum_annual`

### B. Store Stripe Price IDs in Config

**File:** `backend/src/config.ts` (or `.env`)

```typescript
export const STRIPE_PRICES = {
  silver_monthly: 'price_silver_monthly',
  silver_annual: 'price_silver_annual',
  gold_monthly: 'price_gold_monthly',
  gold_annual: 'price_gold_annual',
  platinum_monthly: 'price_platinum_monthly',
  platinum_annual: 'price_platinum_annual',
};
```

---

## 2. NEW API ROUTES

### Create File: `backend/src/routes/subscriptions.ts`

```typescript
import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { getCompanySubscription, getTierConfig } from '../services/subscriptionService.js';
import { getCredits } from '../services/adCreditService.js';
import { getMilestoneProgress } from '../services/milestoneService.js';
import { stripeService } from '../services/stripe.js';

const router = Router();

/**
 * GET /api/subscriptions/status
 * Get current subscription status + benefits
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId;
    const subscription = await getCompanySubscription(companyId);
    
    if (!subscription || subscription.status !== 'active') {
      return res.json({
        tier: 'free',
        commission_rate: 0.20,
        ad_credit_monthly: 0,
        ep_multiplier: 1,
        max_team_members: 1,
        is_active: false
      });
    }

    const tier = await getTierConfig(subscription.current_tier);
    const credits = await getCredits(companyId);
    const milestones = await getMilestoneProgress(companyId);

    res.json({
      tier: subscription.current_tier,
      billing_type: subscription.billing_type,
      renewal_date: subscription.renewal_date,
      commission_rate: tier.commission_rate,
      ad_credit_monthly: tier.ad_credit_monthly,
      ad_credit_current_balance: credits?.available_amount || 0,
      ep_multiplier: tier.ep_multiplier,
      max_team_members: tier.max_team_members,
      milestone_progress: milestones,
      is_active: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * GET /api/subscriptions/tiers
 * Get all available tiers + pricing
 */
router.get('/tiers', async (req, res) => {
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
        features: ['Team coordination (5 people)', 'AI dashboard', 'Enhanced recommendations', '2x EP multiplier', 'Monthly newsletter']
      },
      {
        name: 'gold',
        price_monthly: 7800,
        price_annual: 74800,
        commission_rate: 0.17,
        ad_credit_monthly: 20000,
        ep_multiplier: 3,
        max_team_members: 15,
        features: ['Team coordination (15 people)', 'AI dashboard', 'Enhanced recommendations', '3x EP multiplier', 'Events access', 'Top newsletter placement']
      },
      {
        name: 'platinum',
        price_monthly: 14800,
        price_annual: 142000,
        commission_rate: 0.16,
        ad_credit_monthly: 50000,
        ep_multiplier: 5,
        max_team_members: 999999,
        features: ['Unlimited team members', 'AI dashboard', 'Enhanced recommendations', '5x EP multiplier', 'Blog publishing', 'Quarterly newsletter', 'Priority events']
      }
    ];

    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

/**
 * POST /api/subscriptions/checkout
 * Create Stripe checkout session
 */
router.post('/checkout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tier, billingType } = req.body; // 'silver'/'gold'/'platinum', 'monthly'/'annual'
    const companyId = req.companyId;

    // Validate inputs
    if (!tier || !billingType) {
      return res.status(400).json({ error: 'tier and billingType required' });
    }

    // Create Stripe checkout session
    const session = await stripeService.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: req.user?.email,
      line_items: [{
        price: `price_${tier}_${billingType}`,
        quantity: 1
      }],
      success_url: `${process.env.FRONTEND_URL}/subscription/success`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        companyId: companyId.toString(),
        tier,
        billingType
      }
    });

    res.json({ success: true, checkout_url: session.url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/subscriptions/upgrade
 * Upgrade to higher tier (immediate)
 */
router.post('/upgrade', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tier } = req.body;
    const companyId = req.companyId;

    // Use subscription service to upgrade
    const updated = await upgradeSubscription(companyId, tier);

    res.json({
      success: true,
      message: `Upgraded to ${tier}`,
      subscription: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upgrade' });
  }
});

/**
 * POST /api/subscriptions/downgrade
 * Schedule downgrade (takes effect at month-end/renewal)
 */
router.post('/downgrade', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tier } = req.body;
    const companyId = req.companyId;

    const updated = await scheduleDowngrade(companyId, tier);

    res.json({
      success: true,
      message: `Downgrade scheduled to ${tier}`,
      subscription: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule downgrade' });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription
 */
router.post('/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const companyId = req.companyId;

    const updated = await cancelSubscription(companyId);

    res.json({
      success: true,
      message: 'Subscription canceled',
      subscription: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
```

---

## 3. ADD ROUTES TO MAIN APP

**File:** `backend/src/index.ts`

```typescript
import subscriptionsRouter from './routes/subscriptions.js';

// Add to Express app
app.use('/api/subscriptions', subscriptionsRouter);
```

---

## 4. STRIPE WEBHOOK HANDLER

**File:** `backend/src/routes/webhooks.ts` (new or update existing)

```typescript
/**
 * Handle Stripe subscription.created
 */
router.post('/stripe/subscription.created', async (req, res) => {
  const event = req.body;
  const subscription = event.data.object;
  const { companyId, tier, billingType } = subscription.metadata;

  try {
    // Create subscription in our DB
    await createSubscription(
      parseInt(companyId),
      tier,
      billingType,
      subscription.id,
      subscription.customer
    );

    // Allocate first month ad credits
    await allocateMonthlyCredits(parseInt(companyId));

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle Stripe invoice.payment_succeeded
 */
router.post('/stripe/invoice.payment_succeeded', async (req, res) => {
  const event = req.body;
  const invoice = event.data.object;

  // Subscription is already active, just confirm payment
  console.log(`✅ Payment succeeded for subscription ${invoice.subscription}`);
  res.json({ success: true });
});

/**
 * Handle Stripe customer.subscription.deleted
 */
router.post('/stripe/customer.subscription.deleted', async (req, res) => {
  const event = req.body;
  const subscription = event.data.object;
  const { companyId } = subscription.metadata;

  try {
    await cancelSubscription(parseInt(companyId));
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

---

## 5. COMPANY OPS DASHBOARD UPDATE

**File:** `frontend/src/pages/CompanyOperations.tsx` (or similar)

Add new tab: **"Subscription & Billing"**

```typescript
// Display:
- Current tier (Silver/Gold/Platinum/Free)
- Commission rate
- Ad credit balance
- EP multiplier
- Team members used / limit
- Milestone progress
- Upgrade/Downgrade buttons
- Billing history
```

---

## 6. ADMIN PANEL UPDATE

**File:** `frontend/src/pages/AdminDashboard.tsx`

Add new section: **"Subscriptions"**

```typescript
// Display all company subscriptions:
- Company name
- Current tier
- Billing type (monthly/annual)
- Renewal date
- Status (active/canceled/downgrade_pending)
- Actions: View details, cancel, switch tier
```

---

## 7. ADD CRON JOBS

**File:** `backend/src/cron.ts`

```typescript
import { allocateMonthlyCredits, expireOldCredits } from './services/adCreditService.js';
import { processPendingDowngrades } from './services/subscriptionService.js';

// 1st of month at 00:00 UTC
cron.schedule('0 0 1 * *', async () => {
  console.log('🔔 Running monthly subscription jobs...');
  try {
    await allocateMonthlyCredits();
    await expireOldCredits();
    await processPendingDowngrades();
    console.log('✅ Monthly jobs complete');
  } catch (error) {
    console.error('❌ Monthly jobs failed:', error);
  }
});

// Daily at 00:00 UTC
cron.schedule('0 0 * * *', async () => {
  console.log('🔔 Running daily subscription jobs...');
  try {
    await processPendingDowngrades();
    console.log('✅ Daily jobs complete');
  } catch (error) {
    console.error('❌ Daily jobs failed:', error);
  }
});
```

---

## 8. INTEGRATION CHECKLIST

### Backend
- [ ] Create `routes/subscriptions.ts` with 5 API endpoints
- [ ] Add subscriptions router to `index.ts`
- [ ] Create/update `routes/webhooks.ts` for Stripe events
- [ ] Add cron jobs to `cron.ts`
- [ ] Create Stripe products and save price IDs to config
- [ ] Test all subscription workflows

### Frontend
- [ ] Add subscription status display to company dashboard
- [ ] Add upgrade/downgrade UI
- [ ] Add billing history page
- [ ] Add subscription section to admin panel
- [ ] Add checkout flow

### Stripe
- [ ] Create 6 price objects (Silver/Gold/Platinum × Monthly/Annual)
- [ ] Configure webhook endpoints (Stripe Dashboard)
- [ ] Test webhook delivery

---

## 9. TESTING WORKFLOW

1. **Manual Testing**
   - Create subscription via checkout
   - Verify company_subscriptions table
   - Check commission calculation in payment
   - Check EP multiplier in task posting
   - Test downgrade workflow
   - Test month-end automatic downgrade

2. **Stripe Testing**
   - Use Stripe test mode
   - Test card: 4242 4242 4242 4242
   - Verify webhooks triggered
   - Check subscription status

3. **Cron Job Testing**
   - Manually trigger cron functions
   - Verify ad credits allocated
   - Verify downgrades applied

---

## Estimated Timeline

- API Routes: 1 day
- Stripe Integration: 1 day
- Admin Panel: 1 day
- Frontend Dashboard: 1 day
- Cron Jobs: 0.5 day
- Testing: 1-2 days
- **Total: 5-6 days**

---

## Dependencies

- Stripe Node SDK: Already installed ✅
- Express: Already installed ✅
- node-cron: Already installed ✅
- DB services: Created in Phase 2 ✅

---

Ready to implement Phase 3? 🚀
