// Notification Helper - Send notifications via both in-app and push channels
// Centralizes notification sending logic across the application

import db from '../db.js';
import { sendPushNotification } from '../services/pushService.js';

export type NotificationType =
  | 'offer_placed'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'errand_confirmed'
  | 'job_started'
  | 'job_completed'
  | 'rating_received'
  | 'rating_reminder'
  | 'message_received'
  | 'errand_reopened'
  | 'payment_released'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'screening_update'
  // Marcom: an admin broadcast, an award, and an event reminder all land in
  // the same bell as everything else rather than in a channel of their own.
  | 'admin_broadcast'
  | 'recognition_awarded'
  | 'event_reminder'
  // Paid when someone you invited completes their first errand.
  | 'referral_bonus';

export interface NotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedErrandId?: number;
  relatedBidId?: number;
  data?: Record<string, any>;
}

/**
 * Send notification via both in-app and push channels
 * Falls back to in-app only if push fails
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    // Step 1: Save to database (in-app notification)
    await createInAppNotification(payload);

    // Step 2: Send push notification (fire-and-forget)
    sendPushNotificationAsync(payload).catch((error) => {
      console.error('Push notification failed (non-blocking):', error);
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
}

/**
 * Create in-app notification in database
 */
async function createInAppNotification(payload: NotificationPayload): Promise<void> {
  try {
    await db.query(
      // related_user_id does not exist on this table — the columns are
      // related_errand_id and related_bid_id. Every call through this helper
      // threw on that column and the error was swallowed by the catch below,
      // so no notification it sent has ever been stored. Affects rating
      // reminders and push as well as screening.
      `INSERT INTO notifications
       (user_id, type, title, message, related_errand_id, related_bid_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
      [
        payload.userId,
        payload.type,
        payload.title,
        payload.message,
        payload.relatedErrandId || null,
        payload.relatedBidId || null,
      ]
    );
  } catch (error) {
    console.error('Failed to create in-app notification:', error);
    throw error;
  }
}

/**
 * Send push notification asynchronously (non-blocking)
 */
async function sendPushNotificationAsync(payload: NotificationPayload): Promise<void> {
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
          bidId: payload.relatedBidId,
        ...payload.data,
      },
      url: getPushNotificationUrl(payload),
    });
  } catch (error) {
    // Non-blocking - don't throw
    console.error('Push notification send failed:', error);
  }
}

/**
 * Get push notification content based on type
 */
function getPushNotificationContent(payload: NotificationPayload): { title: string; body: string } {
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
function getPushNotificationUrl(payload: NotificationPayload): string {
  if (payload.relatedErrandId) {
    return `/errand/${payload.relatedErrandId}`;
  }
  return '/my-account';
}

/**
 * Send notification to multiple users
 */
export async function broadcastNotification(
  userIds: number[],
  payload: Omit<NotificationPayload, 'userId'>
): Promise<void> {
  try {
    const promises = userIds.map((userId) =>
      sendNotification({
        ...payload,
        userId,
      }).catch((error) => {
        console.error(`Failed to send notification to user ${userId}:`, error);
      })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Broadcast notification failed:', error);
  }
}

/**
 * Common notification patterns - use these for consistency
 */
export const NotificationTemplates = {
  offerPlaced: (bidderName: string, amount: number, errandTitle: string, errandId: number) => ({
    userId: 0, // Set by caller
    type: 'offer_placed' as NotificationType,
    title: 'New Offer! 💰',
    message: `${bidderName} offered $${amount} for "${errandTitle}"`,
    relatedErrandId: errandId,
    data: { bidderName, amount, errandTitle },
  }),

  offerAccepted: (errandTitle: string, errandId: number) => ({
    userId: 0, // Set by caller
    type: 'offer_accepted' as NotificationType,
    title: 'Offer Accepted! ✅',
    message: `Your offer was accepted for "${errandTitle}"`,
    relatedErrandId: errandId,
  }),

  jobCompleted: (doerName: string, errandTitle: string, errandId: number) => ({
    userId: 0, // Set by caller
    type: 'job_completed' as NotificationType,
    title: 'Job Done! 👍',
    message: `${doerName} completed "${errandTitle}" - Please review their work`,
    relatedErrandId: errandId,
  }),

  ratingReceived: (raterName: string, rating: number, errandTitle: string, errandId: number) => ({
    userId: 0, // Set by caller
    type: 'rating_received' as NotificationType,
    title: 'You Got a Rating! ⭐',
    message: `${raterName} gave you ${rating}⭐ for "${errandTitle}"`,
    relatedErrandId: errandId,
  }),

  messageReceived: (senderName: string, message: string) => ({
    userId: 0, // Set by caller
    type: 'message_received' as NotificationType,
    title: 'New Message 💬',
    message: `${senderName}: ${message.substring(0, 50)}...`,
  }),

  paymentReleased: (amount: number, errandTitle: string, errandId: number) => ({
    userId: 0, // Set by caller
    type: 'payment_released' as NotificationType,
    title: 'Payment Released 💳',
    message: `$${amount} released for "${errandTitle}"`,
    relatedErrandId: errandId,
  }),
};
