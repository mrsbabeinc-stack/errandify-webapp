---
name: smart_email_notifications
description: Smart email notification strategy - high value, low spam, user-controlled frequency
metadata:
  type: project
  status: proposal
  date: 2026-06-19
---

# Smart Email Notifications: Value Without Spam

## THE PROBLEM: EMAIL FATIGUE

### What Kills User Engagement
```
User gets 10 emails per day:
- Every bid received
- Every bid rejected
- Every message
- Every small event
→ User unsubscribes or ignores all emails
→ Platform becomes irrelevant
```

### What We Want Instead
```
User gets 1-2 VALUABLE emails per day:
- Bid accepted! (Time-sensitive, needs action)
- Task reopened (Opportunity, limited time)
- Payment released (Important)
→ User checks email eagerly
→ High engagement, action taken
```

---

## SMART EMAIL STRATEGY: 4 PRINCIPLES

### Principle 1: ONLY CRITICAL EVENTS
```
✅ SEND EMAIL:
- Bid accepted (user needs to pay)
- Task reopened (limited 30-min window)
- Payment released (money in account)
- Task completed waiting for confirmation (action needed)
- Rating received (social/reputation)

❌ DON'T SEND EMAIL:
- New bid received (batch daily instead)
- Message received (batch daily)
- Doer started task (informational only)
- View count on profile (nice-to-have)
```

### Principle 2: BATCH LOW-PRIORITY EVENTS
```
Instead of: 5 individual emails about new bids

Better: 1 daily email:
────────────────────────────────────
📋 Daily Summary - You have 5 new bids

Task: Cleaning House
├─ Doer A bid $80 (3 hours ago)
├─ Doer B bid $85 (2 hours ago)
└─ Doer C bid $90 (1 hour ago)

[Review All Bids]
────────────────────────────────────

Send frequency: Daily digest at 9am
```

### Principle 3: USER CONTROL (Preferences)
```
Settings → Notification Preferences:

🔴 HIGH PRIORITY (Always email)
☐ Bid accepted
☐ Task reopened
☐ Payment released

🟡 MEDIUM PRIORITY (Choose frequency)
☐ Daily digest
☐ Weekly digest
☐ Never

🟢 LOW PRIORITY (In-app only)
☐ Message received
☐ Task started
☐ Profile viewed
```

### Principle 4: VALUE-DRIVEN SUBJECT LINES
```
❌ BAD (Spammy):
"New notification from Errandify"
"Activity on Errandify"
"Update from Errandify"

✅ GOOD (Value-driven):
"🎯 Bid Accepted! Payment needed" (ACTION)
"⏰ Task Available Again - Bid $95" (OPPORTUNITY)
"💰 Payment Released - $95 to wallet" (MONEY)
"📋 5 New Bids - Review Today" (SUMMARY)
```

---

## SMART EMAIL NOTIFICATION MATRIX

| Event | Type | Email? | Frequency | Why |
|-------|------|--------|-----------|-----|
| **Bid accepted** | CRITICAL | ✅ Yes | Immediate | User must pay within timeframe |
| **Task reopened** | URGENT | ✅ Yes | Immediate | Limited 30-min window to accept |
| **Payment released** | IMPORTANT | ✅ Yes | Immediate | Money notification |
| **Bid rejected** | INFO | ❌ No | Daily digest | User can check later |
| **New bid received** | INFO | ❌ No | Daily digest | Multiple bids batched |
| **Message received** | INFO | ❌ No | Daily digest | Can check in-app |
| **Task completed** | ACTION | ✅ Yes | Immediate | Needs asker confirmation |
| **Rating received** | SOCIAL | ✅ Yes | Immediate | User wants to know |
| **Payment 24h warning** | REMINDER | ✅ Yes | Scheduled | Important deadline |

---

## IMPLEMENTATION: 3 EMAIL TYPES

### EMAIL TYPE 1: IMMEDIATE (Transactional)
```
WHEN: Bid accepted, payment released, rating received
FREQUENCY: Within 5 minutes
EXAMPLES:

Subject: 🎯 Bid Accepted! Sarah hired you for $120
────────────────────────────────────────────
Hi John,

Great news! Sarah accepted your bid for "Cleaning House" at $120.

Next step: Complete payment to start work.
📊 Deadline: 24 hours
⏱️ Time left: 23h 45m

[Complete Payment Now]

Your bid: $120
Category: Home Help
Date: June 21, 3pm

Questions? Reply to this email.

────────────────────────────────────────────

Subject: 🎯 Task Available Again! Your $95 bid ready
────────────────────────────────────────────
Hi Sarah,

Good news! The previous doer cancelled. Your bid is back on!

⏰ Limited time: Next 30 minutes
💰 Your bid: $95

[Accept Now]

Task: Tuition for my kid
Date: June 21, 3pm

────────────────────────────────────────────
```

### EMAIL TYPE 2: DAILY DIGEST (Summary)
```
WHEN: Once per day at 9am
FREQUENCY: 1 email per user per day max
CONDITION: Only if user has pending notifications

Subject: 📋 Your Errandify Summary - 5 New Bids
────────────────────────────────────────────
Hi Sarah,

Here's what happened on Errandify today:

📌 NEW BIDS (5 received)
Cleaning House
├─ John bid $80 (2 hours ago) ⭐ 4.8 rating
├─ Mary bid $85 (1 hour ago) ⭐ 4.9 rating
└─ [View All 5 Bids]

💬 MESSAGES (2 new)
From John: "I can start today if needed"
From Mary: "I have experience with tile cleaning"

👀 PROFILE (23 views)
Professionals visited your profile

[View All Updates]

────────────────────────────────────────────

Unread: 5 bids, 2 messages, 1 task started
Next update: Tomorrow 9am
```

### EMAIL TYPE 3: REMINDER (Deadline)
```
WHEN: 24 hours before payment deadline
FREQUENCY: Only once per task
CONDITION: Only if payment not yet completed

Subject: ⏰ 24 Hours Left - Complete Payment for $120
────────────────────────────────────────────
Hi John,

Payment deadline approaching!

Task: Cleaning House
Doer: Sarah
Bid amount: $120
⏱️ Time remaining: 23h 45m

If you don't complete payment, the bid will be cancelled
and Sarah will be released.

[Complete Payment Now]

────────────────────────────────────────────
```

---

## AVOIDING SPAM: SMART RULES

### Rule 1: AGGREGATE SIMILAR EVENTS
```
Instead of 5 "New bid" emails:
Send 1 daily digest with all 5

Algorithm:
- New bid received → queue for digest
- If 3+ bids within 1 hour → send digest once
- Daily digest at 9am for remaining
```

### Rule 2: RESPECT FREQUENCY PREFERENCES
```
Database field: user.email_notification_frequency
├─ 'immediate' - only critical events (bid accepted, payment)
├─ 'daily' - digest at 9am
├─ 'weekly' - digest on Mondays 9am
└─ 'never' - no email (except transactional like password reset)

Default: 'daily' (safe middle ground)
```

### Rule 3: UNSUBSCRIBE TRACKING
```
Every email has footer:
────────────────────────────────
Manage preferences: [Update settings]
Unsubscribe: [Click here]

If user unsubscribes:
- Track in database: user.email_opted_out = true
- Still send transactional emails (password reset, payment)
- Never send marketing/notification emails
```

### Rule 4: ENGAGEMENT TRACKING
```
Track per user:
- Emails sent
- Emails opened (via pixel)
- Links clicked
- Unsubscribes

If user opens < 20% of emails:
→ Reduce frequency automatically
→ Try weekly instead of daily

If user opens > 80% of emails:
→ Can be more frequent
→ Try immediate for more events
```

### Rule 5: TIME-BASED SENDING
```
Don't send:
- Between 9pm-7am (respects sleep)
- During work hours for B2B (9-5)
- Weekends (optional)

Queue and send next morning instead:
- Email created at 11pm
- Held until 9am
- Sent in morning digest
```

---

## DATABASE SCHEMA

```sql
-- User notification preferences
ALTER TABLE users ADD COLUMN (
  email_frequency VARCHAR DEFAULT 'daily',
    -- 'immediate', 'daily', 'weekly', 'never'
  email_opted_out BOOLEAN DEFAULT false,
  email_unsubscribe_token VARCHAR UNIQUE,
  last_digest_sent TIMESTAMP,
  last_immediate_email_sent TIMESTAMP
);

-- Email notification logs (for analytics)
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  notification_id INTEGER REFERENCES notifications(id),
  email_type VARCHAR, -- 'immediate', 'digest', 'reminder'
  subject TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  opened_at TIMESTAMP, -- null if not opened
  clicked_at TIMESTAMP, -- null if no click
  bounced_at TIMESTAMP, -- null if not bounced
  unsubscribed_at TIMESTAMP -- null if not unsubscribed
);

-- Notification queue for batching
CREATE TABLE notification_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  notification_id INTEGER REFERENCES notifications(id),
  queued_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP -- null until sent
);
```

---

## BACKEND LOGIC (Pseudo-code)

```typescript
// When critical event happens
async function notifyBidAccepted(doerId, taskTitle, amount) {
  // 1. Save to notifications table
  const notification = await createNotification(...);
  
  // 2. Check user preferences
  const user = await getUser(doerId);
  
  // 3. Send immediately (critical events don't wait)
  if (!user.email_opted_out) {
    await sendEmailImmediate(
      doerId,
      'bid_accepted',
      { taskTitle, amount, notification }
    );
  }
}

// When low-priority event happens
async function notifyNewBidReceived(askerId, bidAmount) {
  // 1. Save to notifications table
  const notification = await createNotification(...);
  
  // 2. Check user preferences
  const user = await getUser(askerId);
  
  // 3. Queue for digest instead of immediate
  if (user.email_frequency === 'daily') {
    await queueForDigest(askerId, notification);
    // Will be sent in next 9am batch
  } else if (user.email_frequency === 'weekly') {
    await queueForWeeklyDigest(askerId, notification);
  } else if (user.email_frequency === 'immediate') {
    await sendEmailImmediate(...); // Even low-priority gets sent
  }
}

// Daily digest job (runs at 9am)
async function sendDailyDigests() {
  // Get all users who have queued notifications
  const usersWithNotifications = await db.query(`
    SELECT DISTINCT user_id 
    FROM notification_queue 
    WHERE processed_at IS NULL
    AND user_id IN (
      SELECT id FROM users WHERE email_frequency = 'daily'
    )
  `);
  
  // Send one digest per user
  for (const user of usersWithNotifications) {
    const queued = await getQueuedNotifications(user.id);
    await sendEmailDigest(user.id, queued);
    await markAsProcessed(queued);
  }
}

// Reminder job (24 hours before deadline)
async function sendPaymentReminders() {
  const expiringSoon = await db.query(`
    SELECT DISTINCT e.id, u.email
    FROM errands e
    JOIN users u ON e.asker_id = u.id
    WHERE e.status = 'confirmed'
    AND e.created_at < NOW() - INTERVAL '23 hours'
    AND e.created_at > NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM email_logs 
      WHERE email_type = 'reminder' 
      AND notification_id = e.id
    )
  `);
  
  for (const errand of expiringSoon) {
    await sendReminderEmail(errand);
  }
}
```

---

## FRONTEND: NOTIFICATION PREFERENCES UI

```typescript
// Settings page component
function NotificationPreferences() {
  const [frequency, setFrequency] = useState('daily');
  const [criticalOnly, setCriticalOnly] = useState(false);

  return (
    <div className="p-6">
      <h2>Email Notifications</h2>
      
      <div className="mt-4">
        <label>
          <input
            type="radio"
            checked={frequency === 'immediate'}
            onChange={() => setFrequency('immediate')}
          />
          Immediate - Send critical updates right away
          <p className="text-sm text-gray-600">
            Bid accepted, payment released, urgent events
          </p>
        </label>

        <label>
          <input
            type="radio"
            checked={frequency === 'daily'}
            onChange={() => setFrequency('daily')}
          />
          Daily Digest - Once per day at 9am
          <p className="text-sm text-gray-600">
            Summary of all updates + critical alerts
          </p>
        </label>

        <label>
          <input
            type="radio"
            checked={frequency === 'weekly'}
            onChange={() => setFrequency('weekly')}
          />
          Weekly Digest - Every Monday at 9am
          <p className="text-sm text-gray-600">
            Only a weekly summary
          </p>
        </label>

        <label>
          <input
            type="radio"
            checked={frequency === 'never'}
            onChange={() => setFrequency('never')}
          />
          None - No email notifications
          <p className="text-sm text-gray-600">
            You'll still see in-app notifications
          </p>
        </label>
      </div>

      <button onClick={() => savePreferences(frequency)}>
        Save Preferences
      </button>
    </div>
  );
}
```

---

## RESULTS: NOT SPAM, HIGH VALUE

### Typical User Experience
```
Monday 9am: Daily digest
├─ 3 new bids
├─ 2 messages
└─ 1 task started

Tuesday 2:30pm: Immediate email
├─ Subject: "Bid Accepted! Payment needed"
└─ User reads within 5 mins → pays immediately ✓

Wednesday 9am: Daily digest
├─ 1 new message
└─ Task update

Thursday 10am: Reminder email
├─ Subject: "24 hours left - Complete payment"
└─ User completes payment ✓

Result:
- Only 4 emails in 4 days
- User opens 100% of emails
- High engagement
- No spam complaints
```

---

## COMPARISON: SPAM vs SMART

| Metric | Spam Approach | Smart Approach |
|--------|---|---|
| **Emails per day** | 5-10 | 0-2 |
| **Open rate** | 10-20% | 80%+ |
| **Click-through** | 1-5% | 40%+ |
| **Unsubscribe rate** | High | Low |
| **User engagement** | Low | High |
| **Revenue impact** | Negative | Positive |

---

## QUICK IMPLEMENTATION STEPS

### Step 1: Add preferences (1 hour)
- Add email_frequency to users table
- Create preferences UI
- Save preferences

### Step 2: Create email templates (2 hours)
- Immediate email template (bid accepted)
- Daily digest template
- Reminder template

### Step 3: Update notification logic (2 hours)
- Check frequency before sending
- Queue for digest vs immediate
- Update all notify* functions

### Step 4: Add daily job (1 hour)
- Create scheduled task (cron job)
- Runs daily at 9am
- Sends digest to eligible users

**Total: 6 hours for complete email system**

---

## FINAL RECOMMENDATION

### Complete Notification Stack (3-Phase)
```
Phase 1 (6h): In-app bell + polling
Phase 2 (4h): Browser push notifications
Phase 3 (6h): Smart email (digest + immediate)

Total: 16 hours for complete notification system
Result: 100% user reach, no spam complaints
```

**Users will LOVE this approach because:**
- ✓ Urgent events reach them immediately
- ✓ Summary emails not overwhelming
- ✓ Full control over preferences
- ✓ High-value notifications only
- ✓ Time-respecting (no 3am emails)
