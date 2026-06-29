# 🎨 ADMIN DASHBOARD - UI/UX DESIGNS

## DESIGN SYSTEM

**Colors:** Orange (#F4A460), Red (#FF6B6B), Green (#4CAF50), Gray (#F5F5F5)  
**Typography:** Poppins (headings), Inter (body), JetBrains Mono (numbers)  
**Tone:** Happy, warm, kampung-style (NOT corporate)  

---

## TAB 1: DASHBOARD OVERVIEW

```
┌─ KPI Cards ─────────────────────────┐
│ 🎯 94% │ 💰 $24k │ ⚠️ 12 │ 🏆 4.7/5 │
└─────────────────────────────────────┘
    ↓
┌─ Safety Alerts ──────────────────────┐
│ 🚨 Trafficking | ⚠️ Content | 🔔 Churn│
└──────────────────────────────────────┘
    ↓
┌─ Dispute Health ─────────────────────┐
│ L1: 0 | L2: 3 | L3: 1                │
└──────────────────────────────────────┘
    ↓
┌─ Revenue Snapshot ───────────────────┐
│ Fees: $2.4k | Payouts: $1.2k | Net   │
└──────────────────────────────────────┘
```

---

## TAB 2: USERS & SAFETY

**Grid Layout:**
- Status cards (active, at-risk, flagged, churn)
- Vulnerability grid (45 users with risk scores)
- Coercion alerts (real-time patterns)
- User list (click for profile modal)

**Key Features:**
- Risk score badge (🟢🟡🔴)
- Last action timestamp
- Quick action buttons
- Mobile: Single column, thumb-friendly

---

## TAB 3: DISPUTES & RESOLUTION

**Pipeline Visualization:**
```
L1 Auto     →    L2 Review    →    L3 Appeal
0 pending       3 in queue        1 pending
89% resolve     91% resolve       75% resolve
```

**Detail Modal:**
- Case summary (parties, amount, status)
- Dispute reason + evidence photos
- Chat history (last 10 messages)
- AI recommendation + agent decision
- PhotoUploadWidget for evidence

**Decision Options:**
- Full Refund
- Split Payment
- Release Payment

---

## TAB 4: OPERATIONS & INTELLIGENCE

**Layout:**
```
Business Metrics Table:
GMV | Tasks | Rating | Repeat | NPS | Retention

AI Insights Cards:
🚨 Fraud | 📉 Churn | 📈 Trends | 💡 Pricing

Revenue Pie Chart:
Fees | Payouts | Vouchers

Category Grid:
Pet Care | Cleaning | Tutoring | Handyman | Moving
```

---

## TAB 5: REGIONAL OPERATIONS

**Multi-Country Dashboard:**
```
[SG] [MY] [TH] [ID] [VN]

Selected: Singapore
├─ Revenue: SGD $12,400 (50%)
├─ Users: 840
├─ Compliance: ✅ PDPA 100%
├─ Support: 8 agents (avg 2.1h resolution)
└─ Expansion: Next (Philippines Q3)
```

**Features:**
- Country quick-select buttons
- Compliance dashboard per country
- Regional market insights
- Support team staffing
- Expansion readiness checklist

---

## RESPONSIVE DESIGN

**Desktop (1400px):** 3-column layout, full features  
**Tablet (768px):** 2-column, simplified  
**Mobile (375px):** 1-column, essential only  

---

## MICRO-INTERACTIONS

- Alert slide-in (200ms)
- Hover scale (150ms)
- Card expand (300ms)
- Status pulse (1s loop)
- Loading spinner (0.8s rotation)

---

## ACCESSIBILITY

✅ WCAG 2.1 AA  
✅ Color contrast 4.5:1  
✅ Keyboard nav (Tab, Enter, Esc)  
✅ Screen reader (ARIA labels)  
✅ Focus indicators  
✅ Alt text  

---

## STATUS

✅ Ready for Figma implementation  
✅ All 5 tabs designed  
✅ Mobile responsive  
✅ Accessible  

