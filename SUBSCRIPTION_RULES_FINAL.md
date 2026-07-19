# Subscription Rules - FINAL & SIMPLE

## 💰 PRICING

### Monthly
- Silver: SGD $28
- Gold: SGD $78
- Platinum: SGD $148

### Annual (20% discount)
- Silver: SGD $268
- Gold: SGD $748
- Platinum: SGD $1,420

---

## 🔄 RULES

### MONTHLY SUBSCRIPTIONS

**Upgrade:** ⚡ Immediate
- Charge difference for remaining days in month

**Downgrade:** ⏳ Wait until month-end
- Takes effect at end of current month
- Full month charged (no refund)

**Cancel:** ⏳ Month-end
- Takes effect at end of current month

---

### ANNUAL SUBSCRIPTIONS

**Upgrade:** ⚡ Immediate
- Charge difference for remaining days in year

**Downgrade:** ⏳ Wait until renewal
- NO REFUND for remaining time
- Stays on current tier until renewal date
- Auto-switches to lower tier at renewal

**Cancel:** ⏳ After 30 days only
- Within 30 days: 100% refund
- After 30 days: Pro-rata refund for remaining days

---

## ✅ ANNUAL DOWNGRADE EXAMPLE

```
User: Platinum Annual (SGD $1,420, June 15 2026 - June 15 2027)
Request: Downgrade to Gold on Sept 15 2026

System response:
✅ Downgrade scheduled for June 15 2027
✅ You keep Platinum until June 15 2027 (no refund)
✅ At renewal: Auto-switches to Gold (SGD $748)

Result:
- Paid: SGD $1,420 (covers June 15 2026 → June 15 2027)
- Gets: Platinum benefits through June 15, 2027
- Next charge: June 15 2027 (SGD $748 for Gold Annual)
```

---

## 📊 QUICK RULES TABLE

| Action | Monthly | Annual |
|--------|---------|--------|
| **Upgrade** | Immediate | Immediate |
| **Downgrade** | Month-end | Renewal date (no refund) |
| **Cancel** | Month-end | After 30 days |
| **Refund** | No (locked) | Only on cancellation |

---

## 🎯 KEY PRINCIPLES

✅ **Upgrades instant** - Capture higher revenue immediately
✅ **Downgrades delayed** - Prevent buyer's remorse, keep higher tier revenue longer
✅ **No refunds on downgrades** - User pays for full period regardless
✅ **Annual is commitment** - No mid-year changes, renewals are clean
✅ **Simple & clear** - One rule per action (no options/confusion)

---

## 🚀 IMPLEMENTATION

**Components needed:**
1. ✅ Commission logic (18%, 17%, 16%)
2. ✅ Ad credit system (SGD $50/200/500 monthly)
3. ✅ Upgrade logic (pro-rata charge remaining period)
4. ✅ Downgrade logic (schedule for month-end or renewal)
5. ✅ Cancellation logic (enforce windows)
6. ✅ Dashboard (show status, renewal date, next action)

**Estimated time: 10-12 days**

---

## ✅ FINAL APPROVAL

**All rules confirmed:**
- Monthly: Cancel at month-end ✅
- Annual: Upgrade immediate, downgrade waits till renewal (NO REFUND) ✅
- Simple, predictable, fair ✅

**Ready to build!** 🚀
