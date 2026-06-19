# Errandify: Complete Implementation Plan for All Remaining Features

**Date:** June 20, 2026  
**Status:** Ready to Execute  
**Estimated Total:** 35-45 hours over 4-5 weeks

---

## Executive Summary

This plan covers **all 8 remaining major feature areas** ordered by:
1. **Dependencies** (what must come first)
2. **Complexity** (simple-to-hard progression)
3. **User Value** (highest impact first)

The system currently has:
- ✅ Task creation (Hana + form)
- ✅ Bidding system (full cycle)
- ✅ Authentication (mock SingPass)
- ✅ Core DB schema
- ✅ Notification infrastructure (in-app + push)
- ✅ Email notification tables
- ✅ Ratings endpoints
- ✅ Sessions/recurring logic
- ✅ Task execution endpoints
- ✅ Wallet calculation endpoints

**Missing (this plan):** Frontend polish, API hookups, and advanced features.

---

## Phase 1: Foundation (Weeks 1-2) - 15-18 hours

These must complete first. Other features depend on them.

### 1. Task Execution Frontend (6-7h) 🔴 **START HERE**

**Purpose:** Let doers show proof of work; let askers confirm completion.

**What needs doing:**
- Enhance `/pages/ErrandDetailPage.tsx`:
  - "Start Work" button → marks task `in_progress`, timestamp
  - Photo upload widget (1-3 photos) → stores in DB
  - Photo gallery view
  - Work log comments
  - "Mark Complete" button (doer) → `completed_unconfirmed`
  - "Confirm Completion" button (asker) → `completed_confirmed`
  - 48h dispute window countdown display
- Connect to existing `/api/tasks/start`, `/api/tasks/complete`, `/api/tasks/upload-photo` endpoints
- Handle status transitions properly (show/hide buttons based on role & status)

**Files to modify:**
- `/frontend/src/pages/ErrandDetailPage.tsx` (add execution UI)
- `/frontend/src/components/TaskPhotoUpload.tsx` (new - reusable component)
- `/frontend/src/components/WorkStatusTimeline.tsx` (new - visual progress)

**Files to check/verify:**
- Backend: `/backend/src/routes/taskExecution.ts` (endpoints exist)
- DB: `task_photos` table (exists)

**Database changes:** None (schema ready)

**API endpoints needed:** (already exist, just verify)
- `PATCH /api/tasks/:taskId/start`
- `PATCH /api/tasks/:taskId/complete`
- `POST /api/tasks/:taskId/photos`
- `GET /api/tasks/:taskId/photos`

**Complexity:** 3/5  
**Dependencies:** None  
**User value:** High - shows work completion flow

---

### 2. Wallet & Earnings Dashboard (4-5h) 🟠

**Purpose:** Show doers earnings, askers spending in beautiful UI.

**What needs doing:**
- Create `/frontend/src/pages/MyPocketPage.tsx`:
  - Tabs: Earnings, Spending, Transactions, Payout Settings
  - **Earnings tab:** Show `pendingEarnings` vs `completedEarnings`, by-category breakdown, by-month chart
  - **Spending tab:** Show `pendingSpent` vs `completedSpent`, task breakdown
  - **Transactions tab:** Full transaction history with pagination (connect to `/api/wallet/transactions`)
  - **Payout tab:** Bank info placeholder (layout for Stripe later)
- Enhance `/frontend/src/pages/PayoutSettingsPage.tsx`:
  - Form to input/edit bank details (UI only, backend ready)
  - Save button → calls `/api/wallet/payout-settings`
- Create reusable `/frontend/src/components/EarningsChart.tsx` (using Chart.js or Recharts)

**Files to create/modify:**
- `/frontend/src/pages/MyPocketPage.tsx` (new)
- `/frontend/src/pages/PayoutSettingsPage.tsx` (enhance)
- `/frontend/src/components/EarningsChart.tsx` (new)
- `/frontend/src/components/TransactionList.tsx` (new)

**API endpoints needed:** (all exist, just verify)
- `GET /api/wallet/balance` ✅
- `GET /api/wallet/transactions` ✅
- `GET /api/wallet/breakdown` ✅
- `POST /api/wallet/payout-settings` (check if exists, may need to add)

**Database changes:** None

**Complexity:** 3/5  
**Dependencies:** Task Execution (so there are actual earnings to show)  
**User value:** High - financial transparency

---

### 3. Rating System Frontend (4-5h) 🟠

**Purpose:** Doers and askers rate each other; build trust scores.

**What needs doing:**
- Create `/frontend/src/pages/RatePage.tsx`:
  - Shows after task completion
  - Star selector (1-5)
  - Text comment field
  - Submit button → `POST /api/ratings`
  - Confirmation message
- Add rating display to `/frontend/src/pages/MyProfilePage.tsx`:
  - Average rating badge
  - Recent ratings list
  - Rating distribution chart (5★ count, 4★ count, etc)
  - Connect to `GET /api/ratings/user/:userId`
- Add rating summary to user cards in public profiles
- Add link from task detail → "Rate this user" after completion

**Files to create/modify:**
- `/frontend/src/pages/RatePage.tsx` (new)
- `/frontend/src/pages/MyProfilePage.tsx` (enhance)
- `/frontend/src/components/RatingDisplay.tsx` (new)
- `/frontend/src/components/RatingForm.tsx` (new)

**API endpoints needed:** (all exist)
- `POST /api/ratings` ✅
- `GET /api/ratings/user/:userId` ✅
- `GET /api/ratings/user/:userId/summary` ✅

**Database changes:** None (ratings table exists)

**Complexity:** 2/5  
**Dependencies:** Task Execution  
**User value:** High - trust mechanism

---

## Phase 2: Core Features (Weeks 2-3) - 12-15 hours

### 4. Email Notifications System (5-6h) 🟡

**Purpose:** Smart email digests + immediate alerts instead of relying on push.

**What needs doing:**
- Backend: Create `/backend/src/routes/emailNotifications.ts`:
  - `GET /api/notifications/preferences` - Get user email prefs
  - `PUT /api/notifications/preferences` - Set digest frequency (immediate, daily, weekly, never)
  - `POST /api/notifications/send-digest` - Batch send emails (cron job)
  - Helper: `sendEmailDigest(userId)` - Format & send via email service
- Frontend: Create `/frontend/src/pages/NotificationPreferencesPage.tsx`:
  - Toggle immediate notifications per event type
  - Select digest frequency (off, immediate, daily, weekly)
  - Test email button
  - Email preview
- Create `/backend/src/services/emailService.ts`:
  - Template rendering (HTML email templates)
  - Integration with SendGrid or Resend API
  - Fallback SMTP option
- Update cron job in `/backend/src/cron.ts`:
  - Run email digest batching (daily at 9am, weekly at Monday 9am)
  - Clean up old email logs

**Files to create/modify:**
- `/backend/src/routes/emailNotifications.ts` (new)
- `/backend/src/services/emailService.ts` (new)
- `/backend/src/cron.ts` (enhance)
- `/frontend/src/pages/NotificationPreferencesPage.tsx` (enhance existing)
- `/backend/templates/` (new folder with email HTML templates)

**Database changes:**
- Already exists: `email_digest_queue`, `email_logs`, `users.email_preferences`
- Add index if missing: `CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at)`

**API endpoints needed:**
- `GET /api/notifications/preferences` (new)
- `PUT /api/notifications/preferences` (new)
- Email service integration (SendGrid/Resend API key in env)

**Config needed:**
- `EMAIL_SERVICE` env var (sendgrid, resend, smtp)
- `EMAIL_API_KEY` env var
- `FROM_EMAIL` env var

**Complexity:** 4/5  
**Dependencies:** None  
**User value:** High - critical for user engagement

---

### 5. Recurring Sessions Dashboard (4-5h) 🟡

**Purpose:** Track which sessions are done, pending, or skipped in recurring tasks.

**What needs doing:**
- Create `/frontend/src/pages/SessionsPage.tsx`:
  - Shows all sessions for a recurring errand
  - Visual progress bar (X of Y completed)
  - Session cards with:
    - Session #, scheduled date, status
    - Assigned doer name
    - Action buttons:
      - Doers: "Mark Complete" (only if assigned & in_progress)
      - Askers: "Mark Complete", "Skip Session", "Cancel Session"
  - Connect to `GET /api/errands/:errandId/sessions`
- Enhance `/frontend/src/pages/ErrandDetailPage.tsx`:
  - Add "Sessions" tab for recurring tasks
  - Quick summary: "3 of 12 sessions completed"
  - Link to full sessions page
- Add session summary to asker's errand list
- Show notifications when sessions need assignment

**Files to create/modify:**
- `/frontend/src/pages/SessionsPage.tsx` (new)
- `/frontend/src/pages/ErrandDetailPage.tsx` (enhance)
- `/frontend/src/components/SessionCard.tsx` (new)
- `/frontend/src/components/SessionsProgressBar.tsx` (new)

**API endpoints needed:** (all exist, verify)
- `GET /api/errands/:errandId/sessions` ✅
- `PATCH /api/errands/:errandId/sessions/:sessionId` ✅
- `POST /api/errands/:errandId/sessions/:sessionId/mark-complete` (may need to add)
- `POST /api/errands/:errandId/sessions/:sessionId/skip` (may need to add)

**Database changes:** None (errand_sessions table exists)

**Complexity:** 3/5  
**Dependencies:** Task Execution (for mark complete logic)  
**User value:** Medium - makes recurring feature actually usable

---

### 6. MyVillage Page - Trust & Community (4-5h) 🟡

**Purpose:** Show trusted users, block list, referrals system.

**What needs doing:**
- Create `/frontend/src/pages/MyVillagePage.tsx` (replace stub):
  - **Trusted Users section:**
    - List users you've successfully worked with
    - Connect to `GET /api/users/trusted-users`
    - Filter/search
    - "Unblock" buttons
  - **Block List section:**
    - Show blocked users
    - "Unblock" button
    - Connect to `GET /api/users/blocklist`
  - **Referral section:**
    - Show your referral code
    - Referral stats (invited, signed up, completed first task)
    - Copy-to-clipboard link
    - Connect to `GET /api/users/referrals`
- Backend: Create `/backend/src/routes/userRelationships.ts`:
  - `GET /api/users/trusted-users` - Get list of users you've worked well with (avg rating > 4)
  - `GET /api/users/blocklist` - Get blocked users
  - `POST /api/users/:userId/block` - Block a user
  - `DELETE /api/users/:userId/block` - Unblock
  - `GET /api/users/referrals` - Get referral stats
  - Add rating history check: if worked together AND good rating → trusted

**Files to create/modify:**
- `/frontend/src/pages/MyVillagePage.tsx` (enhance)
- `/backend/src/routes/userRelationships.ts` (new)
- `/frontend/src/components/TrustedUserCard.tsx` (new)
- `/frontend/src/components/ReferralWidget.tsx` (new)

**Database changes:**
- Add table: `CREATE TABLE user_relationships` (user_id, other_user_id, relationship_type, created_at)
  - Types: 'trusted', 'blocked', 'reported'
  - Indexes: user_id, relationship_type

**API endpoints needed:**
- `GET /api/users/trusted-users` (new)
- `GET /api/users/blocklist` (new)
- `POST /api/users/:userId/block` (new)
- `DELETE /api/users/:userId/block` (new)
- `GET /api/users/referrals` (new)

**Complexity:** 3/5  
**Dependencies:** Rating System (to determine "trusted")  
**User value:** Medium - community features

---

## Phase 3: Advanced Features (Weeks 3-4) - 8-12 hours

### 7. Disputes & Cancellation System (5-6h) 🔴 COMPLEX

**Purpose:** Handle disagreements; manage cancellations with refunds.

**What needs doing:**
- Frontend: Create `/frontend/src/pages/DisputePage.tsx` (enhance existing):
  - **For disputes:**
    - Show dispute details
    - Timeline of events
    - AI recommendation (if available)
    - Evidence upload (photos, chat history)
    - Manual resolution form (askers can release partial/full payment)
    - Chat with admin section
  - **For cancellations:**
    - Show cancellation reason
    - Refund status
    - Timeline
- Backend: Enhance `/backend/src/routes/disputes.ts`:
  - `POST /api/disputes` - Create dispute (already exists, verify)
  - `PATCH /api/disputes/:disputeId/resolve` - Resolve manually
  - `POST /api/disputes/:disputeId/ai-recommend` - Get AI recommendation
  - `POST /api/disputes/:disputeId/evidence` - Add evidence
  - Helper: Calculate refund amounts based on completion %
- Backend: Create `/backend/src/routes/cancellation.ts`:
  - `POST /api/errands/:errandId/cancel` - Cancel task
  - `POST /api/errands/:errandId/refund` - Issue refund
  - Apply penalties if applicable (based on cancellation stage)
  - Update wallet immediately
- Create cancellation scenarios in docs (reference: `memory/cancellation_scenarios.md`)

**Files to create/modify:**
- `/frontend/src/pages/DisputePage.tsx` (enhance)
- `/backend/src/routes/disputes.ts` (enhance)
- `/backend/src/routes/cancellation.ts` (new)
- `/frontend/src/components/DisputeTimeline.tsx` (new)
- `/frontend/src/components/EvidenceUpload.tsx` (new)

**Database changes:**
- Already exists: `disputes` table
- Add: `dispute_evidence` table (evidence_type, url, uploaded_by)
- Add: `cancellation_reasons` lookup table or ENUM

**API endpoints needed:**
- `POST /api/disputes` ✅ (verify)
- `PATCH /api/disputes/:disputeId/resolve` ✅ (verify)
- `POST /api/errands/:errandId/cancel` (new)
- `POST /api/errands/:errandId/refund` (new)

**Complexity:** 5/5 - High business logic  
**Dependencies:** Task Execution, Wallet  
**User value:** Critical - safety net for platform

---

### 8. Admin Dashboard - Activate Functionality (3-4h) 🟢

**Purpose:** Real admin controls (currently layout-only).

**What needs doing:**
- Enhance `/frontend/src/pages/AdminDashboardPage.tsx`:
  - **Overview tab:** Connect all stats to real API calls
  - **Disputes tab:**
    - List open disputes
    - "View" → detail page
    - "Recommend resolution" button
    - "Resolve" button
    - Filter by status
  - **Screening tab:**
    - List all screening declarations
    - Flag/unflag users
    - View criminal history summaries
    - Suspension controls
  - **Users tab:**
    - Search users
    - Suspend/unsuspend
    - Reset passwords
    - View profile details
    - Ban/unban
  - Real-time stats (refresh every 30s)
  - Export data button (CSV)
- Backend: Verify admin endpoints in `/backend/src/routes/admin.ts`:
  - All read endpoints exist
  - Add admin write endpoints for user management

**Files to create/modify:**
- `/frontend/src/pages/AdminDashboardPage.tsx` (enhance)
- `/backend/src/routes/admin.ts` (enhance with write operations)
- `/frontend/src/components/AdminDisputeList.tsx` (new)
- `/frontend/src/components/AdminUserManagement.tsx` (new)
- `/frontend/src/components/AdminScreeningList.tsx` (new)

**API endpoints needed:**
- Read: Most exist ✅
- Write (new):
  - `PATCH /api/admin/users/:userId/suspend`
  - `PATCH /api/admin/users/:userId/ban`
  - `DELETE /api/admin/users/:userId/reset-password`
  - `PATCH /api/admin/disputes/:disputeId/resolve`
  - `PATCH /api/admin/screening/:userId/flag`

**Database changes:** None

**Complexity:** 2/5  
**Dependencies:** None  
**User value:** Operational - platform management

---

## Phase 4: Polish & Testing (Week 4) - 5-8 hours

### 9. Integration & Testing

**What needs doing:**
- End-to-end testing:
  - Full task lifecycle (create → bid → accept → execute → complete → rate)
  - Recurring tasks with multiple sessions
  - Cancellation & dispute scenarios
  - Email notifications delivery
- Bug fixes from testing
- Performance optimization
- Security audit:
  - Auth checks on all endpoints
  - Input validation
  - SQL injection prevention
  - XSS prevention
- Mobile responsiveness testing
- Cross-browser testing

---

## Dependency Graph

```
Task Execution (1)
    ↓
Wallet (2) ← Ratings (3)
    ↓            ↓
Rating System (3) ← Wallet (2)
    ↓
Email Notifications (4) [independent, can parallel]
    ↓
Sessions (5) [uses Task Execution]
    ↓
MyVillage (6) ← Ratings
    ↓
Disputes (7) ← Task Execution, Wallet
    ↓
Admin (8) [uses Disputes]
    ↓
Testing & Polish (9)
```

---

## Implementation Order (Recommended)

### Week 1:
1. **Task Execution** (6-7h) - Unblocks everything
2. **Wallet Dashboard** (4-5h) - Shows financials
3. **Ratings Frontend** (4-5h) - Trust mechanism

**Total: 14-17h** → Can start with ~2h/day baseline + some weekend work

### Week 2:
4. **Email Notifications** (5-6h) - User engagement
5. **Sessions Dashboard** (4-5h) - Recurring usability

**Total: 9-11h** → Lighter week

### Week 3:
6. **MyVillage** (4-5h) - Community features
7. **Disputes & Cancellation** (5-6h) - Safety features

**Total: 9-11h** → Moderate

### Week 4:
8. **Admin Dashboard** (3-4h) - Operational
9. **Testing & Polish** (5-8h) - Quality

**Total: 8-12h** → Finish strong

---

## Complexity Legend

| Level | Effort | Example |
|-------|--------|---------|
| 1/5 | < 1h | Simple list, single API call |
| 2/5 | 1-2h | UI with few interactions |
| 3/5 | 2-4h | Multi-step flow, moderate logic |
| 4/5 | 4-6h | Complex business logic, heavy UI |
| 5/5 | 6-8h | Very complex, multiple systems |

---

## Database Additions Summary

### New Tables:
1. `user_relationships` - Track trusted/blocked users
2. `dispute_evidence` - Evidence for disputes

### New Columns:
- `users.email_preferences` (JSONB) ✅ exists
- `users.average_rating` - Update in ratings.ts
- `users.total_ratings` - Update in ratings.ts

### Existing & Ready:
- ✅ `task_photos`
- ✅ `errand_sessions`
- ✅ `errand_assignments`
- ✅ `ratings`
- ✅ `disputes`
- ✅ `email_digest_queue`
- ✅ `email_logs`

---

## API Endpoints Summary

### Already Implemented (verify):
- Task execution: `/api/tasks/*` ✅
- Wallet: `/api/wallet/*` ✅
- Ratings: `/api/ratings/*` ✅
- Sessions: `/api/errands/:id/sessions*` ✅
- Admin: `/api/admin/*` ✅

### Need to Add:
- User relationships: `/api/users/trusted-users`, `/api/users/blocklist`, etc.
- Email notifications: `/api/notifications/preferences`
- Cancellation: `/api/errands/:id/cancel`, `/api/errands/:id/refund`
- Admin write: `/api/admin/users/*`, etc.

---

## Frontend Components Checklist

**Phase 1:**
- [ ] `TaskPhotoUpload.tsx`
- [ ] `WorkStatusTimeline.tsx`
- [ ] `EarningsChart.tsx`
- [ ] `TransactionList.tsx`
- [ ] `RatingDisplay.tsx`
- [ ] `RatingForm.tsx`

**Phase 2:**
- [ ] `SessionCard.tsx`
- [ ] `SessionsProgressBar.tsx`
- [ ] `TrustedUserCard.tsx`
- [ ] `ReferralWidget.tsx`

**Phase 3:**
- [ ] `DisputeTimeline.tsx`
- [ ] `EvidenceUpload.tsx`
- [ ] `AdminDisputeList.tsx`
- [ ] `AdminUserManagement.tsx`
- [ ] `AdminScreeningList.tsx`

---

## Environment Variables Needed

```
# Email Service
EMAIL_SERVICE=sendgrid|resend|smtp
EMAIL_API_KEY=xxx
SENDGRID_API_KEY=xxx (if using SendGrid)
FROM_EMAIL=noreply@errandify.ai

# Admin
ADMIN_EMAIL=admin@errandify.ai
```

---

## Testing Strategy

### Unit Tests (backend):
- [ ] Email digest formatting
- [ ] Cancellation refund calculation
- [ ] Dispute resolution logic

### Integration Tests:
- [ ] Full task lifecycle
- [ ] Email delivery
- [ ] Payment flows

### E2E Tests:
- [ ] User creates task → gets bids → accepts → executes → rates
- [ ] Recurring task with sessions
- [ ] Dispute escalation
- [ ] Admin actions

---

## Success Criteria

### By End of Week 1:
- Task execution fully working with photos
- Wallet shows accurate earnings/spending
- Ratings display on profiles

### By End of Week 2:
- Email notifications sending (test with dev email)
- Recurring tasks show session progress
- No major bugs in core flows

### By End of Week 3:
- MyVillage trusted user list working
- Disputes can be created and resolved
- All pages mobile-responsive

### By End of Week 4:
- Admin can manage platform
- Full end-to-end test passes
- Ready for beta users

---

## Estimated Time Breakdown

| Feature | Frontend | Backend | Total |
|---------|----------|---------|-------|
| Task Execution | 4h | 1h* | 5-6h |
| Wallet | 3h | 1h* | 4-5h |
| Ratings | 2h | 1h* | 3-4h |
| Email Notifications | 2h | 3-4h | 5-6h |
| Sessions | 3h | 1h* | 4-5h |
| MyVillage | 3h | 2h | 5-6h |
| Disputes | 4h | 2h | 6h |
| Admin | 2h | 1h | 3-4h |
| Testing | - | - | 5-8h |
| **Total** | **23h** | **12h** | **40-48h** |

*Mostly already implemented; just verification & minor additions

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Email API rate limits | Users miss notifications | Implement queue, batch sending |
| Complex dispute logic | Wrong refunds | Test thoroughly, use business logic tests |
| Photo upload failures | Poor UX | Add retry logic, compression |
| Admin misuse | Safety issues | Audit logs, 2FA for admin |

---

## Launch Readiness Checklist

- [ ] All endpoints tested (API-level)
- [ ] All flows tested (E2E)
- [ ] Mobile responsive tested
- [ ] Security audit complete
- [ ] Performance acceptable (< 2s page load)
- [ ] Error handling good
- [ ] Email templates styled
- [ ] Admin training docs
- [ ] User docs/help center updated
- [ ] Monitoring/alerts set up

---

## Next Immediate Steps

1. **Read this plan thoroughly** - Understand the full scope
2. **Start with Task Execution (6-7h)**:
   - Review existing `taskExecution.ts` backend
   - Build photo upload component
   - Build status timeline
   - Hook it all together
3. **Test end-to-end** - Create a test task, execute, complete, rate
4. **Move to Wallet** - Should be quick since endpoints exist

**You're 80% of the way there. These are the final polish features.**

---

## Questions/Notes

- **Stripe/SingPass:** Still deferred until payment integration phase
- **Admin role:** Currently hardcoded to user_id=1; should use proper role column
- **Email templates:** Need to design HTML emails; recommend using template framework (EJS, Handlebars)
- **Recurring logic:** Sessions logic exists; just need dashboard UI
- **Notifications:** All 3 channels (in-app, push, email) infrastructure exists; just polish

---

**Ready to start? Begin with Task Execution - this is the foundation for everything else.**
