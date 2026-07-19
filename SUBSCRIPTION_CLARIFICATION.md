# Subscription Model - Clarification & Implementation Details

## 1. AP vs EP

**You're right - I meant EP (Errandify Points), not AP.**

Current system:
- Users earn 50-500 EP/month from activity
- 1 EP = SGD $0.10 redemption value
- Users can redeem for discounts or gifts

So when I said "Double EP" or "Triple EP", I meant:
- **Silver:** Get 2x the normal EP on posted tasks
- **Gold:** Get 3x the normal EP on posted tasks
- **Platinum:** Get 5x the normal EP on posted tasks

✅ Corrected!

---

## 2. What Does "3% Bonus" Mean?

**This is confusing - let me explain better.**

### Current Model (My Bad):
- Silver: 18% commission
- Gold: 17% + "3% bonus" ← This is vague!

### What I Meant:
When a Gold subscriber posts a task worth SGD $100:

**Old way (20% commission):**
```
Task value: SGD $100
Commission (20%): SGD $20
They keep: SGD $80
```

**Gold subscriber (17% commission + bonus):**
```
Task value: SGD $100
Commission (17%): SGD $17
Bonus credit: SGD $3 (the "3% bonus")
They keep: SGD $80 + $3 credit = SGD $83
```

**So the bonus is a CREDIT, not a discount** - it goes into their ad credit account or EP account.

**Problem:** This is confusing and complex to track!

---

## 3. How to Implement Features on System

Let me be honest - **some features are hard to implement**. Let me break down what's feasible:

### ✅ EASY TO IMPLEMENT

#### A. Commission Rate Changes (18%, 17%, 16%)
```javascript
// In payment calculation
function getCommissionRate(companyId) {
  const subscription = db.subscriptions.findOne({ company_id: companyId });
  
  if (!subscription) return 0.20; // Free: 20%
  
  return {
    'silver': 0.18,
    'gold': 0.17,
    'platinum': 0.16
  }[subscription.tier];
}
```
**Effort:** Easy (1 function change)

---

#### B. Monthly Ad Credit (Reset Every Month)
```javascript
// Schema
subscription_ad_credits {
  company_id,
  month,      // "Aug2026"
  allocated,  // 50, 200, or 500 SGD
  used,       // How much they spent
  expires_at
}

// Cron job - runs on 1st of every month
cron.schedule('0 0 1 * *', async () => {
  const allSubscriptions = await db.subscriptions.find({ status: 'active' });
  for (const sub of allSubscriptions) {
    const creditAmount = { 'silver': 50, 'gold': 200, 'platinum': 500 }[sub.tier];
    
    await db.subscription_ad_credits.create({
      company_id: sub.company_id,
      month: getCurrentMonth(),
      allocated: creditAmount,
      used: 0
    });
  }
});

// When they create ad campaign
async function createAdCampaign(companyId, cost) {
  const credits = await db.subscription_ad_credits.findOne({
    company_id: companyId,
    month: getCurrentMonth()
  });
  
  if (credits.allocated - credits.used < cost) {
    throw Error('Insufficient ad credits');
  }
  
  credits.used += cost;
  await credits.save();
}
```
**Effort:** Easy (2-3 functions)

---

#### C. EP Multiplier on Posted Tasks
```javascript
// When user posts a task
async function postTask(companyId, taskData) {
  const subscription = await db.subscriptions.findOne({ company_id: companyId });
  
  // Create task
  const task = await Task.create(taskData);
  
  // Award EP based on tier
  const epMultiplier = {
    null: 1,        // Free user: normal 10 EP
    'silver': 2,    // Double: 20 EP
    'gold': 3,      // Triple: 30 EP
    'platinum': 5   // 5x: 50 EP
  }[subscription?.tier];
  
  const baseEP = 10;
  const totalEP = baseEP * epMultiplier;
  
  await db.ep_ledger.create({
    user_id: user.id,
    amount: totalEP,
    reason: 'Posted task',
    task_id: task.id
  });
  
  return task;
}
```
**Effort:** Easy (add multiplier logic)

---

### ⚠️ MODERATE COMPLEXITY

#### D. 3x Visibility Boost (Featured Placement)
**The Problem:** Your current system doesn't have visibility/ranking logic.

**Current:** Tasks shown by date posted (default sorting)

**How to implement 3x boost:**

```javascript
// In task search/feed
function getTaskFeed(userId, page = 1) {
  // Get user's subscription
  const askerSubscription = db.subscriptions.findOne({ company_id: userId.company_id });
  
  // Calculate boost score
  const boostMultiplier = {
    null: 1,
    'silver': 2,
    'gold': 3,
    'platinum': 5
  }[askerSubscription?.tier];
  
  // Fetch all tasks and sort by:
  // 1. Subscription tier (platinum first, then gold, then silver, then free)
  // 2. Recency (newer first)
  // 3. Rating (higher rated first)
  
  const tasks = await Task.find({
    status: 'open'
  })
  .sort({
    boost_score: -1,        // Subscription tier first
    created_at: -1,         // Then recency
    asker_rating: -1        // Then rating
  })
  .limit(20);
  
  return tasks;
}

// When task is created, calculate boost score
async function postTask(companyId, taskData) {
  const subscription = await db.subscriptions.findOne({ company_id: companyId });
  
  const boostScores = { null: 1, 'silver': 2, 'gold': 3, 'platinum': 5 };
  const boostScore = boostScores[subscription?.tier] || 1;
  
  const task = await Task.create({
    ...taskData,
    boost_score: boostScore
  });
  
  return task;
}
```
**Effort:** Moderate (need to add boost_score to Task table + update sorting logic)

---

#### E. Weekly Performance Bonuses
**The Problem:** Tracking "posted 5+ tasks this week" is complex.

**How to implement:**

```javascript
// Schema
weekly_performance {
  company_id,
  week,           // "Week 32 2026"
  tasks_posted,   // Counter
  tasks_completed,// Counter
  bonus_earned,   // SGD amount
  claimed         // Whether they claimed it
}

// Cron job - runs every Sunday
cron.schedule('0 23 * * 0', async () => {
  const allSubscriptions = await db.subscriptions.find({ status: 'active' });
  
  for (const sub of allSubscriptions) {
    // Count tasks posted this week
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    
    const tasksPosted = await Task.countDocuments({
      company_id: sub.company_id,
      created_at: { $gte: weekStart, $lte: weekEnd }
    });
    
    const tasksCompleted = await Task.countDocuments({
      company_id: sub.company_id,
      completed_at: { $gte: weekStart, $lte: weekEnd }
    });
    
    // Calculate bonus
    let bonusAmount = 0;
    if (tasksPosted >= 5) bonusAmount += 5; // $5 for posting
    if (tasksCompleted >= 5) bonusAmount += 5; // $5 for completing
    
    if (bonusAmount > 0) {
      await WeeklyPerformance.create({
        company_id: sub.company_id,
        week: getCurrentWeek(),
        tasks_posted: tasksPosted,
        tasks_completed: tasksCompleted,
        bonus_earned: bonusAmount,
        claimed: false
      });
      
      // Send notification
      notify(sub.company_id, `You earned $${bonusAmount} bonus this week!`);
    }
  }
});

// When user claims bonus
async function claimWeeklyBonus(companyId, weekId) {
  const performance = await WeeklyPerformance.findOne({
    company_id: companyId,
    week: weekId,
    claimed: false
  });
  
  if (!performance) throw Error('No bonus to claim');
  
  // Add to their ad credit account
  const credit = await db.subscription_ad_credits.findOne({
    company_id: companyId,
    month: getCurrentMonth()
  });
  
  credit.allocated += performance.bonus_earned;
  await credit.save();
  
  performance.claimed = true;
  await performance.save();
}
```
**Effort:** Moderate (new table + cron job + claim logic)

---

### 🔴 HARD TO IMPLEMENT

#### F. Milestone Rewards (Post 50 tasks → Get $20)
```javascript
// When task is posted, check milestones
async function postTask(companyId, taskData) {
  const task = await Task.create(taskData);
  
  // Check milestones
  const totalTasksPosted = await Task.countDocuments({ company_id: companyId });
  
  const milestones = {
    10: 10,   // Post 10 tasks → $10 bonus
    50: 20,   // Post 50 tasks → $20 bonus
    100: 50,  // Post 100 tasks → $50 bonus
    500: 200  // Post 500 tasks → $200 bonus
  };
  
  if (milestones[totalTasksPosted]) {
    const bonusAmount = milestones[totalTasksPosted];
    
    // Add to ad credits
    const credit = await db.subscription_ad_credits.findOne({
      company_id: companyId,
      month: getCurrentMonth()
    });
    
    credit.allocated += bonusAmount;
    await credit.save();
    
    // Notify user
    notify(companyId, `🎉 Milestone! Posted ${totalTasksPosted} tasks. Earned $${bonusAmount} ad credit!`);
  }
  
  return task;
}
```
**Effort:** Moderate-Hard (tracking milestones, notifications)

---

#### G. Daily Surge Bonuses + Streaks
**The Problem:** This requires tracking daily activity patterns and maintaining streak state.

```javascript
// Schema
user_streaks {
  company_id,
  current_streak,     // How many days in a row
  last_activity_date,
  total_streaks,      // Lifetime streaks achieved
  streak_rewards      // Bonuses earned from streaks
}

// Cron job - runs daily at midnight
cron.schedule('0 0 * * *', async () => {
  const allCompanies = await db.subscriptions.find({ status: 'active' });
  
  for (const company of allCompanies) {
    // Check if they posted a task today
    const taskToday = await Task.findOne({
      company_id: company.company_id,
      created_at: { $gte: startOfDay(), $lte: endOfDay() }
    });
    
    let streak = await db.user_streaks.findOne({ company_id: company.company_id });
    
    if (taskToday) {
      // They posted today - extend streak
      const lastActivityDate = streak?.last_activity_date;
      const yesterday = addDays(new Date(), -1);
      
      if (isSameDay(lastActivityDate, yesterday)) {
        // Yesterday they posted - extend streak
        streak.current_streak += 1;
      } else if (isSameDay(lastActivityDate, new Date())) {
        // Already counted today - do nothing
        return;
      } else {
        // Streak broken - reset to 1
        streak.current_streak = 1;
      }
      
      streak.last_activity_date = new Date();
      
      // Award bonus based on streak
      const streakBonuses = {
        10: 10,   // 10 days → $10
        20: 25,   // 20 days → $25
        30: 50    // 30 days → $50
      };
      
      if (streakBonuses[streak.current_streak]) {
        const bonusAmount = streakBonuses[streak.current_streak];
        
        const credit = await db.subscription_ad_credits.findOne({
          company_id: company.company_id,
          month: getCurrentMonth()
        });
        
        credit.allocated += bonusAmount;
        await credit.save();
        
        notify(company.company_id, `🔥 ${streak.current_streak}-day streak! Earned $${bonusAmount}!`);
      }
      
      await streak.save();
    } else {
      // No activity today - reset streak
      if (streak && streak.current_streak > 0) {
        streak.total_streaks += 1; // Count as completed streak
        streak.current_streak = 0;
        await streak.save();
      }
    }
  }
});
```
**Effort:** Hard (complex state management, daily tracking)

---

## 🎯 SIMPLIFIED RECOMMENDATION

Instead of ALL features, implement **what's easy + impactful**:

### ✅ PHASE 1 (Easy - 7 days)
- [x] Commission rates (18%, 17%, 16%)
- [x] Monthly ad credits ($50, $200, $500)
- [x] EP multiplier on posted tasks (2x, 3x, 5x)
- [x] Dashboard showing subscription status

**This alone drives massive growth!**

### ⚠️ PHASE 2 (Optional - add later if needed)
- [ ] Visibility boost (boost_score sorting)
- [ ] Weekly performance bonuses
- [ ] Milestone rewards (50 tasks → $20, etc)

### 🔴 PHASE 3 (Skip for now)
- [ ] Daily surge bonuses
- [ ] Streaks (too complex, not needed)

---

## 💡 Alternative: Simpler Growth Model

If you want to keep things simple, just do this:

**SILVER ($29/month)**
- Commission: 18% (vs 20%)
- Ad credit: $50/month
- EP multiplier: 2x on posted tasks
- Newsletter feature

**GOLD ($79/month)**
- Commission: 17% (vs 20%)
- Ad credit: $200/month
- EP multiplier: 3x on posted tasks
- Milestone rewards ($20 at 50 tasks, $50 at 100 tasks)
- Featured in newsletter

**PLATINUM ($149/month)**
- Commission: 16% (vs 20%)
- Ad credit: $500/month
- EP multiplier: 5x on posted tasks
- Higher milestone rewards
- Priority newsletter placement
- Blog feature

**Benefits of this simpler model:**
- ✅ Easy to explain to users
- ✅ Easy to implement (all easy/moderate complexity)
- ✅ Still drives massive growth (EP multiplier + milestones)
- ✅ All profits intact

---

## 📊 What Actually Drives Growth?

After thinking about it, **the real drivers are:**

1. **Better commission** (18% vs 20%) → Keep more money
2. **Ad credits** ($50-500/month) → Post more tasks visible
3. **EP multiplier** (2x-5x) → Every post is more rewarding
4. **Milestone rewards** (50 tasks = $20) → Gamification

**You don't need:**
- Daily surge bonuses (confusing)
- Streaks (too complex)
- Weekly tracking (unnecessary)

---

## ✅ FINAL RECOMMENDATION

**Go with SIMPLIFIED MODEL:**
- Commission: 18%, 17%, 16%
- Ad credits: $50, $200, $500/month
- EP multiplier: 2x, 3x, 5x
- Milestones: $20, $50, $100 bonuses
- Newsletter feature (Platinum)

**Implementation time:** 5-7 days
**Complexity:** Easy-Moderate
**Growth impact:** Still massive

**Ready to implement this cleaner version?**

