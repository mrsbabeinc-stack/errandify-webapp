# Complete Guided Experience System

## Overview
A comprehensive guidance system that proactively tells both askers and doers what to do next at every stage of the errand lifecycle. Combines dynamic status cards, activity timelines, and tooltips for intuitive guidance.

---

## Components

### 1. ErrandStatusCard.tsx
**Purpose:** Shows current status, what's happened, what's next, and action buttons

**Features:**
- **Status-Aware:** Different content for each of 10+ errand statuses
- **Role-Aware:** Different guidance for askers vs. doers
- **Expandable:** Click to reveal full details (what happened, what's next)
- **Color-Coded:** Visual status indicator (blue/yellow/orange/green/red)
- **Action Buttons:** Shows only relevant actions for current status

**Statuses Covered:**

**ASKER VIEWS:**
1. `open` - "Your Errand is Live" → waiting for offers
2. `has_bids` - "You Have Offers!" → review and select
3. `confirmed` - "Waiting for Confirmation" → doer has 24h to confirm
4. `confirmed_awaiting_start` - "Ready to Start" → doer will start soon
5. `in_progress` - "Work in Progress" → doer is working
6. `completed` - "Work Completed!" → asker must rate (48h window)
7. `disputed` - "Dispute Raised" → admin reviewing

**DOER VIEWS:**
1. `has_bids` - "Your Offer is Pending" → waiting for response
2. `confirmed` - "Offer Accepted!" → have 24h to confirm
3. `confirmed_awaiting_start` - "Start the Work!" → click START JOB
4. `in_progress` - "You're Working!" → complete and click DONE
5. `completed` - "Waiting for Review" → asker has 48h to rate
6. `disputed` - "Dispute Raised" → respond and provide evidence

**Data Flow:**
```
ErrandDetailPage
├─ passes: errandId, status, userRole
├─ passes: doerName, askerName, budget, deadline
├─ passes: callbacks (onStartJob, onCompleteJob, onRateWork, etc.)
└─ renders: dynamic card + expandable details + action buttons
```

---

### 2. ErrandActivityTimeline.tsx
**Purpose:** Shows complete history of all actions on the errand

**Features:**
- **Auto-Fetches:** Gets activity log from `GET /api/errands/:id/activity-log`
- **Visual Timeline:** Dots and lines connecting events chronologically
- **Rich Icons:** Different icon for each action type (📝, 💰, ⭐, etc.)
- **Timestamps:** Formatted to SGT timezone (Jan 28, 2:30 PM)
- **Detailed Info:** Shows actor, role, action, and extra details
- **Real-Time:** Auto-refreshes when new activities occur

**Displayed Activities:**
- ✅ Posted errand
- 💰 Bid placed ($50)
- ✅ Bid accepted/rejected
- ⏱️ Job started
- ✅ Job completed
- ⭐ Review submitted (5⭐)
- ⚠️ Dispute raised
- 🔄 Job reopened
- 🚫 Errand cancelled
- 🔧 Changes requested
- 💸 Payment made ($50)

**Data Flow:**
```
ErrandDetailPage
├─ passes: errandId, userRole
├─ auto-fetches: GET /api/errands/:id/activity-log
└─ renders: timeline with all activities + timestamps
```

---

### 3. GuidanceTooltip.tsx
**Purpose:** Contextual help tooltips on hover or click

**Features:**
- **Hoverable/Clickable:** Works both ways
- **Positioned:** top/bottom/left/right support
- **Stylish:** Dark background, white text, arrow pointer
- **Reusable:** Wrap any element for help

**Usage Example:**
```jsx
<GuidanceTooltip
  title="Why 48 Hours?"
  content="You have 48 hours to review the completed work. After that, payment releases automatically even if you haven't rated."
>
  <button>⭐ Rate Work</button>
</GuidanceTooltip>
```

---

## Integration Guide

### Step 1: Import Components
```jsx
import ErrandStatusCard from '../components/ErrandStatusCard';
import ErrandActivityTimeline from '../components/ErrandActivityTimeline';
import GuidanceTooltip from '../components/GuidanceTooltip';
```

### Step 2: Add to ErrandDetailPage (or equivalent)
```jsx
<div className="space-y-6">
  {/* Status Card - Shows what to do next */}
  <ErrandStatusCard
    errandId={errandId}
    status={errand.status}
    userRole={userRole}
    budget={errand.budget}
    deadline={errand.deadline}
    doerName={doerName}
    askerName={askerName}
    onStartJob={handleStartJob}
    onCompleteJob={handleCompleteJob}
    onRateWork={handleRateWork}
    onRequestChanges={handleRequestChanges}
    onChat={handleChat}
    onCancel={handleCancel}
  />

  {/* Activity Timeline - Shows complete history */}
  <ErrandActivityTimeline
    errandId={errandId}
    userRole={userRole}
  />

  {/* Optional: Add tooltips to important elements */}
  <GuidanceTooltip
    title="What is 48 Hours?"
    content="After the doer completes work, you have 48 hours to review and rate. Payment releases automatically after."
  >
    <button>Learn More</button>
  </GuidanceTooltip>
</div>
```

---

## Workflow Examples

### Example 1: Asker's Journey (Completed Status)
**Status Card Shows:**
```
✅ Work Completed!
Sarah finished the job

What's happened:
✅ You posted the errand
✅ Sarah accepted the offer
✅ Sarah completed the work

What's next:
⭐ Rate their work (REQUIRED for payment)
⏰ You have 48 hours to review
💰 Payment releases after you rate

[⭐ Rate Sarah's Work] [🔄 Request Changes] [💬 Chat]
```

**Timeline Shows:**
```
Jan 28 2:30 PM  ✅ You posted "Clean living room"
Jan 28 3:15 PM  💰 Sarah bid $50
Jan 28 4:00 PM  ✅ You accepted Sarah's offer
Jan 28 5:45 PM  ✅ Sarah confirmed ready
Jan 29 9:00 AM  ⏱️ Sarah started job
Jan 30 3:30 PM  ✅ Sarah completed work
Jan 30 3:35 PM  ⏳ Waiting for your review...
```

---

### Example 2: Doer's Journey (In Progress Status)
**Status Card Shows:**
```
⏱️ You're Working!
Timer is running, stay focused

What's happened:
✅ Offer was accepted
✅ You confirmed ready
✅ Work started

What's next:
✏️ Complete the work
📸 Take photos/videos as proof
✅ Click COMPLETE when done

[✅ Mark as Complete] [💬 Chat for Help]
```

**Timeline Shows:**
```
Jan 28 3:15 PM  💰 You bid $50
Jan 28 4:00 PM  ✅ Asker accepted your offer
Jan 28 5:45 PM  ✅ You confirmed you're ready
Jan 29 9:00 AM  ⏱️ You started the job
Jan 30 2:45 PM  ⏳ Still in progress...
```

---

## Backend Requirements

### Activity Log API
**Endpoint:** `GET /api/errands/:errandId/activity-log`

**Returns:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "activity_type": "posted",
      "actor_name": "Sarah Tan",
      "actor_role": "asker",
      "details": null,
      "created_at": "2026-01-28T14:30:00Z"
    },
    {
      "id": 2,
      "activity_type": "bid_placed",
      "actor_name": "John Lee",
      "actor_role": "doer",
      "details": {"amount": 50},
      "created_at": "2026-01-28T15:15:00Z"
    }
  ]
}
```

### Required Activity Types
- `posted` - Errand posted
- `bid_placed` - Bid submitted (amount)
- `bid_accepted` - Bid accepted
- `bid_rejected` - Bid rejected
- `started` - Job started
- `completed` - Job completed
- `rating_submitted` - Review submitted (rating)
- `dispute_raised` - Dispute raised
- `reopened` - Job reopened
- `cancelled` - Errand cancelled
- `changes_requested` - Changes requested
- `payment_made` - Payment released (amount)

---

## Features Summary

| Feature | Card | Timeline | Tooltip |
|---------|------|----------|---------|
| Shows current status | ✅ | - | - |
| Shows what happened | ✅ | ✅ | - |
| Shows what's next | ✅ | - | - |
| Shows action buttons | ✅ | - | - |
| Shows timeline | - | ✅ | - |
| Shows timestamps | - | ✅ | - |
| Contextual help | - | - | ✅ |
| Role-aware (asker/doer) | ✅ | ✅ | - |
| Status-aware | ✅ | - | - |
| Auto-refresh | - | ✅ | - |
| Expandable | ✅ | - | - |

---

## Color Coding

- 🔵 **Blue** - Waiting/Pending (awaiting action)
- 🟡 **Yellow** - Decision Needed (choose an action)
- 🟠 **Orange** - Warning/Time-Sensitive (act soon)
- 🟢 **Green** - Success/Complete (good news)
- 🔴 **Red** - Error/Dispute (action required)

---

## User Experience Flow

```
User arrives → Status Card (guidance) → Activity Timeline (history) → Tooltips (help)
                       ↓
                    Can see:
                    - What happened
                    - What's next
                    - What to do now
                    - Full timeline
                    - Additional help
                       ↓
                    Takes action
                    (button click)
                       ↓
                    Activity logs
                    (backend)
                       ↓
                    Timeline updates
                    (real-time)
                       ↓
                    Status card
                    changes
                       ↓
                    Cycle repeats
```

---

## Next Steps

1. **Integration:** Add components to ErrandDetailPage
2. **Testing:** Verify all 10 statuses show correct cards
3. **Styling:** Adjust colors/spacing to match app design
4. **Notifications:** Add toast/email when next action needed
5. **Analytics:** Track which guidance users follow
6. **A/B Testing:** Compare guided vs. non-guided experience

---

This system ensures both askers and doers are never confused about what to do next, reducing support tickets and improving user satisfaction. 🎯
