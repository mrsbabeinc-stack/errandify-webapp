# Payment Escrow Verification & Integration

Detailed analysis of payment system and what needs to be done.

---

## CURRENT STATE

### What Exists ✅

```
Files:
- backend/src/routes/payment.ts (498 lines)
- backend/src/services/stripe.ts (with Stripe integration)

Endpoints:
✅ POST /api/payment/create-intent
   - Creates Stripe PaymentIntent
   - Amount held in "requires_confirmation" state
   - Returns: clientSecret, intentId

✅ POST /api/payment/confirm
   - Confirms PaymentIntent
   - Updates database: task_payments.status = 'completed'
   - Returns: success

✅ POST /api/payment/refund
   - Refunds payment (for disputes, cancellations)

✅ POST /api/payment/payout
   - Creates payout to doer account
   - Called after rating/approval

Database Table:
✅ task_payments (likely has: errand_id, status, stripe_intent_id, confirmed_at)
```

### The Current Flow

```
1. Asker posts job
2. Doer bids
3. Asker accepts bid
4. Doer completes job (photo upload)
5. Asker reviews completion

AT THIS POINT - PAYMENT NEEDED:

6. Asker approves completion
   → createPaymentIntent() called
   → Payment Intent created in "requires_confirmation" state
   → Amount held ($50)

7. Asker submits rating
   → Rating stored in database
   → Notification sent to doer
   
8. ??? NO CODE TO RELEASE PAYMENT ???
   → Should happen: Payment released to doer
   → Currently: ??? Unknown ???
```

---

## WHAT'S MISSING

### Missing: Rating-Triggered Payment Release

```
Location: ratings.ts (POST /api/ratings)

Current Code (Line 86-121):
- Submits rating ✅
- Awards EP ✅
- Sends notification ✅
- Updates user rating ✅

Missing Code:
- Release payment that was held in escrow ❌
- Should trigger: stripeService.releasePayout()
- Or: Create payout to doer account
- Or: Call payment release endpoint
```

### Missing: 48-Hour Dispute Window Logic

```
Current Notification Says:
"Payment releases in 24-48 hours if no dispute"

But Implementation:
- No 48-hour timer ❌
- No dispute check ❌
- No auto-release after 48h ❌

Options:
A) Release immediately on rating (SIMPLE)
B) Release on rating if no dispute within 48h (COMPLEX)
C) Release via cron job after 48h (COMPLEX)

RECOMMENDED: Option A (Release on rating immediately)
- Simpler implementation
- Faster for users
- Dispute can still refund
```

---

## WHAT TO DO

### OPTION 1: Release Payment Immediately on Rating (RECOMMENDED)

```
File: backend/src/routes/ratings.ts

Add after line 96 (after awardEp() call):

// Release payment to doer
try {
  // Find the payment record
  const paymentResult = await db.query(
    'SELECT stripe_intent_id FROM task_payments WHERE errand_id = $1',
    [taskId]
  );

  if (paymentResult.rows.length > 0) {
    const { stripe_intent_id } = paymentResult.rows[0];
    
    // Get doer's Stripe connected account
    const doerResult = await db.query(
      'SELECT stripe_account_id FROM users WHERE id = $1',
      [ratedUserId]
    );

    if (doerResult.rows.length > 0 && doerResult.rows[0].stripe_account_id) {
      // Create payout to doer
      await stripeService.createPayout(
        doerResult.rows[0].stripe_account_id,
        task.budget,
        taskId
      );

      // Update database
      await db.query(
        'UPDATE task_payments SET status = $1, released_at = NOW() WHERE errand_id = $2',
        ['released', taskId]
      );

      // Notify doer of payment release
      await createNotification(
        ratedUserId,
        'payment_released',
        '💰 Payment Released!',
        `Payment of SGD $${task.budget.toFixed(2)} released to your account. Arrives in 1-2 business days.`,
        null
      );
    }
  }
} catch (paymentErr) {
  console.error('Error releasing payment:', paymentErr);
  // Don't fail rating - payment can be released manually later
}
```

Advantages:
✓ Simple implementation
✓ User gets paid immediately after rating
✓ Good UX
✓ Dispute can still refund if needed

---

## STEP-BY-STEP IMPLEMENTATION

### Step 1: Update ratings.ts

Add payment release logic after EP awarding (after line 96).

Files:
- backend/src/routes/ratings.ts (add ~30 lines)

Time: 30 minutes

### Step 2: Verify Stripe Service Has createPayout()

Already exists! (stripe.ts lines 130+)

✅ stripeService.createPayout(stripeAccountId, amount, taskId)

### Step 3: Update Database Task Payments Table

Verify table has:
- errand_id (payment for which errand)
- status (pending, completed, released, refunded)
- stripe_intent_id (Stripe payment ID)
- amount (payment amount)
- released_at (when payment was released)
- created_at (when payment was created)

### Step 4: Test

- Post job ($50 budget)
- Complete job
- Rate doer
- Verify payment appears in doer's Stripe account

---

## ALTERNATIVE: 48-Hour Dispute Window

If you want users to dispute within 48h before payment releases:

```
Flow:
1. Job completed
2. Asker rates doer
3. Payment held for 48 hours
4. If dispute raised → payment held indefinitely
5. If no dispute after 48h → payment released automatically

Implementation:
- Add cron job to check task_payments table
- Find all with status = 'pending' where created_at > 48 hours ago
- Release those payments
- Notify doers

Complexity: HIGH
Time: 4-6 hours
NOT RECOMMENDED for MVP
```

---

## SUMMARY

**Current Problem:**
- Payment is created but never released
- User sees "Payment releases in 48h" but no code does this

**Solution:**
- Add payment release in ratings.ts
- Release immediately when asker rates (SIMPLE)
- Or: Create cron job for 48h auto-release (COMPLEX)

**Recommendation:**
Release on rating (Option 1) - Simple, good UX, fast for MVP

**Time to Fix:**
30 minutes to 1 hour

**Priority:** CRITICAL
This is blocking the payment flow from working.

---

## FILES TO MODIFY

1. `backend/src/routes/ratings.ts`
   - Add payment release logic (30 lines)
   - After line 96 (after EP awarding)

2. Optionally: `backend/src/routes/payment.ts`
   - Add endpoint for manual payment release (if needed)

---

## TESTING CHECKLIST

After implementing:

- [ ] Post job with budget
- [ ] Complete job
- [ ] Submit rating
- [ ] Verify doer receives payment notification
- [ ] Check Stripe dashboard for payout
- [ ] Verify task_payments table updated (status = 'released')
- [ ] Test dispute scenario (cancel should refund)

