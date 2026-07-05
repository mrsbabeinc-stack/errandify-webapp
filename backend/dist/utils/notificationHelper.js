// Notification Helper - Send notifications via both in-app and push channels
// Centralizes notification sending logic across the application
import db from '../db.js';
import { sendPushNotification } from '../services/pushService.js';
/**
 * Send notification via both in-app and push channels
 * Falls back to in-app only if push fails
 */
export async function sendNotification(payload) {
    try {
        // Step 1: Save to database (in-app notification)
        await createInAppNotification(payload);
        // Step 2: Send push notification (fire-and-forget)
        sendPushNotificationAsync(payload).catch((error) => {
            console.error('Push notification failed (non-blocking):', error);
        });
    }
    catch (error) {
        console.error('Failed to send notification:', error);
        throw error;
    }
}
/**
 * Create in-app notification in database
 */
async function createInAppNotification(payload) {
    try {
        await db.query(`INSERT INTO notifications
       (user_id, type, title, message, related_errand_id, related_user_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`, [
            payload.userId,
            payload.type,
            payload.title,
            payload.message,
            payload.relatedErrandId || null,
            payload.relatedUserId || null,
        ]);
    }
    catch (error) {
        console.error('Failed to create in-app notification:', error);
        throw error;
    }
}
/**
 * Send push notification asynchronously (non-blocking)
 */
async function sendPushNotificationAsync(payload) {
    try {
        // Determine push title and body based on notification type
        const pushContent = getPushNotificationContent(payload);
        await sendPushNotification(payload.userId, {
            title: pushContent.title,
            body: pushContent.body,
            tag: `${payload.type}_${payload.relatedErrandId || payload.userId}`,
            data: {
                type: payload.type,
                errandId: payload.relatedErrandId,
                userId: payload.relatedUserId,
                ...payload.data,
            },
            url: getPushNotificationUrl(payload),
        });
    }
    catch (error) {
        // Non-blocking - don't throw
        console.error('Push notification send failed:', error);
    }
}
/**
 * Get push notification content based on type
 */
function getPushNotificationContent(payload) {
    switch (payload.type) {
        case 'offer_placed':
            return {
                title: 'New Offer! 💰',
                body: payload.message,
            };
        case 'offer_accepted':
            return {
                title: 'Offer Accepted! ✅',
                body: payload.message,
            };
        case 'offer_rejected':
            return {
                title: 'Offer Declined',
                body: payload.message,
            };
        case 'errand_confirmed':
            return {
                title: 'Errand Confirmed 🎉',
                body: payload.message,
            };
        case 'job_started':
            return {
                title: 'Job Started 🚀',
                body: payload.message,
            };
        case 'job_completed':
            return {
                title: 'Job Done! 👍',
                body: payload.message,
            };
        case 'rating_received':
            return {
                title: 'You Got a Rating! ⭐',
                body: payload.message,
            };
        case 'message_received':
            return {
                title: 'New Message 💬',
                body: payload.message,
            };
        case 'errand_reopened':
            return {
                title: 'Errand Reopened',
                body: payload.message,
            };
        case 'payment_released':
            return {
                title: 'Payment Released 💳',
                body: payload.message,
            };
        case 'dispute_opened':
            return {
                title: 'Dispute Opened ⚠️',
                body: payload.message,
            };
        case 'dispute_resolved':
            return {
                title: 'Dispute Resolved ✅',
                body: payload.message,
            };
        default:
            return {
                title: payload.title,
                body: payload.message,
            };
    }
}
/**
 * Get notification URL for clicking the push notification
 */
function getPushNotificationUrl(payload) {
    if (payload.relatedErrandId) {
        return `/errand/${payload.relatedErrandId}`;
    }
    return '/my-account';
}
/**
 * Send notification to multiple users
 */
export async function broadcastNotification(userIds, payload) {
    try {
        const promises = userIds.map((userId) => sendNotification({
            ...payload,
            userId,
        }).catch((error) => {
            console.error(`Failed to send notification to user ${userId}:`, error);
        }));
        await Promise.all(promises);
    }
    catch (error) {
        console.error('Broadcast notification failed:', error);
    }
}
/**
 * Common notification patterns - use these for consistency
 */
export const NotificationTemplates = {
    offerPlaced: (bidderName, amount, errandTitle, errandId) => ({
        userId: 0, // Set by caller
        type: 'offer_placed',
        title: 'New Offer! 💰',
        message: `${bidderName} offered $${amount} for "${errandTitle}"`,
        relatedErrandId: errandId,
        data: { bidderName, amount, errandTitle },
    }),
    offerAccepted: (errandTitle, errandId) => ({
        userId: 0, // Set by caller
        type: 'offer_accepted',
        title: 'Offer Accepted! ✅',
        message: `Your offer was accepted for "${errandTitle}"`,
        relatedErrandId: errandId,
    }),
    jobCompleted: (doerName, errandTitle, errandId) => ({
        userId: 0, // Set by caller
        type: 'job_completed',
        title: 'Job Done! 👍',
        message: `${doerName} completed "${errandTitle}" - Please review their work`,
        relatedErrandId: errandId,
    }),
    ratingReceived: (raterName, rating, errandTitle, errandId) => ({
        userId: 0, // Set by caller
        type: 'rating_received',
        title: 'You Got a Rating! ⭐',
        message: `${raterName} gave you ${rating}⭐ for "${errandTitle}"`,
        relatedErrandId: errandId,
    }),
    messageReceived: (senderName, message) => ({
        userId: 0, // Set by caller
        type: 'message_received',
        title: 'New Message 💬',
        message: `${senderName}: ${message.substring(0, 50)}...`,
    }),
    paymentReleased: (amount, errandTitle, errandId) => ({
        userId: 0, // Set by caller
        type: 'payment_released',
        title: 'Payment Released 💳',
        message: `$${amount} released for "${errandTitle}"`,
        relatedErrandId: errandId,
    }),
};
