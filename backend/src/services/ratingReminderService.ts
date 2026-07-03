import db from '../db.js';

export const ratingReminderService = {
  // Send reminders to doers who haven't rated their askers (48 hours after completion)
  async sendDoerRatingReminders() {
    try {
      console.log('[RatingReminder] Starting doer rating reminder check');

      // Find completed errands where:
      // 1. Status is completed/completed_confirmed/completed_unconfirmed
      // 2. Doer hasn't rated asker yet (no rating from doer_id to asker_id)
      // 3. Reminder not already sent
      // 4. Completed at least 48 hours ago

      const query = `
        SELECT DISTINCT
          e.id,
          e.formatted_id,
          e.title,
          ea.doer_id,
          e.asker_id,
          u_doer.display_name as doer_name,
          u_asker.display_name as asker_name,
          e.completed_at
        FROM errands e
        INNER JOIN errand_assignments ea ON e.id = ea.errand_id AND ea.status = 'completed'
        INNER JOIN users u_doer ON ea.doer_id = u_doer.id
        INNER JOIN users u_asker ON e.asker_id = u_asker.id
        WHERE e.status IN ('completed', 'completed_confirmed', 'completed_unconfirmed')
        AND e.doer_rating_reminder_sent = FALSE
        AND e.completed_at IS NOT NULL
        AND NOW() - e.completed_at >= INTERVAL '48 hours'
        AND NOT EXISTS (
          SELECT 1 FROM ratings
          WHERE errand_id = e.id
          AND rater_id = ea.doer_id
          AND ratee_id = e.asker_id
        )
      `;

      const result = await db.query(query);
      console.log(`[RatingReminder] Found ${result.rows.length} doers needing reminders`);

      for (const reminder of result.rows) {
        try {
          // Send notification to doer
          await db.query(
            `INSERT INTO notifications (user_id, title, body, type, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [
              reminder.doer_id,
              `⭐ Rate ${reminder.asker_name}?`,
              `Don't forget to rate ${reminder.asker_name} for "${reminder.title}". Your feedback helps the community!`,
              'rating_reminder'
            ]
          );

          // Send email reminder (TODO: implement rating_reminder email template)
          // await sendCriticalEmail(reminder.doer_id, 'rating_reminder', {
          //   errandTitle: reminder.title,
          //   otherPartyName: reminder.asker_name,
          //   formattedErrandId: reminder.formatted_id,
          // });

          // Mark reminder as sent
          await db.query(
            'UPDATE errands SET doer_rating_reminder_sent = TRUE WHERE id = $1',
            [reminder.id]
          );

          console.log(`[RatingReminder] Sent reminder to doer ${reminder.doer_id} for errand ${reminder.id}`);
        } catch (err) {
          console.error(`[RatingReminder] Error processing doer reminder for errand ${reminder.id}:`, err);
        }
      }
    } catch (error) {
      console.error('[RatingReminder] Error in sendDoerRatingReminders:', error);
      throw error;
    }
  },

  // Send reminders to askers who haven't rated their doers (48 hours after completion)
  async sendAskerRatingReminders() {
    try {
      console.log('[RatingReminder] Starting asker rating reminder check');

      const query = `
        SELECT DISTINCT
          e.id,
          e.formatted_id,
          e.title,
          e.asker_id,
          ea.doer_id,
          u_asker.display_name as asker_name,
          u_doer.display_name as doer_name,
          e.completed_at
        FROM errands e
        INNER JOIN errand_assignments ea ON e.id = ea.errand_id AND ea.status = 'completed'
        INNER JOIN users u_asker ON e.asker_id = u_asker.id
        INNER JOIN users u_doer ON ea.doer_id = u_doer.id
        WHERE e.status IN ('completed', 'completed_confirmed', 'completed_unconfirmed')
        AND e.asker_rating_reminder_sent = FALSE
        AND e.completed_at IS NOT NULL
        AND NOW() - e.completed_at >= INTERVAL '48 hours'
        AND NOT EXISTS (
          SELECT 1 FROM ratings
          WHERE errand_id = e.id
          AND rater_id = e.asker_id
          AND ratee_id = ea.doer_id
        )
      `;

      const result = await db.query(query);
      console.log(`[RatingReminder] Found ${result.rows.length} askers needing reminders`);

      for (const reminder of result.rows) {
        try {
          // Send notification to asker
          await db.query(
            `INSERT INTO notifications (user_id, title, body, type, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [
              reminder.asker_id,
              `⭐ Rate ${reminder.doer_name}?`,
              `Don't forget to rate ${reminder.doer_name} for "${reminder.title}". Your feedback helps the community!`,
              'rating_reminder'
            ]
          );

          // Send email reminder (TODO: implement rating_reminder email template)
          // await sendCriticalEmail(reminder.asker_id, 'rating_reminder', {
          //   errandTitle: reminder.title,
          //   otherPartyName: reminder.doer_name,
          //   formattedErrandId: reminder.formatted_id,
          // });

          // Mark reminder as sent
          await db.query(
            'UPDATE errands SET asker_rating_reminder_sent = TRUE WHERE id = $1',
            [reminder.id]
          );

          console.log(`[RatingReminder] Sent reminder to asker ${reminder.asker_id} for errand ${reminder.id}`);
        } catch (err) {
          console.error(`[RatingReminder] Error processing asker reminder for errand ${reminder.id}:`, err);
        }
      }
    } catch (error) {
      console.error('[RatingReminder] Error in sendAskerRatingReminders:', error);
      throw error;
    }
  },
};
