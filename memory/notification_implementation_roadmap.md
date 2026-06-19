---
name: notification_implementation_roadmap
description: Complete notification system roadmap - recommended phased approach with timing and priorities
metadata:
  type: project
  status: proposal
  date: 2026-06-19
---

# Notification Implementation Roadmap - Best Way Forward

## EXECUTIVE SUMMARY

Build a **3-Phase notification system** that ensures users ALWAYS get important updates:

```
Phase 1 (Week 1): In-App Notifications (6 hours)
├─ Bell icon in header
├─ Notification list/dropdown
├─ Toast popups for actions
└─ Polling every 10 seconds

Phase 2 (Week 2): Browser Push (4 hours)
├─ Service Worker registration
├─ Browser push API integration
├─ Notification clicks → app navigation
└─ Works even when app is closed

Phase 3 (Week 2-3): Smart Email (6 hours)
├─ Immediate emails (critical events)
├─ Daily digest (summary)
├─ User preferences (frequency control)
└─ Scheduled reminders (payment deadline)

TOTAL: 16 hours
RESULT: 100% user reach, no spam, high engagement
```

---

## PHASE 1: IN-APP NOTIFICATIONS (Week 1 - 6 hours) ⭐ START HERE

### What It Does
```
User sees notifications WHILE browsing the app

Header: 🔔(3) ← Bell icon with unread count
Click bell → Dropdown shows:
  🎯 Task Available Again! (2 mins ago)
     "Cleaning House" $95 ready [Accept Now]
  
  💰 Bid Accepted! (5 hours ago)
     Your bid selected, proceed to payment
  
  ✅ Payment Released (1 day ago)
     $115 in your wallet

Bottom-right corner (Toast):
  ┌─────────────────────────────┐
  │ 🎯 Task Available Again!    │
  │ Bid $95 ready (30 min limit)│
  │ [Accept Now] [Dismiss]      │
  └─────────────────────────────┘
  (Auto-disappears after 5-10s)
```

### Implementation Details

**Files to Create:**
1. `frontend/src/components/NotificationBell.tsx`
2. `frontend/src/components/NotificationDropdown.tsx`
3. `frontend/src/components/NotificationToast.tsx`
4. `frontend/src/hooks/useNotifications.ts`
5. `frontend/src/context/NotificationContext.tsx`

**Files to Modify:**
1. `frontend/src/layouts/MainLayout.tsx` - Add bell to header
2. All API success handlers - Show toast on important actions

**Backend Changes:** None (DB already has notifications table)

### Architecture
```
App.tsx
├─ NotificationContext (global state)
│  ├─ notifications: []
│  ├─ unreadCount: number
│  └─ addNotification(type, message, action)
├─ MainLayout
│  ├─ NotificationBell (header)
│  │  ├─ Shows bell icon with count
│  │  └─ Click → NotificationDropdown
│  └─ NotificationToastContainer (bottom-right)
│     └─ Stacks up to 3 toasts
└─ Every page/component
   └─ Can call addNotification() for custom toasts

useNotifications hook:
├─ Fetches from GET /api/notifications
├─ Polls every 10 seconds
├─ Updates global state
└─ Components re-render on notification change
```

### Code Skeleton

```typescript
// NotificationBell.tsx
function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="relative">
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      
      {isOpen && (
        <NotificationDropdown 
          notifications={notifications}
          onAction={(url) => navigate(url)}
        />
      )}
    </>
  );
}

// useNotifications.ts
function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.notifications);
    };

    fetchNotifications(); // Fetch on mount
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    dismissNotification: (id) => {/* call API */}
  };
}

// NotificationToast.tsx
function NotificationToast({ notification, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded shadow-lg p-4 animate-slideup">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{notification.icon}</span>
        <div className="flex-1">
          <p className="font-bold">{notification.title}</p>
          <p className="text-sm text-gray-600">{notification.body}</p>
          {notification.actionUrl && (
            <Link 
              to={notification.actionUrl} 
              className="text-errandify-orange font-semibold text-sm"
              onClick={onDismiss}
            >
              {notification.actionLabel || 'View'}
            </Link>
          )}
        </div>
        <button onClick={onDismiss}>✕</button>
      </div>
    </div>
  );
}
```

### User Control: Notification Preferences
```
Settings → Notifications Page:

🔴 CRITICAL (Always show)
☑ Bid accepted
☑ Task reopened  
☑ Payment released
(Can't disable - these are important)

🟡 MEDIUM (Choose visibility)
☐ New bid received
☐ Bid rejected
☐ Message received
☐ Task started
☐ Review received

🟢 LOW (Optional)
☐ Profile viewed
☐ Referral activity
☐ Platform updates

Save button → Updates user.notification_preferences JSON

When notification created:
1. Check type (bid_accepted, new_bid, etc)
2. Check user preference for that type
3. Only show if enabled
4. Skip if disabled (don't create notification at all)
```

### What It Solves
✅ Users see notifications while browsing
✅ Visual feedback for actions
✅ Urgent events highlighted
✅ Quick navigation to tasks/payments
✅ User control over what they see (NO unwanted notifications)
✅ Prevents notification fatigue

### What It DOESN'T Solve
❌ Users offline don't see anything
❌ Limited to active browsing time
❌ Polling is not real-time (10s delay)

**Status: Ready to implement immediately**

---

## PHASE 2: BROWSER PUSH NOTIFICATIONS (Week 2 - 4 hours) ⭐ CRITICAL

### What It Does
```
Even when user is NOT on the site:

User's phone/desktop shows notification:
┌──────────────────────────────┐
│ 🎯 Errandify                 │
│ Task Available Again!        │
│ "Cleaning House" $95 bid     │
│ [Click to accept]            │
└──────────────────────────────┘

User clicks → Browser opens → App navigates to task
Works because browser notifications are OS-level (Windows/Mac/iOS notifications)
```

### How It Works

**Step 1: User Grants Permission (Once)**
```
On first visit, browser asks:
┌──────────────────────────────┐
│ Errandify wants to send       │
│ notifications                │
│        [Allow] [Block]       │
└──────────────────────────────┘

If Allow:
├─ Service Worker registered
├─ Push subscription created
└─ Stored in database

If Block:
└─ App continues without push (falls back to Phase 1)
```

**Step 2: Backend Sends Push**
```
When task reopened:

Backend:
1. Create notification (already doing)
2. Get user's push subscription
3. Send to browser:
   {
     title: "🎯 Task Available Again!",
     body: "Cleaning House - $95 bid",
     icon: "https://...",
     badge: "https://...",
     data: {
       url: "/errand/123/reaccept-bid/95"
     }
   }
4. Browser delivers to OS notification center

User's OS (Windows/Mac/iOS):
├─ Shows notification in system tray
├─ Can be seen even if browser closed
└─ Persists until clicked/dismissed
```

**Step 3: User Clicks**
```
User clicks notification
└─ Browser opens (if closed)
└─ App loads
└─ Auto-navigates to /errand/123/reaccept-bid/95
└─ Bid auto-fills and pre-accepts
✓ Done! Task accepted in 1-2 clicks
```

### Implementation Details

**Frontend Changes:**
1. Register Service Worker in App.tsx
2. Request push permission on first visit
3. Store subscription in browser localStorage
4. Send subscription to backend when registered

**Backend Changes:**
1. Save push subscriptions (web_push_subscriptions table)
2. When sending notification, also send push:
   ```typescript
   // After creating notification
   const subscriptions = await getPushSubscriptions(userId);
   for (const sub of subscriptions) {
     await sendPushNotification(sub, {
       title: "🎯 Task Available Again!",
       body: taskTitle,
       url: actionUrl,
       icon: "..."
     });
   }
   ```
3. Handle push notification clicks

**Database:**
```sql
CREATE TABLE web_push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  subscription_data JSONB, -- Push subscription object
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

### What It Solves
✅ Reaches users even when offline
✅ Works with browser closed
✅ Instant delivery (real-time)
✅ System-level notifications (high visibility)
✅ Users can click to take action

### What It Doesn't Solve
❌ Requires browser permission (some users block)
❌ Doesn't work for all browsers (older versions)
❌ Only works if browser installed (not Safari desktop yet)

**Status: Ready after Phase 1 complete**

---

## PHASE 3: SMART EMAIL NOTIFICATIONS (Week 2-3 - 6 hours) ⭐ BACKUP GUARANTEE

### What It Does
```
Send emails strategically to reach 100% of users

Type 1: IMMEDIATE (Critical - Time-sensitive)
Subject: "🎯 Bid Accepted! Payment needed in 24h"
When: Within 5 minutes of bid acceptance
To: User who bid
Frequency: Always

Type 2: DAILY DIGEST (Low-priority - Batched)
Subject: "📋 Your Errandify Summary - 5 new bids"
When: Daily at 9am
To: Users with pending notifications
Batches: Multiple bids → 1 email

Type 3: REMINDER (Deadline - Scheduled)
Subject: "⏰ Payment expires in 24 hours"
When: 23 hours after bid acceptance
To: User who accepted but hasn't paid
Frequency: Once per task
```

### Smart Rules (No Spam!)
```
Rule 1: Critical events get immediate email
├─ Bid accepted
├─ Task reopened
├─ Payment released
└─ Rating received

Rule 2: Low-priority batched in digest
├─ New bid received (5 bids → 1 digest)
├─ Message received (multiple → 1 email)
└─ Task status updates

Rule 3: User controls frequency
├─ Immediate (for critical only)
├─ Daily (9am summary)
├─ Weekly (Mondays at 9am)
└─ Never (app only)

Rule 4: Respect quiet hours
├─ No emails between 9pm-7am
├─ Queue and send in morning
└─ Sunday emails on Monday morning

Rule 5: Easy unsubscribe
├─ One-click unsubscribe in footer
├─ But keep transactional (password reset)
└─ Respect user choice
```

### Implementation Details

### User Control: Email Preferences
```
Settings → Email Notifications:

Frequency:
◉ Immediate (Critical events only)
○ Daily Digest (9am summary)
○ Weekly Digest (Monday 9am)
○ Never (App only, no email)

Which events to email:
🔴 ALWAYS (Can't disable):
☑ Bid accepted
☑ Payment released
☑ Task reopened

🟡 CONFIGURABLE:
☐ New bids received (in digest)
☐ Messages (in digest)
☐ Task completed (immediate)
☐ Review received (immediate)

Quiet hours:
⏰ No emails between [___] and [___] (default 9pm-7am)
```

**Database:**
```sql
ALTER TABLE users ADD COLUMN (
  email_frequency VARCHAR DEFAULT 'daily',
  email_opted_out BOOLEAN DEFAULT false,
  timezone VARCHAR DEFAULT 'Asia/Singapore',
  email_preferences JSONB DEFAULT '{"bid_accepted": true, "new_bid": false, ...}',
  notification_preferences JSONB DEFAULT '{"bid_accepted": true, "new_bid": false, ...}'
);

CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  email_type VARCHAR, -- 'immediate', 'digest', 'reminder'
  subject TEXT,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP, -- Tracked via pixel
  clicked_at TIMESTAMP,
  bounced BOOLEAN DEFAULT false
);

CREATE TABLE notification_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  notification_id INTEGER REFERENCES notifications(id),
  queued_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP
);
```

**Backend Logic:**
```typescript
// For critical events (immediate send)
async function notifyBidAccepted(doerId, taskTitle, amount) {
  const notification = await createNotification(...);
  const user = await getUser(doerId);
  
  if (!user.email_opted_out) {
    await sendEmailImmediate(user.email, 'bid_accepted', {
      title: "🎯 Bid Accepted!",
      body: `You're hired for "${taskTitle}" at $${amount}`,
      actionUrl: `/payment/${taskId}`,
      actionLabel: "Complete Payment"
    });
  }
}

// For low-priority (queue for digest)
async function notifyNewBidReceived(askerId, doerName, amount) {
  const notification = await createNotification(...);
  const user = await getUser(askerId);
  
  // Check frequency preference
  if (user.email_frequency === 'daily') {
    await db.insert('notification_queue', {
      user_id: askerId,
      notification_id: notification.id,
      queued_at: new Date()
    });
    // Will be sent in daily batch at 9am
  }
}

// Daily cron job (runs at 9am)
async function sendDailyDigests() {
  const queuedNotifications = await db.query(`
    SELECT user_id, array_agg(notification_id) as notification_ids
    FROM notification_queue
    WHERE sent_at IS NULL
    GROUP BY user_id
  `);
  
  for (const batch of queuedNotifications) {
    const notifications = await getNotifications(batch.notification_ids);
    await sendEmailDigest(batch.user_id, notifications);
  }
}

// Reminder cron job (24h before deadline)
async function sendPaymentReminders() {
  const expiringSoon = await db.query(`
    SELECT e.id, e.asker_id, e.title, e.budget
    FROM errands e
    WHERE e.status = 'confirmed'
    AND e.created_at < NOW() - INTERVAL '23 hours'
    AND NOT EXISTS (
      SELECT 1 FROM email_logs 
      WHERE email_type = 'reminder' 
      AND email_logs.user_id = e.asker_id
    )
  `);
  
  for (const errand of expiringSoon) {
    await sendEmailReminder(errand);
  }
}
```

**Email Templates:**

```html
<!-- Immediate Email: Bid Accepted -->
Subject: 🎯 Bid Accepted! Payment needed in 24h

Hi John,

Great news! Sarah accepted your bid for "Cleaning House" at $120.

⏱️ Next step: Complete payment within 24 hours
📊 Deadline: [TIMESTAMP]

[Complete Payment Now]

Your bid: $120
Category: Home Help
Location: Clementi
Date: June 21, 3pm

Questions? Reply to this email.

────────────────────
[Manage notifications] [Unsubscribe]

---

<!-- Daily Digest Email -->
Subject: 📋 Your Errandify Summary - 5 new bids

Hi Sarah,

Here's what happened on Errandify today:

📌 NEW BIDS (5 received)
Cleaning House
├─ John bid $80 ⭐ 4.8 rating
├─ Mary bid $85 ⭐ 4.9 rating
└─ [View All 5]

💬 MESSAGES (2)
From John: "Can start today?"

[View Dashboard] [Review All Bids]

────────────────────
Next update: Tomorrow 9am
[Manage frequency] [Unsubscribe]

---

<!-- Reminder Email: Payment Expiring -->
Subject: ⏰ Payment expires in 24 hours

Hi John,

Your payment for "Cleaning House" expires in 24 hours!

Amount: $120
⏱️ Time left: 23h 45m
Doer: Sarah

If you don't complete payment, Sarah will be released.

[Complete Payment Now]

────────────────────
[View Task] [Cancel Payment]
```

### What It Solves
✅ Guaranteed delivery (most reliable)
✅ Reaches users not on app
✅ Audit trail (email logs)
✅ No spam (smart batching)
✅ User preferences respected
✅ Works for all users (no tech requirements)

### What It Doesn't Solve
❌ Not instant (5-10 min delay for digest)
❌ Email inbox could be full
❌ Some emails marked as spam

**Status: Ready after Phase 1 & 2 complete**

---

## COMPLETE SOLUTION: ALL 3 PHASES

### User Experience Timeline
```
Monday 9:00am
├─ Daily email digest (5 new bids)
└─ Opens in email ✓

Monday 2:30pm
├─ Bid accepted!
├─ Browser push notification appears
├─ In-app bell notification
├─ Immediate email sent
└─ User clicks push → Opens app → Pays ✓

Tuesday 9:00am
├─ Daily email digest (messages)
└─ Reads over breakfast ✓

Wednesday 10:00am (23h before deadline)
├─ Reminder email "24h left to complete payment"
└─ User completes payment ✓

Result: User ALWAYS knows what's happening
        Across all channels (in-app, push, email)
        Never feels spammed
        High engagement on all events
```

### Notification Coverage
```
User Online (browsing app):
├─ In-app bell ✓ (0 seconds)
├─ Toast popup ✓ (0 seconds)
├─ Browser push ✓ (if enabled)
└─ Email ✓ (sent anyway)

User Offline (not on app):
├─ Browser push ✓ (instant, if enabled)
├─ Email ✓ (guaranteed, 5-10 min)
└─ In-app bell (catches when logs in)

Result: 100% notification coverage
```

### Implementation Timeline
```
Week 1:
├─ Monday-Wednesday: Phase 1 (in-app)
└─ Deployed by Thursday ✓

Week 2:
├─ Monday-Tuesday: Phase 2 (browser push)
├─ Wednesday-Friday: Phase 3 (email)
└─ All deployed by Friday ✓

Total: ~16 hours of work
```

---

## MY RECOMMENDATION: DO ALL 3 PHASES

**Why?**
1. **Phase 1 alone** → Users online miss nothing, offline miss everything ❌
2. **Phase 1 + 2** → Most users reached, some can't get push ✓
3. **Phase 1 + 2 + 3** → 100% user reach, multiple backup channels ✅

**Best for marketplace:**
- Users MUST know about opportunities
- Time-sensitive (limited 30-min window)
- Competitive (first to accept wins)
- Need guaranteed delivery

**Cost vs Benefit:**
- **16 hours of work** (1 week for 1 developer)
- **ROI:** Much higher user engagement, retention, conversions
- **Alternatives:** Lose users to competitors who have notifications

---

## DECISION MATRIX

| Question | Answer | Implication |
|----------|--------|-------------|
| Users need real-time updates? | Yes | Need Phase 2 (push) |
| Users should know offline? | Yes | Need Phase 2 + 3 |
| Email should not be spammy? | Yes | Need smart rules in Phase 3 |
| Must guarantee message reaches? | Yes | Need Phase 3 (email backup) |
| Is this a marketplace? | Yes | Need ALL 3 phases |

---

## START NOW?

**Phase 1 ready to start immediately:**
- ✅ No breaking changes
- ✅ Database already has notifications
- ✅ Can be done in isolation
- ✅ UI components only

**Recommend order:**
1. **Phase 1 first** (most bang for buck)
2. **Then Phase 2** (critical for offline users)
3. **Then Phase 3** (insurance + email lovers)

**Shall I start building Phase 1 now?**
