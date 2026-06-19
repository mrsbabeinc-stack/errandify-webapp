---
name: cancellation_scenarios
description: All cancellation scenarios - doer cancel after accept, asker cancel after doer confirms
metadata:
  type: project
  status: documented
  date: 2026-06-19
---

# Cancellation Scenarios

## SCENARIO 1: DOER CANCELS AFTER ACCEPTING ❌

### Timeline
```
1. Asker posts task for $100
2. System holds $100 in ESCROW immediately (not yet charged)
3. Doer A bids $90
4. Doer B bids $95 (waiting)
5. Asker ACCEPTS Doer A's bid
6. Task status: "confirmed"
7. Doer A changes mind... WANTS TO CANCEL
```

### Current Status
- **Task Status:** confirmed
- **Payment Status:** $100 held in escrow (reserved, not charged)
- **Assignment Status:** accepted
- **Previous Bidders:** Doer B still waiting (was rejected when A accepted)

### What Happens When Doer A Cancels?

**API Call (IMPLEMENTED):**
```
POST /api/bids/:bidId/cancel
{
  reason: "Family emergency"
}
```

**Backend Logic:**

1. **Verify doer owns the bid:**
   - Check current user is the doer
   - Prevent asker from cancelling doer's bid

2. **Check task status:**
   - Can only cancel if status is 'confirmed' (not 'in_progress' or 'completed')
   - Prevent cancelling if work already started

3. **Update assignment:**
   - errand_assignments status: 'accepted' → 'cancelled_by_doer'
   - Mark timestamp

4. **Revert task:**
   - errands status: 'confirmed' → 'open' (allow new bids)
   - Clear accepted_bid_id
   - **Payment stays in escrow** (same $100 reserved, ready for next doer)

5. **Notify previous bidders:**
   - **To Doer B:** "Task is available again! Your previous bid of $95 can be reconsidered. [Re-bid Now]"
   - Send critical email: "Task Available Again! Your bid ready"
   - Automatically notify all doers who bid (backend: notifyTaskReopenedAfterCancellation)

6. **Asker can:**
   - Accept Doer B's previous bid (same $100 escrow used)
   - Wait for new bids
   - Reject and get escrow released

### After Doer A Cancels
```
Task Status: "open"  ← Back to accepting bids
Bid A Status: "cancelled_by_doer"
Bid B Status: Can be reactivated (was rejected, now available)
Payment: $100 still in escrow (just reassigned)
Asker can: Accept Doer B or wait for others
Doer A: Cannot re-bid on this task (blocked)
Doer B: Notified task is open again with their previous bid
```

### Payment Flow (Key Point!)
```
CRITICAL: Payment held in escrow from POST
├─ When task posted → $100 escrow hold
├─ When Doer A accepted → still escrow (not charged)
├─ When Doer A cancels → escrow released back, can be re-held for new doer
├─ When Doer B accepts → same $100 escrow (not new charge)
└─ After 48 hours no dispute → released to doer
```

---

## SCENARIO 2: ASKER CANCELS AFTER DOER CONFIRMS ❌

### Timeline
```
1. Asker posts task for $100 → $100 held in ESCROW
2. Doer bids $90
3. Asker ACCEPTS bid
4. Task status: "confirmed"
5. Doer completes payment process
6. Task status: "in_progress" (doer starts work)
7. Asker changes mind... WANTS TO CANCEL
```

### Current Status
- **Task Status:** in_progress
- **Payment Status:** $100 in escrow (not yet released)
- **Assignment Status:** accepted & confirmed
- **Work Status:** Doer has started
- **Dispute Window:** Just opened (48-hour timer starts)

### What Happens When Asker Cancels?

**API Call (PARTIALLY IMPLEMENTED):**
```
POST /api/bids/task/:taskId/cancel
{}
```

**Current Backend Logic (from code review):**

1. **Verify asker owns task:**
   - ✓ Check current user is the asker
   - ✓ Prevent doer from cancelling

2. **Check task status:**
   - ✓ Handles non-confirmed tasks (just mark cancelled)
   - ✓ Handles confirmed tasks (applies penalty)

3. **Calculate penalty:**
   - ✓ Penalty = 5% of budget OR $5, whichever is higher
   - Example: $100 budget → $5 penalty → $95 refund
   - Penalty goes to doer as compensation

4. **Update task:**
   - ✓ Task status: 'confirmed'/'in_progress' → 'cancelled_by_asker'

5. **Handle escrow payment:**
   - Release escrow: $100 back to asker's account
   - Calculate: Refund $95 to asker, $5 to doer (penalty)
   - Update payment_releases record with cancellation reason

6. **Send notifications:**
   - **To Doer:** "Task cancelled by asker. You receive $5 penalty compensation. Dispute window: 48 hours."
   - **To Asker:** "Task cancelled. $95 refunded. Doer receives $5 (asker responsibility)."

7. **Open dispute window:**
   - Create dispute record: status='open'
   - Countdown: 48 hours from cancellation
   - Doer can dispute if they completed work already

### After Cancellation (Escrow Phase)
```
Task Status: "cancelled_by_asker"
Payment Status: In dispute resolution (48-hour window)
Asker refund: $95 (pending)
Doer compensation: $5 (pending)

48-HOUR DISPUTE WINDOW:
├─ Doer can dispute: "I had completed work! Give me full $100"
├─ Asker can counter-dispute: "Doer didn't start/incomplete work"
├─ After 48h with no dispute:
│  ├─ Asker: receives $95 refund
│  └─ Doer: receives $5 penalty
└─ If dispute filed:
   └─ Admin/System reviews evidence (photos, timestamps, chat)
      ├─ If doer wins: gets full $100
      └─ If asker wins: gets full $95, doer gets $5
```

### Key Difference from Immediate Refund
**OLD (Bad):** Immediate refund, no recourse for doer  
**NEW (Better):** 48-hour dispute window allows:
- Doer to challenge unfair cancellation
- Asker can prove they didn't start work
- Fair resolution with evidence review

---

## ESCROW & 48-HOUR DISPUTE SYSTEM (CORE PROTECTION)

### How Escrow Works (CRITICAL CLARIFICATION)

**Payment held IN ESCROW from moment of posting, NOT when bid accepted.**

```
PAYMENT TIMELINE:

1. POSTING PHASE ⭐ ESCROW STARTS HERE
   ├─ Asker posts task: $100
   └─ System: $100 IMMEDIATELY held in escrow (Stripe reserve)
   
2. BIDDING PHASE
   ├─ Doers bid (escrow unchanged)
   ├─ Multiple bids possible
   └─ Asker accepts one bid

3. CONFIRMED PHASE
   ├─ Task: "confirmed"
   ├─ Payment: $100 still in escrow
   └─ Doer: Accepts and proceeds to work

4. IN_PROGRESS PHASE
   ├─ Task: "in_progress"
   ├─ Payment: $100 escrow → locked for 48h hold
   └─ Timer: 48-hour dispute window starts

5. COMPLETED PHASE
   ├─ Task: "completed"
   ├─ Asker marks work done
   └─ Dispute window: Open for 48h from completion

6. PAYMENT RELEASE (After 48h or dispute resolved)
   ├─ If no dispute: $100 → doer's wallet
   ├─ If doer disputed & won: $100 → doer
   └─ If asker disputed & won: $95 to asker, $5 to doer
```

**Key Insight:**
- Escrow starts at POSTING (before any bids)
- Guarantees asker has funds before doers start work
- If doer cancels and task reopens, SAME $100 escrow transfers to new doer
- Asker cannot withdraw escrow or change amount once posted
- This builds trust with doers (money is guaranteed)

### Why 48 Hours?
**Protects both:**
- **Doer:** Can dispute if asker cancels unfairly or doesn't pay
- **Asker:** Can dispute if doer doesn't complete or does poor work
- **Platform:** Fraud protection, audit trail for 48h window

### What Happens If Someone Disputes?
```
1. Dispute filed within 48h
2. System collects evidence:
   - Chat messages
   - Task photos/proof
   - Timestamps
   - Completion status
3. Admin/automated review:
   - If doer has photos + chat evidence → doer wins
   - If asker says "not started" but has nothing → asker loses
4. Resolution:
   - Full refund or partial release
   - Rating/reliability score updated
```

---

## SCENARIO 3: DOER CANCELS BEFORE PAYMENT (EDGE CASE)

### Timeline
```
1. Task accepted
2. Task status: "confirmed"
3. Doer hasn't paid yet
4. Doer changes mind → cancels
```

### What Happens?
- PaymentIntent exists but not charged
- Cancel PaymentIntent
- Task reverts to "open"
- No refund needed (no charge yet)
- Clean state

---

## SCENARIO 4: BOTH CANCEL (RACE CONDITION)

### Timeline
```
1. Task in_progress (payment captured)
2. Doer clicks "Cancel"
3. Asker clicks "Cancel" (at same time)
4. Who wins?
```

### Current Implementation
- **No handling for this** - need to add:
  - Lock mechanism
  - Or first-canceller wins
  - Prevent double cancellation

---

## COMPARISON TABLE

| Scenario | Who Cancels | Task Status Before | Task Status After | Payment | Doer Compensation |
|----------|------------|-------------------|-------------------|---------|-------------------|
| **Before Payment** | Doer | confirmed | open | Cancelled | None |
| **After Payment** | Doer | in_progress | cancelled_by_doer | Refunded | None (should be penalty?) |
| **Asker (before payment)** | Asker | confirmed | cancelled_by_asker | Cancelled | None |
| **Asker (after payment)** | Asker | in_progress | cancelled_by_asker | Refunded | $5-10 penalty ✓ |

---

## CURRENT IMPLEMENTATION STATUS

### ✅ Implemented
- **Asker cancel (POST /api/bids/task/:taskId/cancel):**
  - Checks asker ownership
  - Handles confirmed tasks
  - Calculates penalty correctly
  - Updates task status
  - Sends notifications

### ❌ Missing/TODO
- **Doer cancel endpoint** - NOT IMPLEMENTED
  - Need to create POST /api/bids/:bidId/cancel
  - Handle refunds
  - Revert task to "open"
  - Prevent double cancellation

- **Stripe refund logic** - MARKED AS TODO
  - Currently dummy implementation
  - Need real Stripe refund calls

- **Race condition handling**
  - What if both cancel simultaneously?
  - Need locking or idempotency

- **Doer penalty for canceling after payment**
  - Currently no penalty for doer cancelling
  - Should doer be penalized? Or just asker?

---

## RECOMMENDED FLOW (TO IMPLEMENT)

### Doer Cancels After Accept (BEFORE PAYMENT)
```
Doer clicks "Cancel" on accepted bid

Check:
✓ Is doer the one who bid?
✓ Is task still 'confirmed' (not started)?
✓ Has payment been charged? → IF YES: refund full + reopen

Actions:
1. Update assignment: accepted → cancelled_by_doer
2. Revert task: confirmed → open
3. Clear accepted_bid_id
4. Cancel Stripe PaymentIntent (if not charged)
5. Notify asker: "Task back to open for bids"
```

### Doer Cancels After Payment (IN PROGRESS)
```
Doer clicks "Cancel" on in_progress task

Check:
✓ Is doer the one assigned?
✓ Is task 'in_progress'?
✓ Has payment been charged? → YES

Actions:
1. Update assignment: accepted → cancelled_by_doer
2. Mark task: in_progress → cancelled_by_doer
3. Refund asker: FULL AMOUNT (or some % based on completion)
4. Notify both:
   - Asker: "Doer cancelled. Full/partial refund issued."
   - Doer: "You cancelled. Your rating may be affected."
5. Update doer's cancellation_count (track reliability)
```

### Asker Cancels (CURRENT - WORKING)
```
Asker clicks "Cancel" on task

Check:
✓ Is asker the one who posted?
✓ Is task 'confirmed' or 'in_progress'?

Actions:
1. Update task: → cancelled_by_asker
2. Calculate penalty: 5% or $5
3. Refund: (budget - penalty) to asker
4. Compensate: penalty to doer
5. Notify both:
   - Doer: "Task cancelled. You receive $5 penalty."
   - Asker: "Refunded $95 (after $5 penalty)"
6. Mark task as cancelled
```

---

## DATABASE CHANGES NEEDED

### New Status Values
Add to errands.status enum:
- `cancelled_by_doer` (currently only has cancelled_by_asker)

### New Fields (Optional but Recommended)
- `doer_cancellation_count` - track doer reliability
- `cancellation_reason` - why cancelled
- `cancellation_timestamp` - when cancelled
- `refund_amount` - how much was refunded
- `penalty_amount` - penalty paid

### Track in Assignments
- `cancelled_by` (doer/asker)
- `cancel_reason`
- `cancel_timestamp`

---

## WHAT HAPPENS TO RATINGS?

**If doer cancels:**
- Asker cannot rate doer (no task completed)
- Doer's cancellation_count increases
- May affect doer's "reliability score"

**If asker cancels:**
- Asker cannot rate doer (task not doer's fault)
- Doer might rate asker (cancelled unfairly)
- Asker's cancellation_count increases

---

## PENALTY RATIONALE

**Why asker pays penalty when cancelling:**
- Doer had time to accept other tasks
- Doer relied on this task
- Compensation for opportunity cost

**Why doer doesn't pay penalty (currently):**
- Doer completed work/payment
- Just backing out
- ISSUE: Should there be penalty?

**Proposed fix:**
- If doer cancels BEFORE starting: no penalty (just refund asker)
- If doer cancels AFTER starting: partial refund based on % complete
