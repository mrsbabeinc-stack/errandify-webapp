# Errandify Points (EP) - Value System

## Current EP Redemption Rates

Based on the codebase, here are the current EP point values:

### Voucher Redemption Rates

| Voucher Code | EP Points | SGD Value | Redemption Rate |
|--------------|-----------|-----------|-----------------|
| ERRAND5 | 50 EP | SGD $5 | **1 EP = SGD $0.10** |
| ERRAND10 | 100 EP | SGD $10 | **1 EP = SGD $0.10** |

### Current Redemption Rate: **1 EP = SGD $0.10**

This means:
- 100 EP = SGD $1.00
- 500 EP = SGD $5.00
- 1,000 EP = SGD $10.00
- 2,000 EP = SGD $20.00
- 10,000 EP = SGD $100.00

---

## EP Points You Earn (Users)

### By Activity

| Activity | EP Points | Source |
|----------|-----------|--------|
| **Signup Bonus** | 50 EP | Join bonus |
| **First Job (Doer)** | 50 EP | First errand completion |
| **Referral** | 50 EP | Per completed referral |
| **Rating Received** | Variable | Based on rating value |
| **Loyalty Bonus** | 100 EP | 10+ errands completed |
| **Bonus Challenges** | 500 EP | Campaign (e.g., "Complete 5 tasks") |

### Typical User Earning Path
- Signup: 50 EP
- First job: 50 EP
- Rating bonus: 10-50 EP per rating
- Referrals: 50 EP each
- **Realistic monthly earnings: 100-500 EP** (depending on activity)

---

## Proposed Subscription EP Allowances (Companies)

Based on **1 EP = SGD $0.10 redemption rate**:

| Tier | EP/Month | EP/Year | SGD Value/Month | SGD Value/Year | Use Case |
|------|----------|---------|-----------------|----------------|----------|
| **Silver** | 500 EP | 6,000 EP | SGD $50 | SGD $600 | Small team rewards |
| **Gold** | 2,000 EP | 24,000 EP | SGD $200 | SGD $2,400 | Team incentives |
| **Platinum** | 10,000 EP | 120,000 EP | SGD $1,000 | SGD $12,000 | Large-scale programs |

---

## Realistic Usage Scenarios

### Silver Company (5 team members, 500 EP/month = SGD $50/month)

**Monthly Budget: SGD $50 in rewards**

Possible allocation:
- Top performer bonus: 100 EP (SGD $10)
- Referral bonuses: 2 × 100 EP (SGD $20)
- Customer loyalty draw: 200 EP (SGD $20)
- **Total: 500 EP = SGD $50**

**Annual: SGD $600 in rewards budget**

---

### Gold Company (15 team members, 2,000 EP/month = SGD $200/month)

**Monthly Budget: SGD $200 in rewards**

Possible allocation:
- Weekly top performer: 4 × 100 EP (SGD $40)
- Monthly excellence award: 300 EP (SGD $30)
- Customer loyalty program: 800 EP (SGD $80)
- Referral bonuses: 600 EP (SGD $60)
- **Total: 2,000 EP = SGD $200**

**Annual: SGD $2,400 in rewards budget**

**Cost vs Commission Savings:**
- Commission savings at SGD $20,000/month = SGD $1,000/month
- EP allowance: SGD $200/month
- Total value: SGD $1,200/month
- Subscription cost: SGD $49/month
- **ROI: 2,347%**

---

### Platinum Company (100+ team members, 10,000 EP/month = SGD $1,000/month)

**Monthly Budget: SGD $1,000 in rewards**

Possible allocation:
- Monthly regional top performers: 4 × 500 EP (SGD $200)
- Quarterly excellence awards: 1,500 EP (SGD $150)
- Customer loyalty campaigns: 3,000 EP (SGD $300)
- Staff referral program: 1,000 EP (SGD $100)
- Special recognition/milestones: 1,000 EP (SGD $100)
- **Total: 10,000 EP = SGD $1,000**

**Annual: SGD $12,000 in rewards budget**

**Cost vs Commission Savings:**
- Commission savings at SGD $100,000/month = SGD $10,000/month
- EP allowance: SGD $1,000/month
- Total value: SGD $11,000/month
- Subscription cost: SGD $99/month
- **ROI: 11,011%**

---

## Why This Value Works

### For Users:
- **Meaningful redemption**: 50 EP = SGD $5 discount (achievable in 1-2 tasks)
- **Achievable goals**: Save 100 EP in a week, redeem for SGD $10 discount
- **Motivating**: A 5-star rating gets 20-50 EP (toward a SGD $2-5 reward)

### For Companies:
- **Affordable incentives**: SGD $50-1,000/month in rewards (scales with their revenue)
- **Team motivation**: Can reward 5-10 top performers monthly
- **Customer loyalty**: Can run weekly/monthly loyalty draws
- **ROI**: Every EP point they give out costs SGD $0.10 (built into subscription cost)

### For Errandify:
- **Valuable perk**: Users see tangible value (SGD $0.10 per point)
- **Stickiness**: Companies spend EP monthly, stay engaged
- **Loyalty**: Better than generic perks (actual money value)

---

## Implementation Notes

### When User Redeems EP:
```
User has 100 EP → Redeems for "ERRAND10" voucher → Gets SGD $10 discount on next task
```

### When Company Gifts EP:
```
Company has 2,000 EP/month allowance
→ Company gifts 100 EP to top cleaner (worth SGD $10)
→ Cleaner can redeem immediately for SGD $10 discount
→ Counts against company's monthly EP allowance
```

### Backend Logic Needed:
1. Track company's monthly EP allowance (500/2000/10000)
2. Subtract EP when company gifts to users
3. Reset monthly allowance on billing date
4. Show company their EP usage dashboard

---

## Summary

**Current System:**
- 1 EP = SGD $0.10 (based on voucher redemptions)
- Users earn 50-500 EP/month from activities
- Redeemable for task discounts

**Proposed System:**
- Keep the **1 EP = SGD $0.10 rate** (consistent)
- Give subscription tiers monthly EP allowances:
  - Silver: 500 EP (SGD $50/month)
  - Gold: 2,000 EP (SGD $200/month)
  - Platinum: 10,000 EP (SGD $1,000/month)
- Companies can gift to employees/partners
- Maintains value for both users and companies
- Creates powerful incentive for subscriptions

