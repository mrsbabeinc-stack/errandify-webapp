import db from '../db.js';
import { sendNotification } from '../utils/notificationHelper.js';
import { sendEmail } from './email.js';
import { templateRatingReminder } from '../templates/emailTemplates.js';

/**
 * Schedule a rating reminder for the doer to rate the asker
 * Sends both email and in-app notification 24 hours after job completion
 */
export async function scheduleRatingReminder(errandId: number, doerId: number): Promise<void> {
  try {
    // Get errand and doer details
    const errandResult = await db.query(
      `SELECT e.id, e.title, e.asker_id, e.formatted_id,
              asker.email as asker_email, asker.display_name as asker_name,
              doer.email as doer_email, doer.display_name as doer_name
       FROM errands e
       LEFT JOIN users asker ON e.asker_id = asker.id
       LEFT JOIN users doer ON e.id = doer.id
       WHERE e.id = $1`,
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      console.warn(`[RatingReminder] Errand ${errandId} not found`);
      return;
    }

    const { title: taskTitle, asker_id: askerId, formatted_id: errandFormattedId, asker_name: askerName, doer_email: doerEmail, doer_name: doerName } = errandResult.rows[0];

    // Schedule the reminder to be sent 24 hours from now
    // Store in a pending_reminders table or use a cron job
    const reminderTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await db.query(
      `INSERT INTO pending_reminders (errand_id, doer_id, asker_id, reminder_type, scheduled_for, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (errand_id, doer_id, reminder_type) DO NOTHING`,
      [errandId, doerId, askerId, 'rating_reminder', reminderTime]
    );

    console.log(`[RatingReminder] Scheduled reminder for errand ${errandId}, doer ${doerId} at ${reminderTime.toISOString()}`);
  } catch (error) {
    console.error('[RatingReminder] Failed to schedule rating reminder:', error);
    // Non-blocking error - don't fail the completion submission
  }
}

/**
 * Send pending rating reminders
 * This should be called by a cron job or scheduled task runner
 */
export async function sendPendingRatingReminders(): Promise<void> {
  try {
    // Find all pending rating reminders that are due
    const remindersResult = await db.query(
      `SELECT pr.id, pr.errand_id, pr.doer_id, pr.asker_id,
              e.title, e.formatted_id,
              doer.email as doer_email, doer.display_name as doer_name,
              asker.display_name as asker_name
       FROM pending_reminders pr
       JOIN errands e ON pr.errand_id = e.id
       JOIN users doer ON pr.doer_id = doer.id
       JOIN users asker ON pr.asker_id = asker.id
       WHERE pr.reminder_type = $1
       AND pr.scheduled_for <= NOW()
       AND pr.sent_at IS NULL
       LIMIT 100`,
      ['rating_reminder']
    );

    console.log(`[RatingReminder] Found ${remindersResult.rows.length} pending reminders`);

    for (const reminder of remindersResult.rows) {
      try {
        const { id: reminderId, errand_id: errandId, doer_id: doerId, asker_id: askerId, title: taskTitle, formatted_id: errandFormattedId, doer_email: doerEmail, doer_name: doerName, asker_name: askerName } = reminder;

        // Check if doer has already rated
        const ratingCheckResult = await db.query(
          `SELECT id FROM ratings WHERE errand_id = $1 AND rater_id = $2`,
          [errandId, doerId]
        );

        if (ratingCheckResult.rows.length > 0) {
          console.log(`[RatingReminder] Doer ${doerId} has already rated errand ${errandId}, skipping reminder`);
          // Mark as sent anyway
          await db.query('UPDATE pending_reminders SET sent_at = NOW() WHERE id = $1', [reminderId]);
          continue;
        }

        // Send in-app notification
        await sendNotification({
          userId: doerId,
          type: 'rating_reminder',
          title: `💫 Don't Forget to Rate ${askerName}!`,
          message: `You completed "${taskTitle}". Rate ${askerName} and earn +5 bonus points!`,
          relatedErrandId: errandId,
          relatedUserId: askerId,
          data: { taskTitle, askerName, errandId },
        });

        // Send email
        if (doerEmail) {
          const emailContent = templateRatingReminder(doerName, askerName, taskTitle, errandId);
          await sendEmail(
            doerEmail,
            `💫 Don't Forget to Rate ${askerName}!`,
            emailContent
          );
        }

        // Mark reminder as sent
        await db.query('UPDATE pending_reminders SET sent_at = NOW() WHERE id = $1', [reminderId]);

        console.log(`[RatingReminder] Sent reminder for errand ${errandId}, doer ${doerId}`);
      } catch (error) {
        console.error(`[RatingReminder] Failed to send reminder ${reminder.id}:`, error);
        // Continue with next reminder
      }
    }
  } catch (error) {
    console.error('[RatingReminder] Failed to send pending rating reminders:', error);
  }
}
