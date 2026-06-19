---
name: bidding_cycle_complete
description: Complete bidding cycle for single and recurring tasks - from posting to payment to completion
metadata:
  type: project
  status: documented
  date: 2026-06-19
---

# Complete Bidding & Payment Cycle

## SINGLE TASK BIDDING CYCLE

### Stage 1: TASK POSTING
**Asker posts a task:**
```
POST /api/errands
{
  title: "Clean my house",
  category: "homehelp",
  budget: 150,
  deadline: "2026-06-20",
  time: "10:00",
  location: "Clementi",
  isRecurring: false,
  description: "2-bedroom apartment"
}
```

**Backend creates:**
- errand row with status='open'
- If single task, creates 1 errand_session

**Result:**
- Errand is "open" and visible to doers
- Status: `open`

---

### Stage 2: DOER VIEWS & BIDS
**Doer sees errand on browse page:**
```
Doer clicks "Submit a Bid"
→ BidSubmissionModal opens
→ Enters: amount=$120, note="I have experience..."
```

**API call:**
```
POST /api/bids
{
  task_id: 1,
  amount: 120,
  note: "I have experience..."
}
```

**Backend creates:**
- bids row with status='pending'
- doer_id, amount, note stored

**Result:**
- Bid is created but NOT accepted yet
- Doer can see bid in "My Bids" page
- Asker sees bid in "Bids" section

---

### Stage 3: ASKER REVIEWS BIDS
**Asker can:**
- See all bids (sorted by price)
- Filter by doer rating
- Chat with doer
- **ACCEPT** best bid
- **REJECT** bids they don't want

**Asker clicks "Accept Bid":**
```
POST /api/bids/:bidId/accept
{}
```

**Backend:**
1. Updates bid status='accepted'
2. Creates errand_assignment row:
   ```
   errand_id: 1,
   doer_id: 123,
   status: 'accepted',
   session_id: 1 (for single task)
   ```
3. Updates errand status='assigned'
4. Rejects all other bids automatically
5. Sends notification to doer: "Your bid was accepted!"

**Result:**
- Task is now "assigned"
- Doer & Asker can now chat
- Payment needs to be processed

---

### Stage 4: PAYMENT PROCESSING
**System initiates payment:**

**Asker sees:**
```
Errand assigned to John for $120
[Pay Now] button
```

**Asker clicks "Pay Now":**
```
POST /api/payment/create-intent
{
  errandId: 1,
  amount: 120
}
```

**Stripe flow:**
1. Backend creates Stripe PaymentIntent
2. Frontend shows Stripe card form
3. Asker enters card details
4. Frontend calls Stripe tokenization
5. Asker clicks "Complete Payment"

```
POST /api/payment/confirm
{
  paymentIntentId: "pi_xyz",
  clientSecret: "..."
}
```

**Backend:**
1. Confirms payment with Stripe
2. Creates payment_releases row (holds funds in escrow)
3. Updates errand status='confirmed'
4. Sends notification to doer: "Payment confirmed! You can start."

**Result:**
- Money is held in escrow (NOT released to doer yet)
- Errand is "confirmed"
- Doer can now start work

---

### Stage 5: TASK EXECUTION
**Doer does the task:**
- Chat back & forth
- Doer sends photos/proof
- Takes time to complete

**Asker marks complete:**
```
POST /api/errands/:id/complete
{
  status: 'completed'
}
```

**Backend:**
1. Updates errand status='completed'
2. Updates errand_assignment status='completed'
3. Marks task_photos as verified

**Result:**
- Task marked complete
- Ready for payment release

---

### Stage 6: PAYMENT RELEASE & RATING
**Asker can now:**
1. Release payment to doer
2. Leave rating/review

**Asker clicks "Release Payment":**
```
POST /api/payment/release
{
  errandId: 1
}
```

**Backend:**
1. Releases funds from escrow to doer's wallet
2. Creates payout record
3. Transfers money via Stripe

**Asker leaves review:**
```
POST /api/errands/:id/rate
{
  rating: 5,
  comment: "Great job! Very professional."
}
```

**Backend:**
1. Updates errand_assignments with rating_score and rating_comment
2. Recalculates doer's average rating
3. Sends notification to doer with review

**Result:**
- Doer received payment ✓
- Review is public on doer's profile
- Task is fully complete

---

## RECURRING TASK BIDDING CYCLE

### Stage 1: RECURRING TASK POSTING
**Asker posts a recurring task:**
```
POST /api/errands
{
  title: "Tuition for my kid",
  category: "childcare",
  budget: 200,
  isRecurring: true,
  repeatEvery: 3,
  repeatUnit: "day",
  occurrences: 8,
  deadline: "2026-06-21",
  time: "3pm",
  location: "Clementi"
}
```

**Backend creates:**
1. errand row with is_recurring=true
2. **8 errand_session rows** (one for each occurrence):
   - session_number: 1-8
   - start_date: 2026-06-21, 2026-06-24, 2026-06-27, ...
   - status: 'pending'

**Result:**
- Errand is "open" with 8 sessions
- All sessions visible to doers

---

### Stage 2: DOER VIEWS & SELECTS SESSIONS
**Doer sees recurring errand:**
```
Doer clicks "Select Sessions"
→ RecurringErrandSessionSelector modal opens
→ Shows all 8 sessions with dates/times
```

**Doer can:**
- Check/uncheck each session
- Select "Select All" or individual sessions
- Example: Selects 6 of 8 (unavailable on 2 dates)

**API call:**
```
POST /api/bids/recurring-sessions
{
  errandId: 1,
  selectedSessionIds: [1, 2, 3, 4, 6, 7]  // skips sessions 5 & 8
}
```

**Backend creates:**
- **6 errand_assignment rows** (one per selected session):
  ```
  errand_id: 1,
  doer_id: 123,
  session_id: 1 (links to specific session),
  status: 'accepted',
  is_partial_recurring: true
  ```
- Sessions 5 & 8 stay unassigned (status='pending')

**Result:**
- Doer accepted 6 of 8 sessions
- 2 sessions still open for other doers
- Asker can see: "6/8 sessions covered"

---

### Stage 3: ASKER FILLS REMAINING SESSIONS
**Asker sees:**
```
Sessions covered: 6/8
Session 5 (2026-06-29): OPEN
Session 8 (2026-07-06): OPEN

[Find More Doers]
```

**Asker can:**
- Wait for more bids on remaining sessions
- Find another doer for missing sessions
- Or cancel missing sessions

**Second doer bids:**
```
POST /api/bids/recurring-sessions
{
  errandId: 1,
  selectedSessionIds: [5, 8]  // covers the 2 remaining
}
```

**Result:**
- Now all 8 sessions are assigned
- Errand is fully "covered"
- 2 doers involved (one for 6 sessions, one for 2)

---

### Stage 4: PAYMENT FOR RECURRING
**Payment happens PER SESSION:**

**Asker initiates payment:**
```
For John (6 sessions × $200): $1200
For Jane (2 sessions × $200): $400
Total: $1600
```

**Two separate payment flows:**

**John's payment:**
```
POST /api/payment/create-intent
{
  errandId: 1,
  sessions: [1, 2, 3, 4, 6, 7],
  amount: 1200
}
```

**Jane's payment:**
```
POST /api/payment/create-intent
{
  errandId: 1,
  sessions: [5, 8],
  amount: 400
}
```

**Result:**
- 2 separate Stripe charges
- Funds held in escrow per doer per sessions

---

### Stage 5: RECURRING TASK EXECUTION
**Each session happens independently:**

**Session 1 (2026-06-21):**
- John does task
- Asker marks complete
- John gets temporary status='in_progress'

**Session 2 (2026-06-24):**
- John does task again
- Asker marks complete
- Status → 'completed'

**Session 5 (2026-06-29):**
- Jane does task
- Asker marks complete
- Status → 'completed'

**And so on for all 8 sessions...**

---

### Stage 6: PAYMENT RELEASE - RECURRING
**Asker releases payment:**

**For John:**
```
POST /api/payment/release
{
  errandId: 1,
  doerId: 123,
  sessions: [1, 2, 3, 4, 6, 7]
}
```
→ Releases $1200 to John

**For Jane:**
```
POST /api/payment/release
{
  errandId: 1,
  doerId: 124,
  sessions: [5, 8]
}
```
→ Releases $400 to Jane

**Ratings happen per doer:**

**For John's 6 sessions:**
```
POST /api/errands/:id/rate
{
  doerId: 123,
  rating: 5,
  comment: "Excellent tuition, very patient!"
}
```

**For Jane's 2 sessions:**
```
POST /api/errands/:id/rate
{
  doerId: 124,
  rating: 5,
  comment: "Professional, punctual!"
}
```

**Result:**
- Both doers paid
- Both have reviews
- Recurring task fully complete

---

## KEY DIFFERENCES: SINGLE vs RECURRING

| Aspect | Single Task | Recurring Task |
|--------|------------|-----------------|
| **Sessions** | 1 session | N sessions |
| **Bids** | 1 doer per task | Multiple doers (per sessions) |
| **Assignments** | 1 assignment | N assignments (one per session per doer) |
| **Selection** | Accept/Reject bid | Select which sessions to do |
| **Payment** | 1 payment (all or nothing) | N payments (one per doer per session set) |
| **Execution** | Once | Multiple times |
| **Rating** | 1 rating per doer | 1 rating per doer (covers all their sessions) |
| **Coverage** | 100% or 0% | Can be partial (6/8 sessions) |

---

## PAYMENT STATE FLOW

### Single Task
```
open → assigned → confirmed → in_progress → completed → paid
```

### Recurring Task (Per Session)
```
Session 1: pending → assigned → confirmed → in_progress → completed → paid
Session 2: pending → assigned → confirmed → in_progress → completed → paid
... (repeat for all sessions)
```

---

## DATABASE TABLES INVOLVED

**Bidding Flow:**
- `bids` - stores bids from doers
- `errand_assignments` - stores accepted bids (one per doer per task/session)
- `errand_sessions` - stores individual sessions (1 for single, N for recurring)

**Payment Flow:**
- `payment_releases` - tracks escrow holds and releases
- `payment_intents` - Stripe PaymentIntent records

**Execution Flow:**
- `task_photos` - proof of work (optional)
- `task_messages` - chat between asker & doer

**Rating Flow:**
- `errand_assignments.rating_score`
- `errand_assignments.rating_comment`

---

## CURRENT IMPLEMENTATION STATUS

✅ **Single Task:**
- Bid posting (POST /api/bids)
- Bid acceptance (POST /api/bids/:id/accept)
- Payment flow (Stripe integration)
- Rating system

✅ **Recurring Task:**
- Session selection (POST /api/bids/recurring-sessions)
- Multi-doer support (via sessions)
- Per-session tracking in errand_assignments
- Payment logic ready (handles multiple doers)

⚠️ **TODO:**
- Payment UI for multiple sessions per recurring task
- Batch payment handling for doers with multiple sessions
- Calendar view for recurring task execution
- Automatic payment release after completion confirmation
