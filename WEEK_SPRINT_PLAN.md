# Week Sprint Plan: Complete Task Flow + Notifications (Today through Sunday)

Realistic breakdown of what's achievable in 6-7 days with focused effort.

---

## PART 1: WHAT YOU SAID YOU WANT

```
Timeline: Today (Thursday) → Sunday (6-7 days)

Objectives:
1. Complete WHOLE task flow with notifications
2. Review System (designed, not built, 2 weeks)
3. Vulnerable User Protection (designed, not built, 2 weeks)
4. Payment Flow (verify + complete, 1 week)
5. Notification System (partially built, 3 weeks)
6. Errand Ecosystem (partially built, 1 week)

Reality Check: This is 8 weeks of work in 1 week.
That's not possible with quality.

Let me show you what IS possible...
```

---

## PART 2: BRUTAL PRIORITIZATION (What Actually Fits)

### If You Work ~10 Hours/Day (60 hours total)

```
CAN COMPLETE THIS WEEK (Realistic):
═════════════════════════════════

1. ✓ Photo Upload Component (JobCompletion.tsx)
   - File picker
   - Preview grid
   - Upload to Alibaba OSS
   - Success message
   Time: 2 days (16 hours)
   Why: Unblocks job completion phase

2. ✓ Complete Notification System (Phase 1)
   - NotificationBell component
   - Database tables (migrate if not done)
   - API endpoints (POST/GET/DELETE)
   - Toast + Bell notifications working
   - Email service setup (SendGrid/NodeMailer)
   Time: 2.5 days (20 hours)
   Why: Core feature, partially done already

3. ✓ Payment Flow Verification & Fix
   - Verify escrow holding (don't auto-release)
   - Rating-triggered release logic
   - Dispute payment holding
   - Basic payment tests
   Time: 1.5 days (12 hours)
   Why: Critical, mostly backend logic

4. ✓ Review System Foundation (Phase 1 - Basic)
   - 5-star rating UI component
   - Written review textarea
   - Basic database storage
   - Post rating → unlock payment
   Time: 2 days (16 hours)
   Why: Enables rating flow, fraud detection can wait

TOTAL: 7.5 days = 64 hours
(Feasible if you work focused, 9-10 hours/day)

Result: Task flow WORKS end-to-end
- Post → Bid → Accept → Work → Complete (photos) → Rate → Payment
- Notifications working for critical moments
- Basic safeguards in place


CANNOT COMPLETE THIS WEEK (Not Realistic):
═════════════════════════════════════════

✗ Review System AI Moderation
  (Fraud detection, fair rating detection, appeals)
  Time: 1 week (blocked until basic review works)
  Push to: Next week (Week 2)

✗ Vulnerable User Protection
  (8 languages, AI detection, specialized UI)
  Time: 2 weeks (too large)
  Push to: Week 3-4

✗ Complete Notification System (Phase 2)
  (Daily digest, email scheduling, all triggers)
  Time: 1 week (blocking priority above)
  Push to: Week 2
```

---

## PART 3: THIS WEEK'S SPRINT (Day-by-Day)

### Thursday (Today) - 6-8 hours

**Priority 1: Setup**
```
□ Create Alibaba OSS bucket
  - Account setup
  - Get credentials
  - Configure CORS
  Time: 2 hours

□ Setup environment variables
  - Add ALIBABA_* to backend/.env
  - Test connection
  Time: 1 hour

□ Create ossService.ts
  - generateSignedUrl()
  - uploadFile()
  - getFileUrl()
  Code: 150 lines
  Time: 2-3 hours

Total: 5-6 hours
Remaining: 1-2 hours for getting ahead

CHECKPOINT: Backend can generate signed URLs ✓
```

### Friday - 10 hours

**Priority 2: Photo Upload Frontend + Notifications Start**
```
□ Build JobCompletion.tsx
  - File input + preview grid
  - Upload progress bar
  - Error handling
  - Integration with backend
  Code: 400 lines
  Time: 5-6 hours

□ Integrate JobCompletion into ErrandDetailPage
  - Add "Complete Job" button
  - Show modal on click
  - Handle success/error callbacks
  Time: 2 hours

□ Test photo upload end-to-end
  - Single photo upload
  - Multiple photos
  - Error cases
  Time: 2 hours

□ START: NotificationBell component
  - Basic skeleton
  - Bell icon + dropdown
  - Show unread count
  Code: 150 lines
  Time: 2 hours

Total: 11-12 hours
(Work 10-11 hours Friday)

CHECKPOINT: Doers can complete jobs with photos ✓
CHECKPOINT: Notification bell visible (basic) ✓
```

### Saturday - 10 hours

**Priority 3: Notifications Complete + Payment Fix**
```
□ Complete NotificationBell component
  - Click to open dropdown
  - Show recent notifications
  - Mark as read
  - Link to notification preferences
  Code: 200 lines
  Time: 2-3 hours

□ Add notification API endpoints
  - POST /api/notifications
  - GET /api/notifications
  - PUT /api/notifications/:id/read
  Code: 100 lines
  Time: 2 hours

□ Wire up notification triggers
  - On job completion: create notification
  - On bid acceptance: create notification
  - On rating submitted: create notification
  - On payment released: create notification
  Time: 2 hours

□ Test notification flow
  - Complete job → notification appears
  - Accept bid → notification appears
  - Submit rating → notification appears
  Time: 2 hours

□ Payment Flow Verification
  - Check escrow logic
  - Verify rating-triggered release
  - Test dispute holding
  Code: ~100 lines (mostly verification)
  Time: 2-3 hours

Total: 10-11 hours

CHECKPOINT: Notifications working for key moments ✓
CHECKPOINT: Payment logic verified/fixed ✓
```

### Sunday - 8-10 hours

**Priority 4: Review System Foundation**
```
□ Build ReviewForm component
  - 5-star rating input (interactive)
  - Written review textarea (max 500 chars)
  - Submit button
  Code: 200 lines
  Time: 2-3 hours

□ Create API endpoints
  - POST /api/ratings (submit review)
  - GET /api/reviews/:userId (get reviews)
  Code: 100 lines
  Time: 2 hours

□ Database work (if not done)
  - Verify user_reviews table exists
  - Add indexes if needed
  Time: 1 hour

□ Wire into ErrandDetailPage
  - Show ReviewForm after job completion
  - Show submitted reviews
  - Display rating stats
  Time: 2 hours

□ Testing
  - Submit rating
  - View ratings
  - Verify in database
  - Test error cases
  Time: 2 hours

□ OPTIONAL: Start counter-review
  - Allow doer to respond to bad reviews
  - 100 lines of code
  - Only if time permits
  Time: 1-2 hours

Total: 10-11 hours

CHECKPOINT: Can submit ratings ✓
CHECKPOINT: Ratings display on profile ✓
CHECKPOINT: Payment can be released after rating ✓
```

---

## PART 4: REALISTIC OUTCOME BY SUNDAY

### ✓ COMPLETE (Task Flow Working)

```
PHASE 1: POSTING ✓ Already done
PHASE 2: BIDDING ✓ Already done
PHASE 3: ACCEPTANCE ✓ Already done
PHASE 4: IN PROGRESS ✓ Already done
PHASE 5: COMPLETION ✓ NOW DONE
  └─ Photo upload working
  └─ Alibaba OSS integration complete
  └─ Photos stored with job

PHASE 6: RATING ✓ NOW DONE
  └─ 5-star rating interface working
  └─ Written reviews working
  └─ Submit → store in database
  └─ Display ratings on profile

PHASE 7: PAYMENT ✓ NOW DONE
  └─ Payment held (escrow)
  └─ Released when rating submitted
  └─ Dispute holding works

NOTIFICATIONS ✓ PHASE 1 DONE
  └─ Bell icon visible (header)
  └─ Shows recent notifications
  └─ Dropdown menu working
  └─ Mark as read
  └─ Notifications for: bid placed, accepted, job started, completed, rated

ACTIVITY LOGGING ✓ Already done
  └─ Tracks all actions
  └─ Timeline visible

STATUS CARDS ✓ Already done
  └─ Shows progress

OVERALL: ✓ TASK FLOW COMPLETE & WORKING
```

### ⚠️ PARTIAL (Phase 2, Can Do Next Week)

```
NOTIFICATIONS (Phase 2) ⚠️ Deferred
  └─ Email notifications (designed, not wired)
  └─ Daily digest scheduler (designed, not built)
  └─ All notification types (partial)
  Time to complete: 1 more week

REVIEW SYSTEM (Phase 1 Only) ⚠️ Partial
  └─ Basic rating ✓ Done
  └─ Display reviews ✓ Done
  └─ Counter-reviews ⚠️ Maybe by Sunday
  └─ AI Moderation ❌ Deferred (next week)
  └─ Fraud detection ❌ Deferred (next week)
  └─ Appeals system ❌ Deferred (next week)
```

### ❌ NOT BUILT (Defer to Week 2+)

```
VULNERABLE USER PROTECTION ❌
  - 8 languages
  - AI safety detection
  - Specialized UI
  - 2 weeks → Week 3-4

REVIEW SYSTEM AI ❌
  - Fraud detection
  - Fair rating detection
  - Protective language detection
  - 1 week → Week 2
```

---

## PART 5: DAILY STANDUP CHECKLIST

### Thursday (Today)
```
Morning:
□ Create Alibaba account + bucket
□ Get credentials
□ Setup environment variables

Afternoon:
□ Code ossService.ts
□ Test signed URL generation
□ Verify Alibaba connection working

End of day: "Alibaba integration ready"
```

### Friday
```
Morning:
□ Code JobCompletion.tsx component
□ File picker working
□ Photo preview grid working

Afternoon:
□ Upload to Alibaba
□ Progress bar working
□ Error handling
□ Integrate into ErrandDetailPage

Evening:
□ Start NotificationBell component
□ Bell icon appears

End of day: "Doers can complete jobs with photos"
```

### Saturday
```
Morning:
□ Complete NotificationBell component
□ Dropdown menu working
□ Show notifications

Afternoon:
□ Wire API endpoints
□ Create notification on actions
□ Test notifications showing

Evening:
□ Fix payment flow logic
□ Test escrow holding
□ Test rating release

End of day: "Notifications working, payment verified"
```

### Sunday
```
Morning:
□ Code ReviewForm component
□ 5-star rating UI
□ Written review textarea

Afternoon:
□ Create API endpoints
□ Database work (verify tables)
□ Wire into ErrandDetailPage

Evening:
□ Test rating submission
□ Test display on profile
□ Test payment release after rating
□ Optional: counter-reviews

End of day: "Complete task flow working!"
```

---

## PART 6: TIME ALLOCATION

```
Total Available: 60 hours (10 hrs/day × 6 days)

Allocation:
Alibaba OSS Setup:        5 hours  (8%)
Photo Upload (Frontend):  16 hours (27%)
Photo Upload (Integrate): 2 hours  (3%)
Testing Photo Upload:     4 hours  (7%)
Notifications (Backend):  6 hours  (10%)
Notifications (Frontend): 8 hours  (13%)
Payment Flow Fix:         5 hours  (8%)
Review System:            10 hours (17%)
Testing:                  4 hours  (7%)

TOTAL: 60 hours ✓
```

---

## PART 7: WHAT SUCCESS LOOKS LIKE SUNDAY

### End-to-End Flow (You Can Demo)

```
1. USER POSTS JOB ✓
   "I need apartment cleaned"
   → Job created with ID ER26-CL-ABC123

2. DOER BIDS ✓
   "I can do it for $50"
   → Bid submitted
   → Asker gets notification

3. ASKER ACCEPTS ✓
   "Accept Sarah's bid"
   → Bid accepted
   → Doer gets notification
   → Status: Confirmed

4. DOER STARTS ✓
   "Start Work"
   → Status: In Progress
   → Timer starts
   → Asker gets notification

5. DOER COMPLETES (NEW!) ✓
   "Upload Photos"
   → File picker opens
   → Doer selects 3 photos
   → Shows preview
   → Photos upload to Alibaba OSS
   → Status: Completed (unconfirmed)
   → Asker gets notification

6. ASKER RATES (NEW!) ✓
   "Rate Sarah"
   → 5-star rating shown
   → "Great job!" written
   → Rating submitted
   → Status: Ready for Payment
   → Payment released

7. PAYMENT RELEASED ✓
   "$50 transferred to Sarah"
   → Doer gets notification
   → Job complete

FULL LOOP: Post → Bid → Accept → Work → Complete → Rate → Pay → Done
Timeline: 1-2 hours end-to-end
Notifications: Shows at each key step
Photos: Stored + visible to asker
```

---

## PART 8: RISK MITIGATION

### If You Fall Behind

```
PRIORITY ORDER (Cut if needed):

Must Keep (Non-negotiable):
1. Photo upload (JobCompletion.tsx) - 1 week blocked without this
2. Payment flow fix - Can't launch without payment working
3. Basic rating - Can't release payment without rating

Can Defer:
- Counter-reviews (do Monday if needed)
- Email notifications (do Week 2)
- Full notification types (partial is OK)
- Vulnerable user protection (definitely Week 3+)

Cutting Strategy:
- Saturday: If behind 5+ hours → Skip email setup, just focus on bell
- Sunday: If behind 10+ hours → Skip counter-reviews, do basic review only
```

### Quality vs Speed Tradeoff

```
SPEED APPROACH (Get it done):
- Write tests as you go (not after)
- Test one feature per day
- Deploy incremental (Friday → photos work)
- Accept MVP quality (good enough)

NOT RUSHING APPROACH (Proper quality):
- Full test coverage
- Edge case handling
- Deep refactoring
- Perfect code
→ This takes 3 weeks, not 1 week

RECOMMENDATION: SPEED
You need working demo by Sunday.
Perfect code can come Week 2.
```

---

## PART 9: DEPENDENCIES & BLOCKERS

### What's Already Done (Don't Redo)

```
✓ Errand posting (Hana AI working)
✓ Bidding system (fully functional)
✓ Bid acceptance (working)
✓ Job start (timer working)
✓ Chat system (working)
✓ Activity logging (working)
✓ Status cards (UI component done)
✓ Timeline (UI component done)
✓ Payment endpoints (exist, need fix)
✓ Rating endpoints (exist, need wire)
✓ Notification backend (partially done)
✓ Toast notification component (done)

Don't rebuild these. Just wire them together.
```

### What You Must Build New

```
🟢 New Components:
- JobCompletion.tsx (photo upload UI)
- ReviewForm.tsx (rating UI)
- NotificationBell.tsx (notification UI)

🟡 New Services:
- ossService.ts (Alibaba wrapper)

🟡 New Routes:
- uploads.ts (sign-url, verify)

🟡 New Database:
- Verify user_reviews table exists
- Verify task_photos table exists
- Verify user_notifications exists

🟡 New Wiring:
- Connect notification triggers
- Connect payment logic
- Connect rating to payment
```

---

## PART 10: SUCCESS CRITERIA BY SUNDAY

### Absolute Must-Have (Core Loop Works)

```
✓ Doer can upload photos (Alibaba stores them)
✓ Asker can see photos
✓ Asker can rate
✓ Rating triggers payment release
✓ Notifications show at key moments
✓ Can demo full flow: Post → Bid → Work → Photo → Rate → Pay
```

### Nice-to-Have (Polish)

```
⚠️ Email notifications (can be Monday)
⚠️ All notification types (can be partial)
⚠️ Counter-reviews (can be Monday)
⚠️ Payment UI polish (works, might be ugly)
```

### Don't Even Try (Multi-Week Efforts)

```
❌ AI Fraud detection
❌ Fair rating detection
❌ Vulnerable user protection
❌ Appeals system
❌ Dispute system
```

---

## SUMMARY: YOUR WEEK PLAN

```
6-7 days of focused work
10 hours/day (60 hours total)

OUTCOMES:
✓ Photo upload to Alibaba working
✓ Job completion flow working
✓ Rating system basic working
✓ Notifications showing (basic)
✓ Payment flow verified/fixed
✓ FULL TASK LOOP WORKS END-TO-END

You can demo:
- Post job → bid → accept → work → upload photos → rate → payment

This is REALISTIC and ACHIEVABLE.

NEXT WEEK:
- Complete notifications (Phase 2, email + digest)
- Add review AI (moderation, fraud detection)
- Polish UI
- Stress test

Good luck! Go build! 🚀
```

---

## TECHNICAL QUICK REFERENCE

### Files to Create This Week

```
Backend:
□ backend/src/services/ossService.ts (150 lines)
□ backend/src/routes/uploads.ts (100 lines)

Frontend:
□ frontend/src/components/JobCompletion.tsx (400 lines)
□ frontend/src/components/ReviewForm.tsx (250 lines)
□ frontend/src/components/NotificationBell.tsx (200 lines)

Environment:
□ Update backend/.env (Alibaba credentials)

Database:
□ Verify migrations exist (user_reviews, task_photos, user_notifications)
```

### Files to Modify This Week

```
Backend:
- backend/src/index.ts (add upload routes)
- backend/src/routes/taskExecution.ts (add notification trigger)
- backend/src/routes/ratings.ts (wire up)
- backend/src/routes/payment.ts (fix escrow logic)

Frontend:
- frontend/src/pages/ErrandDetailPage.tsx (add JobCompletion)
- frontend/src/components/Layout.tsx (add NotificationBell)
- frontend/src/pages/MyProfile.tsx (add ReviewForm section)
```

### Commands to Run This Week

```bash
# Setup
npm install ali-oss
npm install sendgrid (optional for Phase 2)

# Testing
npm run dev (backend)
npm run vite (frontend)
curl localhost:3001/api/uploads/sign-url

# Deployment (Sunday)
git add .
git commit -m "FEAT: Complete task flow with photo uploads and notifications"
git push origin main
```
