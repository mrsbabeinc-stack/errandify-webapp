# Event Reminder System - Complete Implementation Summary

## 🎉 What Was Built

A **4-tier automatic event reminder system** for MyKampung events that sends warm, friendly email notifications at strategic times:

1. **7 Days Before** - Calendar reminder (casual, informational)
2. **24 Hours Before** - Urgent reminder (next-day emphasis)
3. **1 Hour Before** - Last-minute alert (urgent, green CTA)
4. **Day Of (9am)** - Morning reminder (enthusiastic, final push)

---

## 📧 Email Templates

### 7-Day Reminder
```
Subject: 📅 Mark Your Calendar: [Event] in 7 Days!

✓ Casual greeting
✓ Full event details (date, time, location)
✓ Online event link (if applicable)
✓ Complete agenda with timestamps
✓ Preparation instructions
✓ "Another reminder in 24 hours" footer
```

### 24-Hour Reminder
```
Subject: 🎯 Reminder: [Event] Tomorrow!

✓ "Don't forget!" tone
✓ Event details highlighted
✓ Today's agenda (what will happen)
✓ Online link prominent
✓ "See you tomorrow!" closing
```

### 1-Hour Reminder
```
Subject: ⏰ [Event] Starting in 1 Hour!

✓ Yellow urgent background
✓ "Get ready!" tone
✓ Minimal details (time + location)
✓ Green "Join Now" button
✓ "Join early" tip
```

### Day-Of Reminder
```
Subject: ✨ [Event] is Happening Today!

✓ Enthusiastic greeting
✓ Full event details
✓ Complete what's-happening-today agenda
✓ Online link with CTA
✓ "We can't wait to see you! 🚀"
```

---

## 🗄️ Database Schema

**New fields added to `events` table:**

| Field | Type | Purpose |
|-------|------|---------|
| `event_link` | varchar(2048) | Zoom/Meet URL for online events |
| `agenda` | jsonb | Array of agenda items: `[{time: "2:00pm", title: "Welcome", duration: "15min"}]` |
| `preparation` | text | What attendees should bring/prepare/know |
| `location_type` | varchar(50) | "in-person" \| "online" \| "hybrid" |
| `reminder_7days_sent` | boolean | Flag (prevents duplicate sends) |
| `reminder_24h_sent` | boolean | Flag |
| `reminder_1h_sent` | boolean | Flag |
| `reminder_dayof_sent` | boolean | Flag |
| `status` | varchar(50) | "active" \| "cancelled" \| "completed" |

**Indexes created:**
- `idx_events_date_status` - For finding events by date/status
- `idx_events_reminder_flags` - For querying unsent reminders

---

## 🔄 Cron Jobs (Run Hourly)

### 1. checkEventReminders7Days()
- Finds: events exactly 7 days away
- Sends: 7-day reminder email to all attendees
- Sets: `reminder_7days_sent = true`

### 2. checkEventReminders24Hours()
- Finds: events happening tomorrow
- Sends: 24-hour reminder to all attendees
- Sets: `reminder_24h_sent = true`

### 3. checkEventReminders1Hour()
- Finds: same-day events within ±5 minutes of 1-hour mark
- Sends: 1-hour urgent reminder
- Sets: `reminder_1h_sent = true`

### 4. checkEventRemindersDayOf()
- Finds: same-day events
- Runs: 8-9am UTC window
- Sends: morning reminder to all attendees
- Sets: `reminder_dayof_sent = true`

---

## 🌐 Backend API Endpoints

All POST endpoints in `/api/email/`:

```
POST /api/email/send-event-reminder-7days
POST /api/email/send-event-reminder-24hours
POST /api/email/send-event-reminder-1hour
POST /api/email/send-event-reminder-dayof
```

**Request Body Example:**
```json
{
  "email": "user@example.com",
  "eventTitle": "Community Workshop",
  "eventDate": "2026-06-28",
  "eventTime": "2:00 PM",
  "eventLocation": "Singapore Community Center",
  "eventLink": "https://zoom.us/j/123456789",
  "agenda": [
    {"time": "2:00 PM", "title": "Welcome & Introductions", "duration": "15 min"},
    {"time": "2:15 PM", "title": "Workshop Begins", "duration": "45 min"},
    {"time": "3:00 PM", "title": "Q&A Session", "duration": "15 min"}
  ],
  "preparation": "Bring your laptop. Test your internet connection 5 minutes before. No prior experience needed!"
}
```

---

## 📋 Implementation Files

**Frontend:**
- `src/pages/MyKampungPage.tsx` - Events section with timeline view ✅
- `src/pages/CreateEventPage.tsx` - **TODO** - Event creation form
- `src/pages/EventDetailPage.tsx` - **TODO** - Event details view

**Backend:**
- `src/templates/emailTemplates.ts` - 4 email templates ✅
- `src/routes/email.ts` - Email API endpoints ✅
- `src/cron.ts` - Hourly cron jobs ✅
- `migrations/add_event_reminder_fields.sql` - Database migration ✅

---

## 🚀 Data Flow

```
1. EVENT CREATION
   └─ Admin/organizer creates event with:
      ✓ Title, date, time, location
      ✓ Online link (Zoom/Meet)
      ✓ Agenda items with timeline
      ✓ Preparation instructions

2. ATTENDEE SIGNUP
   └─ User clicks "Attend"
      ✓ Creates event_attendee record
      ✓ Sends immediate confirmation email

3. AUTOMATIC REMINDERS (run hourly)
   ├─ Day 1 (7 days before): Send 7-day reminder
   ├─ Day 8 (24 hours before): Send 24-hour reminder
   ├─ Day 9 (1 hour before): Send 1-hour alert
   └─ Day 9 (9am): Send day-of morning reminder

4. USER RECEIVES
   └─ 4 emails with escalating urgency:
      ✓ Casual, informational (7d)
      ✓ Slightly urgent (24h)
      ✓ Very urgent (1h)
      ✓ Enthusiastic, final push (day-of)
```

---

## ✅ Features Included

### Email Content
- ✅ Event title, date, time, location
- ✅ Online event link (with context-specific CTA color)
- ✅ Detailed agenda with timestamps
- ✅ Preparation instructions
- ✅ Escalating urgency (casual → urgent → critical → enthusiastic)
- ✅ Warm, friendly, neighborhoods tone
- ✅ Mobile-friendly HTML design
- ✅ Direct "View Event" or "Join" buttons

### System Features
- ✅ Automatic hourly cron checks
- ✅ Prevents duplicate sends with flags
- ✅ Supports online, in-person, and hybrid events
- ✅ Flexible agenda format (JSON array)
- ✅ Per-attendee email tracking
- ✅ Event status tracking (active/cancelled/completed)

### Email Personalization
- ✅ User's display name (from token)
- ✅ Specific event details
- ✅ Relevant links (Zoom for online, location for in-person)
- ✅ Agenda visible in every reminder (except 1h)

---

## 🔧 How to Use

### Apply Database Migration
```bash
cd backend
psql -U postgres -d errandify < migrations/add_event_reminder_fields.sql
```

### Create an Event (Backend)
```sql
INSERT INTO events (
  title, description, date, time, location, location_type,
  event_link, agenda, preparation, status
) VALUES (
  'Community Workshop',
  'Learn together',
  '2026-06-28',
  '14:00',
  'Singapore Community Center',
  'hybrid',
  'https://zoom.us/j/123456789',
  '[{"time":"2:00 PM","title":"Welcome","duration":"15 min"}]',
  'Bring laptop, test connection early',
  'active'
);
```

### Register User for Event
```sql
INSERT INTO event_attendees (event_id, user_id) VALUES (1, 123);
```

### Test Email Reminders
```bash
# Test 7-day reminder
curl -X POST http://localhost:3000/api/email/send-event-reminder-7days \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "email": "user@example.com",
    "eventTitle": "Workshop",
    "eventDate": "2026-06-28",
    "eventTime": "2:00 PM",
    "eventLocation": "Singapore",
    "eventLink": "https://zoom.us/...",
    "agenda": [{"time":"2:00 PM","title":"Welcome","duration":"15 min"}],
    "preparation": "Bring laptop"
  }'
```

---

## 📊 Timeline Example

**Event created**: June 21, 2026 @ 10am

| When | Email | Subject | Tone |
|------|-------|---------|------|
| June 21 10am | ✅ Confirmation | ✅ Event Confirmed | Warm |
| June 21 10:15am | 📝 (triggered) | 7-day queue | - |
| June 28 (any time) | 📅 7-Day | 📅 Mark Your Calendar | Casual |
| June 28 (any time) | (flagged sent) | - | - |
| June 29 (any time) | 🎯 24-Hour | 🎯 Reminder: Tomorrow! | Slightly Urgent |
| June 29 1pm | (flagged sent) | - | - |
| **June 29 1:55pm** | ⏰ 1-Hour | ⏰ Starting in 1 Hour! | Very Urgent |
| **June 29 2pm** | (flagged sent) | - | - |
| **June 30 9am** | ✨ Day-Of | ✨ Happening Today! | Enthusiastic |

*Note: Actual times depend on when cron jobs run (hourly window)*

---

## 🎯 What's Next (Frontend TODO)

1. **Create Event Form** (`CreateEventPage.tsx`)
   - Input fields for all new columns
   - Dynamic agenda items (add/remove rows)
   - Agenda timestamp picker
   - Text area for preparation
   - Location type radio buttons
   - Event link input

2. **Event Details Page** (`EventDetailPage.tsx`)
   - Display full agenda timeline
   - Show preparation instructions
   - Display online link prominently
   - Show attendee count
   - Edit button (for event creator)

3. **Admin Event Dashboard**
   - Create/edit/delete events
   - View event details
   - See attendee list
   - View reminder sent status
   - Cancel event
   - View event analytics

---

## 💡 Key Design Decisions

✅ **4 reminders instead of 2**: Escalating touchpoints improve attendance
✅ **Hourly cron jobs**: Simple to implement, sufficient for most use cases
✅ **Flags prevent duplicates**: No need for complex "sent" tracking table
✅ **JSONB agenda**: Flexible, queryable, allows future enhancements
✅ **Warm tone**: Matches Errandify brand (warm, friendly, neighbourly)
✅ **Location type support**: Handles hybrid/online/in-person uniformly
✅ **Direct email links**: Users can click straight from email to join

---

## 📞 Support

For questions or issues:
1. Check `memory/event_reminder_system.md` for detailed docs
2. Review email templates in `src/templates/emailTemplates.ts`
3. Check cron logic in `src/cron.ts`
4. Review migration in `migrations/add_event_reminder_fields.sql`

**Commit references:**
- Event reminders: `5baecf4`
- Migration + docs: `ca5eb02`
