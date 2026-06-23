import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware, isUserOnline } from '../middleware/auth.js';
import db from '../db.js';
import axios from 'axios';
import { sendEmail } from '../services/email.js';

const router = Router();

// POST /api/messages/tasks/:taskId/send - Send message in task chat
router.post('/tasks/:taskId/send', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const senderId = parseInt(req.userId || '0', 10);

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // Verify user is involved in task
    const taskResult = await db.query(
      `SELECT e.*, b.doer_id, u.display_name as asker_name FROM errands e
       LEFT JOIN bids b ON e.id = b.errand_id AND b.status IN ('accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress')
       LEFT JOIN users u ON e.asker_id = u.id
       WHERE e.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];
    const isAsker = task.asker_id === senderId;
    const isDoer = task.doer_id === senderId;

    if (!isAsker && !isDoer) {
      return res.status(403).json({ error: 'Only asker and doer can message' });
    }

    // Content moderation via Qwen
    const moderationResult = await moderateMessage(content);
    const isFlagged = moderationResult.status === 'FLAG';

    // Store message
    const messageResult = await db.query(
      `INSERT INTO task_messages (task_id, sender_id, content, flagged, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, task_id, sender_id, content, flagged, created_at`,
      [taskId, senderId, content, isFlagged]
    );

    const message = messageResult.rows[0];

    // Create in-app notification for recipient
    try {
      const recipientId = isAsker ? task.doer_id : task.asker_id;
      const senderName = task.asker_id === senderId ? task.asker_name || 'Asker' : 'Doer';

      await db.query(
        `INSERT INTO notifications (user_id, type, title, body, action_url, created_at, read)
         VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
        [
          recipientId,
          'new_message',
          `💬 New message from ${senderName}`,
          `${senderName} sent: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          `/errand/${taskId}`,
        ]
      );
    } catch (notifErr) {
      console.warn('[Notification] Failed to create in-app notification:', notifErr);
      // Don't fail the message if notification creation fails
    }

    // Send email notification to the other user
    try {
      const recipientId = isAsker ? task.doer_id : task.asker_id;
      const senderName = task.asker_id === senderId ? task.asker_name || 'Asker' : 'Doer';

      // Get recipient email
      const recipientResult = await db.query(
        `SELECT email, display_name FROM users WHERE id = $1`,
        [recipientId]
      );

      if (recipientResult.rows.length > 0 && recipientResult.rows[0].email) {
        const recipientEmail = recipientResult.rows[0].email;
        const recipientName = recipientResult.rows[0].display_name;

        // Send email notification
        await sendEmail({
          to: recipientEmail,
          subject: `💬 New message from ${senderName} on "${task.title}"`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">New Message from ${senderName}</h2>
                <p style="color: #666; font-size: 14px;">On task: <strong>"${task.title}"</strong></p>

                <div style="background: white; padding: 15px; border-left: 4px solid #8B5A2B; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #333; line-height: 1.6;">${content}</p>
                </div>

                <div style="margin: 20px 0;">
                  <a href="${process.env.APP_URL || 'http://localhost:5173'}/errand/${taskId}"
                     style="background: #8B5A2B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    View in Chat
                  </a>
                </div>

                <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                  You're receiving this email because ${senderName} sent you a message on Errandify.
                  <br/>
                  <a href="${process.env.APP_URL || 'http://localhost:5173'}/settings" style="color: #8B5A2B; text-decoration: none;">Update notification preferences</a>
                </p>
              </div>
            </div>
          `,
          text: `New message from ${senderName} on "${task.title}"\n\n${content}\n\nView in chat: ${process.env.APP_URL || 'http://localhost:5173'}/errand/${taskId}`,
        });

        console.log(`[Email] Sent chat notification to ${recipientEmail}`);
      }
    } catch (emailErr) {
      console.warn('[Email] Failed to send chat notification:', emailErr);
      // Don't fail the message if email fails
    }

    if (isFlagged) {
      // Track flag count
      const userFlagCount = await getRecentFlagCount(senderId, taskId);

      // Get sender info for admin notification
      const senderResult = await db.query(
        `SELECT id, display_name, email FROM users WHERE id = $1`,
        [senderId]
      );
      const sender = senderResult.rows[0];

      // Create admin notification for flagged message
      try {
        await db.query(
          `INSERT INTO admin_notifications (type, severity, user_id, message, details, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            'flagged_message',
            'medium',
            senderId,
            `Message flagged from ${sender?.display_name || 'User ' + senderId}`,
            JSON.stringify({
              messageId: message.id,
              taskId: taskId,
              taskTitle: task.title,
              userId: senderId,
              userName: sender?.display_name,
              userEmail: sender?.email,
              content: content.substring(0, 200),
              flagCount: userFlagCount,
            }),
          ]
        );
        console.log(`[Moderation] Flagged message #${message.id} from user ${senderId} (flag count: ${userFlagCount})`);
      } catch (notifErr) {
        console.warn('[Moderation] Failed to create admin notification:', notifErr);
      }

      if (userFlagCount >= 3) {
        // Auto-suspend user for 24 hours
        await db.query(
          `UPDATE users SET suspended_until = NOW() + INTERVAL '24 hours' WHERE id = $1`,
          [senderId]
        );

        // Create admin notification for auto-suspension
        try {
          await db.query(
            `INSERT INTO admin_notifications (type, severity, user_id, message, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              'user_suspended',
              'high',
              senderId,
              `User ${sender?.display_name || 'User ' + senderId} auto-suspended (3+ flagged messages)`,
              JSON.stringify({
                userId: senderId,
                userName: sender?.display_name,
                userEmail: sender?.email,
                reason: '3 or more flagged messages',
                suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                flagCount: userFlagCount,
              }),
            ]
          );
          console.log(`[Moderation] User ${senderId} auto-suspended for 24 hours (${userFlagCount} flags)`);
        } catch (notifErr) {
          console.warn('[Moderation] Failed to create suspension notification:', notifErr);
        }
      }
    }

    // TODO: Emit socket.io event for real-time update
    // socket.to(`task_${taskId}`).emit('message', message);

    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        taskId: message.task_id,
        senderId: message.sender_id,
        content: message.content,
        flagged: message.flagged,
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/tasks/:taskId - Get all messages for task
router.get('/tasks/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is involved in task
    const taskResult = await db.query(
      `SELECT e.*, b.doer_id,
              asker.display_name as asker_name,
              doer.display_name as doer_name
       FROM errands e
       LEFT JOIN bids b ON e.id = b.errand_id AND b.status IN ('accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress')
       LEFT JOIN users asker ON e.asker_id = asker.id
       LEFT JOIN users doer ON b.doer_id = doer.id
       WHERE e.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];
    const isAsker = task.asker_id === userId;
    const isDoer = task.doer_id === userId;

    if (!isAsker && !isDoer) {
      return res.status(403).json({ error: 'Only asker and doer can view messages' });
    }

    // Get messages (last 50)
    const messagesResult = await db.query(
      `SELECT m.id, m.task_id, m.sender_id, m.content, m.flagged, m.created_at,
              u.display_name, u.profile_image_url
       FROM task_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.task_id = $1
       ORDER BY m.created_at ASC
       LIMIT 50`,
      [taskId]
    );

    // Get online status for both participants (handle null doer_id)
    const userStatusMap: any = {};
    if (task.asker_id || task.doer_id) {
      const statusIds = [task.asker_id, task.doer_id].filter((id: any) => id != null);
      if (statusIds.length > 0) {
        const placeholders = statusIds.map((_: any, i: number) => `$${i + 1}`).join(',');
        const userStatusResult = await db.query(
          `SELECT id, last_active_at FROM users WHERE id IN (${placeholders})`,
          statusIds
        );
        userStatusResult.rows.forEach((row: any) => {
          userStatusMap[row.id] = isUserOnline(row.last_active_at);
        });
      }
    }

    // Check if chat should be disabled (dispute raised or 48h after completion)
    let chatDisabled = false;
    let chatDisabledReason = '';

    // Check for active disputes
    const disputeResult = await db.query(
      `SELECT id FROM disputes WHERE errand_id = $1 AND status IN ('open', 'in_progress')`,
      [taskId]
    );

    if (disputeResult.rows.length > 0) {
      chatDisabled = true;
      chatDisabledReason = 'A dispute has been raised. Chat is disabled.';
    }

    // Check if job was completed more than 48 hours ago
    if (!chatDisabled) {
      const completionResult = await db.query(
        `SELECT updated_at FROM errands WHERE id = $1 AND status = 'completed'`,
        [taskId]
      );

      if (completionResult.rows.length > 0 && completionResult.rows[0].updated_at) {
        const completedAt = new Date(completionResult.rows[0].updated_at).getTime();
        const now = new Date().getTime();
        const hoursElapsed = (now - completedAt) / (1000 * 60 * 60);

        if (hoursElapsed > 48) {
          chatDisabled = true;
          chatDisabledReason = 'Chat was closed 48 hours after job completion.';
        }
      }
    }

    // Check if current user has favorited the other user
    let isFavorited = false;
    const otherUserId = isAsker ? task.doer_id : task.asker_id;
    if (otherUserId) {
      const favoriteResult = await db.query(
        `SELECT id FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2`,
        [userId, otherUserId]
      );
      isFavorited = favoriteResult.rows.length > 0;
    }

    res.json({
      success: true,
      data: {
        messages: messagesResult.rows.map(m => ({
          id: m.id,
          taskId: m.task_id,
          senderId: m.sender_id,
          senderName: m.display_name,
          senderAvatar: m.profile_image_url,
          content: m.flagged ? '[Message flagged]' : m.content,
          flagged: m.flagged,
          createdAt: m.created_at,
        })),
        participantStatus: {
          askerId: task.asker_id,
          askerName: task.asker_name || 'Unknown',
          askerOnline: userStatusMap[task.asker_id] || false,
          doerId: task.doer_id,
          doerName: task.doer_name || 'Unknown',
          doerOnline: task.doer_id ? userStatusMap[task.doer_id] || false : false,
        },
        chatStatus: {
          isDisabled: chatDisabled,
          reason: chatDisabledReason,
          isFavorited: isFavorited,
        },
      },
    });
  } catch (error) {
    console.error('Get messages error:', error instanceof Error ? error.message : error);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages/tasks/:taskId/hana - Chat with Hana AI
router.post('/tasks/:taskId/hana', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { question } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question required' });
    }

    // Get task context
    const taskResult = await db.query(
      'SELECT title, description, category, budget FROM errands WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Get user language
    const userResult = await db.query(
      'SELECT language_pref FROM users WHERE id = $1',
      [userId]
    );

    const userLanguage = userResult.rows[0]?.language_pref || 'en';

    // Call Qwen for Hana response
    const hanaResponse = await getHanaResponse(question, task, userLanguage);

    res.json({
      success: true,
      data: {
        question,
        answer: hanaResponse,
        source: 'hana',
      },
    });
  } catch (error) {
    console.error('Hana message error:', error);
    res.status(500).json({ error: 'Failed to get Hana response' });
  }
});

// Helper functions

async function moderateMessage(content: string): Promise<{ status: 'SAFE' | 'FLAG' }> {
  try {
    // Check length first (very long messages might be spam)
    if (content.length > 5000) {
      return { status: 'FLAG' };
    }

    // Basic content checks
    const lowerContent = content.toLowerCase();

    // Check for obvious spam patterns
    const spamPatterns = [
      /(.)\1{9,}/g, // 10+ repeated characters
      /\b(http|https|www)/i, // URLs in chat
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        return { status: 'FLAG' };
      }
    }

    // Use aggressive pattern-based moderation for explicit content
    // Block obvious sexual/drug/violence terms - HIGH PRIORITY
    const blockedPatterns = [
      // Sexual content (30+ keywords)
      /\bporn\b|\bpornograph/i,
      /\bxxx\b/i,
      /\bsex worker\b/i,
      /\berotic\b/i,
      /\borgasm\b/i,
      /\bgenital\b/i,
      /\bmasturbat/i,
      /\bblowjob\b|\bblow job\b/i,
      /\bhandjob\b/i,
      /\bthreesome\b/i,
      /\bfetish\b/i,
      /\bstripper\b|\bstrip club\b/i,
      /\bbooty call\b/i,
      /\bone night stand\b/i,
      /\bnudes\b/i,
      /\bonlyfans\b/i,
      /\bintercourse\b/i,
      /\boral sex\b/i,
      /\bescort service\b/i,
      /\bhappy ending massage\b|\bhappy ending\b/i,
      /\bspecial service\b/i,
      /\bsex\b/i,
      /\bsexual.*service\b|\bservice.*sexual\b/i,
      /\bprostitut/i,
      /\bsex work\b|\bsex.*work\b/i,
      /\bescort\b/i,
      /\bbdsm\b|\bbondage\b/i,
      /\bkink\b/i,
      /\bboobs\b|\bboobies\b/i,
      /\bbreasts\b/i,

      // Violence/threats/abuse (25+ keywords)
      /\bmurder\b/i,
      /\bstrangle\b/i,
      /\bkidnap\b/i,
      /\btorture\b/i,
      /\bterrorist\b/i,
      /\bsuicide bomb\b/i,
      /\bmass shooting\b/i,
      /\bbloodbath\b/i,
      /\bdecapitate\b/i,
      /\bdismember\b/i,
      /\bi will kill\b|\bkill you\b|\bstab that\b|\bshoot him\b|\bshoot her\b|\bbomb your\b|\bgo die\b|\bkill all\b/i,
      /\bi hate (you|u)\b/i,
      /\byou suck\b/i,
      /\byou're stupid\b/i,
      /\byou're useless\b/i,
      /\byou're trash\b/i,
      /\byou're pathetic\b/i,
      /\byou're a loser\b/i,
      /\bgo kill yourself\b/i,
      /\bkill yourself\b/i,
      /\bdie\b.*\byou\b|\byou\b.*\bdie\b/i,

      // Hate speech (16 keywords)
      /\bnigger\b|\bnigga\b/i,
      /\bchink\b/i,
      /\bgook\b/i,
      /\bspic\b/i,
      /\bkike\b/i,
      /\bwetback\b/i,
      /\btowelhead\b/i,
      /\braghead\b/i,
      /\bwhite supremacy\b/i,
      /\bethnic cleansing\b/i,
      /\bgas chamber\b/i,
      /\bgenocide\b/i,
      /\bracial purity\b/i,
      /\bkill all chinks\b|\bkill all niggers\b/i,

      // Drug references
      /\bheroin\b|\bcocaine\b|\bmeth\b|\bweed\b|\bcoke\b|\bcrack\b/i,
      /\bdrug\b/i,
      /\bmarijuana\b/i,

      // Scams
      /\bcrypto\b|\bbitcoin\b|\bforex\b/i,
      /\bmlm\b|\bpyramid\b.*\bscheme\b/i,
      /\bwire.*money\b|\bbank.*transfer\b.*\bupfront\b/i,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(lowerContent)) {
        console.log(`[Moderation] BLOCKED by pattern: "${content}"`);
        return { status: 'FLAG' };
      }
    }

    // Try Qwen API as secondary check (belt and suspenders)
    const qwenApiKey = process.env.QWEN_API_KEY;
    if (qwenApiKey) {
      try {
        const moderationResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${qwenApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen-turbo',
            messages: [
              {
                role: 'system',
                content: `You are a STRICT content moderation expert for task marketplace chat. Your job is to CATCH EVERYTHING inappropriate.

BLOCK IMMEDIATELY for:
1. SEXUAL CONTENT: Any sexual references, innuendo, flirting, sexual propositions, "special services", suggestive language
2. VIOLENCE/THREATS: Kill, hurt, stab, shoot, bomb, torture, or any harm intent
3. VERBAL ABUSE: Insults, curse words, name-calling, harassment, disrespect, rudeness
4. HATE SPEECH: Racist/sexist/homophobic/transphobic slurs or dehumanizing language
5. DRUGS: Heroin, cocaine, weed, meth, or any illegal substance references
6. SCAMS: Crypto, MLM, wire money upfront, investment schemes

ALSO BLOCK:
- "I hate you" / "I hate u" = VERBAL ABUSE
- "Do die" / "die" = THREATS
- Suggestive emojis combined with sexual context 😏💦
- Indirect sexual proposals ("netflix and chill", "come over", "let's hangout" + suggestive context)
- Passive-aggressive insults ("you're not smart enough", "nobody likes you")
- Threats disguised as jokes ("I'll find you", "I know where you live")
- Sarcastic mocking or belittling language
- Any expression of hate or wishing harm on someone

CONTEXT MATTERS:
- "Let's meet at the hotel to discuss the job" = OK
- "Want to meet at a hotel?" (no job context) = BLOCK

ALLOW ONLY:
- Task coordination ("when?", "where?", "budget?", "details?")
- Professional discussion
- Friendly, respectful conversation

Be VERY STRICT. When in doubt, BLOCK.
Respond with ONLY: {"appropriate": true} or {"appropriate": false}`,
              },
              {
                role: 'user',
                content: `Message: "${content}"\n\nAnalyze for: explicit content, violence, verbal abuse, hate speech, aggressive tone.\nRespond with JSON only.`,
              },
            ],
            temperature: 0.1, // Very low temp = strict
          }),
        });

        if (moderationResponse.ok) {
          const result = await moderationResponse.json();
          const text = result.output?.text || '{"appropriate": true}';
          try {
            const parsed = JSON.parse(text);
            if (parsed.appropriate === false) {
              console.log(`[Moderation] Qwen FLAGGED (${parsed.reason}): "${content}"`);
              return { status: 'FLAG' };
            }
          } catch (e) {
            console.warn('[Moderation] Qwen JSON parse error, treating as SAFE');
          }
        } else {
          console.warn(`[Moderation] Qwen API returned ${moderationResponse.status}`);
        }
      } catch (err) {
        console.error('[Moderation] Qwen API error:', err);
      }
    }

    // If we got here, message passed all checks
    return { status: 'SAFE' };
  } catch (error) {
    console.error('Moderation error:', error);
    // Default to SAFE on error (don't block messages)
    return { status: 'SAFE' };
  }
}

async function getRecentFlagCount(userId: number, taskId: string): Promise<number> {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM task_messages
       WHERE sender_id = $1 AND task_id = $2 AND flagged = true
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId, taskId]
    );

    return parseInt(result.rows[0]?.count || '0', 10);
  } catch (error) {
    console.error('Flag count error:', error);
    return 0;
  }
}

async function getHanaResponse(
  question: string,
  task: any,
  userLanguage: string
): Promise<string> {
  try {
    const prompt = `
      You are Hana, Errandify's warm AI helper. A community member has a question
      about their task.

      Task: ${task.title}
      Description: ${task.description}
      Category: ${task.category}
      Budget: $${task.budget}

      Question: "${question}"

      Respond warmly and helpfully:
      1. Show you understand their concern
      2. Give practical advice
      3. Be brief and friendly

      If the issue is complex (disputes, payments, account issues), say:
      "This needs our team's help. Let me flag it for you. Case ID: ERD-[4-digit-random].
      Someone will check in soon. 🌸"

      Sign off with 🌸
    `;

    const response = await callQwen(prompt, userLanguage);
    return response;
  } catch (error) {
    console.error('Hana response error:', error);
    return (
      'Oops, I had a hiccup! Try again in a moment. ' +
      'If this keeps happening, let us know. 🌸'
    );
  }
}

async function callQwen(prompt: string, language: string = 'en'): Promise<string> {
  try {
    // TODO: Implement real Qwen API call
    // For now, return warm placeholder
    return (
      'Thanks for reaching out! Our team will help sort this out. ' +
      'Check your messages for updates. 🌸'
    );
  } catch (error) {
    console.error('Qwen API error:', error);
    throw error;
  }
}

export default router;
