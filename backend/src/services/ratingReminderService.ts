import db from '../db.js';
import { sendNotification } from '../utils/notificationHelper.js';
import { sendEmail } from './email.js';
import { templateRatingReminder } from '../templates/emailTemplates.js';

/**
 * Rating Reminder Service
 * Handles scheduling and sending of rating reminders for doers to rate askers
 */

export const ratingReminderService = {
  /**
   * Send pending doer rating reminders (called by cron job every 6 hours)
   */
  async sendDoerRatingReminders(): Promise<void> {
    await sendPendingRatingReminders();
  },

  /**
   * Placeholder for asker rating reminders (future enhancement)
   */
  async sendAskerRatingReminders(): Promise<void> {
    // TODO: Implement asker rating reminders if needed
  },
};

/**
 * Schedule a rating reminder for the doer to rate the asker
 * Sends in-app notification when doer comes online (smart timing)
 * Falls back to email after 3 days if never rated
 */
export async function scheduleRatingReminder(errandId: number, doerId: number): Promise<void> {
  try {
    // Get errand details
    const errandResult = await db.query(
      `SELECT e.id, e.asker_id
       FROM errands e
       WHERE e.id = $1`,
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      console.warn(`[RatingReminder] Errand ${errandId} not found`);
      return;
    }

    const { asker_id: askerId } = errandResult.rows[0];

    // Store reminder to be triggered on next online activity
    // Will be sent when user comes online OR after 3 days (whichever comes first)
    const fallbackEmailTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    await db.query(
      `INSERT INTO pending_reminders (errand_id, doer_id, asker_id, reminder_type, scheduled_for, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (errand_id, doer_id, reminder_type) DO NOTHING`,
      [errandId, doerId, askerId, 'rating_reminder_online', fallbackEmailTime]
    );

    console.log(`[RatingReminder] Scheduled online reminder for errand ${errandId}, doer ${doerId} (fallback: ${fallbackEmailTime.toISOString()})`);
  } catch (error) {
    console.error('[RatingReminder] Failed to schedule rating reminder:', error);
    // Non-blocking error - don't fail the completion submission
  }
}

/**
 * Send pending rating reminders when doer comes online OR after fallback timeout
 * Smart reminder system: catches users while active, sends email as fallback
 */
export async function sendPendingRatingReminders(): Promise<void> {
  try {
    // Find pending reminders that should be sent:
    // 1. User just came online (last_active_at is very recent)
    // 2. Fallback timer reached (3 days passed)
    const remindersResult = await db.query(
      `SELECT pr.id, pr.errand_id, pr.doer_id, pr.asker_id,
              e.title, e.formatted_id,
              doer.email as doer_email, doer.display_name as doer_name, doer.last_active_at,
              asker.display_name as asker_name
       FROM pending_reminders pr
       JOIN errands e ON pr.errand_id = e.id
       JOIN users doer ON pr.doer_id = doer.id
       JOIN users asker ON pr.asker_id = asker.id
       WHERE pr.reminder_type = $1
       AND pr.sent_at IS NULL
       AND (
         -- Option 1: User just came online (last_active_at within last 5 minutes)
         (doer.last_active_at >= NOW() - INTERVAL '5 minutes')
         -- Option 2: Fallback timer reached (3 days passed)
         OR pr.scheduled_for <= NOW()
       )
       LIMIT 100`,
      ['rating_reminder_online']
    );

    console.log(`[RatingReminder] Found ${remindersResult.rows.length} pending reminders to send`);

    for (const reminder of remindersResult.rows) {
      try {
        const { id: reminderId, errand_id: errandId, doer_id: doerId, asker_id: askerId, title: taskTitle, doer_email: doerEmail, doer_name: doerName, asker_name: askerName, last_active_at: lastActiveAt } = reminder;

        // Check if doer has already rated
        const ratingCheckResult = await db.query(
          `SELECT id FROM ratings WHERE errand_id = $1 AND rater_id = $2`,
          [errandId, doerId]
        );

        if (ratingCheckResult.rows.length > 0) {
          console.log(`[RatingReminder] Doer ${doerId} has already rated errand ${errandId}, skipping`);
          await db.query('UPDATE pending_reminders SET sent_at = NOW() WHERE id = $1', [reminderId]);
          continue;
        }

        // Determine delivery method based on when user is active
        const isUserOnlineNow = lastActiveAt && new Date(lastActiveAt).getTime() > Date.now() - 5 * 60 * 1000;

        // Always send in-app notification (catches them if online)
        await sendNotification({
          userId: doerId,
          type: 'rating_reminder',
          title: `💫 Don't Forget to Rate ${askerName}!`,
          message: `You completed "${taskTitle}". Rate ${askerName} and earn +5 bonus points!`,
          relatedErrandId: errandId,
          data: { taskTitle, askerName, errandId },
        });

        // Send email if: user not online now OR it's the fallback reminder (3+ days)
        if (doerEmail && (!isUserOnlineNow || !lastActiveAt)) {
          const emailContent = templateRatingReminder(doerName, askerName, taskTitle, errandId);
          await sendEmail({
            to: doerEmail,
            subject: `💫 Don't Forget to Rate ${askerName}!`,
            html: emailContent,
          });
          console.log(`[RatingReminder] Sent email reminder for errand ${errandId}, doer ${doerId}`);
        } else if (isUserOnlineNow) {
          console.log(`[RatingReminder] User online - sent in-app notification for errand ${errandId}, doer ${doerId}`);
        }

        // Mark reminder as sent
        await db.query('UPDATE pending_reminders SET sent_at = NOW() WHERE id = $1', [reminderId]);
      } catch (error) {
        console.error(`[RatingReminder] Failed to send reminder ${reminder.id}:`, error);
        // Continue with next reminder
      }
    }
  } catch (error) {
    console.error('[RatingReminder] Failed to send pending rating reminders:', error);
  }
}
