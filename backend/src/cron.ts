import db from './db.js';
import { sendDailyDigests, sendPaymentReminders } from './services/emailNotifications.js';
import axios from 'axios';

/**
 * Cron jobs for Errandify job execution flow
 * Run these at specified intervals
 */

// Run every 15 minutes: Check for tasks ready for auto-payment release
export async function checkAutoPaymentRelease() {
  try {
    console.log('[CRON] Checking for tasks ready for auto-payment release...');

    // Find tasks that are:
    // - status = 'completed_unconfirmed'
    // - payment_release_at <= NOW()
    // - dispute_status IS NULL (no dispute raised)
    // - payment_released_at IS NULL (not yet released)
    const tasksResult = await db.query(
      `SELECT e.*, b.doer_id, b.amount FROM errands e
       LEFT JOIN bids b ON e.accepted_bid_id = b.id
       WHERE e.status = $1
       AND e.payment_release_at <= NOW()
       AND e.dispute_status IS NULL
       AND e.payment_released_at IS NULL
       ORDER BY e.payment_release_at ASC`,
      ['completed_unconfirmed']
    );

    console.log(`[CRON] Found ${tasksResult.rows.length} tasks ready for auto-release`);

    for (const task of tasksResult.rows) {
      try {
        await releasePaymentForTask(task, 'auto_release');
        console.log(`[CRON] Auto-released payment for task ${task.id}`);
      } catch (error) {
        console.error(`[CRON] Error releasing payment for task ${task.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[CRON] Auto-payment release check failed:', error);
  }
}

// Run every hour: Send 24-hour reminders
export async function check24hReminders() {
  try {
    console.log('[CRON] Checking for 24h payment reminders...');

    // Find tasks that are:
    // - status = 'completed_unconfirmed'
    // - payment_release_at BETWEEN NOW()+23h AND NOW()+25h
    // - reminder_24h_sent = false
    // - dispute_status IS NULL
    const now = new Date();
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const tasksResult = await db.query(
      `SELECT e.*, u.display_name FROM errands e
       JOIN users u ON e.asker_id = u.id
       WHERE e.status = $1
       AND e.payment_release_at > $2
       AND e.payment_release_at < $3
       AND e.reminder_24h_sent = false
       AND e.dispute_status IS NULL`,
      ['completed_unconfirmed', in23h.toISOString(), in25h.toISOString()]
    );

    console.log(`[CRON] Sending 24h reminders for ${tasksResult.rows.length} tasks`);

    for (const task of tasksResult.rows) {
      try {
        // TODO: Send push notification to asker
        // Message: "Hi [Name] 🌸 Payment for '[task]' releases in 24 hours. Confirm now or raise a dispute if needed."

        await db.query(
          'UPDATE errands SET reminder_24h_sent = true WHERE id = $1',
          [task.id]
        );

        console.log(`[CRON] 24h reminder sent for task ${task.id}`);
      } catch (error) {
        console.error(`[CRON] Error sending 24h reminder for task ${task.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[CRON] 24h reminder check failed:', error);
  }
}

// Run every hour: Send 1-hour (47h) final reminders
export async function check47hReminders() {
  try {
    console.log('[CRON] Checking for 47h final reminders...');

    // Find tasks that are:
    // - status = 'completed_unconfirmed'
    // - payment_release_at BETWEEN NOW()+46h AND NOW()+48h
    // - reminder_47h_sent = false
    // - dispute_status IS NULL
    const now = new Date();
    const in46h = new Date(now.getTime() + 46 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const tasksResult = await db.query(
      `SELECT e.*, u.display_name FROM errands e
       JOIN users u ON e.asker_id = u.id
       WHERE e.status = $1
       AND e.payment_release_at > $2
       AND e.payment_release_at < $3
       AND e.reminder_47h_sent = false
       AND e.dispute_status IS NULL`,
      ['completed_unconfirmed', in46h.toISOString(), in48h.toISOString()]
    );

    console.log(`[CRON] Sending 47h reminders for ${tasksResult.rows.length} tasks`);

    for (const task of tasksResult.rows) {
      try {
        // TODO: Send push notification to asker
        // Message: "Just 1 hour left! Payment releases automatically soon. No action needed if all went well. 🙏"

        await db.query(
          'UPDATE errands SET reminder_47h_sent = true WHERE id = $1',
          [task.id]
        );

        console.log(`[CRON] 47h reminder sent for task ${task.id}`);
      } catch (error) {
        console.error(`[CRON] Error sending 47h reminder for task ${task.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[CRON] 47h reminder check failed:', error);
  }
}

// Helper function to release payment
async function releasePaymentForTask(task: any, reason: 'early_confirm' | 'auto_release') {
  const bidAmount = parseFloat(task.amount);
  const platformFee = bidAmount * 0.20; // 20% platform fee
  const doerPayout = bidAmount - platformFee;

  // Check for penalties on doer
  const doerResult = await db.query(
    'SELECT penalty_owed FROM users WHERE id = $1',
    [task.doer_id]
  );

  const penaltyOwed = doerResult.rows[0]?.penalty_owed || 0;
  const finalPayout = doerPayout - penaltyOwed;

  // TODO: Execute Stripe transfer to doer's Connect account
  // const stripeTransferId = await stripe.transfers.create({...});

  // Record payment release
  const releaseResult = await db.query(
    `INSERT INTO payment_releases (task_id, bid_amount, platform_fee, doer_payout, stripe_transfer_id, released_at, release_reason)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)
     RETURNING id, released_at`,
    [task.id, bidAmount, platformFee, finalPayout, null, reason]
  );

  // Update task status
  await db.query(
    `UPDATE errands
     SET status = $1, payment_released_at = NOW()
     WHERE id = $2`,
    ['completed_confirmed', task.id]
  );

  // Deduct penalty if applied
  if (penaltyOwed > 0) {
    await db.query(
      'UPDATE users SET penalty_owed = 0 WHERE id = $1',
      [task.doer_id]
    );
  }

  // TODO: Send notifications
  // Asker: "Payment released for '[task]'."
  // Doer: "Your payment of $[amount] is in your wallet! 🎊"

  // TODO: Generate and send eReceipt to both parties

  return releaseResult.rows[0];
}

// Scheduled job: Send daily digest at 9am (Asia/Singapore)
export async function scheduleDailyDigest() {
  try {
    console.log('[CRON] Running daily digest send...');
    await sendDailyDigests();
  } catch (error) {
    console.error('[CRON] Daily digest error:', error);
  }
}

// Scheduled job: Send payment reminders (check every hour)
export async function schedulePaymentReminders() {
  try {
    console.log('[CRON] Checking for payment reminders...');
    await sendPaymentReminders();
  } catch (error) {
    console.error('[CRON] Payment reminder error:', error);
  }
}

// Helper to get next 9am in Singapore timezone
function getNextNineAM(): Date {
  const now = new Date();
  const singapore = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));

  const next9am = new Date(singapore);
  next9am.setHours(9, 0, 0, 0);

  // If already past 9am, schedule for tomorrow
  if (next9am < singapore) {
    next9am.setDate(next9am.getDate() + 1);
  }

  return next9am;
}

// Start all cron jobs
export function startCrons() {
  console.log('[CRON] Starting all cron jobs...');

  // DISABLED: Check auto-payment release - bids table queries need fixing
  // setInterval(checkAutoPaymentRelease, 15 * 60 * 1000);

  // DISABLED: Check 24h reminders - payment_release_at logic needs schema review
  // setInterval(check24hReminders, 60 * 60 * 1000);

  // DISABLED: Check 47h reminders - payment_release_at logic needs schema review
  // setInterval(check47hReminders, 60 * 60 * 1000);

  // DISABLED: Send payment reminders - users table has no email column
  // setInterval(schedulePaymentReminders, 60 * 60 * 1000);

  // Schedule daily digest at 9am Singapore time
  const nextDigestTime = getNextNineAM();
  const msUntilNextDigest = nextDigestTime.getTime() - new Date().getTime();
  setTimeout(() => {
    scheduleDailyDigest().catch(console.error);
    // Then repeat every 24 hours
    setInterval(scheduleDailyDigest, 24 * 60 * 60 * 1000);
  }, msUntilNextDigest);

  console.log(`[CRON] Daily digest scheduled for ${nextDigestTime.toISOString()}`);

  // Event reminders - run every hour
  setInterval(checkEventReminders7Days, 60 * 60 * 1000);
  setInterval(checkEventReminders24Hours, 60 * 60 * 1000);
  setInterval(checkEventReminders1Hour, 60 * 60 * 1000);
  setInterval(checkEventRemindersDayOf, 60 * 60 * 1000);

  console.log('[CRON] All cron jobs started successfully');
}

/**
 * Check for events 7 days away and send reminders
 */
export async function checkEventReminders7Days() {
  try {
    console.log('[CRON] Checking for events 7 days away...');

    // Find events that are 7 days away (within 1-hour window)
    const result = await db.query(
      `SELECT e.id, e.title, e.date, e.time, e.location, e.event_link, e.agenda, e.preparation,
              ea.user_id, u.email, u.display_name
       FROM events e
       JOIN event_attendees ea ON e.id = ea.event_id
       JOIN users u ON ea.user_id = u.id
       WHERE e.reminder_7days_sent = false
       AND e.date = CURRENT_DATE + INTERVAL '7 days'
       AND e.status = 'active'`
    );

    console.log(`[CRON] Found ${result.rows.length} attendees to remind (7 days)`);

    for (const row of result.rows) {
      try {
        await axios.post(
          `${process.env.API_URL || 'http://localhost:3000'}/api/email/send-event-reminder-7days`,
          {
            email: row.email,
            eventTitle: row.title,
            eventDate: row.date,
            eventTime: row.time,
            eventLocation: row.location,
            eventLink: row.event_link,
            agenda: row.agenda,
            preparation: row.preparation,
          },
          { headers: { Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}` } }
        );

        // Mark reminder as sent
        await db.query(
          `UPDATE events SET reminder_7days_sent = true WHERE id = $1`,
          [row.id]
        );
      } catch (error) {
        console.error(`[CRON] Error sending 7-day reminder for event ${row.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[CRON] Event 7-day reminder check failed:', error);
  }
}

/**
 * Check for events 24 hours away and send reminders
 */
export async function checkEventReminders24Hours() {
  try {
    console.log('[CRON] Checking for events 24 hours away...');

    const result = await db.query(
      `SELECT e.id, e.title, e.date, e.time, e.location, e.event_link, e.agenda,
              ea.user_id, u.email, u.display_name
       FROM events e
       JOIN event_attendees ea ON e.id = ea.event_id
       JOIN users u ON ea.user_id = u.id
       WHERE e.reminder_24h_sent = false
       AND e.date = CURRENT_DATE + INTERVAL '1 day'
       AND e.status = 'active'`
    );

    console.log(`[CRON] Found ${result.rows.length} attendees to remind (24 hours)`);

    for (const row of result.rows) {
      try {
        await axios.post(
          `${process.env.API_URL || 'http://localhost:3000'}/api/email/send-event-reminder-24hours`,
          {
            email: row.email,
            eventTitle: row.title,
            eventDate: row.date,
            eventTime: row.time,
            eventLocation: row.location,
            eventLink: row.event_link,
            agenda: row.agenda,
          },
          { headers: { Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}` } }
        );

        await db.query(
          `UPDATE events SET reminder_24h_sent = true WHERE id = $1`,
          [row.id]
        );
      } catch (error) {
        console.error(`[CRON] Error sending 24h reminder for event ${row.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[CRON] Event 24h reminder check failed:', error);
  }
}

/**
 * Check for events in 1 hour and send reminders
 */
export async function checkEventReminders1Hour() {
  try {
    console.log('[CRON] Checking for events in 1 hour...');

    // For same-day events, check within 1 hour window
    const result = await db.query(
      `SELECT e.id, e.title, e.time, e.location, e.event_link,
              ea.user_id, u.email, u.display_name
       FROM events e
       JOIN event_attendees ea ON e.id = ea.event_id
       JOIN users u ON ea.user_id = u.id
       WHERE e.reminder_1h_sent = false
       AND e.date = CURRENT_DATE
       AND e.time::time BETWEEN NOW()::time + INTERVAL '55 minutes' AND NOW()::time + INTERVAL '1 hour 5 minutes'
       AND e.status = 'active'`
    );

    console.log(`[CRON] Found ${result.rows.length} attendees to remind (1 hour)`);

    for (const row of result.rows) {
      try {
        await axios.post(
          `${process.env.API_URL || 'http://localhost:3000'}/api/email/send-event-reminder-1hour`,
          {
            email: row.email,
            eventTitle: row.title,
            eventTime: row.time,
            eventLocation: row.location,
            eventLink: row.event_link,
          },
          { headers: { Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}` } }
        );

        await db.query(
          `UPDATE events SET reminder_1h_sent = true WHERE id = $1`,
          [row.id]
        );
      } catch (error) {
        console.error(`[CRON] Error sending 1h reminder for event ${row.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[CRON] Event 1h reminder check failed:', error);
  }
}

/**
 * Check for events on the day and send morning reminders
 */
export async function checkEventRemindersDayOf() {
  try {
    console.log('[CRON] Checking for events happening today...');

    const result = await db.query(
      `SELECT e.id, e.title, e.date, e.time, e.location, e.event_link, e.agenda,
              ea.user_id, u.email, u.display_name
       FROM events e
       JOIN event_attendees ea ON e.id = ea.event_id
       JOIN users u ON ea.user_id = u.id
       WHERE e.reminder_dayof_sent = false
       AND e.date = CURRENT_DATE
       AND EXTRACT(HOUR FROM NOW()) BETWEEN 8 AND 9
       AND e.status = 'active'`
    );

    console.log(`[CRON] Found ${result.rows.length} attendees to remind (day-of)`);

    for (const row of result.rows) {
      try {
        await axios.post(
          `${process.env.API_URL || 'http://localhost:3000'}/api/email/send-event-reminder-dayof`,
          {
            email: row.email,
            eventTitle: row.title,
            eventDate: row.date,
            eventTime: row.time,
            eventLocation: row.location,
            eventLink: row.event_link,
            agenda: row.agenda,
          },
          { headers: { Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}` } }
        );

        await db.query(
          `UPDATE events SET reminder_dayof_sent = true WHERE id = $1`,
          [row.id]
        );
      } catch (error) {
        console.error(`[CRON] Error sending day-of reminder for event ${row.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[CRON] Event day-of reminder check failed:', error);
  }
}
