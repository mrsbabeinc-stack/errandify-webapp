# Errandify Platform - Testing Checklist

## Modules Built & Ready for Testing

### ✅ 1. Authentication & User Management
- [x] Login/Logout
- [x] User role selection (Asker/Doer)
- [x] Profile management
- [x] Token management

**Test Flow:**
1. Open app → click "Login"
2. Enter credentials → select role (Asker/Doer)
3. Should redirect to home page
4. Click profile to view/edit details

---

### ✅ 2. Hana AI Assistant (Dual Role)
**Role 1: Customer Service (Floating Button)**
- [x] Floating chat button at bottom-right
- [x] Multiple language support: English, 中文 (帮帮乐), 粵語 (廣東話)
- [x] Natural female voice synthesis (Alibaba Qwen TTS)
- [x] Auto-speak responses
- [x] Microphone input (speech-to-text)
- [x] Speaker toggle

**Role 2: Task Creation Helper (+ Button)**
- [x] Pre-fill errand form from Hana suggestions
- [x] AI-powered errand generation

**Test Flow - Customer Service:**
1. Open app as any user
2. Click Hana floating button (bottom-right)
3. Select language: English / 中文 / 粵語
4. Type message: "How do I post an errand?"
5. Hana responds in natural female voice
6. Toggle speaker 🔊 or enable microphone 🎤

**Test Flow - Task Creation:**
1. Go to Create Errand page
2. Click "+" button next to skills
3. Hana helps generate errand details

---

### ✅ 3. Errand Management System
- [x] Create new errand (post task)
- [x] Browse available errands (Doer view)
- [x] View errand details
- [x] Edit errand (Asker only)
- [x] Search & filter by category
- [x] Location-based matching
- [x] Duplicate errand detection (24-hour check)
- [x] AI suggestions for title/category/budget

**Test Flow - Post Errand (Asker):**
1. Login as Asker → Home → "+ New Errand"
2. Fill: Title "Iron clothes", Category, Budget $30, Deadline
3. System suggests corrections/category
4. Submit → See error if duplicate posted in last 24hrs
5. Success → Errand posted

**Test Flow - Browse Errands (Doer):**
1. Login as Doer → Home
2. Browse available errands by category
3. Click errand to see full details
4. Check location (shows postal code + area)

---

### ✅ 4. Bidding System
- [x] Submit bid on open errand
- [x] View all bids (Asker view)
- [x] Accept bid
- [x] Reject bid
- [x] Bid amount suggestions

**Test Flow:**
1. Login as Doer → Browse Errands
2. Click "Accept This Errand" → Submit bid with amount & note
3. Login as Asker → View Your Errands
4. View all bids on your errand
5. Click "Accept" on winning bid → Payment confirmation

---

### ✅ 5. Payment & Escrow System
- [x] Payment processing (Stripe integration)
- [x] Escrow hold until completion
- [x] Auto-confirmation for testing
- [x] Amount display throughout flow

**Test Flow:**
1. Accept a bid as Asker
2. System shows "Amount held in escrow: $X"
3. After doer completes → Payment released
4. Check transaction history

---

### ✅ 6. Job Management
- [x] Track active jobs (both roles)
- [x] Mark job as complete
- [x] In-progress status updates
- [x] Job history

**Test Flow:**
1. Doer: After bid accepted, see job in "My Jobs" 
2. Update status → "In Progress" → "Completed"
3. Asker: Approve completion → payment released

---

### ✅ 7. Messaging System
- [x] Direct messages between Asker & Doer
- [x] Real-time updates
- [x] Message history
- [x] Message notifications

**Test Flow:**
1. Asker: Click message icon on job
2. Send message to doer: "Can you start tomorrow?"
3. Doer: Receive & reply
4. Verify real-time update

---

### ✅ 8. Notifications System
- [x] New bid notifications
- [x] Message notifications
- [x] Job status change notifications
- [x] Notification center
- [x] Mark as read/unread

**Test Flow:**
1. Doer submits bid
2. Asker should receive notification: "You have a new bid from [Name] for $[amount]"
3. Check notification history
4. Mark as read

---

### ✅ 9. Reviews & Ratings System
- [x] Rate completed jobs (1-5 stars)
- [x] Write review comments
- [x] Display doer ratings on profile
- [x] Calculate average rating

**Test Flow:**
1. After job completion → navigate to /review/:jobId
2. Rate 1-5 stars
3. Write comment (optional)
4. Submit → Review saved
5. Check doer's profile → see new rating

---

### ✅ 10. Dispute Resolution System
- [x] File dispute if job not satisfactory
- [x] Dispute chat with support
- [x] Dispute resolution options
- [x] Refund handling

**Test Flow:**
1. Asker: Job marked complete but unsatisfied
2. Click "File Dispute"
3. Select reason: "Work quality", "Incomplete", etc.
4. Add evidence/description
5. Admin/Support reviews → approve refund or deny

---

## Feature Additions

### AI Enhancements
- [x] AI title correction
- [x] AI category detection
- [x] AI description generation
- [x] AI skill suggestions
- [x] AI budget suggestions
- [x] AI duplicate detection (24-hour check)
- [x] AI content safety checking
- [x] AI bias/discrimination detection
- [x] AI Singlish detection for natural responses

### UI/UX Improvements
- [x] Duplicate errand error messaging
- [x] Voice quality improvements (natural female voices)
- [x] Language-specific voice selection
- [x] Responsive design for mobile
- [x] Hana avatar image (hana-avatar.png)

---

## Quick Test Scenarios

### Scenario 1: Post & Complete an Errand
**Time: ~10 minutes**
1. Login as Asker
2. Create errand "Fix light bulb", Category: Home Maintenance, Budget: $20
3. Logout → Login as Doer
4. Browse errands → Find your errand
5. Submit bid: $18
6. Logout → Login as Asker
7. View bids → Accept $18 bid
8. After "complete" click → see completion
9. Navigate to /review/[jobId] → Submit 5-star review
10. Check Doer's profile → See new rating

### Scenario 2: Test Hana AI Assistant
**Time: ~5 minutes**
1. Click Hana floating button
2. Switch to Chinese (中文 帮帮乐)
3. Ask: "How do I post an errand?" 
4. Listen to response (should be warm, motherly female voice)
5. Toggle to English → Ask same question
6. Compare voice quality

### Scenario 3: Test Duplicate Detection
**Time: ~3 minutes**
1. Login as Asker
2. Create errand: "Iron clothes", $30
3. Try posting identical errand again
4. Should see error: "You already have an open errand with similar title..."
5. Wait 24+ hours → Should allow posting (simulated by changing date in DB)

### Scenario 4: Test Messaging
**Time: ~5 minutes**
1. Accept a bid as Asker
2. Send message to doer: "Can you start today?"
3. Login as Doer → should see new message
4. Reply: "Yes, starting now"
5. Verify real-time update on both sides

---

## Known Issues & Workarounds

### TTS Voice Quality
- **Status**: Improved with Alibaba Qwen voices
- **Workaround**: Use natural speaking pace (rate: 1.0, pitch: 1.0)

### Duplicate Detection
- **Status**: Checks for similar titles in last 24 hours
- **Limitation**: Partial matches only check first 10 chars

### Payment Processing
- **Status**: Auto-confirmed in development mode
- **Limitation**: Real Stripe integration requires API keys

---

## Next Steps After Testing

1. **If bugs found**: Report issue with:
   - Step-by-step reproduction
   - Expected vs actual behavior
   - Device/browser used

2. **If all tests pass**: Ready for:
   - User acceptance testing (UAT)
   - Load testing
   - Security audit
   - Production deployment

---

## Support

For issues during testing, check:
- Browser console (F12) for errors
- Network tab to verify API responses
- Backend logs: `npm run dev` output

Contact: support@errandify.ai
