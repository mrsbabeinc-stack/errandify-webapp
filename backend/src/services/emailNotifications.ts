import db from '../db.js';
import { sendEmail } from './email.js';
import {
  templateBidAccepted,
  templateTaskReopened,
  templatePaymentReleased,
  templateDailyDigest,
  templatePaymentReminder,
  templateReferralJoin,
  templateFirstJobBonus,
  templateRatingReceived,
} from '../templates/emailTemplates.js';

// Send email for critical events (immediate)
export async function sendCriticalEmail(
  userId: number,
  emailType: 'bid_accepted' | 'task_reopened' | 'payment_released' | 'referral_join' | 'first_job_bonus' | 'rating_received',
  data: any
): Promise<boolean> {
  try {
    // Get user email
    const userResult = await db.query(
      'SELECT email, display_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.log(`[Email] User ${userId} not found`);
      return false;
    }

    const user = userResult.rows[0];
    const userEmail = user.email || user.display_name; // Fallback

    // Check user preferences
    const prefsResult = await db.query(
      'SELECT email_frequency, email_preferences FROM users WHERE id = $1',
      [userId]
    );

    if (prefsResult.rows.length > 0) {
      const prefs = prefsResult.rows[0];

      // Check if user opted out
      if (prefs.email_frequency === 'never') {
        console.log(`[Email] User ${userId} opted out of emails`);
        return false;
      }

      // Check if this specific event type is disabled
      const emailPrefs = prefs.email_preferences || {};
      if (emailPrefs[emailType] === false) {
        console.log(`[Email] User ${userId} disabled ${emailType} emails`);
        return false;
      }
    }

    // Generate email
    let subject = '';
    let html = '';

    switch (emailType) {
      case 'bid_accepted':
        subject = `🎯 Bid Accepted! Payment needed in 24h`;
        html = templateBidAccepted(
          user.display_name,
          data.taskTitle,
          data.amount,
          data.taskId
        );
        break;

      case 'task_reopened':
        subject = `🎯 Task Available Again! Your bid of $${data.bidAmount}`;
        html = templateTaskReopened(
          user.display_name,
          data.taskTitle,
          data.bidAmount,
          data.taskId
        );
        break;

      case 'payment_released':
        subject = `💰 Payment Released! $${data.amount} in your wallet`;
        html = templatePaymentReleased(user.display_name, data.amount, data.taskTitle);
        break;

      case 'referral_join':
        subject = `👤 New Referral Joined! +${data.pointsAwarded} Errandify Points`;
        html = templateReferralJoin(user.display_name, data.newUserName, data.pointsAwarded);
        break;

      case 'first_job_bonus':
        subject = `🌟 First Job Milestone! +${data.pointsAwarded} Activation Bonus`;
        html = templateFirstJobBonus(user.display_name, data.referredUserName, data.pointsAwarded);
        break;

      case 'rating_received':
        subject = `✨ New Review! ${data.rating} stars - You earned +${data.pointsAwarded} EP`;
        html = templateRatingReceived(user.display_name, data.raterName, data.rating, data.taskTitle, data.pointsAwarded);
        break;
    }

    // Send email
    const success = await sendEmail({
      to: userEmail,
      subject,
      html,
    });

    if (success) {
      console.log(`[Email] ${emailType} sent to ${userEmail}`);
    }

    return success;
  } catch (error) {
    console.error(`[Email] Error sending ${emailType}:`, error);
    return false;
  }
}

// Queue notification for digest (low-priority)
export async function queueForDigest(userId: number, notificationId: number): Promise<void> {
  try {
    await db.query(
      `INSERT INTO email_digest_queue (user_id, notification_id, queued_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT DO NOTHING`,
      [userId, notificationId]
    );
  } catch (error) {
    console.error('[Email] Error queuing for digest:', error);
  }
}

// Send daily digest (runs at 9am via cron)
export async function sendDailyDigests(): Promise<void> {
  try {
    console.log('[Email] Starting daily digest send...');

    // Get all users who want daily digests
    const usersResult = await db.query(
      `SELECT DISTINCT user_id FROM email_digest_queue
       WHERE sent_at IS NULL`,
      []
    );

    for (const row of usersResult.rows) {
      const userId = row.user_id;

      // Get all queued notifications for this user
      const queuedResult = await db.query(
        `SELECT n.id, n.title, n.body, n.type
         FROM email_digest_queue edq
         JOIN notifications n ON edq.notification_id = n.id
         WHERE edq.user_id = $1 AND edq.sent_at IS NULL
         ORDER BY n.created_at DESC
         LIMIT 20`,
        [userId]
      );

      if (queuedResult.rows.length === 0) continue;

      // Get user info
      const userResult = await db.query(
        'SELECT email, display_name FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) continue;

      const user = userResult.rows[0];

      // Build summary
      const summary = {
        bids: queuedResult.rows
          .filter((n: any) => n.type === 'new_bid_received')
          .map((n: any) => ({
            doer: extractDoerName(n.body),
            amount: extractAmount(n.body),
            task: extractTaskTitle(n.body),
          })),
        messages: queuedResult.rows
          .filter((n: any) => n.type === 'message_received')
          .map((n: any) => ({
            sender: extractSenderName(n.body),
            preview: n.body.substring(0, 50),
          })),
      };

      // Send email
      const html = templateDailyDigest(user.display_name, summary);
      const success = await sendEmail({
        to: user.email || user.display_name,
        subject: `📋 Your Errandify Summary - ${queuedResult.rows.length} updates`,
        html,
      });

      // Mark as sent
      if (success) {
        await db.query(
          `UPDATE email_digest_queue
           SET sent_at = NOW()
           WHERE user_id = $1 AND sent_at IS NULL`,
          [userId]
        );

        console.log(`[Email] Daily digest sent to ${user.email}`);
      }
    }
  } catch (error) {
    console.error('[Email] Error sending daily digests:', error);
  }
}

// Send payment reminders (runs at various intervals via cron)
export async function sendPaymentReminders(): Promise<void> {
  try {
    console.log('[Email] Starting payment reminder send...');

    // Find pending payments that expire in ~24 hours
    const result = await db.query(
      `SELECT e.id, e.asker_id, e.title, e.created_at, u.display_name, u.email
       FROM errands e
       JOIN users u ON e.asker_id = u.id
       WHERE e.status = 'confirmed'
       AND e.created_at < NOW() - INTERVAL '23 hours'
       AND e.created_at > NOW() - INTERVAL '24 hours'
       AND NOT EXISTS (
         SELECT 1 FROM email_logs
         WHERE email_logs.email_type = 'payment_reminder'
         AND email_logs.errand_id = e.id
       )`,
      []
    );

    for (const errand of result.rows) {
      const hoursLeft = Math.ceil((new Date(errand.created_at).getTime() + 24 * 60 * 60 * 1000 - Date.now()) / 3600000);

      const html = templatePaymentReminder(errand.display_name, errand.title, hoursLeft);
      const success = await sendEmail({
        to: errand.email || errand.display_name,
        subject: `⏰ Payment expires in ${hoursLeft} hours!`,
        html,
      });

      // Log email sent
      if (success) {
        await db.query(
          `INSERT INTO email_logs (user_id, email_type, subject, sent_at, errand_id)
           VALUES ($1, 'payment_reminder', $2, NOW(), $3)`,
          [errand.asker_id, `Payment reminder for ${errand.title}`, errand.id]
        );

        console.log(`[Email] Payment reminder sent to ${errand.email}`);
      }
    }
  } catch (error) {
    console.error('[Email] Error sending payment reminders:', error);
  }
}

// Helper functions to extract data from notification text
function extractDoerName(body: string): string {
  const match = body.match(/(\w+) bid/);
  return match ? match[1] : 'Someone';
}

function extractAmount(body: string): string {
  const match = body.match(/\$(\d+)/);
  return match ? match[1] : '0';
}

function extractTaskTitle(body: string): string {
  const match = body.match(/"([^"]+)"/);
  return match ? match[1] : 'a task';
}

function extractSenderName(body: string): string {
  const match = body.match(/from (\w+)/);
  return match ? match[1] : 'Someone';
}
