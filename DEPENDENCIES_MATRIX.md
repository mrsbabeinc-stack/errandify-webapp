# Errandify Features - Dependencies Matrix

## Dependency Overview

This matrix shows which features depend on which, helping you understand the build order.

---

## Feature Dependency Matrix

```
INDEPENDENT (no dependencies):
├── Email Notifications ────────┐
└── Admin Dashboard            │
                               │
LEVEL 1 (standalone, no deps):  │
├── Task Execution ◄───────────┘
│   └─ enables everything
│
LEVEL 2 (depends on Task Execution):
├── Wallet Dashboard
│   ├─ shows earnings from completed tasks
│   ├─ shows spending from posted tasks
│   └─ requires task completions exist
│
├── Ratings System
│   ├─ requires completed tasks
│   └─ displays on profiles
│
LEVEL 3 (depends on Ratings):
├── MyVillage Trust System
│   ├─ builds trusted list from ratings > 4.0
│   ├─ allows blocking users
│   └─ shows referral stats
│
LEVEL 4 (depends on Execution + Wallet):
├── Recurring Sessions Dashboard
│   ├─ shows session status
│   ├─ uses task execution to mark complete
│   └─ tracks earnings per session
│
LEVEL 5 (depends on Execution + Wallet):
├── Disputes & Cancellation
│   ├─ handles task conflicts
│   ├─ calculates refunds (needs wallet)
│   ├─ applies penalties
│   └─ requires completion status
│
LEVEL 6 (final layer - depends on everything):
└── Testing & Integration
    ├─ tests full workflow
    ├─ tests all features together
    └─ verifies no conflicts
```

---

## Build Order Implications

### Must Build First (Foundation):
1. **Task Execution** - Everything depends on this
   - Enables: Work to be started and completed
   - Unlocks: Wallet, Ratings, Sessions, Disputes

### Then Build (Core):
2. **Wallet Dashboard** - Financial transparency
   - Requires: Tasks to be completed
   - Enables: Users to see earnings/spending

3. **Ratings System** - Trust mechanism
   - Requires: Tasks to be completed
   - Enables: MyVillage trusted users

4. **Email Notifications** - Can build in parallel with above
   - Independent
   - Enhances: All other features with notifications

### Then Build (Intermediate):
5. **MyVillage Trust System** - Community features
   - Requires: Ratings (> 4.0 = trusted)
   - Enables: Better user discovery

6. **Sessions Dashboard** - Recurring support
   - Requires: Task Execution (to mark sessions complete)
   - Enables: Recurring tasks to be functional

### Then Build (Advanced):
7. **Disputes & Cancellation** - Safety features
   - Requires: Task Execution, Wallet (refund calculation)
   - Enables: Conflict resolution

### Finally:
8. **Admin Dashboard** - Operational control
   - Can build anytime (layout exists)
   - Benefits: Everything else working first for better testing

9. **Integration Testing** - Quality assurance
   - Requires: Everything else functional
   - Produces: Confidence before launch

---

## Detailed Dependency Map

### 1. Task Execution
**Depends on:** Nothing
**Dependencies:**
- Task Execution ← Wallet
- Task Execution ← Ratings
- Task Execution ← Sessions
- Task Execution ← Disputes
```
Decision: START HERE
Time: 6-7h
Impact: Unblocks all other features
```

---

### 2. Wallet Dashboard
**Depends on:** Task Execution
**Blocked by:** None
**Blocks:** Nothing (but useful with Ratings)
**Cross-feature refs:**
- Reads: `errands.budget`, `errands.status`, `errand_assignments.doer_id`
- Calculates: earnings from completed tasks, spending from posted tasks
```
Decision: Do immediately after Task Execution
Time: 4-5h
Impact: Financial visibility, doer motivation
```

---

### 3. Ratings System
**Depends on:** Task Execution
**Blocked by:** None
**Blocks:** MyVillage (needs ratings to determine "trusted")
**Cross-feature refs:**
- Reads: `errands.status`, `errand_assignments`
- Writes: `ratings` table
- Updates: `users.average_rating`, `users.total_ratings`
```
Decision: Do immediately after Task Execution
Time: 4-5h
Impact: Trust signals, doer accountability
```

---

### 4. Email Notifications
**Depends on:** Nothing
**Blocked by:** None
**Blocks:** Nothing
**Cross-feature refs:**
- Reads: All notification events from other features
- Writes: `email_digest_queue`, `email_logs`
- Relies on: `users.email`, `users.email_preferences`
```
Decision: Can do in parallel with 2-3
Time: 5-6h
Impact: User engagement without push dependency
Parallel path: Yes
```

---

### 5. MyVillage Trust System
**Depends on:** Ratings System (for calculating "trusted")
**Blocked by:** Ratings
**Blocks:** Nothing
**Cross-feature refs:**
- Reads: `ratings` (avg > 4.0)
- Writes: `user_relationships` (new table)
- Reads: `users.referral_code`
```
Decision: Do after Ratings complete
Time: 4-5h
Impact: Community features, user retention
```

---

### 6. Recurring Sessions Dashboard
**Depends on:** Task Execution (for marking sessions complete)
**Blocked by:** Task Execution
**Blocks:** Nothing (but enhances recurring feature)
**Cross-feature refs:**
- Reads: `errand_sessions`, `errand_assignments`
- Updates: `errand_sessions.status`
- Calculates: Progress (completed/total)
```
Decision: Do after Task Execution
Time: 4-5h
Impact: Recurring feature usability
Can do in parallel: With MyVillage
```

---

### 7. Disputes & Cancellation
**Depends on:** Task Execution + Wallet
**Blocked by:** Both needed
**Blocks:** Admin usefulness
**Cross-feature refs:**
- Reads: `errands.status`, `errands.budget`, `task_photos`
- Writes: `disputes`, `dispute_evidence`
- Updates: `errands.dispute_status`, `users.penalty_owed`
- Calls: Wallet refund logic
```
Decision: Do after Wallet complete
Time: 5-6h
Impact: Safety mechanism, conflict resolution
Complex: Business logic around refunds
```

---

### 8. Admin Dashboard
**Depends on:** Can enhance anytime, but better with everything working
**Blocked by:** Nothing (layout exists)
**Blocks:** Nothing
**Cross-feature refs:**
- Reads: All tables for analytics
- Updates: `users.suspended_until`, `disputes.status`
- Manages: User suspension, dispute resolution
```
Decision: Polish after core features
Time: 3-4h
Impact: Platform operations
Testing benefit: Higher with other features done
```

---

### 9. Integration Testing
**Depends on:** All of above
**Blocks:** Launch
**Testing flows:**
- Create → Bid → Accept → Execute → Complete → Rate → Wallet
- Recurring: Create → Multiple sessions → Track progress
- Dispute: Create → Dispute → Resolve → Refund
- Admin: Create scenario → Admin resolves → Verify result
```
Decision: Final phase
Time: 5-8h
Impact: Confidence before beta
```

---

## Parallel Work Opportunities

### Can Do in Parallel (if multiple people working):

**Path A (Frontend Person):**
1. Task Execution UI (week 1)
2. Wallet Dashboard UI (week 1)
3. Ratings UI (week 1)
4. Sessions UI (week 2)
5. MyVillage UI (week 2-3)
6. Disputes UI (week 3)
7. Admin UI (week 3-4)

**Path B (Backend Person):**
1. Verify Task Execution endpoints (week 1)
2. Email Notifications service (week 1-2)
3. User Relationships API (week 2)
4. Cancellation system (week 3)
5. Admin write endpoints (week 3)

**Time overlap:** Weeks 1-4
**Communication needed:** Minimal (APIs already exist)

---

## Critical Path

The shortest path to MVP (assuming solo development):

```
Day 1-2: Task Execution (6-7h)
   ↓
Day 3-4: Wallet Dashboard (4-5h)
   ↓
Day 5: Ratings (4-5h)
   ↓
Day 6-7: Email Notifications (5-6h) + Sessions (2-3h)
   ↓
Day 8: MyVillage (2-3h)
   ↓
Day 9-10: Disputes (5-6h)
   ↓
Day 11: Admin enhancements (2-3h)
   ↓
Day 12-14: Integration testing (5-8h)

Total: ~42-50 hours
Timeline: 5-6 weeks @ 8h/day

Or faster with parallel work:
Total: ~40-45 hours
Timeline: 4-5 weeks @ 8-10h/day with breaks
```

---

## Blocking Issues

### High Risk (likely to block progress):
1. Photo upload service (could fail, affects Task Execution)
   - Mitigation: Use simple URL-based service (Cloudinary, Vercel Blob)
   - Fallback: S3 with pre-signed URLs

2. Email service integration (could fail, affects Email Notifications)
   - Mitigation: Start with SendGrid (mature, reliable)
   - Fallback: SMTP relay

3. Complex refund logic (could have bugs, affects Disputes)
   - Mitigation: Write business logic tests first
   - Test with multiple scenarios before shipping

### Medium Risk (nice to have, can defer):
1. Admin 2FA (security nice-to-have, not MVP)
   - Mitigation: Defer to post-launch

2. Analytics dashboard (polish feature)
   - Mitigation: Defer to v2

### Low Risk (unlikely to block):
1. Styling/polish
   - Mitigation: Use existing design system

2. Form validation
   - Mitigation: Use existing validation patterns

---

## Data Flow Map

```
Task Creation
    ↓
Task → Bid → Accept
    ↓
Task Execution (START)
    ↓
  ├─ Photos uploaded → task_photos
  ├─ Status changed → errands.status
  └─ Timeline recorded → task_execution_logs (optional)
    ↓
Task Completion
    ├─ Marked complete → errands.completed_at
    ├─ Payment released → payment_releases (if Stripe)
    └─ Wallet updated ← Wallet Dashboard reads this
    ↓
Rating
    ├─ Rating submitted → ratings table
    ├─ Avg calculated → users.average_rating
    └─ MyVillage trusts → user_relationships (if avg > 4.0)
    ↓
Notification
    ├─ Event triggered
    ├─ Email queued → email_digest_queue
    ├─ Push sent → push_subscriptions
    └─ In-app created → notifications

Disputes (parallel flow):
    Task Issue
    ├─ Dispute opened → disputes table
    ├─ Evidence uploaded → dispute_evidence
    ├─ Admin resolves → disputes.status = resolved
    └─ Refund issued → wallet updates, penalty applied
```

---

## Checklist: Before Starting Each Feature

### Before Task Execution:
- [ ] DB task_photos table exists
- [ ] Backend /api/tasks/* endpoints verified
- [ ] Photo upload service chosen (Cloudinary, S3, etc.)

### Before Wallet:
- [ ] Tasks completed in test DB
- [ ] Backend /api/wallet/* endpoints verified
- [ ] Chart library chosen (Recharts, Chart.js)

### Before Ratings:
- [ ] Tasks completed in test DB
- [ ] Backend /api/ratings/* endpoints verified
- [ ] Star rating component ready

### Before Email Notifications:
- [ ] Email service account created (SendGrid/Resend)
- [ ] API keys configured
- [ ] Email templates designed

### Before MyVillage:
- [ ] Ratings system tested (so avg > 4 works)
- [ ] user_relationships table created
- [ ] user_id and other_user_id have relationship data

### Before Sessions:
- [ ] Task Execution working
- [ ] errand_sessions populated with test data
- [ ] Backend endpoints verified

### Before Disputes:
- [ ] Task Execution working
- [ ] Wallet system verified (refund logic)
- [ ] disputes table with all fields

### Before Admin:
- [ ] All other features at least partially working
- [ ] Can test admin on real data
- [ ] Admin endpoints verified

### Before Testing:
- [ ] All features passing individual tests
- [ ] No obvious bugs
- [ ] Mobile responsive verified

---

## Summary Table

| Feature | Week | Hours | Depends | Blocks | Risk |
|---------|------|-------|---------|--------|------|
| Task Execution | 1 | 6-7 | None | All | LOW |
| Wallet | 1 | 4-5 | Exec | None | LOW |
| Ratings | 1 | 4-5 | Exec | Village | LOW |
| Email Notify | 1-2 | 5-6 | None | None | MED |
| Sessions | 2 | 4-5 | Exec | None | LOW |
| MyVillage | 2-3 | 4-5 | Rating | None | LOW |
| Disputes | 3 | 5-6 | Exec+Wallet | Admin | HIGH |
| Admin | 3-4 | 3-4 | None | None | LOW |
| Testing | 4 | 5-8 | All | Launch | MED |

---

## Recommended Reading Order

1. This file (you are here)
2. IMPLEMENTATION_PLAN_COMPLETE.md (full details)
3. FEATURE_QUICK_REFERENCE.md (checklist)
4. Then start: Task Execution

---

**Key Insight:** Task Execution is the foundation. Everything else is either supporting it or enhancing it. Get Task Execution right, and the rest falls into place naturally.

Ready? Start with Task Execution. 🚀
