# Advertising System - Visual Flow & UX

## 1️⃣ Campaign Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Select Ad Types (Package Setup)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Which ads do you want to create?                           │
│                                                              │
│  ☐ 🌟 Hero Banner        ☐ 📰 In-Feed Ads                   │
│                                                              │
│                            [Cancel] [Continue: Fill Details] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Campaign Details (For Each Ad Type)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🌟 Hero Banner Details                  Step 1 of 1        │
│                                                              │
│  Title: [________________]        (AI spell-check)          │
│  URL: [________________]          (URL validation)          │
│  Image: [Upload Photo] ✓          (Quality check)           │
│  Budget: $[500]                   (Budget slider)           │
│  Start Date: [2026-07-21]                                   │
│  Duration: [2] weeks                                        │
│                                                              │
│  🎯 AI Recommendation:                                       │
│  Your CTR is 20% above average!                             │
│                                                              │
│                           [Cancel] [💳 Ready for Payment →] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Refund Policy Agreement ⚠️                          │
├─────────────────────────────────────────────────────────────┤
│                            ⚠️                                │
│                      Payment Policy                         │
│             Please read carefully before proceeding         │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ❌ No Refunds Once Paid                               │  │
│  │ Once you submit payment, NO REFUNDS will be issued    │  │
│  │ regardless of the reason or timing.                   │  │
│  │                                                        │  │
│  │ ⏸️ Pause Anytime                                       │  │
│  │ You can PAUSE your campaign anytime and RESUME        │  │
│  │ it later without additional charges.                  │  │
│  │                                                        │  │
│  │ ⏹️ Stop Permanently                                    │  │
│  │ You can STOP your campaign anytime to end it          │  │
│  │ permanently. NO REFUND for unused budget.             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  💡 Review campaign details before payment. You cannot     │
│  edit once submitted for payment.                          │
│                                                              │
│  ☐ I understand and accept the no refund policy. I can    │
│    pause or stop my campaign anytime.                      │
│                                                              │
│         [Go Back]       [💳 Continue to Payment]            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Stripe Checkout                                            │
│  (Payment Processing)                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
                 ✅ Payment Approved
                 Campaign Status: APPROVED (paid)
```

---

## 2️⃣ Active Campaign Management

```
┌──────────────────────────────────────────────────────────────────┐
│  Active Advertising Campaigns                                     │
│  Manage and optimize your active advertising                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Premium Partner Showcase                                  ⋮      │
│  ● ACTIVE                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │      Your Banner Ad (1200×300px)                          │  │
│  │      [Placeholder Image]                                  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Budget Used                                                       │
│  ████████░░░░░░░░░  64%                                           │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ [⏸ Pause]      [⏹ Stop]      │ [⏸ Pause]     [⏹ Stop]       │ │
│  │  (same size)    (red, same size)                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘

For DRAFT campaigns:
┌──────────────────────────────────────────────────────────────────┐
│  New Campaign Concept                                      ⋮      │
│  ○ DRAFT                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [Image Placeholder]                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Budget Used: Not yet submitted                                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ [✏️ Edit]       [🗑 Delete]                                 │ │
│  │ (enabled)      (enabled)                                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Stop Campaign Warning

```
┌─────────────────────────────────────────────────────────────┐
│  ⏹️ Stop Campaign                                    ✕      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  You are about to PERMANENTLY STOP the campaign:            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Premium Partner Showcase                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ⚠️ Important:                                        │   │
│  │ • This action CANNOT BE REVERSED                     │   │
│  │ • Campaign will stop immediately                     │   │
│  │ • NO REFUND for remaining budget                     │   │
│  │ • Cannot restart this campaign                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [Yes, Stop Campaign]        [Cancel]                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4️⃣ Campaign Status States & Actions

```
DRAFT
│
├─ Can: Edit, Delete, Submit for Payment
├─ Cannot: Pause, Stop (not paid yet)
└─ Buttons: [✏️ Edit] [🗑 Delete]
           │
           └─ Can edit before final submission
              Then removed from here


SUBMITTED
│
├─ Can: Await admin approval
├─ Cannot: Edit, Delete, Pause, Stop
└─ Status: "Awaiting Admin Review"
          │
          └─ Hidden from company view during admin review


APPROVED
│
├─ Can: Pause (disabled until live)
├─ Cannot: Edit, Delete
└─ Buttons: Disabled until start_date
           │
           └─ Auto-transitions to LIVE on start_date


ACTIVE (LIVE)
│
├─ Can: Pause → Resume, Stop
├─ Cannot: Edit, Delete
└─ Buttons: [⏸ Pause] [⏹ Stop]
           │
           ├─ Pause → goes to PAUSED state
           └─ Stop → shows warning, becomes STOPPED


PAUSED
│
├─ Can: Resume → Active, Stop
├─ Cannot: Edit, Delete
└─ Buttons: [▶️ Resume] [⏹ Stop]
           │
           ├─ Resume → goes back to ACTIVE
           └─ Stop → shows warning, becomes STOPPED


STOPPED
│
├─ Can: View only (read-only)
├─ Cannot: Resume, Edit, Delete
└─ Status: "Campaign Stopped - No Refund"
          │
          └─ Permanent. No actions available.


EXPIRED
│
├─ Can: View statistics only
├─ Cannot: Resume, Edit, Delete
└─ Status: "Campaign Expired"
          │
          └─ Auto-transitioned after end_date
```

---

## 5️⃣ Button Size & Styling

**All Action Buttons:**
- Equal flex sizing (flex: 1)
- Padding: 12px 16px
- Font: 14px, weight 700
- Rounded corners: 10px
- Transitions: 0.3s all

**Default Buttons (Pause/Resume):**
- Background: `linear-gradient(135deg, #FF6B35, #FF8C5A)` (orange)
- Hover: Darker gradient + shadow + translate up
- Disabled: 50% opacity + gray background

**Stop Button:**
- Background: `linear-gradient(135deg, #E74C3C, #E8653A)` (red)
- Hover: Darker red + shadow + translate up
- Disabled: 50% opacity + gray background

**All buttons have same dimensions:**
```
Container: display flex, gap 12px
Each btn: flex 1 (equal width)
Height: ~44px (from padding + font size)
```

---

## 6️⃣ Wizard Always Starts at Step 1

```
useEffect(() => {
  if (isOpen) {
    setStep('package-setup');  // Always reset to Step 1
  }
}, [isOpen]);


User closes wizard at Step 2
    ↓
User clicks "New Campaign" again
    ↓
useEffect detects isOpen = true
    ↓
Step resets to 'package-setup' (Step 1)
    ↓
User sees fresh wizard from beginning
```

---

## 7️⃣ Key UX Decisions

| Aspect | Why |
|--------|-----|
| Refund warning in Step 3 | Appears AFTER user designs campaign, so they see true cost before payment |
| Checkbox required | Prevents accidental clicks, forces deliberate agreement |
| Stop warning modal | Clear understanding that action is permanent & non-refundable |
| Edit/Delete hidden for paid | Prevents confusion—paid campaigns can't be changed post-purchase |
| Equal button sizes | Professional appearance, no visual hierarchy suggesting one is "better" |
| Always reset wizard | Users expect fresh start when reopening, prevents confusion with stale state |
| Pause vs Stop distinction | Pause = temporary break, Stop = permanent end—clear differentiation |

---

## ✅ Verification Checklist

- [x] Refund policy warning shown before payment
- [x] User must check agreement checkbox
- [x] Cannot proceed to payment without checkbox
- [x] Stop button shows warning modal
- [x] Cannot edit/delete paid campaigns
- [x] Edit/Delete only visible for draft/rejected
- [x] All buttons same size
- [x] Title changed to "Active Advertising Campaigns"
- [x] Wizard resets to Step 1 when opened
- [x] Stop is permanent (status → 'stopped')
- [x] Pause is reversible (status → 'paused' then 'active')

