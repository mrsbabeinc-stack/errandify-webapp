# Complete Dummy Payment Flow Guide

**Status**: ✅ Ready for End-to-End Testing

---

## Overview

The complete bidding and payment flow is now fully functional in dummy mode:
1. **Post Errand** - Asker posts errand (no payment required)
2. **Submit Bid** - Doer submits bid with custom amount
3. **Accept Bid** - Asker accepts bid → auto-creates & confirms dummy payment
4. **Complete Errand** - Doer marks as completed
5. **Rate Doer** - Asker rates doer (next phase)

**All payment processing is dummy - no real charges.**

---

## Complete End-to-End Test Flow

### Step 1: Asker Posts an Errand

**Browser A (Asker):**
1. Log in as Asker (or switch role to Asker)
2. Click "Post an Errand" (or Hana 🤖 button)
3. Use Hana or manual form:
   - Title: "Clean my apartment"
   - Category: "Cleaning & Laundry"
   - Location/Postal Code: "680433"
   - Budget: "$100"
   - Deadline: Pick a date
   - Time: "2:00 PM"
4. Click "Post Errand"
5. **See alert**: "✓ Errand posted successfully! Dummy payment confirmed."
6. Navigate to home
7. **Expected**: Errand appears in "My Errands"

### Step 2: Doer Browses and Submits Bid

**Browser B (Doer):**
1. Log in as Doer (or switch role to Doer)
2. Click "Browse ToHelp" or "Browse Errands"
3. Find the newly posted errand "Clean my apartment"
4. Click on errand detail
5. Click "Submit a Bid" button
6. **Modal opens** with:
   - Budget reference: "$100"
   - Bid amount field (pre-filled with $100)
   - Notes field (optional)
7. Edit bid amount to $80 (or keep $100)
8. Add note: "I have 5 years cleaning experience"
9. Click "Submit Bid"
10. **See alert**: "✓ Bid submitted for $80!"
11. Button changes to "✓ Bid Submitted"

### Step 3: Asker Reviews and Accepts Bid

**Browser A (Asker):**
1. View the posted errand detail
2. Scroll down to "Bids" section
3. **See incoming bid** with:
   - Doer name
   - Bid amount ($80)
   - Doer's note
   - "Accept" and "Reject" buttons
4. Click "Accept" button
5. **See alert**: "✓ Bid accepted! Payment confirmed and amount held in escrow."
6. Bids section updates:
   - Accepted bid shows status = "accepted"
   - Other bids (if any) show status = "rejected"

**What happens behind the scenes:**
- Dummy Stripe PaymentIntent created
- Errand status changed to "confirmed"
- $80 held in dummy escrow

### Step 4: Doer Marks Errand as Completed

**Browser B (Doer):**
1. View the errand detail
2. **See new button**: "✓ Mark as Completed" (green)
3. Click button
4. Confirmation dialog: "Mark this errand as completed?"
5. Click confirm
6. **See alert**: "✓ Errand marked as completed! Awaiting asker rating."
7. Button changes to show status:
   - "✓ Completed"
   - "Awaiting asker rating"

**What happens behind the scenes:**
- Errand status changed to "completed"
- Payment still held in escrow (awaiting rating)
- Doer awaits asker's 5-star rating

### Step 5: Asker Rates Doer (Next Phase)

**Browser A (Asker):**
> This feature is not yet implemented but the errand shows as "completed" and awaits rating.
> When rating system is added, asker will:
> 1. See a rating modal
> 2. Leave 1-5 star rating + comment
> 3. Confirm rating
> 4. Payment released to doer's Stripe Connect account
> 5. Errand marked as "closed"

---

## Quick Test Commands

### Test via API (if backend is running)

#### 1. Post an Errand
```bash
curl -X POST http://localhost:3000/api/errands \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean my apartment",
    "description": "2 bedroom apartment",
    "category": "cleaning-laundry",
    "location": "Singapore 680433",
    "budget": 100,
    "deadline": "2026-06-20T14:00:00Z"
  }'
```

#### 2. Submit a Bid
```bash
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer DOER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": 1,
    "amount": 80,
    "note": "5 years experience"
  }'
```

#### 3. View Bids
```bash
curl -X GET http://localhost:3000/api/bids/task/1 \
  -H "Authorization: Bearer ASKER_TOKEN"
```

#### 4. Accept a Bid
```bash
curl -X POST http://localhost:3000/api/bids/1/accept \
  -H "Authorization: Bearer ASKER_TOKEN"
```

#### 5. Complete Errand
```bash
curl -X POST http://localhost:3000/api/errands/1/complete \
  -H "Authorization: Bearer DOER_TOKEN"
```

---

## User Experience Highlights

### For Askers
✅ Post errand without payment setup  
✅ See real-time bid updates (refreshes every 3 seconds)  
✅ Accept/reject individual bids  
✅ Clear payment confirmation  
✅ Mark errand completed when doer finishes  

### For Doers
✅ Browse open errands  
✅ Submit custom bid amount with notes  
✅ See bid status ("Bid Submitted")  
✅ Mark errand as completed when done  
✅ Track completion status  

### For Both
✅ Floating Hana available on all pages  
✅ Clear success/error messages  
✅ Smooth status transitions  
✅ No payment friction (dummy mode)  

---

## Key Dummy Features

### Dummy Stripe Implementation
- ✅ Auto-creates payment method if none exists
- ✅ Generates realistic PaymentIntent IDs (`pi_xxx_xxx`)
- ✅ Generates client secrets (`pi_xxx_secret_xxx`)
- ✅ Manual capture flow (ready for real Stripe)
- ✅ Auto-confirms payment on accept
- ✅ Amounts properly converted to cents

### Dummy Payment Methods
```
Auto-created method:
- Brand: Visa
- Last 4: 4242
- Expiry: 12/2025
```

### Dummy Workflow
1. No payment setup needed
2. Accept bid → instant dummy payment
3. No card entry required
4. No failed payments
5. Ready to swap for real Stripe

---

## Status Codes & Transitions

### Errand Status Flow
```
open
  ↓ (when bid accepted)
confirmed
  ↓ (when doer marks complete)
completed
  ↓ (when asker rates doer)
closed [future]

If cancelled:
open → cancelled_by_asker
confirmed → cancelled_by_asker (with penalty)
```

### Bid Status Flow
```
pending
  ├→ accepted (1 per errand)
  └→ rejected (others when 1 accepted)
```

---

## Common Issues & Fixes

### Issue: "Bid Submitted" button not appearing
**Fix**: Clear browser cache, reload page

### Issue: Bids section not updating
**Fix**: Page refreshes bids every 3 seconds automatically, but you can also reload

### Issue: Accept button not working
**Fix**: Ensure you're logged in as the errand's asker

### Issue: "Mark as Completed" button not showing
**Fix**: 
1. Errand must be status = "confirmed"
2. Logged in as the doer who accepted the bid
3. Check browser console for any errors

### Issue: Payment alert not showing
**Fix**: Check that browser allows alerts (not blocked in settings)

---

## Next Steps (Future Phases)

### Phase 3.6: Real Stripe Integration
- [ ] Replace dummy PaymentIntent with real Stripe API
- [ ] Implement Stripe Connect for doer payouts
- [ ] Add card authentication/SCA flow
- [ ] Proper payment state management
- [ ] Webhook handling for payment updates

### Phase 3.7: Rating & Completion
- [ ] Implement star rating modal
- [ ] Rating submission UI
- [ ] Payment release to doer
- [ ] Doer earnings tracking
- [ ] Review history

### Phase 3.8: Improvements
- [ ] Hana AI bid suggestions
- [ ] Doer skill matching
- [ ] Trust score calculation
- [ ] Payment analytics
- [ ] Refund handling

---

## Testing Checklist

- [ ] **Errand Creation**
  - [ ] Post errand without payment setup
  - [ ] See confirmation alert
  - [ ] Errand appears in list
  - [ ] Prefilled data from Hana works

- [ ] **Bid Submission**
  - [ ] Submit bid as doer
  - [ ] Custom amount works
  - [ ] Notes field optional
  - [ ] See confirmation alert
  - [ ] Button shows "✓ Bid Submitted"

- [ ] **Bid Management**
  - [ ] Asker sees all bids
  - [ ] Bids refresh in real-time
  - [ ] Accept button works
  - [ ] Reject button works
  - [ ] Payment confirmation shows

- [ ] **Completion**
  - [ ] "Mark as Completed" button appears for doer
  - [ ] Completion confirmation works
  - [ ] Status updates correctly
  - [ ] Completion alert shows

- [ ] **Floating Hana**
  - [ ] Button visible on all pages
  - [ ] Opens/closes/minimizes
  - [ ] Prefills form correctly
  - [ ] Navigation works

- [ ] **Edge Cases**
  - [ ] Can't bid on own errand (403)
  - [ ] Can't accept bid if not asker (403)
  - [ ] Can't complete if not assigned doer (403)
  - [ ] Cancelled errand shows correct status

---

## Database State After Test

After running through the complete flow:

**Errands table:**
- 1 errand with status = "completed"
- accepted_bid_id = 1
- stripe_payment_intent_id = "pi_xxx_xxx"

**Bids table:**
- 1 bid with status = "accepted"
- doer_id = (doer user id)
- amount = 80

**Users table:**
- Doer has trust_score unchanged (rating system next)
- No penalty_owed (no cancellations)

---

## How to Start Testing

1. **Ensure backend is running** (`npm run dev` in backend folder)
2. **Ensure database is initialized** (run schema.sql)
3. **Ensure frontend is running** (`npm run dev` in frontend folder)
4. **Open two browser windows** (one for asker, one for doer)
5. **Log in as different users** (or use role toggle)
6. **Follow the 5-step flow above**

---

**Ready to test the complete bidding and payment flow! 🚀**
