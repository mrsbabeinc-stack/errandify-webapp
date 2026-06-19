---
name: next_priorities_simplified
description: Simplified priority list after deferring SingPass and Stripe
metadata:
  type: project
  status: proposal
  date: 2026-06-19
---

# Next Priorities (SingPass & Stripe Deferred)

## KEY DECISION 🎯
**SingPass integration: LATER**
**Stripe integration: LATER**

This changes the priorities significantly!

---

## WHAT CAN YOU DO NOW (Without Stripe/SingPass)

### Continue with Task Workflow ✅

#### 1. Task Execution & Completion (5-6h) 🟠 NEXT
**What:**
- Status flow: confirmed → in_progress → completed
- Doer marks "started work"
- Doer uploads photos/proof
- Asker marks "work done"
- 48h dispute window display (even if not real)

**Why now:**
- Doesn't require Stripe
- Doesn't require SingPass
- Completes core workflow
- Shows full errand journey

**Impact:** Users can complete tasks end-to-end

---

#### 2. Task Chat & Messaging (3-4h) 🟠 NEXT
**What:**
- Improve existing TaskChatbox component
- Doer can send updates/photos
- Asker can request changes
- Timestamp and read receipts
- Notifications on new messages

**Why now:**
- Already have messaging DB
- Critical for work coordination
- Works with or without payment

**Impact:** Communication during execution

---

#### 3. Recurring Task Sessions Tracking (4-5h) 🟠 NEXT
**What:**
- Dashboard showing session status
- Mark individual sessions complete
- Show which doers accepted which sessions
- Track progress visually (X of Y sessions done)

**Why now:**
- Doesn't require payment
- Completes recurring feature
- Useful for planning

**Impact:** Recurring tasks become usable

---

#### 4. Rating System (3-4h) 🟢 AFTER ABOVE
**What:**
- Polish rating form
- Display ratings on profile
- Show review history
- Calculate average rating

**Why now:**
- Independent of payment
- Works with mock payments
- Important for trust

**Impact:** Trust signals between users

---

#### 5. Wallet Display (2-3h) 🟢 POLISH
**What:**
- Show wallet balance (mock for now)
- Transaction history (mock)
- Pending payments from tasks
- Layout for future payout button

**Why now:**
- UI-only, no integration needed
- Good for design & UX
- Ready for Stripe later

**Impact:** Professional user dashboard

---

## WHAT TO DEFER (Until SingPass/Stripe Ready)

### Defer These:
❌ SingPass authentication (do later)
❌ Real Stripe payments (do later)
❌ Real escrow holding (do later)
❌ Real payment release logic (do later)
❌ Real payout requests (do later)
❌ Admin dashboard (post-launch)

---

## MOCK PAYMENTS FOR NOW

Until Stripe is integrated, you can:

```
Bid Accepted Flow:
1. Asker "accepts" bid (no real payment)
2. System marks as "confirmed"
3. Show payment status as "pending" (mock)
4. Let doer work
5. Show "released" after completion (mock)

Wallet Display:
- Show pending earnings (mock)
- Show completed earnings (mock)
- Layout ready for real Stripe

This allows full testing without payment
```

---

## SIMPLIFIED PRIORITY LIST

### Order (What to Build Now):

#### Week 1: Task Workflow Completion
1. **Task Execution Flow** (5-6h)
   - Status transitions
   - Photo uploads
   - Completion marking
   - Est. savings: Show actual workflow

2. **Task Chat Improvement** (3-4h)
   - Better messaging UI
   - Photo support
   - Notifications
   - Est. savings: Communication during work

#### Week 2: Recurring & Rating
3. **Recurring Sessions Dashboard** (4-5h)
   - Session tracking
   - Individual session completion
   - Visual progress
   - Est. savings: Makes recurring usable

4. **Rating System** (3-4h)
   - Form polish
   - Profile display
   - Review history
   - Est. savings: Trust signals

#### Week 3: Polish & Prep
5. **Wallet UI** (2-3h)
   - Balance display (mock)
   - Transaction history (mock)
   - Earnings tracking
   - Est. savings: Ready for Stripe

6. **Testing & Bug Fixes** (4-5h)
   - Full end-to-end test
   - Bug fixes
   - Polish
   - Est. savings: Launch quality

**Total: 21-27 hours**
**Timeline: 2-3 weeks at 8h/day**

---

## WHAT THIS GIVES YOU

### Fully Functional MVP (Without Payment):
✅ Task creation (Hana + form)
✅ Bidding system
✅ Bid acceptance
✅ Task execution (status flow)
✅ Photo uploads
✅ Chat & messaging
✅ Task completion
✅ Rating system
✅ Profile with ratings
✅ Notifications (all 3 channels)
✅ Recurring errands with session tracking
✅ Mock payments (UI ready)

### Ready for Next Phase:
🔲 SingPass integration (when ready)
🔲 Real Stripe payments (when ready)
🔲 Real payment release (when ready)
🔲 Actual payout requests (when ready)

---

## LAUNCH STRATEGY

### Phase 1 (Now - 3 weeks):
Build everything except payments
- Full workflow works with mocks
- All features visible & functional
- Can invite testers
- Can't handle real money yet

### Phase 2 (Later):
Add SingPass & Stripe
- Real authentication
- Real payments
- Real money handling
- Go live

### Phase 3 (Post-launch):
Polish & enhance
- Admin dashboard
- Advanced analytics
- Payment disputes
- Improved search

---

## YOUR NEXT MOVE

### Recommend Starting With:

**Task Execution Flow (5-6h) 🎯 START HERE**
- Most critical for platform
- Unblocks testing
- Shows users completing work
- Foundation for chat, photos, rating

**Then Chat Improvements (3-4h)**
- Enables coordination
- Shows communication
- Works with execution

**Then Recurring Sessions (4-5h)**
- Makes recurring feature work
- Shows progress tracking
- Differentiator from competitors

**Then Rating (3-4h)**
- Builds trust
- Completes feedback loop

**Then Polish (4-6h)**
- Clean up rough edges
- Test end-to-end
- Ready for beta users

---

## WHAT YOU'LL HAVE AT END

A **fully functional task marketplace MVP** that:
- ✅ Posts tasks
- ✅ Gets bidders
- ✅ Accepts bids
- ✅ Executes work (with photos)
- ✅ Completes & rates
- ✅ Handles recurring (with session tracking)
- ✅ Notifies users (3 channels)
- ✅ Shows wallet (mock)
- ✅ Ready for payment integration

**All without needing SingPass or Stripe yet.**

---

## DEFERRAL PLAN

### When Ready for SingPass:
```
1. Integrate SingPass auth
2. Update user profiles
3. Verify mobile numbers
4. Switch from mock auth
```

### When Ready for Stripe:
```
1. Create Stripe accounts for users
2. Implement escrow holding
3. Switch from mock payments to real
4. Implement payment release logic
5. Add payout requests
```

---

## ESTIMATED EFFORT

| Feature | Hours | Can Do Now? |
|---------|-------|------------|
| Task execution | 5-6 | ✅ Yes |
| Chat improvements | 3-4 | ✅ Yes |
| Recurring sessions | 4-5 | ✅ Yes |
| Rating system | 3-4 | ✅ Yes |
| Wallet UI | 2-3 | ✅ Yes |
| Testing | 4-5 | ✅ Yes |
| SingPass integration | 4-5 | 🔲 Later |
| Stripe integration | 6-8 | 🔲 Later |

**Buildable now: 21-27 hours**
**Deferred: 10-13 hours**

---

## FINAL RECOMMENDATION

**Build the full MVP without payments in 2-3 weeks:**

1. Week 1: Task workflow (execution + chat)
2. Week 2: Recurring + rating
3. Week 3: Polish + testing

**Result:** Fully functional marketplace ready for testers

**Then integrate payments later when SingPass/Stripe ready**

This way you can:
- Test the platform fully
- Get user feedback early
- Iterate on core workflows
- Add payments when infrastructure ready
- Launch sooner with MVP features

---

## NEXT 3 WEEKS AT A GLANCE

**Week 1 (8-10h):**
- [ ] Task execution status flow
- [ ] Photo upload implementation
- [ ] Chat UI improvements

**Week 2 (8-10h):**
- [ ] Recurring sessions dashboard
- [ ] Rating system
- [ ] Wallet UI (mock)

**Week 3 (5-7h):**
- [ ] Bug fixes
- [ ] End-to-end testing
- [ ] Polish rough edges

**Result:** MVP ready for beta testers

---

## Ready to Start?

Ready to pick up with **Task Execution** (5-6 hours)?
This is the next logical step and unlocks the full workflow.

Or would you like to tackle something else first?
