import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/notifications - Get user's notifications
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // TODO: notifications table doesn't exist in schema yet
    // Return empty list for now to prevent app from crashing
    res.json({
      success: true,
      data: {
        notifications: [],
        unread_count: 0,
      },
    });
    return;

    res.json({
      success: true,
      data: {
        notifications: notificationsResult.rows,
        unreadCount: parseInt(countResult.rows[0]?.count || '0'),
        total: notificationsResult.rows.length,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    // Verify ownership
    const notifResult = await db.query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [id]
    );

    if (notifResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notifResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Mark as read
    const updateResult = await db.query(
      'UPDATE notifications SET read = true WHERE id = $1 RETURNING id, read',
      [id]
    );

    res.json({
      success: true,
      data: {
        id: updateResult.rows[0].id,
        read: updateResult.rows[0].read,
      },
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    await db.query(
      'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
      [userId]
    );

    res.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Service function to create notifications
export async function createNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  actionUrl?: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, title, body, type, read, action_url, created_at)
       VALUES ($1, $2, $3, $4, false, $5, NOW())`,
      [userId, title, body, type, actionUrl || null]
    );

    // TODO: Send push notification via service worker
    // TODO: Send SMS for critical alerts via Twilio
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

// Event notification helpers

export async function notifyBidReceived(askerId: number, doerName: string, amount: number) {
  await createNotification(
    askerId,
    'task_bid_received',
    '💰 New Bid',
    `${doerName} bid $${amount} on your task!`,
    null
  );
}

export async function notifyBidAccepted(doerId: number, taskTitle: string, amount: number) {
  await createNotification(
    doerId,
    'task_bid_accepted',
    '🎉 Bid Accepted!',
    `Awesome! You're hired for "${taskTitle}". Get ready to start!`,
    null
  );
}

export async function notifyBidRejected(doerId: number, taskTitle: string) {
  await createNotification(
    doerId,
    'task_bid_rejected',
    '😕 Bid Not Selected',
    `Your bid for "${taskTitle}" wasn't chosen. Want to resubmit?`,
    null
  );
}

export async function notifyTaskReopenedAfterCancellation(
  doerId: number,
  taskTitle: string,
  bidAmount: number,
  errandId: number
) {
  const actionUrl = `/errand/${errandId}/reaccept-bid/${bidAmount}`;
  await createNotification(
    doerId,
    'task_reopened_for_bid',
    '🎯 Task Available Again!',
    `${taskTitle}" is available again! Your original bid of $${bidAmount} is ready to go. [Accept Now]`,
    actionUrl
  );
}

export async function notifyJobStarted(askerId: number, doerName: string, taskTitle: string) {
  await createNotification(
    askerId,
    'task_started',
    '⏰ Job Started',
    `${doerName} has started "${taskTitle}". They're on their way!`,
    null
  );
}

export async function notifyJobCompleted(
  askerId: number,
  doerName: string,
  taskTitle: string,
  releaseTime: string
) {
  await createNotification(
    askerId,
    'task_completed',
    '✅ Job Completed',
    `${doerName} finished "${taskTitle}". Confirm or dispute before ${releaseTime}.`,
    null
  );
}

export async function notifyPaymentReminder24h(
  askerId: number,
  taskTitle: string,
  releaseTime: string
) {
  await createNotification(
    askerId,
    'payment_reminder_24h',
    '🌸 24 Hours Left',
    `Payment for "${taskTitle}" releases in 24h. Confirm now or raise dispute if needed.`,
    null
  );
}

export async function notifyPaymentReminder1h(askerId: number, taskTitle: string) {
  await createNotification(
    askerId,
    'payment_reminder_1h',
    '⏰ 1 Hour Left!',
    `Payment releases automatically in 1 hour. No action needed if all went well. 🙏`,
    null
  );
}

export async function notifyPaymentReleased(doerId: number, amount: number, taskTitle: string) {
  await createNotification(
    doerId,
    'payment_released',
    '🎊 Payment Released!',
    `Your payment of $${amount} for "${taskTitle}" is in your wallet! 💰`,
    null
  );
}

export async function notifyReviewPrompt(
  userId: number,
  otherName: string,
  isAsker: boolean
) {
  const role = isAsker ? 'doer' : 'asker';
  await createNotification(
    userId,
    'review_prompt',
    '⭐ Leave a Review',
    `How did ${otherName} do as a ${role}? Your review helps the kampung! 🌸`,
    null
  );
}

export async function notifyReferralJoined(referrerId: number, newUserName: string, epAwarded: number) {
  await createNotification(
    referrerId,
    'referral_joined',
    '🎉 New Neighbour',
    `${newUserName} joined using your code! You earned ${epAwarded} EP. 🌸`,
    null
  );
}

export async function notifyReferralFirstTask(referrerId: number, newUserName: string, epAwarded: number) {
  await createNotification(
    referrerId,
    'referral_first_task',
    '🎊 Milestone Reached',
    `${newUserName} completed their first task! You both earned ${epAwarded} EP. 🌸`,
    null
  );
}

export async function notifyEpEarned(userId: number, epAmount: number, action: string) {
  await createNotification(
    userId,
    'ep_earned',
    '⭐ Errandify Points Earned',
    `You earned ${epAmount} EP for ${action}! Redeem for wallet credit. 💰`,
    null
  );
}

export async function notifyDisputeRaised(
  userId: number,
  otherParty: string,
  caseId: string,
  taskTitle: string
) {
  await createNotification(
    userId,
    'dispute_raised',
    '⚠️ Dispute Raised',
    `${otherParty} raised a dispute (Case ${caseId}). Payment frozen. Our team reviews within 24-48h.`,
    null
  );
}

export async function notifyDisputeResolved(
  userId: number,
  taskTitle: string,
  decision: string,
  caseId: string
) {
  await createNotification(
    userId,
    'dispute_resolved',
    '✅ Case Resolved',
    `Case ${caseId} for "${taskTitle}" has been resolved. Payment will process shortly. 🌸`,
    null
  );
}

export default router;
