# Quick Start Testing Guide (5 Minutes)

## Prerequisites
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173` (or similar)
- Database initialized with `schema.sql`
- Two browser tabs/windows (for asker and doer)

---

## 30-Second Overview

```
1. Asker posts errand (Hana or form)
2. Doer submits bid
3. Asker accepts bid → auto-payment
4. Doer marks complete
5. Done! ✓
```

---

## The 5-Minute Test

### **Browser 1 (ASKER) - 1 minute**

1. Login as Asker
2. Click "Post an Errand" or Hana 🤖 button
3. **Quick Fill** (use Hana or manual):
   - Title: "Clean apartment"
   - Category: "Cleaning & Laundry"
   - Budget: "100"
   - Any other fields (optional)
4. Click "Post"
5. ✓ See confirmation alert

### **Browser 2 (DOER) - 1.5 minutes**

1. Login as Doer (different user)
2. Click "Browse ToHelp" or "Browse Errands"
3. Find "Clean apartment" errand
4. Click on it
5. Click "Submit a Bid"
6. Enter: "$80" (or keep $100)
7. Add note: "5 years experience"
8. Click "Submit Bid"
9. ✓ See confirmation alert

### **Browser 1 (ASKER) - 1 minute**

1. Refresh errand page (or already viewing)
2. Scroll to "Bids" section
3. See doer's bid
4. Click "Accept"
5. ✓ See payment confirmation alert

### **Browser 2 (DOER) - 1.5 minutes**

1. View the errand (may need to refresh)
2. See "✓ Mark as Completed" button (green)
3. Click it
4. Confirm dialog
5. ✓ See completion alert

**Total Time: ~5 minutes**

---

## What You'll See

### Alerts/Confirmations
- ✓ Errand posted successfully! Dummy payment confirmed.
- ✓ Bid submitted for $80!
- ✓ Bid accepted! Payment confirmed and amount held in escrow.
- ✓ Errand marked as completed! Awaiting asker rating.

### UI Changes
- Button: "Submit a Bid" → "✓ Bid Submitted"
- Button: "✓ Mark as Completed" (doer only, when confirmed)
- Section: "Bids" appears for asker viewing their errand

---

## Alternative: Test via Floating Hana (2 minutes)

### Asker using Hana
1. See 🤖 button bottom-right
2. Click it
3. Type: "Clean my 2-bedroom apartment at 680433 on Saturday 2pm, 2 hours, $100 budget"
4. AI extracts all fields
5. Form pre-fills
6. Edit & post
7. ✓ Done

---

## Quick Checks

**Did it work?**
- ✓ No console errors
- ✓ Alerts appeared
- ✓ Buttons changed states
- ✓ Redirects worked

**If something failed:**
1. Check browser console (F12)
2. Check backend logs
3. Verify database connection
4. Try clearing cache & reload

---

## Key UI Elements

| Action | Button Text | Expected State |
|--------|------------|-----------------|
| Post errand | "Post" | Redirects to home |
| Submit bid (before) | "Submit a Bid" | Modal opens |
| Submit bid (after) | "✓ Bid Submitted" | Button disabled |
| Accept bid | "Accept" | Bid status shows "accepted" |
| Mark complete | "✓ Mark as Completed" | Status shows "Completed" |

---

## Files to Check if Errors

**Backend:**
- `backend/src/routes/errands.ts` - POST, GET, complete endpoint
- `backend/src/routes/bids.ts` - All bid endpoints
- `backend/src/routes/payment.ts` - Payment endpoints

**Frontend:**
- `frontend/src/pages/CreateErrandPage.tsx` - Form & submission
- `frontend/src/pages/ErrandDetailPage.tsx` - Bidding UI
- `frontend/src/components/FloatingHana.tsx` - Hana button

**Database:**
- Verify `bids` table exists
- Verify `errands` has `accepted_bid_id`, `stripe_payment_intent_id`

---

## Status Indicators

**Page Load:** ⏳ Loading... → ✓ Loaded  
**Form Submit:** ⏳ Posting... → ✓ Success / ❌ Error  
**Bid Submit:** ⏳ Submitting... → ✓ Bid Submitted  
**Payment:** 💳 Creating intent... → ✓ Confirmed  

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Bid button not showing | Ensure errand status is "open" |
| "Complete" button missing | Errand must be "confirmed" (bid accepted) |
| Bids section blank | Refresh page (updates every 3 sec anyway) |
| Payment not confirming | Check backend logs for errors |
| Can't post errand | Ensure title & category filled |

---

## One-Liner Tests (If Backend is Accessible)

```bash
# Post errand
curl -X POST http://localhost:3000/api/errands \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","category":"cleaning-laundry","budget":100}'

# Submit bid
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"task_id":1,"amount":80,"note":"test"}'

# Accept bid
curl -X POST http://localhost:3000/api/bids/1/accept \
  -H "Authorization: Bearer TOKEN"

# Complete errand
curl -X POST http://localhost:3000/api/errands/1/complete \
  -H "Authorization: Bearer TOKEN"
```

---

## Success Indicators

✅ Errand posted and visible in list  
✅ Bid submitted and shows in "Bids" section  
✅ Bid accepted with payment confirmation  
✅ Errand marked complete with status update  

**If all 4 ✅ appear → System is working perfectly!**

---

## Next Steps

- Read `DUMMY_PAYMENT_FLOW.md` for detailed flow
- Read `FULL_SYSTEM_READY.md` for complete overview
- Check `BIDDING_SYSTEM_GUIDE.md` for API details

---

**That's it! You're ready to test. Good luck! 🚀**
