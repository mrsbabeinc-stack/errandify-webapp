# System Audit Findings - Subscription Implementation

## ✅ What I Found in Your Codebase

### 1. EP TRACKING SYSTEM ✅ EXISTS

**Location:** `/backend/src/services/gamificationService.ts`

**Current Structure:**
```
Database tables:
- user_gamification (total_ep, current_month_ep, tier, login_streak)
- ep_transactions (user_id, amount, reason, related_errand_id, created_at)

Current Tier System:
- Bronze: 0 EP
- Silver: 100 EP
- Gold: 250 EP
- Platinum: 500 EP (user EP tiers)
```

**What Already Works:**
- ✅ Awarding EP to users (`awardEp()` function)
- ✅ Tracking EP transactions with reasons
- ✅ Monthly EP reset
- ✅ Tier calculation based on total EP
- ✅ Rating bonuses (2-25 EP per star)

**Status:** Ready to enhance with **multiplier logic** (multiply base EP by 2x/3x/5x)

---

### 2. PAYMENT SYSTEM ✅ EXISTS

**Location:** `/backend/src/routes/payment.ts` + `/backend/src/services/stripe.ts`

**Current Structure:**
- Stripe integration for payments
- PaymentIntent creation
- Dummy payment methods for testing
- Bank/card support

**Status:** Stripe is configured. Can hook commission calculation here.

---

### 3. COMMISSION LOGIC ❓ NOT FOUND (YET)

**Current State:**
- Payment routes exist (`/api/payment/create-intent`)
- No explicit commission calculation in payment flow
- No commission tracking table

**What You Need:**
- Create `company_commissions` table (track 18%/17%/16% rates)
- Add commission calculation when payment is processed
- Create `subscription_tiers` table (config for Silver/Gold/Platinum)

---

### 4. STRIPE INTEGRATION ✅ EXISTS

**Location:** `/backend/src/services/stripe.ts`

**Current Capabilities:**
- ✅ Stripe payment processing
- ✅ PaymentIntent creation
- ✅ Customer management
- ✅ Payment method handling

**Status:** Ready for subscription products (monthly/annual)

---

### 5. CRON JOBS ✅ EXISTS

**Location:** `/backend/src/cron.ts`

**Current Use:**
- Advertising auto-posting jobs
- Background task scheduling

**Status:** Can add monthly ad credit allocation job here

---

### 6. DATABASE ✅ READY

**Type:** MySQL (Alibaba RDS)

**Current Tables:**
- users
- companies
- errands/tasks
- user_gamification ✅
- ep_transactions ✅
- payments
- And many more...

**Status:** Can add new subscription tables without issues

---

## 🚨 WHAT'S MISSING (Need to Build)

### New Database Tables Required

```sql
-- 1. Subscription tier configuration (static)
CREATE TABLE subscription_tiers (
  id INT PRIMARY KEY,
  name VARCHAR(20),  -- 'silver', 'gold', 'platinum'
  commission_rate DECIMAL(3,2),  -- 0.18, 0.17, 0.16
  ad_credit_monthly INT,  -- 5000 (cents: SGD $50)
  ep_multiplier INT,  -- 2, 3, 5
  max_team_members INT,  -- 5, 15, unlimited
  price_monthly INT,  -- 2800 (cents: SGD $28)
  price_annual INT  -- 26800 (cents: SGD $268)
);

-- 2. Company subscriptions (active subscriptions)
CREATE TABLE company_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT,
  current_tier VARCHAR(20),  -- 'silver', 'gold', 'platinum'
  billing_type VARCHAR(10),  -- 'monthly', 'annual'
  status VARCHAR(20),  -- 'active', 'canceled', 'downgrade_pending'
  renewal_date DATE,
  pending_tier VARCHAR(20),  -- if downgrading
  pending_effective_date DATE,
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 3. Monthly ad credit allocation
CREATE TABLE subscription_ad_credits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT,
  month VARCHAR(20),  -- 'June-2026'
  allocated_amount INT,  -- 5000 (cents)
  used_amount INT,
  expires_at DATE,
  created_at TIMESTAMP
);

-- 4. Milestone bonuses
CREATE TABLE subscription_milestones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT,
  milestone_type VARCHAR(50),  -- 'tasks_posted_50'
  completed_at TIMESTAMP,
  bonus_amount INT,  -- 2000 (cents: SGD $20)
  bonus_applied BOOLEAN,
  created_at TIMESTAMP
);
```

### New Backend Services Needed

1. **subscriptionService.ts** - Handle subscriptions (upgrade, downgrade, cancel)
2. **commissionService.ts** - Calculate tiered commissions
3. **adCreditService.ts** - Manage ad credit allocation & usage
4. **milestoneService.ts** - Track & award milestone bonuses

### New Routes Needed

```
GET  /api/subscription/status         - Show current subscription
POST /api/subscription/upgrade        - Upgrade tier
POST /api/subscription/downgrade      - Request downgrade
POST /api/subscription/cancel         - Cancel subscription
GET  /api/subscription/billing-history - Invoice history
POST /api/subscription/checkout       - Create Stripe session
```

### Cron Jobs Needed

```javascript
// Run on 1st of every month
- Allocate monthly ad credits (SGD $50/200/500)

// Run daily at midnight
- Apply pending downgrades (month-end or renewal)
- Send renewal reminders (30 days before)

// Run on task posting
- Check milestone achievements
- Award bonus ad credits
```

---

## 📊 IMPLEMENTATION BREAKDOWN

### What's Easy (Reuse Existing Code)
✅ EP multiplier logic - Modify `awardEp()` to accept multiplier
✅ Stripe payments - Already integrated
✅ Database - Schema is solid
✅ Cron jobs - Framework exists
✅ API routes - Architecture in place

### What's New (Build from Scratch)
❌ Subscription tier management - New logic needed
❌ Commission calculation - New logic needed
❌ Ad credit system - New logic needed
❌ Milestone tracking - New logic needed
❌ Downgrade/cancel workflows - New logic needed

---

## 🚀 IMPLEMENTATION PLAN (Updated)

### Phase 1: Database (1 day)
- [ ] Create 4 new tables (subscription_tiers, company_subscriptions, subscription_ad_credits, subscription_milestones)
- [ ] Run migrations

### Phase 2: Core Logic (5-7 days)
- [ ] subscriptionService.ts (upgrade, downgrade, cancel)
- [ ] commissionService.ts (apply tier-based commission)
- [ ] adCreditService.ts (allocate, track, deduct credits)
- [ ] milestoneService.ts (check & award bonuses)
- [ ] Modify gamificationService.ts (add EP multiplier)

### Phase 3: Integration (2-3 days)
- [ ] Integrate commission into payment flow
- [ ] Integrate EP multiplier into task posting
- [ ] Add cron jobs for monthly allocation & pending downgrades
- [ ] Add Stripe webhook handlers for subscription events

### Phase 4: API Routes (1-2 days)
- [ ] GET /api/subscription/status
- [ ] POST /api/subscription/upgrade
- [ ] POST /api/subscription/downgrade
- [ ] POST /api/subscription/cancel
- [ ] GET /api/subscription/billing-history

### Phase 5: Frontend (2-3 days)
- [ ] Subscription status dashboard
- [ ] Upgrade/downgrade UI
- [ ] Billing history
- [ ] Ad credit display

### Phase 6: Testing & Launch (2-3 days)
- [ ] Unit tests for commission calculation
- [ ] Integration tests for workflows
- [ ] End-to-end testing with Stripe
- [ ] Launch to production

---

## ✅ FINAL ASSESSMENT

### CAN I BUILD THIS? YES ✅

**Your system is well-structured:**
- ✅ Database is clean and organized
- ✅ EP system is mature
- ✅ Stripe is already integrated
- ✅ Cron jobs are working
- ✅ API architecture is solid

**Estimated Timeline: 12-16 days**

**Complexity: Medium (mostly new logic, but good foundation)**

**Confidence Level: 90%** (High)

---

## 📋 NEXT STEPS

1. **Confirm you want to proceed** ✅
2. **I'll create the 4 new database tables**
3. **I'll build subscription service logic**
4. **I'll integrate with existing EP & payment systems**
5. **I'll add API routes**
6. **I'll add cron jobs for automation**

Ready to start? 🚀

