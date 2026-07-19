# Implementation Breakdown - What I Can Automate

## ✅ YES, I CAN AUTOMATE ALL OF THIS

Here's exactly what I'll build:

---

## 📋 PART 1: DATABASE SCHEMA (Day 1)

### New Tables Needed

```sql
-- Store subscription tier configuration
CREATE TABLE subscription_tiers (
  id INT PRIMARY KEY,
  name VARCHAR(20),  -- 'silver', 'gold', 'platinum'
  commission_rate DECIMAL(3,2),  -- 0.18, 0.17, 0.16
  ad_credit_monthly INT,  -- 50, 200, 500
  ep_multiplier INT,  -- 2, 3, 5
  max_team_members INT,  -- 5, 15, unlimited
  price_monthly INT,  -- 2800 (in cents: SGD $28)
  price_annual INT  -- 26800 (in cents: SGD $268)
);

-- Track each company's subscription
CREATE TABLE company_subscriptions (
  id INT PRIMARY KEY,
  company_id INT,
  current_tier VARCHAR(20),  -- 'silver', 'gold', 'platinum'
  billing_type VARCHAR(10),  -- 'monthly', 'annual'
  status VARCHAR(20),  -- 'active', 'canceled', 'downgrade_pending'
  billing_date DATE,  -- Day of month subscription started
  renewal_date DATE,  -- For annual: June 15 2027, For monthly: June 15 2026
  pending_tier VARCHAR(20),  -- If downgrading, scheduled tier
  pending_effective_date DATE,  -- When downgrade takes effect
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Track monthly ad credit allocation
CREATE TABLE subscription_ad_credits (
  id INT PRIMARY KEY,
  company_id INT,
  month VARCHAR(20),  -- 'June-2026'
  allocated_amount INT,  -- 5000 (in cents: SGD $50)
  used_amount INT,  -- How much they spent
  expires_at DATE,
  created_at TIMESTAMP
);

-- Track milestone bonuses earned
CREATE TABLE subscription_milestones (
  id INT PRIMARY KEY,
  company_id INT,
  milestone_type VARCHAR(50),  -- 'tasks_posted_50', 'tasks_posted_100', etc
  completed_at TIMESTAMP,
  bonus_amount INT,  -- 2000 (in cents: SGD $20)
  bonus_applied BOOLEAN,  -- Has it been added to credits?
  created_at TIMESTAMP
);
```

---

## 🔧 PART 2: BACKEND LOGIC (Days 2-8)

### 2.1 Commission Calculation (Day 2)

**When payment is processed:**
```javascript
// File: backend/services/paymentService.ts

async function calculateCommission(companyId, taskAmount) {
  // Get company's current subscription
  const subscription = await CompanySubscription.findOne({ company_id: companyId });
  
  // Get tier info
  const tier = subscription?.current_tier;
  const commissionRate = {
    'silver': 0.18,
    'gold': 0.17,
    'platinum': 0.15,
    null: 0.20  // Default free user
  }[tier];
  
  const commission = taskAmount * commissionRate;
  
  // Log it
  await CommissionLog.create({
    company_id: companyId,
    task_amount: taskAmount,
    commission_rate: commissionRate,
    commission_amount: commission,
    tier: tier || 'free',
    date: new Date()
  });
  
  return commission;
}
```

**Status:** ✅ Easy - Just a lookup table

---

### 2.2 Ad Credit Monthly Allocation (Day 2-3)

**Cron job runs on 1st of each month:**
```javascript
// File: backend/jobs/adCreditAllocationJob.ts

async function allocateMonthlyAdCredits() {
  // Get all active subscriptions
  const subscriptions = await CompanySubscription.find({ status: 'active' });
  
  for (const subscription of subscriptions) {
    // Get tier config
    const tier = await SubscriptionTier.findOne({ name: subscription.current_tier });
    const monthKey = getCurrentMonthKey();  // 'June-2026'
    
    // Check if already allocated this month
    const existing = await SubscriptionAdCredits.findOne({
      company_id: subscription.company_id,
      month: monthKey
    });
    
    if (!existing) {
      // Create new allocation
      await SubscriptionAdCredits.create({
        company_id: subscription.company_id,
        month: monthKey,
        allocated_amount: tier.ad_credit_monthly,  // 5000 (SGD $50)
        used_amount: 0,
        expires_at: getEndOfMonth(),
        created_at: new Date()
      });
      
      // Send notification
      await sendNotification(subscription.company_id, 
        `Your SGD $${tier.ad_credit_monthly/100} monthly ad credit is ready!`
      );
    }
  }
}

// Schedule: runs on 1st of every month at midnight
// CronJob.schedule('0 0 1 * *', allocateMonthlyAdCredits);
```

**Status:** ✅ Easy - Standard cron job

---

### 2.3 EP Multiplier on Task Posting (Day 3)

**When company posts a task:**
```javascript
// File: backend/services/taskService.ts

async function postTask(companyId, taskData) {
  // Create the task
  const task = await Task.create({
    company_id: companyId,
    ...taskData,
    created_at: new Date()
  });
  
  // Get subscription tier
  const subscription = await CompanySubscription.findOne({ company_id: companyId });
  const multiplier = {
    'silver': 2,
    'gold': 3,
    'platinum': 5,
    null: 1  // Free user
  }[subscription?.current_tier];
  
  // Award EP
  const baseEP = 10;  // Base EP per task
  const totalEP = baseEP * multiplier;
  
  await EPLedger.create({
    company_id: companyId,
    amount: totalEP,
    source: 'task_posted',
    task_id: task.id,
    multiplier: multiplier,
    created_at: new Date()
  });
  
  // Check milestones
  await checkMilestones(companyId);
  
  return task;
}
```

**Status:** ✅ Easy - Just multiplication

---

### 2.4 Milestone Bonus Tracking (Day 4)

**Check and award milestones:**
```javascript
// File: backend/services/milestoneService.ts

async function checkMilestones(companyId) {
  // Count total tasks posted
  const totalTasks = await Task.countDocuments({ 
    company_id: companyId,
    status: 'posted'  // Only posted tasks count
  });
  
  // Get subscription tier for milestone amounts
  const subscription = await CompanySubscription.findOne({ company_id: companyId });
  const tier = subscription.current_tier;
  
  // Define milestones per tier
  const milestones = {
    'silver': [
      { tasks: 50, bonus: 2000 }  // SGD $20
    ],
    'gold': [
      { tasks: 50, bonus: 5000 },  // SGD $50
      { tasks: 100, bonus: 10000 }  // SGD $100
    ],
    'platinum': [
      { tasks: 50, bonus: 10000 },  // SGD $100
      { tasks: 100, bonus: 20000 },  // SGD $200
      { tasks: 200, bonus: 50000 }  // SGD $500
    ]
  };
  
  // Check each milestone
  const tierMilestones = milestones[tier] || [];
  
  for (const milestone of tierMilestones) {
    if (totalTasks >= milestone.tasks) {
      // Check if already earned
      const existing = await SubscriptionMilestone.findOne({
        company_id: companyId,
        milestone_type: `tasks_posted_${milestone.tasks}`,
        bonus_applied: true
      });
      
      if (!existing) {
        // Award the bonus
        await SubscriptionMilestone.create({
          company_id: companyId,
          milestone_type: `tasks_posted_${milestone.tasks}`,
          completed_at: new Date(),
          bonus_amount: milestone.bonus,
          bonus_applied: false
        });
        
        // Add to ad credits
        const credit = await SubscriptionAdCredits.findOne({
          company_id: companyId,
          month: getCurrentMonthKey()
        });
        
        credit.allocated_amount += milestone.bonus;
        await credit.save();
        
        // Notify user
        await sendNotification(companyId,
          `🎉 Milestone unlocked! Posted ${milestone.tasks} tasks. 
           Earned SGD $${milestone.bonus/100} bonus ad credit!`
        );
      }
    }
  }
}
```

**Status:** ✅ Easy - Straightforward counting + award logic

---

### 2.5 Upgrade Logic (Day 5)

**When user clicks upgrade:**
```javascript
// File: backend/services/subscriptionService.ts

async function upgradeSubscription(companyId, newTier) {
  const subscription = await CompanySubscription.findOne({ company_id: companyId });
  const newTierConfig = await SubscriptionTier.findOne({ name: newTier });
  const oldTierConfig = await SubscriptionTier.findOne({ name: subscription.current_tier });
  
  if (subscription.billing_type === 'monthly') {
    // MONTHLY: Charge difference for remaining days
    const today = new Date();
    const daysLeftInMonth = getDaysLeftInMonth(today);
    const daysInMonth = getDaysInMonth(today);
    
    // Daily rates
    const oldDailyRate = oldTierConfig.price_monthly / daysInMonth;
    const newDailyRate = newTierConfig.price_monthly / daysInMonth;
    
    // Charge difference
    const chargeDifference = (newDailyRate - oldDailyRate) * daysLeftInMonth;
    
    if (chargeDifference > 0) {
      await Stripe.charges.create({
        customer: subscription.stripe_customer_id,
        amount: chargeDifference,
        currency: 'sgd',
        description: `Upgrade from ${subscription.current_tier} to ${newTier}`
      });
    }
    
    // Apply upgrade immediately
    subscription.current_tier = newTier;
    await subscription.save();
    
  } else if (subscription.billing_type === 'annual') {
    // ANNUAL: Charge difference for remaining days in year
    const daysLeftInYear = getDaysUntilRenewal(subscription.renewal_date);
    const daysInYear = 365;
    
    const oldDailyRate = oldTierConfig.price_annual / daysInYear;
    const newDailyRate = newTierConfig.price_annual / daysInYear;
    
    const chargeDifference = (newDailyRate - oldDailyRate) * daysLeftInYear;
    
    if (chargeDifference > 0) {
      await Stripe.charges.create({
        customer: subscription.stripe_customer_id,
        amount: chargeDifference,
        currency: 'sgd'
      });
    }
    
    // Apply upgrade immediately
    subscription.current_tier = newTier;
    await subscription.save();
  }
  
  return subscription;
}
```

**Status:** ✅ Medium - Requires date math, but straightforward

---

### 2.6 Downgrade Logic (Day 5-6)

**When user clicks downgrade:**
```javascript
// File: backend/services/subscriptionService.ts

async function downgradeSubscription(companyId, newTier) {
  const subscription = await CompanySubscription.findOne({ company_id: companyId });
  
  if (subscription.billing_type === 'monthly') {
    // MONTHLY: Schedule downgrade for month-end
    const monthEnd = getEndOfMonth();
    
    subscription.pending_tier = newTier;
    subscription.pending_effective_date = monthEnd;
    subscription.status = 'downgrade_pending';
    await subscription.save();
    
    // Notify user
    await sendNotification(companyId,
      `Your downgrade to ${newTier} takes effect on ${monthEnd.toDateString()}`
    );
    
  } else if (subscription.billing_type === 'annual') {
    // ANNUAL: Schedule downgrade for renewal date (NO REFUND)
    const renewalDate = subscription.renewal_date;
    
    subscription.pending_tier = newTier;
    subscription.pending_effective_date = renewalDate;
    subscription.status = 'downgrade_pending';
    await subscription.save();
    
    // Notify user
    await sendNotification(companyId,
      `Your downgrade to ${newTier} takes effect on ${renewalDate.toDateString()}.
       You keep ${subscription.current_tier} benefits until then. No refund.`
    );
  }
  
  return subscription;
}

// Cron job: runs daily at midnight
// Checks for pending downgrades and applies them
async function applyPendingDowngrades() {
  const pending = await CompanySubscription.find({
    status: 'downgrade_pending',
    pending_effective_date: { $lte: new Date() }
  });
  
  for (const sub of pending) {
    sub.current_tier = sub.pending_tier;
    sub.pending_tier = null;
    sub.pending_effective_date = null;
    sub.status = 'active';
    await sub.save();
    
    await sendNotification(sub.company_id,
      `Your subscription has been downgraded to ${sub.pending_tier}`
    );
  }
}
```

**Status:** ✅ Easy - Just date scheduling

---

### 2.7 Cancellation Logic (Day 6)

**When user clicks cancel:**
```javascript
// File: backend/services/subscriptionService.ts

async function cancelSubscription(companyId) {
  const subscription = await CompanySubscription.findOne({ company_id: companyId });
  
  if (subscription.billing_type === 'monthly') {
    // MONTHLY: Cancel at month-end
    const monthEnd = getEndOfMonth();
    
    subscription.pending_tier = 'free';  // Downgrade to free
    subscription.pending_effective_date = monthEnd;
    subscription.status = 'downgrade_pending';
    await subscription.save();
    
    await sendNotification(companyId,
      `Your subscription will cancel on ${monthEnd.toDateString()}. 
       Last month charged in full.`
    );
    
  } else if (subscription.billing_type === 'annual') {
    // ANNUAL: Cancel after 30 days OR pro-rata refund
    const subscriptionDate = subscription.created_at;
    const daysSinceSubscription = daysBetween(subscriptionDate, new Date());
    
    if (daysSinceSubscription < 30) {
      // Within 30 days: Full refund
      const refundAmount = subscription.current_tier === 'silver' ? 26800 :
                          subscription.current_tier === 'gold' ? 74800 : 142000;
      
      await Stripe.refunds.create({
        charge: subscription.stripe_charge_id,
        amount: refundAmount
      });
      
      subscription.status = 'canceled';
      subscription.current_tier = 'free';
      await subscription.save();
      
      await sendNotification(companyId, `Full refund processed: SGD $${refundAmount/100}`);
      
    } else {
      // After 30 days: Pro-rata refund
      const daysRemaining = daysBetween(new Date(), subscription.renewal_date);
      const priceAnnual = subscription.current_tier === 'silver' ? 26800 :
                         subscription.current_tier === 'gold' ? 74800 : 142000;
      const refundAmount = Math.round((priceAnnual / 365) * daysRemaining);
      
      await Stripe.refunds.create({
        charge: subscription.stripe_charge_id,
        amount: refundAmount
      });
      
      subscription.status = 'canceled';
      subscription.current_tier = 'free';
      await subscription.save();
      
      await sendNotification(companyId, `Pro-rata refund processed: SGD $${refundAmount/100}`);
    }
  }
  
  return subscription;
}
```

**Status:** ✅ Medium - Requires date math + Stripe refund API

---

### 2.8 Team Member Limit Enforcement (Day 6-7)

**When adding team member:**
```javascript
// File: backend/services/teamService.ts

async function addTeamMember(companyId, email) {
  const subscription = await CompanySubscription.findOne({ company_id: companyId });
  const maxMembers = {
    'silver': 5,
    'gold': 15,
    'platinum': 999999,  // Unlimited
    null: 1  // Free: solo only
  }[subscription?.current_tier];
  
  const currentMembers = await TeamMember.countDocuments({ company_id: companyId });
  
  if (currentMembers >= maxMembers) {
    throw new Error(`Limit reached. ${subscription.current_tier} tier allows ${maxMembers} members.`);
  }
  
  // Add member
  const member = await TeamMember.create({
    company_id: companyId,
    email: email,
    role: 'staff',
    status: 'pending'
  });
  
  return member;
}
```

**Status:** ✅ Easy - Just a count check

---

## 🎨 PART 3: FRONTEND DASHBOARD (Days 7-8)

### Display Subscription Status

```typescript
// File: frontend/src/components/SubscriptionStatus.tsx

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState(null);
  
  useEffect(() => {
    fetch('/api/subscription/status')
      .then(res => res.json())
      .then(data => setSubscription(data));
  }, []);
  
  if (!subscription) return <Loader />;
  
  return (
    <div className="subscription-card">
      <h2>{subscription.current_tier.toUpperCase()}</h2>
      
      <div className="stats">
        <StatItem label="Commission" value={`${18/17/16}%`} />
        <StatItem label="Ad Credit" value={`SGD $${subscription.ad_credit_balance}`} />
        <StatItem label="Team" value={`${subscription.team_count}/${subscription.max_team_members}`} />
      </div>
      
      <div className="renewal">
        {subscription.billing_type === 'monthly' ? (
          <p>Renews: {subscription.renewal_date}</p>
        ) : (
          <p>Renews: {subscription.renewal_date}</p>
        )}
      </div>
      
      <div className="actions">
        <Button onClick={() => upgradeModal()}>Upgrade</Button>
        <Button onClick={() => downgradeModal()}>Downgrade</Button>
        <Button onClick={() => cancelModal()}>Cancel</Button>
      </div>
    </div>
  );
}
```

**Status:** ✅ Easy - Standard React component

---

## ✅ COMPLETE AUTOMATION CHECKLIST

| Feature | Status | Effort | Complexity |
|---------|--------|--------|-----------|
| Commission calculation | ✅ | 1 day | Easy |
| Ad credit allocation | ✅ | 1 day | Easy |
| EP multiplier on tasks | ✅ | 1 day | Easy |
| Milestone tracking | ✅ | 1 day | Easy |
| Upgrade (immediate) | ✅ | 1 day | Medium |
| Downgrade (scheduled) | ✅ | 1 day | Easy |
| Cancellation logic | ✅ | 1 day | Medium |
| Team limit enforcement | ✅ | 0.5 day | Easy |
| Dashboard display | ✅ | 1 day | Easy |
| Cron jobs | ✅ | 1 day | Easy |
| Stripe integration | ✅ | 1 day | Medium |
| **TOTAL** | ✅ | **10-12 days** | **Easy-Medium** |

---

## 🚀 PHASED ROLLOUT

### Phase 1 (Days 1-6): Core Logic
- Commission calculation ✅
- Ad credit allocation ✅
- EP multiplier ✅
- Upgrade/downgrade/cancel ✅
- **Can launch to beta users**

### Phase 2 (Days 7-8): Polish
- Milestone tracking ✅
- Team limits ✅
- Dashboard ✅
- Cron jobs ✅
- **Production ready**

### Phase 3 (Days 9-12): Testing & Launch
- End-to-end testing
- Edge case handling
- Performance optimization
- Full launch

---

## ✅ FINAL ANSWER

**YES, I can automate ALL of this logic.**

**What will happen automatically:**
✅ Commission rate changes when subscription activates
✅ Ad credits allocated every month (no manual work)
✅ EP multiplier applied to all tasks posted
✅ Milestones tracked and bonuses awarded automatically
✅ Upgrades charged immediately
✅ Downgrades scheduled and applied automatically
✅ Cancellations processed with correct refunds
✅ Team member limits enforced
✅ Monthly reminders sent automatically
✅ All data synced with Stripe

**What requires no backend work:** Nothing - it's all automated!

**Timeline:** 10-12 days to full implementation

**Ready to start?** 🚀

