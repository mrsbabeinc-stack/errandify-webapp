# Subscription System - Implementation Checklist

**Status:** Phase 3 Complete - Ready for Testing & Integration

---

## ✅ COMPLETED - Phase 1 & 2 & 3

### Database Schema
- [x] `add_subscription_tiers.sql` - Tier configuration
- [x] `add_company_subscriptions.sql` - Subscription tracking
- [x] `add_subscription_ad_credits.sql` - Credit allocation
- [x] `add_subscription_milestones.sql` - Achievement tracking
- [x] `add_subscription_billing_history.sql` - Payment audit trail

### Backend Services
- [x] `subscriptionService.ts` - Subscription lifecycle
- [x] `commissionService.ts` - Commission calculation
- [x] `adCreditService.ts` - Credit management
- [x] `milestoneService.ts` - Milestone tracking
- [x] `gamificationService.ts` - EP multiplier support

### API Routes
- [x] `subscriptions.ts` - 10 user endpoints + 3 admin endpoints
- [x] `webhooks-subscriptions.ts` - Stripe webhook handler
- [x] Routes registered in `index.ts`

### Frontend Components
- [x] `AdminSubscriptionManagement.tsx` - Admin panel
- [x] `CompanySubscriptionBilling.tsx` - Company dashboard tab

### Automation
- [x] Cron jobs added to `cron.ts`
- [x] Monthly credit allocation scheduler
- [x] Credit expiration scheduler
- [x] Pending downgrade processor

---

## ⏳ NEEDS COMPLETION - Integration Points

### 1. Task Posting Integration
**File:** `backend/src/routes/errands.ts` (or task posting endpoint)

**Action Required:**
```typescript
// Add these imports
import { getEpMultiplier } from '../services/subscriptionService.js';
import { checkMilestones } from '../services/milestoneService.js';

// In task posting handler, after creating errand:
const multiplier = await getEpMultiplier(companyId);
await checkMilestones(companyId);
await awardEp({
  userId: companyId,
  amount: 10,
  reason: 'Posted task',
  multiplier: multiplier  // Apply multiplier
});
```

**Priority:** HIGH
**Difficulty:** Easy (3 lines of code)

---

### 2. Payment Processing Integration
**File:** `backend/src/routes/payment.ts` (or payment endpoint)

**Action Required:**
```typescript
// Add these imports
import { calculateCommission, logCommission } from '../services/commissionService.js';

// In payment processing handler:
const commission = await calculateCommission(companyId, taskAmount);
await logCommission(companyId, taskAmount, tier, commission);
const payable = taskAmount - commission; // Actual payout amount

// Then process payout of 'payable' amount
```

**Priority:** HIGH
**Difficulty:** Easy (3 lines of code)

---

### 3. Ad Campaign Integration
**File:** Ad campaign creation route

**Action Required:**
```typescript
// Add this import
import { deductCredits } from '../services/adCreditService.js';

// In campaign creation handler:
const campaignCost = 500; // Example SGD cents
await deductCredits(companyId, campaignCost);

// Campaign is now created and credits deducted
```

**Priority:** MEDIUM
**Difficulty:** Easy (1 line of code)

---

## ⏳ NEEDS COMPLETION - Stripe Configuration

### Setup in Stripe Dashboard

**Action Required:**

1. **Create Subscription Products:**
   - Silver Plan: SGD $28/month, SGD $268/year
   - Gold Plan: SGD $78/month, SGD $748/year
   - Platinum Plan: SGD $148/month, SGD $1,420/year

2. **Get Price IDs:**
   - Save all 6 price IDs from Stripe

3. **Configure Webhook Endpoint:**
   - Endpoint URL: `https://your-domain.com/webhooks/stripe/subscriptions`
   - Events: `customer.subscription.*`, `invoice.payment_*`

4. **Add Environment Variables:**
   ```bash
   STRIPE_SILVER_MONTHLY=price_...
   STRIPE_SILVER_ANNUAL=price_...
   STRIPE_GOLD_MONTHLY=price_...
   STRIPE_GOLD_ANNUAL=price_...
   STRIPE_PLATINUM_MONTHLY=price_...
   STRIPE_PLATINUM_ANNUAL=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

**Priority:** CRITICAL
**Difficulty:** Medium (manual Stripe setup)

---

## ⏳ NEEDS COMPLETION - Testing

### Database Testing
- [ ] Run migrations: `tsx run-migrations.ts`
- [ ] Verify tables created: Check schema
- [ ] Verify data seeded: Check tier configs

### API Testing
- [ ] Test `/api/subscriptions/status` endpoint
- [ ] Test `/api/subscriptions/tiers` endpoint
- [ ] Test `/api/subscriptions/checkout` (test mode card)
- [ ] Test upgrade flow (immediate)
- [ ] Test downgrade flow (scheduled)
- [ ] Test cancel flow
- [ ] Test `/api/admin/subscriptions` (list all)

### Webhook Testing
- [ ] Trigger webhook in Stripe test mode
- [ ] Verify subscription created in DB
- [ ] Verify webhook signature validation
- [ ] Verify error handling for invalid webhooks

### Cron Testing
- [ ] Manually trigger monthly jobs
- [ ] Verify ad credits allocated
- [ ] Verify old credits expired
- [ ] Verify pending downgrades applied

### Admin Panel Testing
- [ ] Open AdminSubscriptionManagement page
- [ ] View all subscriptions
- [ ] Search by company name
- [ ] Filter by tier
- [ ] Filter by status
- [ ] Expand subscription details
- [ ] See all tier benefits listed

### Company Dashboard Testing
- [ ] Open CompanySubscriptionBilling tab
- [ ] View current subscription tier
- [ ] See commission rate benefit
- [ ] See ad credit balance
- [ ] See EP multiplier
- [ ] See team member limit
- [ ] Browse upgrade options
- [ ] See billing history

**Priority:** CRITICAL
**Difficulty:** Medium (manual QA)

---

## ⏳ NEEDS COMPLETION - Admin Features

### Admin Endpoint Handlers

**File:** `backend/src/routes/subscriptions.ts` (admin routes)

**Action Required:**

1. **Add Role Check:**
   ```typescript
   // Add admin check to all admin routes
   if (!req.user?.role === 'admin') {
     return res.status(403).json({ error: 'Unauthorized' });
   }
   ```

2. **Implement Actions:**
   - Change tier button → calls `/admin/subscriptions/:id/change-tier`
   - Cancel button → calls `/admin/subscriptions/:id/cancel`

3. **Add Success Notifications:**
   - Confirm tier change
   - Confirm cancellation

**Priority:** MEDIUM
**Difficulty:** Easy (copy pattern from existing admin routes)

---

## ⏳ NEEDS COMPLETION - Notifications

### Email Notifications (Future Enhancement)

**Action Required:**

1. Subscribe to events:
   - Subscription created → Send welcome email
   - Upgrade → Send benefits email
   - Downgrade scheduled → Send warning email
   - Downgrade applied → Send confirmation email
   - Cancellation → Send confirmation email

2. Use existing email service
3. Create email templates

**Priority:** LOW
**Difficulty:** Medium

---

## Deployment Checklist

### Pre-Deployment
- [ ] All integration points wired
- [ ] All environment variables set
- [ ] Stripe products created + IDs saved
- [ ] Webhook endpoint configured
- [ ] Database migrations ready
- [ ] Comprehensive testing complete

### Deployment Steps
1. [ ] Merge code to main
2. [ ] Deploy backend (npm install, build)
3. [ ] Run migrations: `npm run migrate`
4. [ ] Set environment variables
5. [ ] Restart application
6. [ ] Verify webhook connectivity
7. [ ] Monitor first transactions

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check cron job execution
- [ ] Test with test Stripe card
- [ ] Verify real payments
- [ ] Check email notifications

---

## Files Summary

### Backend Files
```
backend/
├── migrations/
│   └── add_subscription_*.sql (5 files)
├── src/
│   ├── routes/
│   │   ├── subscriptions.ts (464 lines)
│   │   └── webhooks-subscriptions.ts (215 lines)
│   ├── services/
│   │   ├── subscriptionService.ts
│   │   ├── commissionService.ts
│   │   ├── adCreditService.ts
│   │   ├── milestoneService.ts
│   │   └── gamificationService.ts (enhanced)
│   ├── cron.ts (25 lines added)
│   └── index.ts (2 lines added)
```

**Total Backend Lines:** ~1,500+ lines

### Frontend Files
```
frontend/
├── src/pages/
│   ├── admin/
│   │   └── AdminSubscriptionManagement.tsx (370 lines)
│   └── CompanySubscriptionBilling.tsx (450 lines)
```

**Total Frontend Lines:** ~820 lines

---

## Quick Reference: APIs

### User Endpoints
```bash
# Get current subscription
GET /api/subscriptions/status
Header: Authorization: Bearer TOKEN

# Get all available tiers
GET /api/subscriptions/tiers

# Create checkout session
POST /api/subscriptions/checkout
Body: { tier: "silver", billingType: "monthly" }

# Upgrade tier (immediate)
POST /api/subscriptions/upgrade
Body: { tier: "gold" }

# Schedule downgrade (month-end)
POST /api/subscriptions/downgrade
Body: { tier: "silver" }

# Cancel subscription
POST /api/subscriptions/cancel

# Get billing history
GET /api/subscriptions/billing-history

# Get ad credit balance
GET /api/subscriptions/ad-credits/balance

# Get ad credit history
GET /api/subscriptions/ad-credits/history

# Get milestone progress
GET /api/subscriptions/milestones
```

### Admin Endpoints
```bash
# List all subscriptions
GET /api/admin/subscriptions
Header: Authorization: Bearer ADMIN_TOKEN

# Change company tier
POST /api/admin/subscriptions/:companyId/change-tier
Body: { tier: "platinum" }

# Cancel subscription
POST /api/admin/subscriptions/:companyId/cancel
```

### Webhook Endpoint
```bash
# Stripe sends events here
POST /webhooks/stripe/subscriptions
Header: stripe-signature: <signature>
Body: <Stripe event JSON>
```

---

## Rollback Plan

If issues arise:

1. **Database Rollback:**
   ```bash
   # Drop tables (be careful!)
   DROP TABLE subscription_billing_history;
   DROP TABLE subscription_milestones;
   DROP TABLE subscription_ad_credits;
   DROP TABLE company_subscriptions;
   DROP TABLE subscription_tiers;
   ```

2. **Code Rollback:**
   - Revert commits to before subscription routes were added
   - Remove imports from index.ts and cron.ts

3. **Stripe Rollback:**
   - Deactivate webhook endpoint
   - Keep price objects (won't hurt)

---

## Success Metrics

After full implementation:

- [ ] 100% of subscriptions can be created via checkout
- [ ] 100% of payments have correct commission deducted
- [ ] 100% of EP awards apply multiplier
- [ ] 100% of monthly jobs execute successfully
- [ ] 0 webhook errors in logs
- [ ] Admin can view all subscriptions
- [ ] Companies can self-service upgrade/downgrade

---

## Timeline Estimate

| Task | Days | Priority |
|------|------|----------|
| Integrate task posting | 1 | HIGH |
| Integrate payment processing | 1 | HIGH |
| Integrate ad campaigns | 0.5 | MEDIUM |
| Stripe setup | 1 | CRITICAL |
| Manual testing | 2 | CRITICAL |
| Bug fixes | 1 | HIGH |
| Deployment | 0.5 | HIGH |
| **TOTAL** | **6-7** | |

---

## Key Contact Points

**Stripe Configuration:**
- Need Stripe account admin access
- Dashboard: https://dashboard.stripe.com

**Database:**
- Must run migrations before any production use
- Backup database before migrations

**Monitoring:**
- Watch logs during first week
- Monitor payment success rates
- Check cron job execution

---

## Notes

- All code is TypeScript with full type safety
- All error handlers in place
- Follows existing Errandify patterns
- Database queries use parameterized statements (SQL injection safe)
- Webhook signature verification in place
- No hardcoded secrets (all from env vars)

---

**Last Updated:** 2026-07-19
**Status:** ✅ Phase 3 Complete - Awaiting Integration & Testing
