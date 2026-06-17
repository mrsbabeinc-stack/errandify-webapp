import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import axios from 'axios';

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
      `SELECT e.*, b.doer_id FROM errands e
       LEFT JOIN bids b ON e.accepted_bid_id = b.id
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

    if (isFlagged) {
      // Track flag count
      const userFlagCount = await getRecentFlagCount(senderId, taskId);

      if (userFlagCount >= 3) {
        // Auto-suspend user for 24 hours
        await db.query(
          `UPDATE users SET suspended_until = NOW() + INTERVAL '24 hours' WHERE id = $1`,
          [senderId]
        );

        // TODO: Notify admin of auto-suspension
      }

      // TODO: Notify admin of flagged message
      // TODO: Notify user that message was flagged
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
      `SELECT e.*, b.doer_id FROM errands e
       LEFT JOIN bids b ON e.accepted_bid_id = b.id
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
              u.display_name, u.avatar_url
       FROM task_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.task_id = $1
       ORDER BY m.created_at ASC
       LIMIT 50`,
      [taskId]
    );

    res.json({
      success: true,
      data: messagesResult.rows.map(m => ({
        id: m.id,
        taskId: m.task_id,
        senderId: m.sender_id,
        senderName: m.display_name,
        senderAvatar: m.avatar_url,
        content: m.flagged ? '[Message flagged]' : m.content,
        flagged: m.flagged,
        createdAt: m.created_at,
      })),
    });
  } catch (error) {
    console.error('Get messages error:', error);
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

    // Call Qwen for content moderation
    const prompt = `
      Review this message for harmful content:
      "${content}"

      Is it safe for a community platform?
      Consider: harassment, hate speech, threats, illegal content, sexual content.

      Reply ONLY: SAFE or FLAG
    `;

    const response = await callQwen(prompt);
    const status = response.includes('FLAG') ? 'FLAG' : 'SAFE';

    return { status };
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
