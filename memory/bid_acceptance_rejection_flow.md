---
name: bid_acceptance_rejection_flow
description: Detailed flow of what happens when asker accepts or rejects bids
metadata:
  type: project
  status: documented
  date: 2026-06-19
---

# Bid Acceptance & Rejection Flow

## SCENARIO 1: ASKER ACCEPTS A BID ✅

### Before Acceptance
```
Task Status: "open"
Bids Status: "pending" (multiple doers can bid)

Doer A bids $100
Doer B bids $120  ← Asker wants to accept this
Doer C bids $150
```

### Asker clicks "Accept" on Doer B's bid

**API Call:**
```
POST /api/bids/:bidId/accept
{
  // no body needed
}
```

**Backend Logic - Step by Step:**

1. **Verify Doer B's bid exists**
   - Find bid in database
   - Check it belongs to the right errand

2. **Verify asker owns the errand**
   - Confirm only the asker (person who posted) can accept
   - Reject if someone else tries to accept

3. **Verify errand is still "open"**
   - Prevent accepting if already assigned to someone else
   - Prevent accepting if task was cancelled

4. **Accept Doer B's bid:**
   - Update `bids` table:
     ```
     bid_id: B
     status: 'accepted'  ← Changed from 'pending'
     ```

5. **Close the errand:**
   - Update `errands` table:
     ```
     status: 'confirmed'  ← Changed from 'open'
     accepted_bid_id: B
     stripe_payment_intent_id: pi_xyz...
     ```

6. **Reject ALL other bids AUTOMATICALLY:**
   - Update `bids` table:
     ```
     WHERE task_id = X AND id != B
     status: 'rejected'  ← All other bids rejected
     ```
   - So:
     - Doer A's bid: status = 'rejected'
     - Doer C's bid: status = 'rejected'

7. **Send notifications:**
   - **To Doer B (accepted):** "Congratulations! Your bid for 'Clean House' was accepted for $120!"
   - **To Doer A (rejected):** "Your bid for 'Clean House' was not selected"
   - **To Doer C (rejected):** "Your bid for 'Clean House' was not selected"

### After Acceptance
```
Task Status: "confirmed"
Bid B Status: "accepted"
Bid A Status: "rejected"
Bid C Status: "rejected"

Doer B can now:
- See payment link
- Start payment process
- Chat with asker
- Execute task when paid
```

---

## SCENARIO 2: ASKER REJECTS A BID ❌

### Before Rejection
```
Task Status: "open"
Bids Status: "pending" (all still open for bidding)

Doer A bids $100
Doer B bids $120
Doer C bids $150  ← Asker wants to reject this
```

### Asker clicks "Reject" on Doer C's bid

**API Call:**
```
POST /api/bids/:bidId/reject
{
  reason: "Too expensive"  (optional)
}
```

**Backend Logic - Step by Step:**

1. **Verify Doer C's bid exists**
   - Find bid in database
   - Check it belongs to the right errand

2. **Verify asker owns the errand**
   - Confirm only the asker can reject
   - Reject if someone else tries to reject

3. **Reject ONLY Doer C's bid:**
   - Update `bids` table:
     ```
     bid_id: C
     status: 'rejected'  ← Changed from 'pending'
     ```
   - That's it - only this one bid is rejected

4. **Task remains OPEN:**
   - `errands` table:
     ```
     status: 'open'  ← Still open, other bids welcome
     accepted_bid_id: NULL  ← No one accepted yet
     ```

5. **Other bids STAY ACTIVE:**
   - Doer A's bid: status = 'pending' ← Still active
   - Doer B's bid: status = 'pending' ← Still active

6. **Send notification:**
   - **To Doer C (rejected):** "Your bid for 'Clean House' was not selected. Reason: Too expensive"
   - **NO notification** to other doers (they don't know)

### After Rejection
```
Task Status: "open"  ← Still open
Bid A Status: "pending"  ← Still waiting
Bid B Status: "pending"  ← Still waiting
Bid C Status: "rejected"  ← Doer C out

Asker can:
- Accept Doer A's bid
- Accept Doer B's bid
- Wait for more bids
- Reject more bids
```

---

## KEY DIFFERENCES

| Action | Accept | Reject |
|--------|--------|--------|
| **Affects** | Bid + All other bids | Only this bid |
| **Task Status** | Changes to "confirmed" | Stays "open" |
| **Task Closed** | YES ✓ | NO ✗ |
| **Can still bid** | NO - task closed | YES - others can still bid |
| **Payment needed** | YES - immediately | NO - task still open |
| **Other bids** | All rejected auto | Unaffected |
| **Can change mind** | NO - locked in | YES - can accept later |

---

## EDGE CASES

### What if asker accepts, then payment fails?
```
1. Asker clicks "Accept"
2. Task marked "confirmed"
3. Payment attempt fails
4. Task stays "confirmed" (stuck)

ISSUE: Task is locked but payment never completed
FIX: Need to implement "cancel" for confirmed tasks
```

### What if asker rejects all bids?
```
1. Doer A bid: rejected
2. Doer B bid: rejected
3. Doer C bid: rejected
4. Task still "open"
5. Waiting for more bids

OPTION: Asker can wait, lower budget, or cancel task
```

### What if asker accepts but doer doesn't pay?
```
1. Asker accepts bid
2. Task marked "confirmed"
3. Doer never completes payment
4. Task stuck in "confirmed"

ISSUE: No timeout - task never starts
FIX: Add 24-hour timeout for payment completion
```

---

## CURRENT IMPLEMENTATION

**Working:**
- ✅ Accept bid (closes task, rejects others)
- ✅ Reject bid (keeps task open)
- ✅ Notifications sent
- ✅ Task status updates

**Missing/TODO:**
- ⚠️ Timeout if payment not completed
- ⚠️ Allow asker to cancel "confirmed" task before payment
- ⚠️ Batch reject all bids at once
- ⚠️ UI for managing multiple bids

---

## RECURRING TASK HANDLING

For recurring tasks, the flow is different:

**Accept:**
- Doer selected specific sessions (e.g., 6 of 8)
- Those 6 sessions are "assigned" to this doer
- Other 2 sessions stay "open" for other doers
- Task does NOT close - stays "open"
- Multiple doers can be accepted (one per session set)

**Reject:**
- Doer's session selection is rejected
- All 8 sessions stay "open"
- Other doers can still bid/select
- Same notification flow

---

## DATABASE STATE CHANGES

### Accept Flow
```
BEFORE:
errands: {id:1, status:'open', accepted_bid_id:NULL}
bids: {id:A, status:'pending'}, {id:B, status:'pending'}, {id:C, status:'pending'}

AFTER:
errands: {id:1, status:'confirmed', accepted_bid_id:B}
bids: {id:A, status:'rejected'}, {id:B, status:'accepted'}, {id:C, status:'rejected'}
```

### Reject Flow
```
BEFORE:
errands: {id:1, status:'open', accepted_bid_id:NULL}
bids: {id:A, status:'pending'}, {id:B, status:'pending'}, {id:C, status:'pending'}

AFTER:
errands: {id:1, status:'open', accepted_bid_id:NULL}  ← Unchanged
bids: {id:A, status:'pending'}, {id:B, status:'pending'}, {id:C, status:'rejected'}  ← Only C changed
```
