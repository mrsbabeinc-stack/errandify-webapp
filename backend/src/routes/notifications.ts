import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { storePushSubscription, sendPushNotification } from '../services/pushService.js';

const router = Router();

// GET /api/notifications - Get user's notifications
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Get user's notifications (most recent first)
    const notificationsResult = await db.query(
      `SELECT id, user_id, type, title, message as body, related_errand_id, created_at, is_read
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Get unread count
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      success: true,
      data: {
        notifications: notificationsResult.rows.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.body,
          body: n.body,
          relatedErrandId: n.related_errand_id,
          createdAt: n.created_at,
          read: n.is_read,
        })),
        unread_count: parseInt(countResult.rows[0]?.count || '0'),
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
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING id, is_read',
      [id]
    );

    res.json({
      success: true,
      data: {
        id: updateResult.rows[0].id,
        read: updateResult.rows[0].is_read,
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
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
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

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    // Delete notification
    await db.query('DELETE FROM notifications WHERE id = $1', [id]);

    res.json({
      success: true,
      data: { message: 'Notification deleted' },
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/notifications/clear-all - Clear all notifications
router.post('/clear-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    await db.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: { message: 'All notifications cleared' },
    });
  } catch (error) {
    console.error('Clear all error:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
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
    // The columns are message / is_read / related_errand_id — not body / read /
    // action_url. Every notification sent through this helper was failing on
    // "column body does not exist" and being swallowed by the catch below, so
    // 17 different notification types silently never arrived.
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())`,
      [userId, title, body, type]
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

export async function notifyBidAccepted(doerId: number, errandTitle: string, amount: number) {
  await createNotification(
    doerId,
    'errand_bid_accepted',
    'Offer Accepted',
    `Awesome! You're hired for "${errandTitle}". Get ready to start!`,
    null
  );
}

export async function notifyBidRejected(doerId: number, errandTitle: string) {
  await createNotification(
    doerId,
    'errand_bid_rejected',
    'Bid Not Selected',
    `Your bid for "${errandTitle}" wasn't chosen. Want to resubmit?`,
    null
  );
}

export async function notifyErrandReopenedAfterCancellation(
  doerId: number,
  errandTitle: string,
  bidAmount: number,
  errandId: number
) {
  const actionUrl = `/errand/${errandId}/reaccept-bid/${bidAmount}`;
  await createNotification(
    doerId,
    'errand_reopened_for_bid',
    'Errand Available Again',
    `${errandTitle}" is available again! Your original bid of $${bidAmount} is ready to go. [Accept Now]`,
    actionUrl
  );
}

export async function notifyErrandStarted(askerId: number, doerName: string, errandTitle: string) {
  await createNotification(
    askerId,
    'errand_started',
    'Errand Started',
    `${doerName} has started "${errandTitle}". They're on their way!`,
    null
  );
}

export async function notifyErrandCompleted(
  askerId: number,
  doerName: string,
  errandTitle: string,
  releaseTime: string
) {
  await createNotification(
    askerId,
    'errand_completed',
    'Errand Completed',
    `${doerName} finished "${errandTitle}". Confirm or dispute before ${releaseTime}.`,
    null
  );
}

export async function notifyPaymentReminder24h(
  askerId: number,
  errandTitle: string,
  releaseTime: string
) {
  await createNotification(
    askerId,
    'payment_reminder_24h',
    '24 Hours Left',
    `Payment for "${errandTitle}" releases in 24h. Confirm now or raise dispute if needed.`,
    null
  );
}

export async function notifyPaymentReminder1h(askerId: number, errandTitle: string) {
  await createNotification(
    askerId,
    'payment_reminder_1h',
    '⏰ 1 Hour Left!',
    `Payment releases automatically in 1 hour. No action needed if all went well. 🙏`,
    null
  );
}

export async function notifyPaymentReleased(doerId: number, amount: number, errandTitle: string) {
  await createNotification(
    doerId,
    'payment_released',
    'Payment Released',
    `Your payment of $${amount} for "${errandTitle}" is in your wallet!`,
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
  taskTitle: string,
  /** when this person must reply by — omit for the person who raised it */
  responseDeadline?: Date | string | null
) {
  // The person on the receiving end was previously told only "our team reviews
  // within 24-48h" — never that THEY needed to reply, by when, or that staying
  // quiet costs them the right to appeal the outcome. That last part matters:
  // it is a real consequence and it was going unmentioned.
  if (responseDeadline) {
    const by = new Date(responseDeadline).toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    await createNotification(
      userId,
      'dispute_raised',
      'Someone has raised an issue with an errand',
      `${otherParty} has raised an issue about "${taskTitle}". The payment is held safely while it's sorted out.\n\nPlease tell us your side by ${by}. If we don't hear from you we'll decide with only their account of it, and you won't be able to appeal the outcome.`,
      null
    );
    return;
  }

  await createNotification(
    userId,
    'dispute_raised',
    "We've got your issue",
    `Thanks for letting us know about "${taskTitle}" (${caseId}). The payment is held safely while we look into it. We've asked the other person for their side and will come back to you.`,
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

// GET /api/notifications/ai-alerts - Get AI-generated personalized alerts
router.get('/ai-alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Fetch user stats. Errands have no doer_id — the doer is linked through the
    // accepted offer (errands.accepted_bid_id -> bids.doer_id).
    const statsResult = await db.query(
      `SELECT
        COUNT(CASE WHEN e.status IN ('completed', 'completed_confirmed', 'rated') THEN 1 END) as completed_this_month,
        COUNT(CASE WHEN e.status = 'in_progress' THEN 1 END) as current_tasks,
        COALESCE((SELECT AVG(rating) FROM ratings WHERE ratee_id = $1), 0) as avg_rating
      FROM errands e
      JOIN bids b ON e.accepted_bid_id = b.id
      WHERE b.doer_id = $1
        AND DATE_TRUNC('month', e.updated_at) = DATE_TRUNC('month', NOW())`,
      [userId]
    );

    const stats = statsResult.rows[0] || { completed_this_month: 0, current_tasks: 0, avg_rating: 0 };

    // Fetch last errand earnings (the accepted offer amount is what the doer earned)
    const lastErrandResult = await db.query(
      `SELECT b.amount
       FROM errands e
       JOIN bids b ON e.accepted_bid_id = b.id
       WHERE b.doer_id = $1
         AND e.status IN ('completed', 'completed_confirmed', 'rated')
       ORDER BY e.updated_at DESC
       LIMIT 1`,
      [userId]
    );
    const lastErrandAmount = lastErrandResult.rows[0]?.amount || 80;

    // Generate AI alerts using Qwen
    const qwenApiKey = process.env.QWEN_API_KEY;
    let alerts = [];

    if (qwenApiKey) {
      try {
        const axios = await import('axios');
        const response = await axios.default.post(
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            model: 'qwen-turbo',
            input: {
              messages: [
                {
                  role: 'user',
                  content: `Generate 3 short, motivational push notifications for a gig worker on Errandify. User stats: ${stats.completed_this_month} errands completed this month, ${stats.current_tasks} tasks in progress, ${stats.avg_rating.toFixed(1)} star rating, last errand earned SGD $${lastErrandAmount}.

Generate JSON array with format: [{"type":"success/achievement/milestone","emoji":"🎉","title":"Title","message":"Short 1-2 sentence message"}]

Keep messages warm, encouraging, and specific to their activity. Use Singaporean context.`,
                }
              ],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${qwenApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        const content = response.data.output?.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          alerts = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.warn('AI alerts generation failed, using fallback:', error);
      }
    }

    // Fallback alerts if AI fails or is not configured
    if (alerts.length === 0) {
      alerts = [
        {
          type: 'success',
          emoji: '✅',
          title: 'Great News!',
          message: `Your last errand earned you SGD $${lastErrandAmount}! 🎉`,
        },
        {
          type: 'achievement',
          emoji: '🚀',
          title: 'On Fire!',
          message: `You've completed ${stats.completed_this_month} errands this month. You're a superstar! ⭐`,
        },
        {
          type: 'milestone',
          emoji: '🎁',
          title: 'Bonus Alert!',
          message: `Earn SGD $${Math.max(0, 150 - lastErrandAmount * 2)} more to unlock the "Speed Demon" badge! 🏃‍♂️`,
        },
      ];
    }

    res.json({
      success: true,
      data: {
        alerts,
      },
    });
  } catch (error) {
    console.error('AI alerts error:', error);
    res.status(500).json({ error: 'Failed to generate alerts' });
  }
});

// GET /api/notifications/preferences - Get user's notification preferences
router.get('/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      'SELECT notification_preferences FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const prefs = result.rows[0].notification_preferences || {
      offerConfirmed: true,
      errandReopened: true,
      paymentReleased: true,
      newOffer: true,
      messageReceived: true,
      errandDone: true,
      profileViewed: false,
      referralActivity: false,
      platformUpdates: false,
    };

    res.json({
      success: true,
      data: prefs,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// POST /api/notifications/preferences - Save user's notification preferences
router.post('/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const prefs = req.body;

    await db.query(
      'UPDATE users SET notification_preferences = $1 WHERE id = $2',
      [JSON.stringify(prefs), userId]
    );

    res.json({
      success: true,
      data: prefs,
      message: 'Preferences saved successfully',
    });
  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// POST /api/notifications/subscribe - Subscribe to push notifications
router.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Store subscription in database
    await storePushSubscription(userId, {
      endpoint: subscription.endpoint,
      keys: {
        auth: subscription.keys?.auth || '',
        p256dh: subscription.keys?.p256dh || '',
      },
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

// POST /api/notifications/test-push - Send test push notification (development only)
router.post('/test-push', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test push not available in production' });
    }

    const result = await sendPushNotification(userId, {
      title: 'Test Notification',
      body: 'This is a test push notification from Errandify',
      tag: 'test-notification',
      data: {
        type: 'test',
      },
    });

    res.json({
      success: true,
      message: 'Test push sent',
      result,
    });
  } catch (error) {
    console.error('Test push error:', error);
    res.status(500).json({ error: 'Failed to send test push' });
  }
});

export default router;
