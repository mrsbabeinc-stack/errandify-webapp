# Complete Feature Testing Guide - Errandify Platform

**Date**: 2026-06-18  
**Status**: ✅ READY TO TEST  
**Estimated Time**: 60-90 minutes for full feature test

---

## Pre-Test Setup (10 minutes)

### Start Backend
```bash
cd /Users/celestia/Claude\ code/260616\ Errandify\ WebApp/backend
npm install  # If first time
npm run dev
```

**Expected Output:**
```
Errandify API running on port 3000
Environment: development
```

### Start Frontend (New Terminal)
```bash
cd /Users/celestia/Claude\ code/260616\ Errandify\ WebApp/frontend
npm install  # If first time
npm run dev
```

**Expected Output:**
```
VITE v4.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Open Browser
- Go to: **http://localhost:5173**

---

## Test 1: Authentication (5 min)

### Register Asker User
1. Click "Login"
2. Click "Create Account"
3. Fill:
   - Email: `test.asker@example.com`
   - Password: `Test@123456`
   - Role: **Asker**
4. Accept Terms
5. Click "Sign Up"

**Verify:**
- ✅ Account created
- ✅ Logged in automatically
- ✅ Redirected to home

### Check JWT Token
Open browser console (F12) and run:
```javascript
localStorage.getItem('token')   // Should show JWT
localStorage.getItem('user')    // Should show user object
```

**Verify:** Both show values

---

## Test 2: Profile Management (5 min)

### View Profile
1. Click Profile icon (top-right)
2. Click "MyProfile"
3. Verify displays:
   - User name
   - Verified badge
   - Stats (Errands Posted, Completed, etc.)

**Verify:** Profile page loads correctly

### CHAS Card Selection
1. Scroll to "Personal Information"
2. Find "CHAS Card Status"
3. Select: **🟦 Blue Card**
4. Click Save (if button exists)
5. Refresh page (F5)

**Verify:**
- ✅ Blue Card selected
- ✅ Shows "25% discount"
- ✅ Persists after refresh

---

## Test 3: Create Errand with AI (10 min)

### Post New Errand
1. Click "+ New Errand"
2. Fill form:
   ```
   Title: "Iron my clothes for weekend"
   Description: "Need someone to iron 20 shirts and 5 pants"
   Category: "Cleaning & Laundry"
   Budget: "50"
   Deadline: "2026-06-25"
   ```

**Verify:**
- ✅ AI suggests category
- ✅ AI suggests description improvement
- ✅ Form validates
- ✅ No title corruption ("Iron" not changed to "Ir.")

3. Click "Post Errand"

**Verify:** Errand created successfully

### Verify in Database
```bash
psql -U postgres -d errandify

SELECT id, title, category, budget, status 
FROM errands 
WHERE title LIKE '%iron%' 
ORDER BY created_at DESC LIMIT 1;
```

**Expected:** Shows errand with correct data

---

## Test 4: Register Doer & Browse (5 min)

### Logout & Register Doer
1. Click Profile → Logout
2. Click Login → Create Account
3. Fill:
   - Email: `test.doer@example.com`
   - Password: `Test@123456`
   - Role: **Doer**
4. Sign Up

### Browse Errands
1. Look for "Browse Errands" or similar
2. Should see "Iron my clothes for weekend"
3. Click to view details

**Verify:**
- ✅ Errand list loads
- ✅ Can see asker's errand
- ✅ Details display correctly

---

## Test 5: Bidding System (10 min)

### Submit Bid
1. Click "Accept This Errand" button
2. Fill bid form:
   - Bid Amount: `45`
   - Note: "I'm professional and fast"
3. Click "Submit Bid"

**Verify:**
- ✅ Bid form validates
- ✅ Bid submits successfully
- ✅ Confirmation message

### Verify Bid in Database
```bash
psql -U postgres -d errandify

SELECT id, task_id, doer_id, amount, status 
FROM bids ORDER BY created_at DESC LIMIT 1;
```

**Expected:** Bid shows with status "pending"

---

## Test 6: Stripe Payment (15 min)

### Accept Bid as Asker
1. Logout & login as Asker:
   - Email: `test.asker@example.com`
   - Password: `Test@123456`

2. Go to "My Errands"
3. Click on errand
4. Scroll to "Bids"
5. Click "Accept Bid"

**Verify:** Stripe payment dialog appears

### Enter Test Payment
Stripe form:
- Card: `4242 4242 4242 4242`
- Expiry: `12/25`
- CVC: `123`
- ZIP: `12345`

Click "Pay $45.00"

**Verify:**
- ✅ Payment processes
- ✅ Success message
- ✅ Bid status → "accepted"

### Check Stripe Dashboard
Go to: https://dashboard.stripe.com/test/payments

**Verify:**
- ✅ Payment shows as "Succeeded"
- ✅ Amount: $45.00

---

## Test 7: Hana AI (15 min)

### English Test
1. Look for Hana floating button (bottom-right)
2. Click button
3. Select "🇬🇧 English"
4. Type: "How do I find someone to help with housework?"
5. Press Enter

**Verify:**
- ✅ Hana responds (< 3 sec)
- ✅ Response is helpful
- ✅ Voice plays automatically
- ✅ Voice is FEMALE (Joanna)
- ✅ Sounds natural (NOT robotic)
- ✅ NO emoticons in text

### Chinese Test
1. Select "🇨🇳 中文 (帮帮乐)"
2. Type: "我怎样发布帮帮求助?"
3. Press Enter

**Verify:**
- ✅ Responds in Chinese (NOT English)
- ✅ Mentions "帮帮乐"
- ✅ Voice is FEMALE (Siqi)
- ✅ Sounds warm (NOT male)
- ✅ NO emoticons

### Cantonese Test
1. Select "🇭🇰 粵語 (廣東話)"
2. Type: "我點樣發布幫幫求助?"
3. Press Enter

**Verify:**
- ✅ Responds in Cantonese (NOT Mandarin)
- ✅ Uses proper Cantonese grammar
- ✅ Voice is FEMALE (Hui)
- ✅ Warm and natural
- ✅ NO emoticons

---

## Test 8: Real-Time Messaging (10 min)

### Send Message as Asker
1. As Asker, go to accepted errand
2. Click "Message"
3. Type: "When can you start?"
4. Press Send

**Verify:** Message sent immediately

### Reply as Doer
1. Logout & login as Doer
2. Go to same errand
3. Click "Messages"
4. Should see asker's message
5. Type reply: "I can start tomorrow at 2 PM"
6. Press Send

**Verify:**
- ✅ Both messages visible
- ✅ Chat history shows
- ✅ Real-time updates work

---

## Test 9: CHAS Card Full Test (10 min)

### Blue Card
1. As Doer, go to Profile
2. Select "🟦 Blue Card"
3. Save

**Verify:**
- ✅ Shows "Monthly household income ≤ $1,900"
- ✅ Shows "25% discount"

### Green Card
1. Change to "🟩 Green Card"
2. Save

**Verify:**
- ✅ Shows "Monthly household income ≤ $3,900"
- ✅ Shows "15% discount"

### No Card
1. Change to "⚪ No Card"
2. Save

**Verify:**
- ✅ Shows "Not eligible"

---

## Test 10: Reviews & Ratings (10 min)

### Mark Completed
1. As Doer, go to errand
2. Click "Mark as Completed"
3. Confirm

**Verify:** Status changes to "completed"

### Submit Review as Asker
1. Logout & login as Asker
2. Find errand
3. Click "Submit Review"
   - Or go to: `http://localhost:5173/review/[errandId]`

4. Select: ⭐⭐⭐⭐⭐ (5 stars)
5. Comment: "Excellent work!"
6. Click "Submit Review"

**Verify:**
- ✅ Review submits
- ✅ Redirects
- ✅ Doer profile shows ⭐ 5.0

### Check in Database
```bash
psql -U postgres -d errandify

SELECT id, rating, comment FROM reviews ORDER BY created_at DESC LIMIT 1;
```

**Expected:** Review shows with 5 stars

---

## Test 11: Error Cases (10 min)

### Duplicate Errand
1. Create same errand twice (within 24 hours)
2. Should show error: "Similar errand posted recently"

**Verify:** Duplicate prevention works

### Invalid Payment Card
1. Try to accept bid with: `4000 0000 0000 0002` (decline card)
2. Should show error

**Verify:** Decline handled gracefully

### Unauthorized Access
1. Logout
2. Try to access: `http://localhost:5173/my-errands`

**Verify:** Redirected to login

---

## All Tests Completed Checklist

- [ ] Test 1: Authentication (Register, Login, Logout)
- [ ] Test 2: Profile (View, Edit, CHAS Card)
- [ ] Test 3: Create Errand (AI suggestions, AI accuracy)
- [ ] Test 4: Browse Errands (Find, View)
- [ ] Test 5: Bidding (Submit, List)
- [ ] Test 6: Stripe Payment (Accept, Charge, Dashboard)
- [ ] Test 7: Hana AI (English, Chinese, Cantonese)
- [ ] Test 8: Messaging (Send, Reply, Real-time)
- [ ] Test 9: CHAS Cards (Blue, Green, None)
- [ ] Test 10: Reviews (Submit, Display)
- [ ] Test 11: Error Handling (Duplicates, Payments, Auth)

---

## Database Verification

After all tests, run:
```bash
psql -U postgres -d errandify

-- Count all entities
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM errands) as errands,
  (SELECT COUNT(*) FROM bids) as bids,
  (SELECT COUNT(*) FROM reviews) as reviews,
  (SELECT COUNT(*) FROM messages) as messages;
```

**Expected:** All > 0 (at least 1 of each type)

---

## Success Criteria

✅ **Platform PASSES when:**

1. Backend runs without errors
2. Frontend loads
3. Can register & login
4. Can post errand with AI
5. Can submit bid
6. Can accept bid & charge Stripe card
7. Can chat with Hana (3 languages)
8. Can select CHAS card
9. Can message other user
10. Can submit review
11. All data persists in database
12. No console errors
13. No backend errors

---

## If Tests FAIL

### Backend Won't Start
```bash
lsof -i :3000  # Check port
env | grep DATABASE_URL  # Check DB connection
```

### Frontend Won't Load
```bash
lsof -i :5173  # Check port
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Hana Not Responding
```bash
echo $QWEN_API_KEY  # Check API key
# Check backend logs for errors
```

### Payment Fails
- Use correct test card: `4242 4242 4242 4242`
- Check STRIPE_SECRET_KEY starts with `sk_test_`

---

✅ **ALL TESTS COMPLETE!**

If all checkboxes are checked, platform is ready for:
- ✅ Beta deployment
- ✅ 50-100 user testing
- ✅ LEAP East pitch

**Total Time**: ~90 minutes  
**Total Tests**: 11 major features
