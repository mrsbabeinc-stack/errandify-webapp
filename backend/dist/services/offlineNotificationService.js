import db from '../db.js';
import { sendEmail } from './email.js';
/**
 * Offline Notification Service
 * Sends email notifications to offline users for new messages
 * Batches multiple messages within 5-10 min window to avoid spam
 */
class OfflineNotificationService {
    constructor() {
        this.pendingEmailTimers = new Map();
    }
    /**
     * Queue a message for offline notification
     * Will send email if user is offline after 5 min delay
     */
    async queueOfflineNotification(recipientId, recipientEmail, senderId, senderAlias, errandId, errandTitle, messageContent) {
        try {
            // Check if user is currently online
            const userResult = await db.query(`SELECT last_active_at FROM users WHERE id = $1`, [recipientId]);
            if (userResult.rows.length === 0) {
                console.warn(`[OfflineNotification] User ${recipientId} not found`);
                return;
            }
            const lastActiveAt = new Date(userResult.rows[0].last_active_at);
            const now = new Date();
            const minutesSinceActive = (now.getTime() - lastActiveAt.getTime()) / (1000 * 60);
            // If user active in last 2 minutes, don't send email (assume still on app)
            if (minutesSinceActive < 2) {
                console.log(`[OfflineNotification] User ${recipientId} is online, skipping email`);
                return;
            }
            // Store pending notification for batching
            const messagePreview = messageContent.substring(0, 100);
            await db.query(`INSERT INTO offline_notifications (recipient_id, sender_id, sender_alias, errand_id, errand_title, message_preview, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [recipientId, senderId, senderAlias, errandId, errandTitle, messagePreview]);
            console.log(`[OfflineNotification] Queued for user ${recipientId}`);
            // Schedule email send after 5 minutes (will batch recent messages)
            this.scheduleOfflineEmailSend(recipientId, recipientEmail, 5 * 60 * 1000);
        }
        catch (error) {
            console.error('[OfflineNotification] Error queueing notification:', error);
        }
    }
    /**
     * Schedule email send with batching
     */
    scheduleOfflineEmailSend(recipientId, recipientEmail, delayMs) {
        // Clear existing timer if any
        const existingTimer = this.pendingEmailTimers.get(recipientId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        // Schedule new send
        const timer = setTimeout(async () => {
            await this.sendOfflineEmailBatch(recipientId, recipientEmail);
            this.pendingEmailTimers.delete(recipientId);
        }, delayMs);
        this.pendingEmailTimers.set(recipientId, timer);
    }
    /**
     * Send batched notifications via email
     */
    async sendOfflineEmailBatch(recipientId, recipientEmail) {
        try {
            // Get user details
            const userResult = await db.query(`SELECT display_name FROM users WHERE id = $1`, [recipientId]);
            if (userResult.rows.length === 0)
                return;
            const userName = userResult.rows[0].display_name;
            // Get pending notifications (created in last 10 min)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const notificationsResult = await db.query(`SELECT DISTINCT
           sender_alias, errand_id, errand_title, message_preview, COUNT(*) as count
         FROM offline_notifications
         WHERE recipient_id = $1 AND created_at > $2
         GROUP BY sender_alias, errand_id, errand_title, message_preview
         ORDER BY created_at DESC
         LIMIT 5`, [recipientId, tenMinutesAgo]);
            if (notificationsResult.rows.length === 0) {
                console.log(`[OfflineNotification] No pending notifications for user ${recipientId}`);
                return;
            }
            // Build email content
            const notifications = notificationsResult.rows;
            const notificationCount = notifications.reduce((sum, n) => sum + n.count, 0);
            const uniqueCount = notifications.length;
            let emailBody = `<p>Hi ${userName},</p>\n`;
            emailBody += `<p>You have <strong>${notificationCount} new message${notificationCount !== 1 ? 's' : ''}</strong> from <strong>${uniqueCount} conversation${uniqueCount !== 1 ? 's' : ''}</strong>:</p>\n`;
            emailBody += `<ul style="line-height: 1.8;">\n`;
            for (const notif of notifications) {
                const errandLink = `${process.env.APP_URL || 'http://localhost:5173'}/chat?errandId=${notif.errand_id}`;
                emailBody += `<li>
          <strong>${notif.sender_alias}</strong> on <em>${notif.errand_title}</em>:
          <br><span style="color: #666; font-size: 0.9em;">"${notif.message_preview}${notif.count > 1 ? ` (+ ${notif.count - 1} more)` : ''}"</span>
          <br><a href="${errandLink}" style="color: #ff6b35; text-decoration: none; font-weight: bold;">→ View Chat</a>
        </li>\n`;
            }
            emailBody += `</ul>\n`;
            emailBody += `<p style="margin-top: 20px; color: #999; font-size: 0.9em;">
        You received this email because you were offline.
        <a href="${process.env.APP_URL || 'http://localhost:5173'}/settings/notifications" style="color: #ff6b35;">Manage notification preferences</a>
      </p>`;
            // Send email
            const success = await sendEmail({
                to: recipientEmail,
                subject: `💬 ${notificationCount} new message${notificationCount !== 1 ? 's' : ''} on Errandify`,
                html: emailBody,
            });
            if (success) {
                console.log(`[OfflineNotification] Sent email to ${recipientEmail} with ${notificationCount} messages`);
                // Mark as sent
                await db.query(`DELETE FROM offline_notifications WHERE recipient_id = $1 AND created_at > $2`, [recipientId, tenMinutesAgo]);
            }
        }
        catch (error) {
            console.error('[OfflineNotification] Error sending batch email:', error);
        }
    }
    /**
     * Clean up old pending notifications (> 1 hour)
     * Run via cron job
     */
    async cleanupOldNotifications() {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const result = await db.query(`DELETE FROM offline_notifications WHERE created_at < $1`, [oneHourAgo]);
            console.log(`[OfflineNotification] Cleaned up ${result.rowCount} old notifications`);
        }
        catch (error) {
            console.error('[OfflineNotification] Error cleaning up:', error);
        }
    }
}
export const offlineNotificationService = new OfflineNotificationService();
