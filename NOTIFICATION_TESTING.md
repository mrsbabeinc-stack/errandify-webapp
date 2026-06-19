# Notification System Testing Guide

## Phase 1: In-App Notifications (Bell Icon)

### Test 1: Bell icon shows unread count
```
1. Log in as any user
2. See bell icon (🔔) in header
3. Should show unread count badge
4. Click bell → see list of notifications
```

### Test 2: Notifications appear for events
```
1. Post a task as Asker
2. Log in as Doer in another browser
3. Bid on task
4. Switch back to Asker
5. Check bell icon - should show "1" unread
6. See "New bid received" notification
```

### Test 3: Toast popups appear
```
1. Trigger an event (bid accepted, etc)
2. Should see toast popup in bottom-right
3. "Accept Now" or similar action button
4. Auto-dismisses after 5-10 seconds
```

### Test 4: Notification preferences work
```
1. Go to Settings → Notifications
2. Toggle off "New Bid Received"
3. Doer bids again
4. Asker should NOT see notification
5. Toggle back on
6. Should appear again
```

---

## Phase 2: Browser Push Notifications

### Test 5: Push permission prompt appears
```
1. Log in (first time)
2. See "Stay Updated!" card at bottom
3. Click "Enable Notifications"
4. Browser asks for permission
5. Click "Allow"
6. See confirmation
```

### Test 6: Push notifications on event
```
1. Enable push notifications (Test 5)
2. Minimize browser/close tab
3. Trigger event (bid accepted)
4. See system notification on desktop/phone
5. Click notification → should open app and navigate
```

### Test 7: Push works across devices
```
1. Enable push on Chrome
2. Enable push on Firefox (or mobile)
3. Same user, different browser
4. Trigger event
5. Should receive push on BOTH browsers
```

---

## Phase 3: Email Notifications

### Test 8: Critical email on bid accepted (IMMEDIATE)
```
1. Asker posts task
2. Doer bids $50
3. Asker accepts bid
4. Doer should IMMEDIATELY receive email:
   - Subject: "🎯 Bid Accepted! Payment needed in 24h"
   - Contains: "Your bid of $50 accepted for [taskname]"
   - Has action button: "Complete Payment Now"
5. Check email logs: SELECT * FROM email_logs WHERE email_type = 'bid_accepted'
```

### Test 9: Task reopened email (IMMEDIATE)
```
1. Doer A accepts bid
2. Doer A cancels
3. Doer B (who bid earlier) should IMMEDIATELY receive email:
   - Subject: "🎯 Task Available Again! Your bid of $45"
   - Contains: "Your bid is back on the table"
   - Has action button: "Accept Now"
4. Check email logs: SELECT * FROM email_logs WHERE email_type = 'task_reopened'
```

### Test 10: Payment released email (IMMEDIATE)
```
1. Task completed
2. Payment released to doer
3. Doer should IMMEDIATELY receive email:
   - Subject: "💰 Payment Released! $50 in your wallet"
   - Contains: "Your payment has been released"
   - Has action button: "View Wallet"
4. Check email logs: SELECT * FROM email_logs WHERE email_type = 'payment_released'
```

### Test 11: Daily digest at 9am (BATCHED)
```
1. Set user email_frequency to 'daily'
2. Doer receives 5 new bids
3. NO immediate email (goes to queue)
4. At 9am Singapore time:
   - Check email_digest_queue table
   - Run: SELECT * FROM email_digest_queue WHERE sent_at IS NULL
   - Should be empty after 9am (all sent)
   - Email received with subject "📋 Your Errandify Summary - 5 updates"
   - Contains all 5 bids in one email
```

### Test 12: Payment reminder (24h before deadline)
```
1. Bid accepted at 10:00am
2. Payment deadline: 10:00am + 24h = next day 10:00am
3. Around 9:00am next day:
   - Cron job checks for reminders
   - Email sent: "⏰ Payment expires in 24 hours!"
   - Contains: "23h 45m left to complete payment"
4. Check email logs: SELECT * FROM email_logs WHERE email_type = 'payment_reminder'
```

### Test 13: Email preferences respected
```
1. Go to Settings → Notifications → Email
2. Set frequency to "Weekly"
3. Doer receives bids (should NOT email immediately)
4. Wait until Monday 9am
5. Should receive weekly digest email
6. Change to "Never"
7. No more emails (except transactional like password reset)
```

### Test 14: Per-event toggles work
```
1. Settings → Email Notifications
2. Toggle OFF "New Bid Received"
3. Doer receives bid
4. NO email sent (even if frequency = 'immediate')
5. Toggle ON again
6. Should send again next time
```

---

## Email Development Mode

### When EMAIL_PROVIDER not configured:
```
All emails logged to console instead of sent.

In development, you'll see:
[Email] (Dev Mode - Not Sent)
  To: user@example.com
  Subject: 🎯 Bid Accepted!
  Body: Your bid of $50 accepted for...
```

### To actually send emails:
```bash
# 1. Install SendGrid library
npm install @sendgrid/mail

# 2. Set environment variable
export SENDGRID_API_KEY=SG_xxxxxxxx

# 3. Set email provider
export EMAIL_PROVIDER=sendgrid

# 4. Restart backend
# Emails will now send via SendGrid
```

---

## Database Checks

### Check if notifications created:
```sql
SELECT * FROM notifications 
WHERE user_id = [userId] 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check if emails queued:
```sql
SELECT * FROM email_digest_queue 
WHERE user_id = [userId] 
AND sent_at IS NULL;
```

### Check email logs:
```sql
SELECT * FROM email_logs 
WHERE user_id = [userId] 
ORDER BY sent_at DESC 
LIMIT 20;
```

### Check push subscriptions:
```sql
SELECT * FROM push_subscriptions 
WHERE user_id = [userId];
```

### Check user preferences:
```sql
SELECT 
  notification_preferences, 
  email_frequency, 
  email_preferences 
FROM users 
WHERE id = [userId];
```

---

## Full End-to-End Test Scenario

### Scenario: "Complete Bidding Flow with Notifications"

```
Step 1: Asker posts task
  → Should see "task created" notification
  
Step 2: Doer 1 bids
  → Asker sees bell (1), gets notification
  → Doer 1 sees "bid submitted" toast
  
Step 3: Doer 2 bids
  → Asker sees bell (2), gets notification
  → Doer 2 sees "bid submitted" toast
  
Step 4: Doer 3 bids
  → Asker sees bell (3), gets notification
  → Doer 3 sees "bid submitted" toast
  
Step 5: Asker accepts Doer 2's bid
  → Doer 2 gets:
     ✅ In-app notification
     ✅ Toast popup
     ✅ Browser push (if enabled)
     ✅ EMAIL immediately: "Bid Accepted!"
  
  → Doer 1 & 3 get:
     ✅ In-app notification: "Bid rejected"
     ✅ No email (not critical)
  
Step 6: Asker cancels (doer cancels bid)
  → Doer 2 cancels bid
  → Task reopens
  → Doer 1 & 3 get:
     ✅ In-app notification: "Task available again"
     ✅ Toast popup
     ✅ Browser push (if enabled)
     ✅ EMAIL immediately: "Task Available Again!"
  
Step 7: Doer 2 accepts (different doer)
  → Same notifications as Step 5
  
Step 8: Task completed
  → Asker marks complete
  → Doer sees notification
  
Step 9: Payment released
  → Doer gets:
     ✅ In-app notification
     ✅ Toast popup
     ✅ Browser push (if enabled)
     ✅ EMAIL immediately: "Payment Released!"
  
Step 10: User leaves app for a week
  → All events batched in daily digest at 9am
  → User receives 7 digest emails
  → One email per day, not spammed
```

---

## Troubleshooting

### Bell icon not showing notifications
```
1. Check: Are notifications being created?
   SELECT * FROM notifications WHERE user_id = [id]
   
2. Check: Is useNotifications hook polling?
   Browser console should show API calls every 10s
   
3. Check: Is user_id correct?
   Verify localStorage.getItem('user') has correct id
```

### Email not sending
```
1. Check dev mode:
   EMAIL_PROVIDER=development in .env?
   Check console logs for email output

2. Check error logs:
   [Email] Error sending email: ...
   Check cloud logs

3. Check database:
   Did email_logs entry get created?
   SELECT * FROM email_logs WHERE user_id = [id]

4. Check credentials:
   Is SENDGRID_API_KEY set and valid?
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -d {...}
```

### Push notification not working
```
1. Check browser support:
   Chrome/Firefox/Edge = yes
   Safari = limited
   
2. Check permission:
   Settings → Notifications → Errandify = Allow?
   
3. Check registration:
   Browser console: Is service-worker registered?
   
4. Check subscription:
   SELECT * FROM push_subscriptions WHERE user_id = [id]
   Should have entries
```

### Cron jobs not running
```
1. Check console on startup:
   "[CRON] All cron jobs started successfully"
   
2. Check daily digest time:
   "[CRON] Daily digest scheduled for [time]"
   
3. Check logs:
   Should see "[CRON] Running daily digest send..."
   at 9am Singapore time
   
4. Test manually:
   In backend: await sendDailyDigests()
   Should process queue immediately
```

---

## Quick Test Commands

### Send test email immediately (development):
```bash
# In backend terminal:
node -e "
import { sendCriticalEmail } from './src/services/emailNotifications.js';
await sendCriticalEmail(1, 'bid_accepted', {
  taskTitle: 'Test Task',
  amount: 100,
  taskId: 123
});
"
```

### Trigger daily digest:
```bash
# In backend code or cron:
import { sendDailyDigests } from './src/services/emailNotifications.js';
await sendDailyDigests();
```

### Check cron running:
```bash
# Backend logs should show:
[CRON] Starting all cron jobs...
[CRON] Daily digest scheduled for [time]
[CRON] All cron jobs started successfully
```

---

## Success Criteria

✅ **Phase 1 (In-App):**
- Bell icon shows with count
- Notifications appear in dropdown
- Toasts popup on events
- Preferences prevent notifications

✅ **Phase 2 (Push):**
- Permission prompt appears
- System notifications show
- Click navigates to correct page
- Works when app is closed

✅ **Phase 3 (Email):**
- Critical emails send immediately
- Digest emails batch daily
- Reminders send before deadline
- User preferences respected

✅ **Overall:**
- All 3 channels work independently
- Multiple channels work together
- No spam (smart batching)
- User has full control
