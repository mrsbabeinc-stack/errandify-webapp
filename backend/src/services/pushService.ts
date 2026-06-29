import webpush from 'web-push';
import db from '../db.js';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@errandify.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log('Web Push VAPID configured');
} else {
  console.warn('Web Push VAPID keys not configured - push notifications disabled');
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  userAgent?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  url?: string;
}

/**
 * Store push subscription in database
 */
export async function storePushSubscription(userId: number, subscription: PushSubscriptionData): Promise<void> {
  try {
    const existingSubscription = await db.query(
      'SELECT id FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, subscription.endpoint]
    );

    if (existingSubscription.rows.length > 0) {
      // Update existing subscription
      await db.query(
        `UPDATE push_subscriptions
         SET auth_key = $1, p256dh_key = $2, user_agent = $3, updated_at = NOW()
         WHERE id = $4`,
        [subscription.keys.auth, subscription.keys.p256dh, subscription.userAgent, existingSubscription.rows[0].id]
      );
      console.log('Updated push subscription for user:', userId);
    } else {
      // Create new subscription
      await db.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, auth_key, p256dh_key, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, subscription.endpoint, subscription.keys.auth, subscription.keys.p256dh, subscription.userAgent]
      );
      console.log('Stored new push subscription for user:', userId);
    }
  } catch (error) {
    console.error('Error storing push subscription:', error);
    throw error;
  }
}

/**
 * Get all push subscriptions for a user
 */
export async function getUserPushSubscriptions(userId: number): Promise<any[]> {
  try {
    const result = await db.query(
      `SELECT id, endpoint, auth_key, p256dh_key, created_at
       FROM push_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting push subscriptions:', error);
    throw error;
  }
}

/**
 * Send push notification to user
 */
export async function sendPushNotification(
  userId: number,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('Push notifications not configured');
      return { sent: 0, failed: 0 };
    }

    // Get user's push subscriptions
    const subscriptions = await getUserPushSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return { sent: 0, failed: 0 };
    }

    // Prepare notification data
    const notificationData = {
      title: payload.title,
      body: payload.body,
      tag: payload.tag || 'errandify-notification',
      icon: payload.icon || '/errandify-icon-192.png',
      badge: payload.badge || '/errandify-badge-72.png',
      data: payload.data || {},
    };

    const pushPayload = JSON.stringify(notificationData);

    let sentCount = 0;
    let failedCount = 0;

    // Send to each subscription
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.auth_key,
            p256dh: subscription.p256dh_key,
          },
        };

        await webpush.sendNotification(pushSubscription, pushPayload);
        sentCount++;

        // Log successful send
        await logPushNotification(subscription.id, userId, payload, 'sent');
      } catch (error: any) {
        failedCount++;
        console.error('Failed to send push to subscription:', subscription.id, error.message);

        // Check if subscription is expired
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Delete expired subscription
          await db.query('DELETE FROM push_subscriptions WHERE id = $1', [subscription.id]);
          console.log('Deleted expired subscription:', subscription.id);
        }

        // Log failed send
        await logPushNotification(
          subscription.id,
          userId,
          payload,
          'failed',
          error.message || 'Unknown error'
        );
      }
    }

    console.log(`Push sent to user ${userId}: ${sentCount} sent, ${failedCount} failed`);
    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send push notification to multiple users
 */
export async function broadcastPushNotification(
  userIds: number[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    try {
      const result = await sendPushNotification(userId, payload);
      totalSent += result.sent;
      totalFailed += result.failed;
    } catch (error) {
      console.error('Error broadcasting to user:', userId, error);
      totalFailed++;
    }
  }

  return { sent: totalSent, failed: totalFailed };
}

/**
 * Log push notification send attempt
 */
async function logPushNotification(
  subscriptionId: number,
  userId: number,
  payload: PushNotificationPayload,
  status: 'sent' | 'failed' | 'pending',
  errorMessage?: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO push_notification_logs
       (subscription_id, user_id, title, body, notification_type, status, error_message, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        subscriptionId,
        userId,
        payload.title,
        payload.body,
        payload.data?.type || 'general',
        status,
        errorMessage || null,
        status === 'sent' ? new Date() : null,
      ]
    );
  } catch (error) {
    console.error('Error logging push notification:', error);
  }
}

/**
 * Clean up expired subscriptions
 */
export async function cleanupExpiredSubscriptions(): Promise<number> {
  try {
    const result = await db.query(
      `DELETE FROM push_subscriptions
       WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );

    console.log('Cleaned up expired subscriptions:', result.rowCount);
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up expired subscriptions:', error);
    return 0;
  }
}

/**
 * Remove push subscription
 */
export async function removePushSubscription(userId: number, endpoint: string): Promise<void> {
  try {
    await db.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    );
    console.log('Removed push subscription for user:', userId);
  } catch (error) {
    console.error('Error removing push subscription:', error);
    throw error;
  }
}
