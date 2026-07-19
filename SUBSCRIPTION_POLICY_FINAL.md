# Subscription Policy - Final (Annual Upgrade/Downgrade Rules)

## 📋 BILLING POLICIES

### MONTHLY PLANS
**Billing:** Charged on same day each month
**Cancellation:** Takes effect at end of current month (full month charged)

---

### ANNUAL PLANS
**Billing:** One upfront charge for 12 months
**Renewal:** Exactly 12 months from purchase date

---

## 🔄 UPGRADE & DOWNGRADE RULES

### MONTHLY → MONTHLY UPGRADE (Immediate)
```
User on Silver Monthly (SGD $28, charged June 1)
Wants to upgrade to Gold Monthly on June 15

Action: Upgrade takes effect immediately
Billing: 
- June: Charged SGD $28 (Silver for full month)
- July 1: Charges switch to SGD $78 (Gold)
- Exception: If within same month, charge difference pro-rata

Better approach:
- Let them upgrade immediately
- Charge difference for remaining days as one-time charge
- July 1: Standard monthly billing applies
```

---

### MONTHLY → MONTHLY DOWNGRADE (Wait Till Month-End)
```
User on Gold Monthly (SGD $78, charged June 1)
Wants to downgrade to Silver Monthly on June 15

Action: Downgrade takes effect at end of month
Billing:
- June: Still charged SGD $78 (can't downgrade mid-month)
- July 1: Charges switch to SGD $28 (Silver)
- Result: User gets "free" upgrade to Silver for remaining June
```

**Why this works:**
- Discourages frivolous downgrades ✅
- Guarantees full month revenue ✅
- Simple to implement ✅

---

### ANNUAL → ANNUAL UPGRADE (Immediate) ⭐
```
User on Silver Annual (SGD $268, charged June 15 2026)
Renewal: June 15 2027
Current date: Sept 15 2026 (92 days into contract)
Remaining: 273 days (Sept 15 2026 → June 15 2027)

Wants to upgrade to Gold Annual

Action: Upgrade takes effect immediately
Calculation:
- Silver Annual rate: SGD $268 ÷ 365 = SGD $0.734/day
- Gold Annual rate: SGD $748 ÷ 365 = SGD $2.049/day
- Days remaining: 273

Cost for remaining 273 days:
- At Silver rate: SGD $0.734 × 273 = SGD $200.38
- At Gold rate: SGD $2.049 × 273 = SGD $559.38
- Charge user: SGD $559.38 - SGD $200.38 = SGD $359

New renewal date: June 15 2027 (unchanged)
New plan: Gold Annual from Sept 15 2026 - June 15 2027
```

**Result:**
- User upgraded immediately ✅
- New renewal date stays same ✅
- You get full Gold rate for remaining 273 days ✅
- User only pays difference ✅

---

### ANNUAL → ANNUAL DOWNGRADE (Wait Till End of Contract) ⭐
```
User on Platinum Annual (SGD $1,420, charged June 15 2026)
Renewal: June 15 2027
Current date: Sept 15 2026 (92 days in)
Remaining: 273 days

Wants to downgrade to Gold Annual

Action: Cannot downgrade immediately
Downgrade takes effect at renewal date (June 15 2027)
NO REFUND for remaining time on higher tier

Result:
- User stays on Platinum from Sept 15 2026 → June 15 2027
- Already paid SGD $1,420 (non-refundable)
- At renewal (June 15 2027): Auto-switches to Gold Annual at SGD $748
- Next charge: June 15 2027 (SGD $748)
```

**Why this works:**
- ✅ No refund processing complexity
- ✅ User committed for full term (no surprises)
- ✅ Prevents downgrade regrets (they think harder)
- ✅ Keeps users on higher tier longer (you get better commission)
- ✅ Renewal is clean - no pro-rata calculations
- ✅ Simple one-option policy

---

## 📊 SUMMARY TABLE

| Scenario | Monthly | Annual |
|----------|---------|--------|
| **Upgrade to higher** | Immediate | Immediate (pro-rata charge) |
| **Downgrade to lower** | Wait until month-end | Wait until renewal (NO REFUND) |
| **Cancel** | Month-end | After 30 days (pro-rata refund) |
| **Refund processing** | Minimal | Only on cancellation |

---

## 💰 EXAMPLE SCENARIOS

### Scenario 1: Monthly Upgrade
```
User: Gold Monthly (SGD $78, June 1-30)
Action: Upgrade to Platinum on June 15
Charge: SGD $148 ÷ 30 × 16 days = SGD $78.93 (difference)
Result: June bill = SGD $78 + $78.93 = SGD $156.93
July onward: SGD $148/month
```

### Scenario 2: Annual Upgrade
```
User: Silver Annual (SGD $268, June 15 2026 - June 15 2027)
Action: Upgrade to Platinum on Sept 15 2026 (92 days in)
Remaining days: 273
Charge: (SGD $1,420 - SGD $268) ÷ 365 × 273 = SGD $869.26
Result: User pays SGD $869.26 one-time
Renewal: Still June 15 2027 (at new Platinum Annual rate SGD $1,420)
```

### Scenario 3: Annual Downgrade Request
```
User: Platinum Annual (SGD $1,420, June 15 2026 - June 15 2027)
Action: Wants to downgrade to Gold on Dec 15 2026 (184 days in)
Remaining days: 181

Show user 3 options:

A) "Stay Platinum, auto-switch to Gold on June 15" 
   → No refund, no action needed
   → Recommended ⭐

B) "Downgrade now, get service credit"
   → Refund: (SGD $1,420 ÷ 365) × 181 = SGD $703.67
   → Credit toward next year
   → Effective: SGD $1,420 - $703.67 = SGD $716.33 paid for 184 days

C) "Cancel and get full refund"
   → Refund: SGD $703.67
   → Account reverts to free tier
```

---

## ✅ IMPLEMENTATION LOGIC

### Upgrade Logic (Both Monthly & Annual - Immediate)
```javascript
async function upgradeSubscription(userId, newTier) {
  const subscription = await Subscription.findOne({ user_id: userId });
  
  if (subscription.billing_type === 'monthly') {
    // Monthly: Charge difference for remaining days this month
    const daysRemaining = daysLeftInMonth();
    const dailyRateDiff = calculateDailyRateDifference(subscription.tier, newTier);
    const charge = dailyRateDiff * daysRemaining;
    await stripe.charge(userId, charge);
  } else if (subscription.billing_type === 'annual') {
    // Annual: Charge difference for remaining days in year
    const daysRemaining = daysUntilRenewal(subscription.renewal_date);
    const dailyRateDiff = calculateDailyRateDifference(subscription.tier, newTier);
    const charge = dailyRateDiff * daysRemaining;
    await stripe.charge(userId, charge);
  }
  
  subscription.tier = newTier;
  subscription.save();
}
```

### Downgrade Logic (Different for Monthly vs Annual)
```javascript
async function downgradeSubscription(userId, newTier) {
  const subscription = await Subscription.findOne({ user_id: userId });
  
  if (subscription.billing_type === 'monthly') {
    // Monthly: Downgrade takes effect at month-end
    subscription.pending_tier = newTier;
    subscription.pending_tier_effective_date = getEndOfMonth();
    subscription.save();
    // Notify user: "Downgrade takes effect [end of month]"
    
  } else if (subscription.billing_type === 'annual') {
    // Annual: Show user 3 options
    showDowngradeOptions(userId, subscription, newTier);
    // User selects A, B, or C
  }
}

async function processAnnualDowngradeOption(userId, option) {
  const subscription = await Subscription.findOne({ user_id: userId });
  
  if (option === 'A') {
    // Option A: Stay on current tier, auto-switch at renewal
    subscription.next_tier = newTier;
    subscription.save();
    
  } else if (option === 'B') {
    // Option B: Downgrade now with credit
    const refund = calculateProRataRefund(subscription);
    subscription.credit_balance += refund;
    subscription.tier = newTier;
    subscription.renewal_date = addYears(today(), 1);
    subscription.save();
    
  } else if (option === 'C') {
    // Option C: Cancel with refund
    const refund = calculateProRataRefund(subscription);
    await stripe.refund(subscription.stripe_id, refund);
    subscription.status = 'canceled';
    subscription.save();
  }
}
```

---

## 🎯 USER EXPERIENCE

### Upgrade Flow
```
User clicks "Upgrade to Gold"
├─ Monthly: "Upgrade takes effect immediately. Charge SGD $27 for remaining days?"
├─ Annual: "Upgrade takes effect immediately. Charge SGD $359 for remaining year?"
└─ User confirms → Upgrade happens instantly
```

### Downgrade Flow (Monthly)
```
User clicks "Downgrade to Silver"
├─ Message: "Downgrade takes effect July 1 (end of current month)"
├─ June: Still charged SGD $78 (Gold)
├─ July: Charges switch to SGD $28 (Silver)
└─ User confirms
```

### Downgrade Flow (Annual)
```
User clicks "Downgrade to Gold"
├─ Message: "Your downgrade will take effect at renewal (June 15 2027)"
├─ Current: Platinum Annual (SGD $1,420 paid upfront)
├─ Remaining time: You keep Platinum benefits through June 15 2027
├─ At renewal: Auto-switches to Gold Annual (SGD $748)
├─ No refund for remaining Platinum time
└─ User confirms → Downgrade scheduled for renewal
```

---

## ✅ FINAL POLICIES

### MONTHLY SUBSCRIPTIONS
- **Upgrade:** Immediate (pro-rata charge for remaining days)
- **Downgrade:** Takes effect at month-end (no refund)
- **Cancel:** Takes effect at month-end

### ANNUAL SUBSCRIPTIONS
- **Upgrade:** Immediate (pro-rata charge for remaining days)
- **Downgrade:** Wait until renewal OR get pro-rata credit (user choice)
- **Cancel:** After 30 days, then pro-rata refund

---

## 🚀 IMPLEMENTATION EFFORT

**Upgrade logic:** 2-3 days (straightforward math)
**Downgrade logic:** 3-4 days (has decision tree for annual)
**UI/UX:** 2 days (forms and confirmations)
**Testing:** 2 days (edge cases, refunds, date calculations)

**Total: 9-12 days for full implementation**

