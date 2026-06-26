# Comprehensive Notification Strategy

## Overview
Multi-channel notifications for asker and doer throughout errand lifecycle:
- **In-app Toast** (top center, non-intrusive, 5s auto-dismiss)
- **Notification Bell** (counter badge, shows all notifications)
- **Email** (configurable: immediate or daily digest)
- **Critical Alerts** (ALWAYS shown, can't be disabled)

---

## Notification Types & Rules

### TIER 1: CRITICAL (Always Shown - Cannot Be Disabled)
These are essential for errand completion and payment. Users cannot disable.

#### For ASKER:
| Event | Trigger | Message | Channels | Timing |
|-------|---------|---------|----------|--------|
| Bid Received | Doer bids | "💰 John bid $50 for your errand" | Toast + Bell + Email | Immediate |
| Bid Accepted | Asker clicks accept | "✅ You accepted John's offer ($50)" | Toast + Bell | Immediate |
| Job Starting | Doer clicks start | "🚀 John is starting your job!" | Toast + Bell + Email | Immediate |
| Job Completed | Doer clicks complete | "✅ John completed your errand! Please review within 48h" | Toast + Bell + Email | Immediate |
| Payment Released | Auto after 48h | "💰 Payment of $50 released to John" | Bell + Email | Auto |

#### For DOER:
| Event | Trigger | Message | Channels | Timing |
|-------|---------|---------|----------|--------|
| Bid Accepted | Asker clicks accept | "✅ Sarah accepted your offer!" | Toast + Bell + Email | Immediate |
| Confirmation Needed | Bid accepted | "🔔 You have 24h to confirm you can help" | Toast + Bell + Email | Immediate |
| Job Started | Doer clicks start | "⏱️ Timer started! Work on: Clean living room" | Toast + Bell | Immediate |
| Rating Received | Asker rates | "⭐ Sarah rated you 5 stars! \"Great work!\"" | Toast + Bell + Email | Immediate |
| Payment Coming | Job completed | "💸 Your payment is being processed ($50)" | Toast + Bell + Email | After 48h |

---

### TIER 2: IMPORTANT (User-Configurable, Default ON)
Users can disable, but it's ON by default.

#### For ASKER:
| Event | Message | Channels | Config |
|-------|---------|----------|--------|
| Bid Rejected | "❌ John's offer was rejected" | Bell + Email | Default: ON |
| Changes Requested | "🔧 John is asking for changes" | Toast + Bell + Email | Default: ON |
| Dispute Raised | "⚠️ Dispute raised - admin reviewing" | Toast + Bell + Email | Default: ON |
| Job Reopened | "🔄 John reopened the job" | Bell + Email | Default: ON |
| Changes Completed | "✅ John made the changes" | Toast + Bell | Default: ON |

#### For DOER:
| Event | Message | Channels | Config |
|-------|---------|----------|--------|
| Bid Rejected | "❌ Your offer was not selected" | Bell + Email | Default: ON |
| Confirmation Expiring | "⏰ 1 hour left to confirm!" | Toast + Bell | Default: ON |
| Changes Requested | "🔧 Asker is requesting changes" | Toast + Bell + Email | Default: ON |
| Job Expired | "❌ 48-hour review period ended" | Bell + Email | Default: ON |

---

### TIER 3: INFORMATIONAL (User-Configurable, Default OFF)
Nice-to-have updates. Users can enable if interested.

#### For ASKER:
| Event | Message | Channels | Config |
|-------|---------|----------|--------|
| Doer Profile Viewed | "👤 John viewed your job listing" | Bell | Default: OFF |
| Doer Started Typing | "✏️ John is typing..." | Toast (silent) | Default: OFF |
| Similar Jobs Posted | "📌 5 similar tasks posted near you" | Bell | Default: OFF |

#### For DOER:
| Event | Message | Channels | Config |
|-------|---------|----------|--------|
| Asker Profile Viewed | "👤 Sarah viewed your profile" | Bell | Default: OFF |
| Similar Jobs Available | "📌 5 similar tasks in your area" | Bell | Default: OFF |

---

## Channel Details

### 1. In-App Toast (Top Center)
**Behavior:**
- Position: Top center (10% from top)
- Width: 400px max
- Auto-dismiss: 5 seconds
- Closeable: X button
- Non-intrusive: appears above content
- Stacks: Multiple toasts stack vertically

**Styling:**
```
CRITICAL (Red/Orange):
  Background: bg-red-50 border-l-4 border-red-500
  Text: text-red-900
  Icon: ⚠️ 🔴

SUCCESS (Green):
  Background: bg-green-50 border-l-4 border-green-500
  Text: text-green-900
  Icon: ✅ 🟢

INFO (Blue):
  Background: bg-blue-50 border-l-4 border-blue-500
  Text: text-blue-900
  Icon: ℹ️ 🔵
```

**Example Toast:**
```
┌─────────────────────────────────────────┐
│ ✅ John accepted your offer!            │ ✕
│ You have 24 hours to confirm            │
└─────────────────────────────────────────┘
(Auto-dismisses after 5 seconds)
```

### 2. Notification Bell Icon
**Behavior:**
- Location: Header (next to profile)
- Badge: Red counter (1-99+) when unread
- Click: Opens notification panel
- Real-time: Updates as notifications arrive

**Notification Panel:**
```
NOTIFICATION CENTER
━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 UNREAD (3)
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ John accepted your offer
   2 minutes ago
   
💰 Payment of $50 released
   1 hour ago
   
⭐ Sarah rated you 5 stars
   3 hours ago

━━━━━━━━━━━━━━━━━━━━━━━━━
📖 READ (12)
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ You posted "Clean room"
   Jan 28, 2:30 PM
   
💰 John bid $50
   Jan 28, 3:15 PM
   
[View All] [Clear All]
```

### 3. Email Notifications
**Configuration Options:**
- **Immediate:** Get email right away (for critical alerts)
- **Daily Digest:** Combined email once per day at 8 AM
- **Weekly:** Combined email every Monday at 8 AM
- **Disabled:** No email notifications

**Email Template Example:**
```
Subject: ✅ John accepted your errand offer!

Hi Sarah,

Great news! John accepted your offer for "Clean living room" at $50.

📋 OFFER DETAILS:
- Budget: $50
- John's rating: 4.8⭐ (12 reviews)
- Action Required: You have 24 hours to confirm

NEXT STEPS:
1. Review John's profile
2. Chat with John if you have questions
3. Click "Confirm" to proceed

[View Offer] [Chat with John] [Confirm]

Questions? Reply to this email or contact support.

—
Errandify | Get Help. Give Help.
```

---

## User Configuration Settings

### Notification Preferences Page
Location: MyAccount → Notifications

```
NOTIFICATION PREFERENCES
━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL ALERTS (Always On)
These notifications cannot be disabled as they're essential for your safety and payments.

✅ In-App Toast
   Enabled (cannot disable)
   
🔔 Notification Bell
   Enabled (cannot disable)
   
📧 Email
   ⚪ Immediate
   ⭕ Daily Digest (8 AM)
   ⭕ Disabled

━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ IMPORTANT ALERTS (Configurable)
Default: ON | You can turn these off

☑ Bid Rejected
☑ Changes Requested
☑ Dispute Updates
☑ Job Status Changes
☑ Payment Updates

━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ INFORMATIONAL (Configurable)
Default: OFF | You can turn these on

☐ Profile Viewed
☐ Similar Jobs Posted
☐ New Doers in Area
☐ Tips & Best Practices

━━━━━━━━━━━━━━━━━━━━━━━━━

[Save Preferences]
```

---

## Notification Flow During Errand Lifecycle

### ASKER'S NOTIFICATIONS

```
1️⃣ POSTING ERRAND
   ✅ Toast: "Errand posted! Waiting for offers..."
   + Bell notification (stays until dismissed)

2️⃣ DOER BIDS
   🔴 CRITICAL Toast: "💰 John bid $50!"
   + Email (immediate or digest)
   + Bell counter: 1

3️⃣ ASKER ACCEPTS BID
   ✅ Toast: "Offer accepted! Waiting for John to confirm..."
   + Bell notification

4️⃣ DOER CONFIRMS
   ✅ Toast: "John is ready! Job confirmed."
   + Bell notification
   + Email (optional)

5️⃣ DOER STARTS JOB
   🚀 Toast: "John started your job! See you soon."
   + Email (important)
   + Bell notification

6️⃣ DOER COMPLETES JOB
   🔴 CRITICAL Toast: "✅ John finished! Please rate within 48h"
   + Email (immediate)
   + Bell counter updates

7️⃣ PAYMENT RELEASED
   💰 Bell only: "Payment of $50 released"
   + Email (important)
```

### DOER'S NOTIFICATIONS

```
1️⃣ DOER BIDS
   ✅ Toast: "Offer submitted! Waiting for Sarah's response..."

2️⃣ BID ACCEPTED
   🔴 CRITICAL Toast: "✅ Sarah accepted your offer!"
   + Email (immediate)
   + Bell counter: 1

3️⃣ CONFIRMATION NEEDED
   ⚠️ Toast: "🔔 You have 24 hours to confirm"
   + Email (important)

4️⃣ DOER CONFIRMS
   ✅ Toast: "You're all set! Ready to start?"

5️⃣ DOER STARTS JOB
   ⏱️ Toast: "⏱️ Timer started! 'Clean living room'"
   + Bell notification

6️⃣ DOER COMPLETES JOB
   ✅ Toast: "Work submitted! Waiting for Sarah to rate..."
   + Email

7️⃣ RATING RECEIVED
   🔴 CRITICAL Toast: "⭐ Sarah gave you 5 stars!"
   + Email (immediate)

8️⃣ PAYMENT RELEASED
   💰 Toast: "💸 Payment of $50 coming to your account"
   + Email (important)
```

---

## Implementation Components Needed

### 1. ToastNotification Component
```jsx
<ToastNotification
  type="critical" | "success" | "info"
  message="John accepted your offer!"
  icon="✅"
  duration={5000}
  onClose={() => {}}
/>
```

### 2. NotificationBell Component
```jsx
<NotificationBell
  unreadCount={3}
  notifications={[...]}
  onNotificationClick={(id) => {}}
/>
```

### 3. NotificationPreferences Component
```jsx
<NotificationPreferences
  userPrefs={{
    emailFormat: 'digest',
    criticalAlerts: true,
    importantAlerts: true,
    informational: false,
  }}
  onSave={(newPrefs) => {}}
/>
```

### 4. Email Notification Service
```typescript
sendCriticalEmail(userId, type, data) // ALWAYS send
sendConfigurableEmail(userId, type, data) // Check user prefs
sendDigestEmail(userId, notifications) // Daily at 8 AM
```

---

## Backend Requirements

### Database Schema
```sql
CREATE TABLE user_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50), -- 'bid_placed', 'bid_accepted', etc.
  tier VARCHAR(20), -- 'critical', 'important', 'informational'
  title VARCHAR(255),
  message TEXT,
  icon VARCHAR(10),
  related_errand_id INTEGER,
  related_user_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- For old notifications cleanup
);

CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  email_format VARCHAR(20), -- 'immediate', 'digest', 'disabled'
  digest_time TIME, -- 8:00:00 for 8 AM
  critical_in_app BOOLEAN DEFAULT true,
  important_in_app BOOLEAN DEFAULT true,
  informational_in_app BOOLEAN DEFAULT false,
  critical_email BOOLEAN DEFAULT true,
  important_email BOOLEAN DEFAULT true,
  informational_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints
```
GET    /api/notifications              -- Get user's notifications
GET    /api/notifications/unread       -- Get unread count
POST   /api/notifications/:id/read     -- Mark as read
POST   /api/notifications/read-all     -- Mark all as read
DELETE /api/notifications/:id          -- Delete notification
GET    /api/notifications/preferences  -- Get user's preferences
POST   /api/notifications/preferences  -- Update preferences
```

---

## Timeline Examples

### Example 1: Complete Asker Flow with Notifications

```
2:30 PM: Asker posts errand
   Toast: "✅ Errand posted!"
   Bell: 1 notification

3:15 PM: John bids $50
   Toast: "💰 John bid $50 for your errand!"
   Email: Immediate (critical)
   Bell: 2 unread

4:00 PM: Asker accepts John's bid
   Toast: "✅ John is being notified..."
   Bell: 1 (read)

5:45 PM: John confirms he's ready
   Toast: "🚀 John is ready to start!"
   Email: Sent (important)
   Bell: 1 unread

9:00 AM (Next day): John starts job
   Toast: "John started your errand!"
   Bell: 1 unread

3:30 PM: John completes job
   Toast: "✅ John finished! Please rate within 48 hours"
   Email: CRITICAL - Immediate (rating deadline)
   Bell: 1 unread
   (Bell shows "48h countdown" badge)

(After Asker rates)
   Toast: "⭐ Thank you for rating!"
   Email: John gets rating notification
```

---

## Benefits

✅ **Non-Intrusive:** Toast auto-dismisses, doesn't block content
✅ **Critical Safety:** Important notifications always shown
✅ **User Control:** Customize non-critical notifications
✅ **Multi-Channel:** In-app, email, push (future)
✅ **Smart Timing:** Immediate for critical, batched for non-critical
✅ **Mobile-Ready:** Bell icon works on all devices
✅ **Accessible:** Screen readers can read toasts and bells
✅ **Offline Support:** Email works when user is offline

---

## Success Metrics

- **Toast Engagement:** 80%+ users dismiss/read toasts
- **Email Open Rate:** 45%+ open critical notifications
- **Opt-In Rate:** 60%+ enable important alerts
- **Complaint Rate:** <5% say notifications are annoying
- **Missed Actions:** <2% miss critical deadline due to notification failure

---

This system ensures both asker and doer are guided through every step while respecting their preferences and attention. 🎯
