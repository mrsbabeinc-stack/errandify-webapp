import db from './db.js';
import { sendDailyDigests, sendPaymentReminders } from './services/emailNotifications.js';
import { offlineNotificationService } from './services/offlineNotificationService.js';
import { ratingReminderService } from './services/ratingReminderService.js';
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

// Check and send rating reminders to users who haven't rated
export async function checkRatingReminders() {
  try {
    console.log('[CRON] Checking for rating reminders to send...');
    await ratingReminderService.sendDoerRatingReminders();
    await ratingReminderService.sendAskerRatingReminders();
    console.log('[CRON] Rating reminders check completed');
  } catch (error) {
    console.error('[CRON] Rating reminder check failed:', error);
  }
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

  // Rating reminders - run every 6 hours
  setInterval(checkRatingReminders, 6 * 60 * 60 * 1000);
  console.log('[CRON] Rating reminders scheduled to run every 6 hours');

  // Event reminders - run every hour
  setInterval(checkEventReminders7Days, 60 * 60 * 1000);
  setInterval(checkEventReminders24Hours, 60 * 60 * 1000);
  setInterval(checkEventReminders1Hour, 60 * 60 * 1000);
  setInterval(checkEventRemindersDayOf, 60 * 60 * 1000);

  // Dispute auto-resolution - run every 6 hours

  // Advertising campaign jobs - run hourly for schedule checks
  setInterval(checkAdvertisingSchedules, 60 * 60 * 1000);
  console.log('[CRON] Advertising schedule checks scheduled to run every hour');
  setInterval(retryFailedHanaProposals, 6 * 60 * 60 * 1000);
  // Hourly: money must not stay frozen because a rework stalled
  setInterval(sweepStalledRework, 60 * 60 * 1000);
  console.log('[CRON] Dispute auto-resolution scheduled to run every 6 hours');

  // Offline notification cleanup - run every hour
  setInterval(cleanupOfflineNotifications, 60 * 60 * 1000);
  console.log('[CRON] Offline notification cleanup scheduled to run every hour');

  // Retention purge — enforces docs/DATA_RETENTION.md.
  //
  // PDPC 18.5 expects data to be reviewed against the retention policy
  // regularly. Daily is more often than a seven-year period needs, but it means
  // the dry-run log is always current, so anyone can see what the policy would
  // remove without waiting a year to find out.
  //
  // Dry run unless RETENTION_PURGE_ENABLED=true. It deletes rows permanently and
  // runs unattended, so it must be switched on deliberately.
  setInterval(runRetentionPurgeJob, 24 * 60 * 60 * 1000);
  setTimeout(runRetentionPurgeJob, 60 * 1000); // once shortly after boot
  console.log('[CRON] Retention: daily report + approved-purge check');

  // Subscription management - run on 1st of month at 00:00 UTC
  const nextMonthFirst = getNextMonthFirst();
  const msUntilMonthFirst = nextMonthFirst.getTime() - new Date().getTime();
  setTimeout(() => {
    allocateMonthlySubscriptionCredits().catch(console.error);
    setTimeout(() => expireSubscriptionCredits().catch(console.error), 60 * 60 * 1000);
    setTimeout(() => processPendingSubscriptionDowngrades().catch(console.error), 2 * 60 * 60 * 1000);
    // Then repeat every month
    setInterval(() => {
      allocateMonthlySubscriptionCredits().catch(console.error);
      setTimeout(() => expireSubscriptionCredits().catch(console.error), 60 * 60 * 1000);
      setTimeout(() => processPendingSubscriptionDowngrades().catch(console.error), 2 * 60 * 60 * 1000);
    }, 30 * 24 * 60 * 60 * 1000); // Run monthly
  }, msUntilMonthFirst);
  console.log(`[CRON] Subscription jobs scheduled for ${nextMonthFirst.toISOString()}`);

  console.log('[CRON] All cron jobs started successfully');
}

/**
 * Helper: Get next 1st of month at 00:00 UTC
 */
function getNextMonthFirst(): Date {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return next;
}

/**
 * Retry Hana's proposal on disputes where it failed.
 *
 * This used to be an auto-resolution job calling batchProcessDisputes(), which
 * does not exist in disputeResolutionService — so it threw every 6 hours and
 * was swallowed by the catch. Auto-resolution is gone by design (Hana proposes,
 * an admin decides), so the slot now does something useful instead: disputes
 * where Hana errored are sitting with an admin WITHOUT a suggestion, and this
 * gives them one.
 */
/**
 * Move stalled reworks back to the admin.
 *
 * Two ways a rework stalls, and both leave someone's payment frozen, so neither
 * can be allowed to sit:
 *   - nobody answered within the consent window  -> treated as a decline
 *   - both agreed but the deadline passed        -> recorded as not completed
 *
 * Either way it goes back to an admin for a compensation decision, with what
 * happened on the record — which is useful evidence in itself.
 */
export async function sweepStalledRework() {
  try {
    const { default: db } = await import('./db.js');

    const expiredConsent = await db.query(
      `UPDATE disputes
          SET rework_outcome = 'expired',
              status = 'admin_review',
              updated_at = NOW()
        WHERE resolution_kind = 'rework'
          AND rework_outcome IS NULL
          AND rework_consent_deadline IS NOT NULL
          AND rework_consent_deadline < NOW()
        RETURNING id, errand_id`
    );

    const missedDeadline = await db.query(
      `UPDATE disputes
          SET rework_outcome = 'not_completed',
              status = 'admin_review',
              updated_at = NOW()
        WHERE resolution_kind = 'rework'
          AND rework_outcome = 'agreed'
          AND rework_deadline IS NOT NULL
          AND rework_deadline < NOW()
        RETURNING id, errand_id`
    );

    for (const row of [...expiredConsent.rows, ...missedDeadline.rows]) {
      const wasAgreed = missedDeadline.rows.some((r: any) => r.id === row.id);
      try {
        const parties = await db.query(
          `SELECT e.asker_id, ab.doer_id, e.title
             FROM errands e LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
            WHERE e.id = $1`,
          [row.errand_id]
        );
        const p = parties.rows[0];
        for (const uid of [p?.asker_id, p?.doer_id].filter(Boolean)) {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_errand_id)
             VALUES ($1, 'dispute_rework_lapsed', $2, $3, $4)`,
            [
              uid,
              `We'll take it from here on "${p?.title || 'your errand'}"`,
              wasAgreed
                ? "The rework wasn't completed by the agreed date, so we'll look at it and decide fairly. Your payment is still held safely."
                : "We didn't hear back about the rework, so we'll review it and decide. Your payment is still held safely.",
              row.errand_id,
            ]
          );
        }
      } catch (e) {
        console.warn('[CRON] Could not notify about lapsed rework:', e);
      }
    }

    const total = expiredConsent.rows.length + missedDeadline.rows.length;
    if (total > 0) console.log(`[CRON] Returned ${total} stalled rework(s) to admin review`);
  } catch (error) {
    console.error('[CRON] Rework sweep failed:', error);
  }
}

export async function retryFailedHanaProposals() {
  try {
    const { default: db } = await import('./db.js');
    const { proposeResolution } = await import('./services/hanaDisputeProposal.js');

    // Still awaiting an admin, Hana failed, and not already retried to death
    const stuck = await db.query(
      `SELECT id FROM disputes
        WHERE status = 'admin_review'
          AND hana_failed_reason IS NOT NULL
          AND hana_proposed_at IS NULL
          AND created_at > NOW() - INTERVAL '7 days'
        LIMIT 25`
    );

    for (const row of stuck.rows) {
      await proposeResolution(row.id);
    }

    if (stuck.rows.length > 0) {
      console.log(`[CRON] Retried Hana proposals for ${stuck.rows.length} dispute(s)`);
    }
  } catch (error) {
    console.error('[CRON] Hana proposal retry failed:', error);
  }
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

// Run hourly: Clean up old offline notifications
export async function cleanupOfflineNotifications() {
  try {
    console.log('[CRON] Cleaning up old offline notifications...');
    await offlineNotificationService.cleanupOldNotifications();
  } catch (error) {
    console.error('[CRON] Offline notification cleanup failed:', error);
  }
}

// ============================================
// ADVERTISING CAMPAIGN JOBS
// ============================================

/**
 * Check for due ad schedules and execute transitions
 * Run hourly
 */
export async function checkAdvertisingSchedules() {
  try {
    const { advertisingJobScheduler } = await import('./services/advertisingJobScheduler.js');
    await advertisingJobScheduler.checkAndExecuteSchedules();
  } catch (error) {
    console.error('[CRON] Advertising schedule check failed:', error);
  }
}

/**
 * Generate daily performance data for active campaigns
 * Run daily at midnight
 */
export async function generateAdvertisingPerformance() {
  try {
    const { advertisingJobScheduler } = await import('./services/advertisingJobScheduler.js');
    await advertisingJobScheduler.generateDailyPerformance();
  } catch (error) {
    console.error('[CRON] Advertising performance generation failed:', error);
  }
}

/**
 * Archive expired campaigns
 * Run daily
 */
export async function archiveExpiredAdvertisingCampaigns() {
  try {
    const { advertisingJobScheduler } = await import('./services/advertisingJobScheduler.js');
    await advertisingJobScheduler.archiveExpiredCampaigns();
  } catch (error) {
    console.error('[CRON] Advertising campaign archival failed:', error);
  }
}

/**
 * Cleanup old executed schedules
 * Run weekly
 */
export async function cleanupAdvertisingSchedules() {
  try {
    const { advertisingJobScheduler } = await import('./services/advertisingJobScheduler.js');
    await advertisingJobScheduler.cleanupOldSchedules();
  } catch (error) {
    console.error('[CRON] Advertising schedule cleanup failed:', error);
  }
}

/**
 * Allocate monthly subscription ad credits
 * Run on 1st of month at 00:00 UTC
 */
export async function allocateMonthlySubscriptionCredits() {
  try {
    console.log('[CRON] Allocating monthly subscription ad credits...');
    const { allocateMonthlyCredits } = await import('./services/adCreditService.js');
    await allocateMonthlyCredits();
    console.log('[CRON] ✅ Monthly credits allocated');
  } catch (error) {
    console.error('[CRON] Monthly credit allocation failed:', error);
  }
}

/**
 * Expire old subscription ad credits
 * Run on 1st of month at 01:00 UTC
 */
export async function expireSubscriptionCredits() {
  try {
    console.log('[CRON] Expiring old subscription ad credits...');
    const { expireOldCredits } = await import('./services/adCreditService.js');
    await expireOldCredits();
    console.log('[CRON] ✅ Old credits expired');
  } catch (error) {
    console.error('[CRON] Credit expiration failed:', error);
  }
}

/**
 * Process pending subscription downgrades
 * Run on 1st of month at 02:00 UTC
 */
export async function processPendingSubscriptionDowngrades() {
  try {
    console.log('[CRON] Processing pending subscription downgrades...');
    const { processPendingDowngrades } = await import('./services/subscriptionService.js');
    await processPendingDowngrades();
    console.log('[CRON] ✅ Pending downgrades processed');
  } catch (error) {
    console.error('[CRON] Downgrade processing failed:', error);
  }
}

/**
 * Removes anonymised accounts whose retention period has expired.
 * See services/retentionPurge.ts — dry run unless explicitly enabled.
 */
export async function runRetentionPurgeJob() {
  try {
    const { raiseRetentionReport, runRetentionPurge } = await import('./services/retentionPurge.js');
    // Each day: make sure a report exists for the admin to review, then run any
    // batch they have already approved and whose week has elapsed. Nothing is
    // deleted without an approval on file.
    await raiseRetentionReport();
    await runRetentionPurge();
  } catch (error) {
    console.error('[CRON] Retention job failed:', error);
  }
}
