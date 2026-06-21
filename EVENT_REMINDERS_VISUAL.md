# Event Reminder System - Visual Guide

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ERRANDIFY EVENT SYSTEM                    │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 1. EVENT CREATION (Admin/Organizer)                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Event Details Form                                       │
│  ├─ Title: "Community Workshop"                           │
│  ├─ Date: June 28, 2026                                   │
│  ├─ Time: 2:00 PM                                         │
│  ├─ Location: Singapore Community Center                  │
│  ├─ Type: Hybrid                                          │
│  ├─ Online Link: https://zoom.us/j/123456789             │
│  │                                                        │
│  ├─ Agenda:                                               │
│  │  ├─ 2:00 PM - Welcome (15 min)                        │
│  │  ├─ 2:15 PM - Workshop (45 min)                       │
│  │  └─ 3:00 PM - Q&A (15 min)                            │
│  │                                                        │
│  └─ Preparation: "Bring laptop, test connection early"   │
│                                                            │
│  [CREATE EVENT] → Stored in DB with status='active'       │
│                                                            │
└────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────┐
│ 2. USER ATTENDS EVENT (MyKampung Timeline)                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Event Card → [ATTEND] Button Click                       │
│                                                            │
│  Actions:                                                  │
│  1. Create event_attendee record                          │
│  2. Send confirmation email immediately                   │
│  3. Schedule reminders in cron system                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────┐
│ 3. AUTOMATIC REMINDERS (Cron Jobs - Run Hourly)           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Hourly Check #1: checkEventReminders7Days()              │
│  ├─ SQL: Find events 7 days from today                    │
│  ├─ For each event: Get all attendees                     │
│  ├─ Send: 📅 7-Day Reminder email                         │
│  └─ Flag: reminder_7days_sent = true                      │
│                                                            │
│  Hourly Check #2: checkEventReminders24Hours()            │
│  ├─ SQL: Find events happening tomorrow                   │
│  ├─ Send: 🎯 24-Hour Reminder email                       │
│  └─ Flag: reminder_24h_sent = true                        │
│                                                            │
│  Hourly Check #3: checkEventReminders1Hour()              │
│  ├─ SQL: Find same-day events ~1h away                    │
│  ├─ Send: ⏰ 1-Hour Urgent Reminder                        │
│  └─ Flag: reminder_1h_sent = true                         │
│                                                            │
│  Hourly Check #4: checkEventRemindersDayOf()              │
│  ├─ SQL: Find same-day events (9am window)                │
│  ├─ Send: ✨ Day-Of Morning Reminder                      │
│  └─ Flag: reminder_dayof_sent = true                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────┐
│ 4. USER RECEIVES EMAILS                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Email #1 (Day 1 - 7 days before)                         │
│  From: noreply@errandify.ai                               │
│  Subject: 📅 Mark Your Calendar: Workshop in 7 Days!      │
│  Tone: Casual, informational                              │
│  Contains: Full details, agenda, prep instructions         │
│                                                            │
│  Email #2 (Day 8 - 24 hours before)                       │
│  Subject: 🎯 Reminder: Workshop Tomorrow!                  │
│  Tone: "Don't forget" emphasis                            │
│  Contains: Details, agenda, "See you tomorrow!"            │
│                                                            │
│  Email #3 (Day 9 - 1 hour before)                         │
│  Subject: ⏰ Workshop Starting in 1 Hour!                  │
│  Tone: Urgent, action-oriented                            │
│  Contains: Minimal details, prominent "Join Now" link      │
│                                                            │
│  Email #4 (Day 9 - 9am)                                   │
│  Subject: ✨ Workshop is Happening Today!                  │
│  Tone: Enthusiastic, "we're ready!"                        │
│  Contains: Full details, agenda, "See you soon! 🚀"        │
│                                                            │
└────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────┐
│ 5. USER ATTENDS EVENT                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  User gets reminders:                                      │
│  ✓ 7 days out: plan ahead                                 │
│  ✓ 24 hours: confirm attendance                           │
│  ✓ 1 hour: last chance to prep                            │
│  ✓ Day-of: energetic final reminder                       │
│                                                            │
│  Multiple touchpoints = Higher attendance                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📅 Timeline Example

```
JUNE 2026

21  Event Created
    └─ Signup Confirmation Email Sent
    └─ Reminders queued in cron system

28  📅 7-Day Reminder Email
    └─ "Mark your calendar! Workshop in 7 days"
    └─ Full agenda, prep instructions
    └─ reminder_7days_sent = true

29  🎯 24-Hour Reminder Email
    └─ "Don't forget! Workshop tomorrow at 2pm"
    └─ Agenda, online link
    └─ reminder_24h_sent = true

30  09:00 - ✨ Day-Of Morning Reminder Email
           └─ "Workshop is happening TODAY!"
           └─ Full details, last chance to prep

    13:55 - ⏰ 1-Hour Reminder Email
           └─ "Workshop starting in 1 hour! Join now →"
           └─ Green CTA button

    14:00 - 🎉 Event Starts
           └─ Community members joining
           └─ Agenda executed as planned
```

---

## 💌 Email Template Structure

```
┌─────────────────────────────────────────────────┐
│            7-DAY REMINDER EMAIL                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  [HEADER - Gradient Orange]                    │
│  📅 Mark Your Calendar!                        │
│                                                 │
│  Hi [User Name],                               │
│  We're excited to remind you about...          │
│                                                 │
│  [EVENT CARD]                                  │
│  ├─ Title: Community Workshop                  │
│  ├─ 📅 June 28, 2026                           │
│  ├─ ⏰ 2:00 PM                                  │
│  ├─ 📍 Singapore Community Center              │
│  └─ 🔗 Join Online: https://zoom.us/...       │
│                                                 │
│  [AGENDA SECTION - Blue Background]            │
│  📋 Agenda                                      │
│  ├─ 2:00 PM Welcome (15 min)                   │
│  ├─ 2:15 PM Workshop (45 min)                  │
│  └─ 3:00 PM Q&A (15 min)                       │
│                                                 │
│  [PREP SECTION - Yellow Background]            │
│  🎒 How to Prepare                             │
│  "Bring laptop, test internet 5 min early..."  │
│                                                 │
│  [CTA BUTTON - Orange]                         │
│  View Event Details                            │
│                                                 │
│  You'll get another reminder in 24 hours!      │
│                                                 │
│  [FOOTER]                                      │
│  © 2026 Errandify                              │
│                                                 │
└─────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────┐
│          24-HOUR REMINDER EMAIL                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  [HEADER - Same Gradient]                      │
│  🎯 Event Tomorrow!                            │
│                                                 │
│  Hi [User Name],                               │
│  Don't forget! Your event starts TOMORROW!     │
│                                                 │
│  [Same EVENT CARD format]                      │
│  [Same AGENDA format]                          │
│  [No PREP section - already covered]           │
│                                                 │
│  [CTA BUTTON]                                  │
│  Join Event                                    │
│                                                 │
│  See you tomorrow! 🎉                          │
│                                                 │
└─────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────┐
│            1-HOUR REMINDER EMAIL                │
├─────────────────────────────────────────────────┤
│                                                 │
│  [HEADER - Same Gradient]                      │
│  ⏰ Event Starting in 1 Hour!                   │
│                                                 │
│  Hi [User Name],                               │
│                                                 │
│  [URGENT SECTION - Yellow Background]          │
│  🚀 Get Ready! Event starts in 1 hour           │
│  Workshop • 2:00 PM • Singapore Center         │
│                                                 │
│  [ONLINE LINK SECTION - Green Background]      │
│  Join Online: https://zoom.us/...              │
│  [CTA BUTTON - Green]                          │
│  Join Now                                      │
│                                                 │
│  Quick reminder: Join a few minutes early!     │
│                                                 │
│  [VIEW BUTTON]                                 │
│  View Event                                    │
│                                                 │
└─────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────┐
│          DAY-OF REMINDER EMAIL                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  [HEADER - Same Gradient]                      │
│  ✨ Good Morning! Event Today!                  │
│                                                 │
│  Hi [User Name],                               │
│  🎉 Today's the day! Your event is happening   │
│                                                 │
│  [EVENT CARD - Same format]                    │
│  [AGENDA - What's Happening Today]             │
│  [ONLINE LINK - If applicable]                 │
│                                                 │
│  [CTA BUTTON]                                  │
│  Go to Event                                   │
│                                                 │
│  See you soon! We can't wait. 🚀               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🗂️ Database Schema Visualization

```
EVENTS TABLE
┌──────────────────────────────────────────┐
│ id (PK)                                  │
│ title                                    │
│ description                              │
│ date                                     │
│ time                                     │
│ location                                 │
├──────────────────────────────────────────┤
│ NEW FIELDS ↓                             │
├──────────────────────────────────────────┤
│ event_link          (varchar)            │
│ agenda              (jsonb)              │
│ preparation        (text)                │
│ location_type      (varchar)             │
├──────────────────────────────────────────┤
│ REMINDER FLAGS ↓                         │
├──────────────────────────────────────────┤
│ reminder_7days_sent (boolean)            │
│ reminder_24h_sent   (boolean)            │
│ reminder_1h_sent    (boolean)            │
│ reminder_dayof_sent (boolean)            │
├──────────────────────────────────────────┤
│ status              (varchar)            │
│ created_at          (timestamp)          │
│ updated_at          (timestamp)          │
└──────────────────────────────────────────┘
        ↓
EVENT_ATTENDEES TABLE (N:M)
┌──────────────────────────────┐
│ id (PK)                      │
│ event_id (FK) ──┐            │
│ user_id (FK)    │            │
│ created_at      │            │
└──────────────────────────────┘
                  └─→ Queries attendees to send reminders
```

---

## 🎯 Cron Job Execution Pattern

```
HOURLY SCHEDULE (runs every 60 minutes)

:00 - START HOUR
 ├─ Check: Any events 7 days away?
 │  └─ YES: Send 7-day reminders + flag
 │
 ├─ Check: Any events happening tomorrow?
 │  └─ YES: Send 24-hour reminders + flag
 │
 ├─ Check: Any same-day events in ~1 hour?
 │  └─ YES: Send 1-hour reminders + flag
 │
 └─ Check: Any same-day events (9am window)?
    └─ YES: Send day-of reminders + flag

REPEAT next hour...
```

---

## 🔄 Data Flow with Duplicate Prevention

```
Event Created (June 21)
    ↓
Attendee Joins → Confirmation Email
    ↓
Cron Check Day 1 (June 28)
    ├─ Query: date = June 28 AND reminder_7days_sent = false
    ├─ Found! Send email to all attendees
    └─ UPDATE: reminder_7days_sent = true ✓
    
Next Hour Check (Day 1)
    ├─ Query: date = June 28 AND reminder_7days_sent = false
    ├─ NOT FOUND (already flagged)
    └─ Skip ✓ (prevents duplicates)

Cron Check Day 8 (June 29)
    ├─ Query: date = June 29 AND reminder_24h_sent = false
    ├─ Found! Send emails
    └─ UPDATE: reminder_24h_sent = true ✓

...and so on for 1h and day-of reminders
```

---

## 📧 Email Personalization

```
Template Rendering:

${userName}          → "Sarah Johnson"
${eventTitle}        → "Community Workshop"
${eventDate}         → "June 28, 2026"
${eventTime}         → "2:00 PM"
${eventLocation}     → "Singapore Community Center"
${eventLink}         → "https://zoom.us/j/123456789"
${agenda}            → Loops through array, renders each item
${preparation}       → "Bring laptop, test connection..."

Result: Personalized, context-specific email for each attendee
```

---

## ✨ Feature Highlights

```
✓ AUTOMATIC
  └─ No manual intervention needed after event creation

✓ INTELLIGENT TIMING  
  └─ 4 touchpoints at optimal engagement windows

✓ ESCALATING URGENCY
  └─ Casual (7d) → Important (24h) → Urgent (1h) → Enthusiastic (day-of)

✓ RICH CONTENT
  └─ Agenda, prep info, online links in every email

✓ DUPLICATE PREVENTION
  └─ Boolean flags prevent sending same email twice

✓ MOBILE FRIENDLY
  └─ Responsive HTML, works on all devices

✓ WARM & FRIENDLY
  └─ Errandify brand tone throughout

✓ CONTEXT AWARE
  └─ Handles online, in-person, hybrid events
```

---

## 🚀 Deployment Checklist

```
□ Apply migration: migrations/add_event_reminder_fields.sql
□ Deploy backend code: src/routes/email.ts
□ Deploy cron jobs: src/cron.ts
□ Deploy email templates: src/templates/emailTemplates.ts
□ Verify email service is running (sendEmail function)
□ Test email endpoints with sample event
□ Monitor first hourly cron run (check logs)
□ Verify flags set correctly after sends
□ Create sample event for testing
□ Have real user attend event
□ Monitor email delivery in next 24 hours
□ Celebrate! 🎉
```
