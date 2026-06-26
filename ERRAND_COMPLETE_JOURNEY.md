# Complete Errand Journey: From Start to Finish

User experience from errand creation through payment, with all notifications, reminders, guidance, and tracking.

---

## PHASE 1: POSTING THE ERRAND (Asker)

### Step 1: Create Errand with Hana AI (Optional)
**What Asker Does:**
- Click "Post Job" or open Hana
- Type task description: "Clean my living room"
- Hana extracts: category, location, details, notes
- User reviews and adjusts

**What Happens in Background:**
- Activity Log Entry: "Posted errand" (timestamp)
- Status: `open`
- Budget can be set by asker or left for doers to bid

**Notifications:**
- Toast Success: "Great! Your job is live - doers will start bidding soon"
- Bell: 1 notification "Your errand 'Clean living room' is posted"

**UI Guidance:**
- Status Card: "Your Errand is Live" - waiting for offers
- Timeline: Shows "Posted errand" entry
- Next Action: "Review bids as they come in"

### Step 2: Asker Waits for Bids
**What's Happening:**
- Doers browse and see the errand
- Doers can bid any amount
- Asker gets notified for each bid

**Notifications for Each Bid:**
- Critical Toast: "John bid $50 for your job - he's got 4.8 stars from 23 neighbors"
- Email (Immediate): "John bid $50 for Clean living room"
- Bell: Unread count increases

**UI Guidance:**
- Status Card Updates to: "You Have Offers!" - review and select
- Timeline: Shows each bid with actor name, amount, time
- Doer Profiles: Show ratings, reviews, availability

**Reminders (Optional):**
- None for first 24 hours
- Day 2: Gentle reminder if no bids "Still accepting bids for your job"

---

## PHASE 2: ACCEPTING A BID (Asker)

### Step 1: Asker Reviews and Selects
**What Asker Does:**
- Reviews bid profiles (rating, reviews, location)
- Compares prices
- Reads bids in order (newest first or highest rated first)
- Clicks "Accept" on chosen bid

**Activity Log Entry:**
- "Bid accepted" (asker name, timestamp)

**Status Change:** `open` → `confirmed`

**Notifications for Accepted Doer:**
- Critical Toast: "Wonderful! Sarah picked you for $50 - confirm within 24 hours?"
- Email (Immediate): "Sarah picked you! Confirm within 24 hours"
- Bell: "Offer accepted - action needed"

**Notifications for Rejected Doers:**
- Toast: "Not this time, but plenty more jobs coming your way soon"
- Email (Digest): "Your offer for 'Clean living room' wasn't selected"
- Bell: "Offer not selected"

**UI Guidance (Asker):**
- Status Card: "Waiting for Doer Confirmation" - he has 24h
- Doer name and details shown
- Can still chat or cancel

**UI Guidance (Doer):**
- Status Card: "Offer Accepted! Confirm within 24 hours"
- Big button: "I'm Ready to Help"
- Shows budget, deadline, asker details
- Can cancel if needed

---

## PHASE 3: DOER CONFIRMS READINESS (Doer)

### Step 1: Doer Confirms Within 24 Hours
**What Doer Does:**
- Gets notification about accepted bid
- Reviews job details and asker profile
- Clicks "I'm Ready to Help"

**Activity Log Entry:**
- "Bid accepted confirmation received" (doer name, timestamp)

**Status Change:** `confirmed` → `confirmed_awaiting_start`

**Notifications:**
- Toast (Asker): "John is ready! Job confirmed 🎉"
- Email (Asker): "John confirmed - he's ready to start"
- Toast (Doer): "All set! Click START JOB whenever you're ready"

**UI Guidance (Asker):**
- Status Card: "Ready to Start!" - doer will start soon
- Can chat with doer anytime
- Next step: Doer starts job

**UI Guidance (Doer):**
- Status Card: "Start the Work!" - click to begin timer
- Big button: "Start Job"
- Shows deadline and doer's notes

### Step 2: What If Doer Doesn't Confirm?
**If No Response in 24 Hours:**
- Reminder 1 hour before deadline: "1 hour left - are you ready? Confirm now"
- Status reverts to `open`
- Asker can select another doer
- Notification to doer: "Time's up - offer expired"

---

## PHASE 4: JOB IN PROGRESS (Doer Working)

### Step 1: Doer Starts Job
**What Doer Does:**
- Clicks "Start Job"
- Timer starts counting
- Doer begins work

**Activity Log Entry:**
- "Job started" (doer name, start time, timestamp)

**Status Change:** `confirmed_awaiting_start` → `in_progress`

**Notifications:**
- Toast (Asker): "John's on the way! Chat anytime if you need anything"
- Email (Asker): "John started your job - contact him if needed"
- Toast (Doer): "Timer started! You've got this"

**UI Guidance (Asker):**
- Status Card: "Work in Progress" - doer is working
- Chat button prominent
- Can ask for progress updates
- Timeline shows start time

**UI Guidance (Doer):**
- Status Card: "You're Working!" - timer running, stay focused
- Upload proof/photos option
- Chat button for questions
- "Mark as Complete" button

### Step 2: During Work - Reminders (Optional)
**If Job Takes Longer Than Expected:**
- After 2x original estimated time: "Still working? Need help?"
- Doer can ask for extension in chat

**Chat Features:**
- Real-time messages
- Can share photos/videos as proof
- Disable after job is marked complete + 48h or dispute

---

## PHASE 5: MARKING COMPLETION (Doer)

### Step 1: Doer Submits Work
**What Doer Does:**
- Takes photos/videos of completed work
- Uploads as proof
- Writes brief description
- Clicks "Mark as Complete"

**Activity Log Entry:**
- "Job completed" (doer name, completion time, timestamp)

**Status Change:** `in_progress` → `completed`

**Dispute Window Opens:** 48-hour countdown starts

**Notifications:**
- Critical Toast (Asker): "John finished! Please rate him within 48 hours so he gets paid"
- Critical Email (Asker): Subject: "John finished - please rate him within 48 hours"
- Toast (Doer): "Work submitted! Waiting for Sarah to review"

**UI Guidance (Asker):**
- Status Card: "Work Completed!" - action required
- Shows: completion time, photos/videos, doer's description
- Big button: "Rate John's Work"
- Secondary button: "Request Changes"
- Secondary button: "Chat"
- Warning: "48-hour window" with countdown timer

**UI Guidance (Doer):**
- Status Card: "Waiting for Review"
- Shows: completion details, proof uploaded
- Chat button for any questions
- "Payment is being processed - you'll get it after rating"

---

## PHASE 6: RATING & PAYMENT (Asker Reviews)

### Step 1: Asker Reviews Work (Within 48 Hours)
**Options for Asker:**

**Option A: Rate and Pay**
- Clicks "Rate John's Work"
- Gives 1-5 star rating
- Writes optional review: "Perfect work, very happy!"
- Clicks "Submit Rating"

**Activity Log Entry:**
- "Rating submitted" (asker name, rating, timestamp)

**Notifications:**
- Critical Toast (Asker): "Thank you for rating!"
- Critical Toast (Doer): "Sarah gave you 5 stars - 'Perfect work, very happy!' Great job!"
- Critical Email (Doer): "Sarah rated you 5 stars!"
- Bell: Updates for both showing rating

**Option B: Request Changes**
- Clicks "Request Changes"
- Describes what needs fixing: "The corner needs another pass"
- Doer gets notification
- Status reverts to `in_progress`
- Doer fixes and resubmits
- New 48-hour window starts
- Repeat rating process

**Option C: Raise Dispute**
- If major issue within 48h
- Clicks "Raise Dispute"
- Explains problem
- Admin reviews
- Status: `disputed`
- Payment held pending investigation

**Option D: Do Nothing**
- If no action in 48 hours
- Timer expires
- Auto-payment releases
- Status: `completed`
- Rating deadline passed (but can still rate later)

**Notifications at Hour 47:**
- Reminder Toast: "5 hours left to rate John's work - don't forget!"
- Reminder Email: "Your rating deadline is in 5 hours"

### Step 2: Payment Processing

**Activity Log Entry:**
- "Payment released" (amount, timestamp)

**Status Change:** `completed` → `payment_released` or `closed`

**Notifications:**
- Critical Toast (Asker): "Payment of $50 sent to John - thanks for supporting your neighbor"
- Critical Toast (Doer): "Sarah's payment of $50 is on the way!"
- Critical Email (Both): Payment confirmation with details

---

## PHASE 7: SPECIAL SCENARIOS

### Scenario 1: Doer Cancels Before Starting
**Timeline:** After acceptance, before start

**What Happens:**
- Doer clicks "Cancel"
- Status reverts to `open`
- Asker notified: "John cancelled - we're looking for another helper"
- Asker can select different bid immediately
- Activity Log: "Bid cancelled" (doer name, reason, timestamp)

### Scenario 2: Asker Cancels During Work
**Timeline:** After job started

**What Happens:**
- Asker clicks "Cancel"
- Requires confirmation (can't undo easily)
- Doer notified: "Sarah cancelled the job"
- Dispute handling based on how far along
- Possible partial payment to doer

### Scenario 3: Dispute After Completion
**Timeline:** Within 48 hours after completion

**What Happens:**
- Asker clicks "Raise Dispute"
- Describes issue: "Work not up to standard"
- Admin notified
- Payment held
- Both parties can provide evidence in chat
- Admin reviews and decides
- Activity Log: "Dispute raised", "Dispute resolved" (decision, timestamp)
- Notifications to both: "Dispute resolved - [decision]"

### Scenario 4: Job Reopened
**Timeline:** After rating, before payment if issue found

**What Happens:**
- Either party requests reopening within deadline
- Status: `in_progress` again
- Doer makes fixes
- New 48-hour review window opens
- Notifications to both parties

---

## ACTIVITY TIMELINE (Complete)

Shows all events for both asker and doer:

```
Jan 28, 2:30 PM   Posted - Sarah posted "Clean living room"
Jan 28, 3:15 PM   Bid Placed - John bid $50
Jan 28, 4:00 PM   Bid Accepted - Sarah accepted John's offer
Jan 28, 5:45 PM   Confirmed - John confirmed he's ready
Jan 29, 9:00 AM   Started - John started the job
Jan 30, 3:30 PM   Completed - John finished and uploaded photos
Jan 30, 3:35 PM   Rating Submitted - Sarah gave John 5 stars
Feb 01, 3:35 PM   Payment Released - $50 sent to John
```

---

## NOTIFICATIONS SUMMARY

### Critical (Always Shown, Can't Disable)
1. Bid received: "John bid $50 - 4.8 stars"
2. Bid accepted (doer): "Sarah picked you! Confirm within 24h"
3. Confirmation deadline approaching: "1 hour left to confirm"
4. Job started: "John's on the way!"
5. Job completed: "John finished! Rate within 48h so he gets paid"
6. Rating received: "Sarah gave you 5 stars - Great job!"
7. Payment released: "$50 sent to John"

### Important (Default ON, User Can Disable)
1. Bid rejected: "Not this time, more jobs coming soon"
2. Changes requested: "Sarah wants a small fix"
3. Dispute raised: "Oops - there's a disagreement"
4. Job expired: "48-hour review period ended"
5. Confirmation expired: "Time's up - offer expired"

### Informational (Default OFF, User Can Enable)
1. Profile viewed: "Sarah checked your profile"
2. Similar jobs posted: "3 new cleaning jobs near you"
3. Someone typing: "John is typing..."

---

## REMINDERS SCHEDULE

### For Asker
- Hour 24 (if no bids): "Still accepting bids for your job"
- Hour 47 (before rating deadline): "5 hours left to rate John - don't forget!"
- Auto-payment at hour 48: "Payment auto-released to John"

### For Doer
- Hour 23 (before confirmation deadline): "1 hour left to confirm!"
- Hour 24 (after expiration): "Time's up - offer expired"
- During work: If running long "Still working? Need help?"

---

## GUIDANCE & UI ELEMENTS

### Status Card (Dynamic by Status)
Shows on ErrandDetailPage:
- Current status with icon
- What's happened (summary)
- What's next (clear action)
- Action buttons (only relevant ones)
- Time remaining (countdown)
- Color coding (blue/yellow/orange/green/red)

### Activity Timeline
Shows on ErrandDetailPage:
- All events chronologically
- Actor name, action, timestamp
- Expandable for details
- Shows photos/videos when applicable

### Tooltips
Contextual help:
- "Why 48 hours?" - explains dispute window
- "What if doer doesn't show?" - explains cancellation
- "How do I know if work is good?" - rating guidance

### Chat Features
- Real-time messaging
- Photo/video sharing
- Shows "John is typing..."
- Disabled 48h after completion or on dispute

---

## COMPLETE FLOW DIAGRAM

```
ASKER SIDE                          DOER SIDE
==========================================================

Post Errand
├─ Toast: Posted!
├─ Status Card: Live, waiting for offers
└─ Timeline: Posted entry

                                   See Errand, Click Bid
                                   ├─ Offer amount
                                   └─ Add optional note
                                   
Receive Bid Notification
├─ Critical Toast: John bid $50
├─ Email: John bid notification
├─ Bell: +1 unread

Review Bids
├─ See all bids
├─ Check doer profiles
├─ Compare prices/ratings
└─ Select best bid

Click Accept → Notify Doer
                                   Receive Accept Notification
                                   ├─ Critical Toast: Sarah picked you!
                                   ├─ Email: Confirm within 24h
                                   ├─ Status Card: Action needed
                                   └─ Big button: I'm Ready

                                   Click Confirm
                                   ├─ Toast: All set!
                                   └─ Status changes

See Confirmation
├─ Toast: John is ready!
├─ Status Card: Ready to Start
└─ Can chat with John

                                   Click Start Job
                                   ├─ Toast: Timer started!
                                   ├─ Status: In Progress
                                   └─ Begin work

Chat/Ask for Updates
├─ Real-time messages
├─ Ask for progress photos
└─ Can help with questions

                                   Complete Work
                                   ├─ Upload proof/photos
                                   ├─ Write description
                                   └─ Click Mark Complete
                                   
Get Completion Notification
├─ Critical Toast: John finished!
├─ Email: John finished - rate him!
├─ Status Card: Action required!
├─ See photos/videos
└─ Big button: Rate John's Work

Review Work & Rate
├─ See completion details
├─ Give 1-5 star rating
├─ Write review (optional)
└─ Click Submit

                                   Get Rating Notification
                                   ├─ Critical Toast: 5 stars!
                                   ├─ Email: Great rating!
                                   ├─ Show review text
                                   └─ "You're awesome!"

Payment Auto-Released
├─ Toast: $50 sent to John
├─ Email: Payment confirmation
└─ Status: Closed

                                   Receive Payment
                                   ├─ Toast: $50 on the way!
                                   ├─ Email: Payment confirmation
                                   └─ Available in wallet
```

---

## WHAT ELSE? (Additional Features Mentioned in Docs)

### 1. Referral System
- Share QR code/link when posting
- Earn EP points when referred user completes first job
- Personal tracking dashboard

### 2. Errandify Points (EP)
- Earn per rating received (base + bonus)
- Redeem for rewards
- Show tier (Bronze/Silver/Gold/Platinum)
- Transaction history

### 3. Gamification
- Badges (5-star baker, helper streak, etc.)
- Streaks (consecutive jobs)
- Leaderboards
- Monthly challenges
- Progress visualization

### 4. Favorites System
- Heart icon to favorite other party
- Shows in "Favorite Helpers" when posting new job
- One-click booking with favorites

### 5. Recurring Jobs
- Set job to repeat (weekly, bi-weekly, monthly)
- Same doer for consistency
- Single rating at end of cycle
- Easier for both parties

### 6. Criminal Records Check
- Integrated into signup
- Gates access to sensitive categories (childcare, elderly care)
- Job restrictions based on offense type
- Transparent verification status

### 7. Criminal Screening (Safety)
- Before signup completion
- Required for sensitive job categories
- Shows verified status to both parties
- Builds trust

### 8. Booking Calendar
- Doer calendar showing availability
- Asker can see when doer is free
- Schedule jobs in advance
- Recurring job scheduling

### 9. Smart Matching (AI-Powered)
- Rate guidance: "This job typically pays $40-60"
- Skill matching: Suggest best doers for job type
- Location matching: Show nearby helpers
- Rating/trust scoring

### 10. Smart Notifications
- Predict likelihood of doer accepting
- Suggest doers based on past behavior
- Alert asker if doer rarely completes jobs
- Fraud detection flags

### 11. Dispute Resolution
- Level 1: Auto-resolve (clear cut cases)
- Level 2: AI + human review
- Level 3: Full manual investigation
- Evidence submission via chat

### 12. Content Moderation
- Block dangerous categories (weapons, drugs, violence)
- Two-layer: Pattern matching + AI sentiment
- Allow legitimate uses
- No false positives

### 13. Event Reminders (For MyKampung Events)
- 7-day advance reminder
- 24-hour reminder
- 1-hour reminder
- Day-of reminder with agenda/links
- Email with full event details

### 14. News & Training
- 36+ SGD news articles
- Free training on job safety
- Government resources
- Community stories

### 15. My Kampung Integration
- Community posts
- Event announcements
- Local news
- Success stories
- Real people, real jobs

### 16. User Capability Declaration
- Self-declare abilities/restrictions
- Physical limitations
- Health conditions
- Work status
- AI matches to safe jobs

### 17. Admin Dashboard (Future)
- User management
- Category management
- Dispute management
- Analytics & reports
- System monitoring

---

## KEY METRICS TO TRACK

### For Asker
- Jobs posted: count, average budget, completion rate
- Ratings given: 1-5 distribution, average
- Doers rehired: loyalty, repeat usage
- Cost per job: budget vs actual spend
- Time to completion: average duration

### For Doer
- Jobs completed: count, success rate
- Ratings received: 1-5 distribution, average
- Earnings: total, monthly, per job
- Reliability: on-time, cancellation rate
- Tier progress: EP earned, current level

### For Platform
- Jobs posted per day/week/month
- Completion rate: % of jobs that finish successfully
- Dispute rate: % of jobs with disputes
- User retention: active doers/askers
- Referral effectiveness: growth from referrals
- Average job value
- Geographic distribution

---

## SUMMARY: Complete User Journey

**Asker's Timeline:**
1. Post → 2-5 min
2. Wait for bids → 30 min - several hours
3. Review & select → 5-10 min
4. Wait for doer confirmation → Up to 24h
5. Job happens → 1-4 hours typically
6. Review & rate → 5 min
7. Payment auto-releases → Immediate
**Total: 1-2 days typical**

**Doer's Timeline:**
1. See job & bid → 2-3 min
2. Wait for response → 30 min - several hours
3. Get notified & confirm → 5 min
4. Do the work → 1-4 hours
5. Submit completion → 5 min
6. Wait for rating → Up to 48h
7. Receive payment → 1-2h after rating
**Total: 1-3 days typical**

**Notifications & Reminders:** 10-15 total across full journey
**UI Guidance:** Status card updates at each major step
**Activity Trail:** Complete record of all actions with timestamps
**Trust Building:** Ratings, reviews, karma points, verification badges

This is the **complete, guided, transparent experience** that helps both parties understand exactly what's happening, what's next, and how they can succeed together as neighbors in the Errandify community.
