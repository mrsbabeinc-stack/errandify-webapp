# 🧪 Errandify Testing Checklist
**Purpose**: Validate all core features before integrating SingPass & Stripe  
**Duration**: 60-90 minutes  
**Mode**: Demo accounts (sarah/john), dummy payments

---

## Setup (5 minutes)

### Start Services
```bash
# Terminal 1: Backend
cd backend && npm run dev
# Expected: "Server running on http://localhost:3000"

# Terminal 2: Frontend
cd frontend && npm run dev
# Expected: "VITE v4.x.x ready in Xs"
# Open: http://localhost:5173
```

### Demo Accounts
- **Asker**: Email: `sarah@example.com` (or use demo-login button)
- **Doer**: Email: `john@example.com` (or use demo-login button)
- **Password**: Any (demo mode doesn't validate)

---

## Test Modules

### ✅ Module 1: Authentication (5 min)

**Scenario A: Demo Login**
- [ ] Click "Demo: Login as Asker" → see Dashboard
- [ ] Verify bottom nav shows: Home, MyErrands, MyVillage, Chat, Profile
- [ ] Click Profile → can edit info
- [ ] Click Logout → back to Landing page

**Scenario B: Manual Signup**
- [ ] Go to Login → "Don't have account? Sign up"
- [ ] Fill: Name, Email, Mobile, Address
- [ ] Choose Role: Asker
- [ ] Submit → should see "Account created" message
- [ ] Auto-login to Dashboard

**Expected**: Both flows work, user data persists in localStorage

---

### ✅ Module 2: Profile Management (5 min)

**Scenario: Edit Profile**
- [ ] Go to Profile → "My Profile"
- [ ] Edit: Name, Bio, Avatar
- [ ] Click Save → shows "Profile updated"
- [ ] Refresh page → changes persist
- [ ] Check CHAS Card section exists (can select Blue/Green/None)

**Expected**: All fields save and persist across page reloads

---

### ✅ Module 3: Errand Creation (10 min)

**Scenario A: AI-Assisted Creation (Hana)**
- [ ] Click floating Hana icon (bottom-right)
- [ ] Say/type: "I need someone to walk my dog every morning"
- [ ] Hana responds and suggests category
- [ ] Follow Hana's questions (location, date, budget)
- [ ] Review suggested task
- [ ] Click "Post" → redirects to CreateErrandPage with prefilled data
- [ ] Verify all fields auto-filled (title, description, category, budget)
- [ ] Click "Post Errand" → shows success message

**Scenario B: Manual Form**
- [ ] Go to Home → Click "+" button OR go to `/create-errand`
- [ ] Fill: Title, Description, Category, Location, Budget ($25-150), Deadline
- [ ] Click "Post Errand" → success message, redirects to MyErrands
- [ ] Verify errand appears in list with status "Open"

**Expected**: Both paths work, errand appears in doer's browse list

---

### ✅ Module 4: Errand Browsing (5 min)

**Scenario: Doer Browse**
- [ ] Login as Doer (john)
- [ ] Click "Browse ToHelp" or go to `/browse`
- [ ] See list of open errands (from Module 3)
- [ ] Each errand card shows: Title, Budget, Location (masked), Status
- [ ] Click errand → see full details + "Submit a Bid" button

**Expected**: All errands visible, details accurate

---

### ✅ Module 5: Bidding System (10 min)

**Scenario A: Submit Bid (Doer)**
- [ ] From errand detail, click "Submit a Bid"
- [ ] Modal opens: Amount field (pre-filled with budget), Note field
- [ ] Edit amount (e.g., $20 instead of $25)
- [ ] Add note: "I can do this today!"
- [ ] Click "Submit Bid" → success message

**Scenario B: View & Accept Bid (Asker)**
- [ ] Login as Asker (sarah)
- [ ] Go to MyErrands → click the errand you posted
- [ ] Scroll down → see "Bids" section
- [ ] See doer's bid: Amount, Note, Status "Pending"
- [ ] Click "Accept" → shows "Bid accepted! Payment created"
- [ ] Errand status changes to "Confirmed"
- [ ] Notice: "Chat with Doer" button now appears

**Scenario C: Check Notification**
- [ ] Check notification icon (🔊 at top)
- [ ] Should show badge with count
- [ ] Click → see notification: "💰 New Bid - John bid $20 on your task!"
- [ ] Click notification → marks as read

**Expected**: 
- Bid submits successfully
- Asker sees real-time bid updates (polls every 3s)
- Acceptance works
- Notification system working

---

### ✅ Module 6: Chat System (10 min)

**Scenario A: Open Chat from Errand**
- [ ] On confirmed errand detail (Asker or Doer view)
- [ ] Click "Chat with Doer" or "Chat with Asker"
- [ ] TaskChatbox slides up from bottom
- [ ] See two tabs: "Team Chat" & "Ask Hana"

**Scenario B: Send Messages**
- [ ] Type message: "When can you start?"
- [ ] Click Send → message appears with your avatar
- [ ] Switch to other account (login as other user)
- [ ] Go to same errand → open chat
- [ ] Should see your previous message
- [ ] Type reply: "I can start tomorrow!"
- [ ] First account should see reply (may take 2-3 sec to poll)

**Scenario C: Chat Tab on BottomNav**
- [ ] Click "Chat" in bottom nav
- [ ] See list of all active conversations (confirmed errands)
- [ ] Each shows: Errand title, Other party name, Status badge
- [ ] Click "Open Chat" → TaskChatbox opens

**Expected**: 
- Messages persist
- Real-time polling works (2s updates)
- Chat tab shows all active tasks

---

### ✅ Module 7: Job Execution (10 min)

**Scenario: Mark as Completed**
- [ ] Login as Doer
- [ ] Go to MyErrands → open confirmed errand
- [ ] Look for "Job Execution" section
- [ ] Click "Start Job" (captures current status)
- [ ] Do some "work" (wait 10 seconds)
- [ ] Click "End Job & Upload Proof" 
- [ ] Upload photo (select any image from device)
- [ ] Click "Complete" → status changes to "Completed"

**Expected**: Job status changes, proof uploads (test locally with dummy file)

---

### ✅ Module 8: Reviews & Ratings (10 min)

**Scenario: Submit Review**
- [ ] Login as Asker
- [ ] Go to MyErrands → click completed errand
- [ ] Should see "Rate this doer" section OR notification to review
- [ ] Go to `/review/{errandId}` directly
- [ ] Fill rating: 1-5 stars (click stars to select)
- [ ] Add comment: "Great work, very reliable!"
- [ ] Click "Submit Review" → shows success

**Scenario: Verify Rating Saved**
- [ ] Go to Doer's Profile
- [ ] Check ratings section shows your review
- [ ] Rating count increased

**Expected**: Review submits, appears on doer's profile, payment can be released

---

### ✅ Module 9: Hana AI Assistant (15 min)

**Scenario A: English Mode**
- [ ] Click floating Hana
- [ ] Ask: "What are errand categories available?"
- [ ] Hana responds with list (in English)
- [ ] Verify: No emoticons (😀 ❌), proper English, professional tone

**Scenario B: Chinese Mode**
- [ ] Click Hana settings (gear icon)
- [ ] Select language: 中文 (Chinese)
- [ ] Ask: "我想要找一個清潔服務" (I want to find cleaning service)
- [ ] Hana responds in Chinese (Simplified or Traditional)
- [ ] Verify: Response is Chinese, female voice (click speaker icon)

**Scenario C: Cantonese Mode**
- [ ] Change language to 粵語 (Cantonese)
- [ ] Ask: "我想搵人幫我走狗" (I want to find dog walking help)
- [ ] Hana responds in Cantonese
- [ ] Verify: Cantonese response, female voice

**Scenario D: Task Extraction**
- [ ] Say: "我需要人幫我打掃3房公寓，星期六下午2點到4點，預算50元"
- [ ] Hana should extract: Category, Date, Time, Budget
- [ ] Should ask follow-up questions if unclear
- [ ] Should offer to create errand

**Expected**: 
- [ ] Responses are professional (no emojis/emoticons)
- [ ] All 3 languages work
- [ ] Voice is female (not male)
- [ ] Task extraction is accurate

---

### ✅ Module 10: Notifications (5 min)

**Scenario A: Real-time Notifications**
- [ ] Login as Asker, open errand detail
- [ ] Have Doer submit a bid (from another browser/device)
- [ ] Check notification icon badge → should show "1"
- [ ] Click icon → see "New Bid" notification
- [ ] Mark as read → badge disappears

**Scenario B: Bid Status Notifications**
- [ ] As Asker, accept a bid
- [ ] Check Doer's notifications (login as Doer)
- [ ] Should see: "🎉 Bid Accepted! - You're hired for..."
- [ ] Reject another bid
- [ ] Should see: "😕 Bid Not Selected - Your bid wasn't chosen..."

**Expected**: Notifications flow through system correctly

---

### ✅ Module 11: Error Handling (5 min)

**Scenario A: Validation Errors**
- [ ] Try to create errand with empty title → error message
- [ ] Try to submit bid with 0 amount → error message
- [ ] Try to access errand without auth → redirects to login

**Scenario B: Edge Cases**
- [ ] Create 2 errands with same title → should allow
- [ ] Submit 2 bids from same doer on same task → should allow resubmit
- [ ] Try to bid on your own errand → error: "Cannot bid on your own task"

**Expected**: Clear error messages, no app crashes

---

## Database Verification

After testing, verify data persisted:

```bash
psql -U postgres -d errandify

-- Check users created
SELECT display_name, role FROM users LIMIT 10;

-- Check errands posted
SELECT title, status, category FROM errands LIMIT 10;

-- Check bids submitted
SELECT * FROM bids LIMIT 10;

-- Check reviews submitted
SELECT rating, comment FROM reviews LIMIT 5;

-- Check notifications created
SELECT title, body, read FROM notifications LIMIT 10;
```

---

## Test Results Summary

| Module | Status | Notes |
|--------|--------|-------|
| Authentication | ⬜ | |
| Profile | ⬜ | |
| Errand Creation | ⬜ | |
| Errand Browsing | ⬜ | |
| Bidding | ⬜ | |
| Chat | ⬜ | |
| Job Execution | ⬜ | |
| Reviews | ⬜ | |
| Hana AI | ⬜ | |
| Notifications | ⬜ | |
| Error Handling | ⬜ | |

**Overall Status**: ⬜ Pending / ⏳ In Progress / ✅ Complete

---

## Issues Found During Testing

### Critical (Blocks Deployment)
- [ ] 

### Major (Needs Fix)
- [ ] 

### Minor (Can Fix Later)
- [ ] 

---

## Next Steps After Testing

1. ✅ Fix any identified issues
2. ⏳ Integrate SingPass authentication
3. ⏳ Integrate real Stripe payments
4. ⏳ Deploy to staging environment
5. ⏳ User acceptance testing
6. ⏳ Production deployment

---

**Last Updated**: 2026-06-18  
**Prepared By**: Claude Code  
**Status**: Ready for Testing 🚀
