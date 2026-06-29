import db from '../db.js';

export interface NotificationPreferences {
  offerConfirmed: boolean;
  errandReopened: boolean;
  paymentReleased: boolean;
  newOffer: boolean;
  messageReceived: boolean;
  errandDone: boolean;
  profileViewed: boolean;
  referralActivity: boolean;
  platformUpdates: boolean;
}

const notificationTypeMap: Record<string, keyof NotificationPreferences> = {
  'offer_confirmed': 'offerConfirmed',
  'errand_reopened': 'errandReopened',
  'payment_released': 'paymentReleased',
  'new_offer': 'newOffer',
  'message_received': 'messageReceived',
  'errand_done': 'errandDone',
  'profile_viewed': 'profileViewed',
  'referral_activity': 'referralActivity',
  'platform_updates': 'platformUpdates',
};

export async function getUserNotificationPreferences(userId: number): Promise<NotificationPreferences> {
  try {
    const result = await db.query(
      'SELECT notification_preferences FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return getDefaultPreferences();
    }

    return result.rows[0].notification_preferences || getDefaultPreferences();
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return getDefaultPreferences();
  }
}

export function getDefaultPreferences(): NotificationPreferences {
  return {
    offerConfirmed: true,
    errandReopened: true,
    paymentReleased: true,
    newOffer: true,
    messageReceived: true,
    errandDone: true,
    profileViewed: true,
    referralActivity: true,
    platformUpdates: true,
  };
}

export async function shouldSendNotification(
  userId: number,
  notificationType: string
): Promise<boolean> {
  const prefKey = notificationTypeMap[notificationType];

  if (!prefKey) {
    // If notification type not mapped, send by default
    return true;
  }

  const prefs = await getUserNotificationPreferences(userId);
  return prefs[prefKey];
}

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  relatedErrandId?: number
): Promise<boolean> {
  // Check if user wants this notification
  const shouldSend = await shouldSendNotification(userId, type);

  if (!shouldSend) {
    console.log(`Notification ${type} skipped for user ${userId} (preferences disabled)`);
    return false;
  }

  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, related_errand_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [userId, type, title, message, relatedErrandId || null]
    );
    console.log(`Notification ${type} created for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}
