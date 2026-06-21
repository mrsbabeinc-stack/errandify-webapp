-- Add event reminder and details fields to events table
-- Migration: add_event_reminder_fields
-- Date: 2026-06-21

-- Add new columns if they don't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_link VARCHAR(2048);
ALTER TABLE events ADD COLUMN IF NOT EXISTS agenda JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS preparation TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'in-person';
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_7days_sent BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_dayof_sent BOOLEAN DEFAULT false;

-- Add status column if it doesn't exist (for tracking active/inactive events)
ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Create index for reminder queries
CREATE INDEX IF NOT EXISTS idx_events_date_status ON events(date, status);
CREATE INDEX IF NOT EXISTS idx_events_reminder_flags ON events(reminder_7days_sent, reminder_24h_sent, reminder_1h_sent, reminder_dayof_sent);

-- Add comment documenting the fields
COMMENT ON COLUMN events.event_link IS 'Online event link (Zoom/Meet URL) for remote attendance';
COMMENT ON COLUMN events.agenda IS 'Event agenda as JSON array: [{time: "HH:mm", title: "...", duration: "..."}]';
COMMENT ON COLUMN events.preparation IS 'Preparation instructions for attendees';
COMMENT ON COLUMN events.location_type IS 'Type of event: in-person, online, or hybrid';
COMMENT ON COLUMN events.reminder_7days_sent IS 'Flag to prevent duplicate 7-day reminders';
COMMENT ON COLUMN events.reminder_24h_sent IS 'Flag to prevent duplicate 24-hour reminders';
COMMENT ON COLUMN events.reminder_1h_sent IS 'Flag to prevent duplicate 1-hour reminders';
COMMENT ON COLUMN events.reminder_dayof_sent IS 'Flag to prevent duplicate day-of reminders';
COMMENT ON COLUMN events.status IS 'Event status: active, cancelled, or completed';
