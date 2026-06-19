# Email Notifications Setup Guide

## Quick Start (Development - No Email Sending)

By default, emails are logged to console only. No real email provider needed.

### See emails in action:
```bash
# 1. Start backend
cd backend
npm run dev

# 2. In console logs, when email triggers:
[Email] (Dev Mode - Not Sent)
  To: user@example.com
  Subject: 🎯 Bid Accepted! Payment needed in 24h
  Body: Your bid of $50 for Cleaning House has been accepted!
```

---

## Production: SendGrid Integration (5 minutes)

### Step 1: Create SendGrid Account
```
1. Go to https://sendgrid.com
2. Sign up (free tier included: 100 emails/day)
3. Verify email address
4. Create API key:
   Settings → API Keys → Create API Key
5. Copy the key: SG_xxxxxxxxxxxxxxxx
```

### Step 2: Install SendGrid Library
```bash
cd backend
npm install @sendgrid/mail
```

### Step 3: Set Environment Variables
```bash
# In backend/.env:
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG_YOUR_KEY_HERE
EMAIL_FROM=noreply@errandify.app
EMAIL_FROM_NAME=Errandify
```

### Step 4: Restart Backend
```bash
npm run dev
```

### Step 5: Test Email Sending
```bash
# Trigger a notification event:
1. Post task as Asker
2. Doer bids
3. Asker accepts bid
4. Check Doer's email inbox → Should see email!
```

---

## Alternative: Mailgun

If you prefer Mailgun over SendGrid:

### Step 1: Create Mailgun Account
```
1. Go to https://www.mailgun.com
2. Sign up (free tier: 100 emails/month)
3. Add domain (e.g., errandify.mg.mg)
4. Copy API key
```

### Step 2: Set Environment Variables
```bash
# In backend/.env:
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=key-xxxxxxxx
MAILGUN_DOMAIN=errandify.mg.mg
EMAIL_FROM=noreply@errandify.app
EMAIL_FROM_NAME=Errandify
```

### Step 3: Restart Backend
```bash
npm run dev
```

---

## Sending Emails Manually (Testing)

### Send test email via CLI:
```bash
node << 'EOF'
import { sendEmail } from './src/services/email.ts';

await sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<h1>Hello!</h1><p>This is a test email.</p>',
  text: 'Hello! This is a test email.',
});
EOF
```

### Send critical email for event:
```bash
node << 'EOF'
import { sendCriticalEmail } from './src/services/emailNotifications.ts';

// Simulate bid accepted
await sendCriticalEmail(doerId, 'bid_accepted', {
  taskTitle: 'Clean my house',
  amount: 100,
  taskId: 1,
});
EOF
```

---

## Verify Setup

### Check configuration:
```bash
# In backend code:
console.log(config.email);

# Should show:
{
  provider: 'sendgrid',
  sendgridApiKey: 'SG_...',
  fromEmail: 'noreply@errandify.app',
  fromName: 'Errandify'
}
```

### Test SendGrid API:
```bash
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "test@example.com"}]
    }],
    "from": {"email": "noreply@errandify.app"},
    "subject": "Test",
    "content": [{
      "type": "text/plain",
      "value": "Hello!"
    }]
  }'
```

If successful: `202 Accepted`

---

## Email Customization

### Custom sender address:
```bash
# backend/.env:
EMAIL_FROM=hello@errandify.app
EMAIL_FROM_NAME=Errandify Team
```

### Custom templates:
Edit `backend/src/templates/emailTemplates.ts`

### Add new email type:
```typescript
// 1. Create template function
export function templateNewEvent(name: string): string {
  return `<h1>Hello ${name}!</h1>...`;
}

// 2. Add to emailNotifications.ts
export async function sendNewEventEmail(userId: number, data: any) {
  const html = templateNewEvent(data.name);
  await sendEmail({
    to: userEmail,
    subject: 'New Event',
    html,
  });
}

// 3. Call it when event triggers
await sendNewEventEmail(userId, eventData);
```

---

## Monitoring & Logging

### Check email logs in database:
```sql
SELECT 
  id,
  user_id,
  email_type,
  subject,
  sent_at,
  opened_at,
  bounced
FROM email_logs
ORDER BY sent_at DESC
LIMIT 20;
```

### Check SendGrid dashboard:
```
1. Go to https://app.sendgrid.com
2. Click "Activity"
3. See all sent emails
4. Check delivery status
5. View open/click rates
```

### Check stuck queues:
```sql
-- Emails queued but not sent
SELECT * FROM email_digest_queue WHERE sent_at IS NULL;

-- How many per user
SELECT user_id, COUNT(*) as count
FROM email_digest_queue
WHERE sent_at IS NULL
GROUP BY user_id;
```

---

## Troubleshooting

### Email not sending
```
1. Check config:
   EMAIL_PROVIDER=sendgrid?
   SENDGRID_API_KEY set?

2. Check logs:
   [Email] Error sending email: ...
   What's the error message?

3. Check credentials:
   Is API key correct?
   Valid in SendGrid dashboard?

4. Check database:
   Did email_logs entry create?
   SELECT * FROM email_logs WHERE user_id = [id]

5. Check spam:
   Did email go to spam folder?
   Check email verification in SendGrid
```

### Wrong sender address
```
Set in backend/.env:
EMAIL_FROM=correct@email.com
EMAIL_FROM_NAME=Your Name

Note: Must be verified domain in SendGrid
```

### Emails not reaching inbox
```
1. Check SendGrid bounce logs
2. Verify sending domain
3. Add SPF/DKIM records (SendGrid docs)
4. Test with personal email first
5. Check spam filters
```

### Daily digest not sending
```
1. Check cron job running:
   [CRON] Running daily digest send...
   Should appear at 9am

2. Check queue:
   SELECT * FROM email_digest_queue WHERE sent_at IS NULL

3. Check logs:
   SELECT * FROM email_logs WHERE email_type = 'digest'

4. Manually trigger:
   import { sendDailyDigests } from '...';
   await sendDailyDigests();
```

---

## Best Practices

### Domain Verification
```
1. Add domain in SendGrid
2. Add DKIM signature
3. Add SPF record
4. Verify in dashboard
5. Use verified domain in FROM email
```

### Rate Limiting
```
SendGrid free: 100 emails/day
Paid plans: Vary by tier

Monitor usage:
- Check SendGrid dashboard
- Set alerts at 80% limit
- Upgrade if needed
```

### Email Templates
```
Best practices:
- Keep subject under 50 chars
- Preview text important (first line)
- Make links obvious (use buttons)
- Include unsubscribe link
- Test in multiple clients
- Mobile-responsive HTML
```

### Tracking Engagement
```
Enable in SendGrid:
- Open tracking
- Click tracking
- Bounce handling

View in database:
SELECT * FROM email_logs WHERE opened_at IS NOT NULL;
```

---

## Quick Reference

| Item | Value |
|------|-------|
| **API Key** | Settings → API Keys in SendGrid |
| **From Email** | Must be verified domain |
| **Test Endpoint** | /api/test/send-email (optional) |
| **Daily Digest Time** | 9am Singapore time |
| **Reminder Timing** | 24h before deadline |
| **Dev Mode** | Logs to console |
| **Database** | email_logs, email_digest_queue tables |

---

## Next Steps

1. **For Development:**
   - Just start using, emails log to console
   - No setup needed, test with TEST file

2. **For Staging:**
   - Set up SendGrid free account
   - Configure ENV variables
   - Test with real emails

3. **For Production:**
   - Upgrade SendGrid plan
   - Set up verified domain
   - Add SPF/DKIM records
   - Enable tracking
   - Monitor bounce rates
