import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
const router = Router();
// GET /api/questions/:errandId - Get all questions for an errand
router.get('/:errandId', async (req, res) => {
    try {
        const { errandId } = req.params;
        const result = await db.query(`SELECT
        tq.id,
        tq.errand_id,
        tq.doer_id,
        tq.question,
        tq.asker_reply,
        tq.asker_reply_at,
        tq.created_at,
        u.display_name as doer_name
      FROM task_questions tq
      JOIN users u ON tq.doer_id = u.id
      WHERE tq.errand_id = $1
      ORDER BY tq.created_at DESC`, [errandId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});
// POST /api/questions - Post a new question
router.post('/', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId || '0', 10);
        const { errandId, question } = req.body;
        if (!errandId || !question) {
            return res.status(400).json({ error: 'Errand ID and question required' });
        }
        // Check if user already asked a question on this errand
        const existing = await db.query('SELECT id FROM task_questions WHERE errand_id = $1 AND doer_id = $2', [errandId, userId]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'You already asked a question on this task' });
        }
        // Insert the question
        const result = await db.query(`INSERT INTO task_questions (errand_id, doer_id, question, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, errand_id, doer_id, question, asker_reply, asker_reply_at, created_at`, [errandId, userId, question]);
        // Get the doer name and errand details
        const userResult = await db.query('SELECT display_name FROM users WHERE id = $1', [userId]);
        const errandResult = await db.query('SELECT title, asker_id FROM errands WHERE id = $1', [errandId]);
        // Notify asker that doer asked a question
        try {
            const doerName = userResult.rows[0]?.display_name || 'A neighbour';
            const errandTitle = errandResult.rows[0]?.title || 'your task';
            const askerId = errandResult.rows[0]?.asker_id;
            if (askerId) {
                await db.query(`INSERT INTO notifications (user_id, type, title, body, action_url, created_at, read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`, [
                    askerId,
                    'question_asked',
                    '💬 Someone has a question!',
                    `${doerName} asked a great question about "${errandTitle}". Answer it and help them do an amazing job!`,
                    `/errand/${errandId}`,
                ]);
            }
        }
        catch (notifErr) {
            console.warn('[Questions] Failed to send question notification:', notifErr);
        }
        res.status(201).json({
            success: true,
            data: {
                ...result.rows[0],
                doer_name: userResult.rows[0]?.display_name || 'Anonymous',
            },
        });
    }
    catch (error) {
        console.error('Error posting question:', error);
        res.status(500).json({ error: 'Failed to post question' });
    }
});
// POST /api/questions/:questionId/reply - Asker replies to a question
router.post('/:questionId/reply', authMiddleware, async (req, res) => {
    try {
        const { questionId } = req.params;
        const { reply } = req.body;
        const userId = parseInt(req.userId || '0', 10);
        if (!reply) {
            return res.status(400).json({ error: 'Reply text required' });
        }
        // Get the question and verify user is the asker
        const questionResult = await db.query(`SELECT tq.*, e.asker_id
       FROM task_questions tq
       JOIN errands e ON tq.errand_id = e.id
       WHERE tq.id = $1`, [questionId]);
        if (questionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }
        const question = questionResult.rows[0];
        if (question.asker_id !== userId) {
            return res.status(403).json({ error: 'Only the asker can reply' });
        }
        // Update the reply
        const result = await db.query(`UPDATE task_questions
       SET asker_reply = $1, asker_reply_at = NOW()
       WHERE id = $2
       RETURNING id, errand_id, doer_id, question, asker_reply, asker_reply_at, created_at`, [reply, questionId]);
        // Notify doer that their question was answered
        try {
            const errandResult = await db.query('SELECT title FROM errands WHERE id = $1', [question.errand_id]);
            const errandTitle = errandResult.rows[0]?.title || 'your task';
            await db.query(`INSERT INTO notifications (user_id, type, title, body, action_url, created_at, read)
         VALUES ($1, $2, $3, $4, $5, NOW(), false)`, [
                question.doer_id,
                'question_answered',
                '✨ Your question got answered!',
                `The neighbour replied to your question about "${errandTitle}". Check out their answer!`,
                `/errand/${question.errand_id}`,
            ]);
        }
        catch (notifErr) {
            console.warn('[Questions] Failed to send reply notification:', notifErr);
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Error replying to question:', error);
        res.status(500).json({ error: 'Failed to reply to question' });
    }
});
export default router;
