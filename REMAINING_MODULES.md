# Remaining Modules to Build

**Status**: Job execution flow ✅ COMPLETE

---

## Queued Modules (In Priority Order)

### 1. **In-Task Chatbox** (Socket.io Real-Time Messaging)
**Complexity**: High | **Time**: ~2 hours

**What it does:**
- Real-time chat between Asker and Doer on task detail screen
- Socket.io for live updates
- Qwen AI content moderation (SAFE/FLAG)
- Chat history stored in DB
- 3-flag auto-suspension system
- Separate Hana AI chat (pinned in Chat tab)

**Key Files to Create:**
- `backend/src/routes/messages.ts` - Message endpoints
- `frontend/src/components/TaskChatbox.tsx` - Chat UI
- `backend/src/websocket.ts` - Socket.io setup
- Database: update `chat_messages` table

**Status**: Queued

---

### 2. **Dispute Resolution Flow**
**Complexity**: High | **Time**: ~2 hours

**What it does:**
- Either party raises dispute within 48h
- Freezes Stripe escrow
- AI analyzes evidence + chat + description
- Admin reviews and decides (full/partial/refund)
- Email notifications with case IDs
- 24h investigation update emails

**Key Files to Create:**
- `backend/src/routes/disputes.ts` - Dispute endpoints
- `backend/src/services/disputeService.ts` - AI analysis
- Frontend: Dispute UI components

**Status**: Queued

---

### 3. **Mutual Review System** (1h after payment release)
**Complexity**: Medium | **Time**: ~1.5 hours

**What it does:**
- Both parties review each other after payment
- 1-5 star rating + tags
- Trust Score calculation (formula: 40% rating + 20% KYC + 20% completion + 10% certs + 10% declaration)
- Reviews on public profiles
- AI content filter on comments

**Key Files to Create:**
- `backend/src/routes/reviews.ts` - Review endpoints
- `frontend/src/components/ReviewModal.tsx` - Rating UI
- Database: `reviews` table

**Status**: Queued

---

### 4. **Errandify Points (EP) & Rewards**
**Complexity**: Medium | **Time**: ~1.5 hours

**What it does:**
- Signup with referral: +100 EP to referrer
- First task completion: +50 EP each
- Complete task as Doer: +20 EP
- Post task as Asker: +10 EP (one-time)
- Redemption: 100 EP = $1 SGD wallet credit
- Track in Profile tab

**Key Files to Create:**
- `backend/src/routes/points.ts` - EP endpoints
- `backend/src/services/rewardService.ts` - Point logic
- Database: `user_points` table (or extend users table)

**Status**: Queued

---

### 5. **Referral System**
**Complexity**: Medium | **Time**: ~1 hour

**What it does:**
- Unique referral code per user (REF-XXXXXX)
- QR code generation (qrcode npm)
- Referral tracking dashboard
- Share via native share sheet
- Invite favourite doer to specific task

**Key Files to Create:**
- `frontend/src/components/ReferralSection.tsx` - QR + tracker
- Update users table: `referral_code`, `referred_by`
- Generate QR codes on demand

**Status**: Queued

---

### 6. **User Profiles**
**Complexity**: High | **Time**: ~2 hours

**What it does:**
- Own profile: personal dashboard with stats
- Public profiles: limited fields + heart favourite
- Badges (certified, award badges)
- Transaction history
- Reviews received
- Task history (as Asker/Doer)

**Key Files to Create:**
- `frontend/src/pages/ProfilePage.tsx` - Own profile
- `frontend/src/pages/PublicProfilePage.tsx` - Public profile
- `backend/src/routes/profiles.ts` - Profile endpoints

**Status**: Queued

---

### 7. **Admin Dashboard** (Web only)
**Complexity**: High | **Time**: ~2.5 hours

**What it does:**
- Stats overview: users, tasks, fill rate, revenue, disputes
- User management: search, suspend, ban
- Task management: view all, manually close/reopen
- Dispute resolution interface
- Content moderation queue (flagged content)
- Notification center

**Key Files to Create:**
- `frontend/src/pages/AdminDashboard.tsx` - Main dashboard
- `backend/src/routes/admin.ts` - Admin endpoints
- Admin-only auth check

**Status**: Queued

---

### 8. **Notification System**
**Complexity**: High | **Time**: ~2 hours

**What it does:**
- Web push notifications (service worker)
- In-app notification bell + badge count
- SMS for critical alerts (Twilio)
- 20+ notification types (bids, payments, reviews, etc.)
- Mark as read / read all
- Database storage for history

**Key Files to Create:**
- `backend/src/services/notificationService.ts` - Send logic
- `frontend/src/components/NotificationBell.tsx` - Bell UI
- Database: `notifications` table
- Service worker setup

**Status**: Queued

---

## Implementation Recommendations

### **This Session** (Do First)
1. ✅ Job execution flow - COMPLETE
2. **In-Task Chatbox** - Start next (real-time messaging critical)
3. **Dispute Resolution** - High priority (legal protection)

### **Next Sessions**
4. **Mutual Review System** - Enables trust scoring
5. **Errandify Points & Referral** - Growth levers
6. **User Profiles** - Social features
7. **Admin Dashboard** - Platform ops
8. **Notification System** - Engagement

---

## Which Module Should We Build Next?

**My Recommendation**: **In-Task Chatbox**

**Why?**
- Enables communication during job execution
- Required for dispute context (chat history)
- Socket.io is complex but foundation for future features
- Users need to coordinate details in real-time
- Foundation for all messaging features

**Effort**: 2 hours (doable in one session)
**Impact**: High (critical for UX)
**Dependencies**: None (builds on existing task detail)

---

## Quick Reference: Module Dependencies

```
Job Execution Flow ✅
├─ In-Task Chatbox (needs job execution for task context)
├─ Dispute Resolution (needs chat history + job completion)
└─ Notifications (triggered by all modules)

Mutual Review
├─ Job Execution Flow ✅
├─ Notification System (1h reminder)
└─ User Profiles (reviews displayed)

Errandify Points & Referral
├─ Mutual Review (check completion)
├─ User Profiles (show earned points)
└─ Admin Dashboard (fraud prevention)

User Profiles
└─ Mutual Review (show reviews)
└─ Errandify Points (show balance)

Admin Dashboard
├─ All previous modules (manage content)
└─ Notification System (notify admins)

Notification System
└─ All modules (triggered by events)
```

---

## Tech Stack for Remaining Modules

**Real-Time Communication:**
- Socket.io (in-task chat)
- Redis for message queue (optional, for scale)

**Cloud Services:**
- Cloudinary: Photo uploads (already in use)
- Twilio: SMS notifications (free tier 100 SMS/month)
- Stripe: Already integrated

**NLP / AI:**
- Qwen: Content moderation, dispute analysis
- QR code: qrcode npm package

**Database:**
- PostgreSQL (already in use)
- New tables: notifications, reviews, points

---

## Ready to Start?

Which module would you like to build next?

1. ✅ **In-Task Chatbox** (Recommended - 2 hours)
2. **Dispute Resolution** (High priority - 2 hours)
3. **Mutual Review System** (Medium priority - 1.5 hours)
4. **Errandify Points** (Growth - 1.5 hours)
5. **Referral System** (Growth - 1 hour)
6. **User Profiles** (Social - 2 hours)
7. **Admin Dashboard** (Ops - 2.5 hours)
8. **Notification System** (Engagement - 2 hours)

**Or build multiple in parallel?** (Each can be independent)

Let me know and I'll start building immediately! 🚀
