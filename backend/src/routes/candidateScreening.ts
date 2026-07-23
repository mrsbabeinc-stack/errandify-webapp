import express, { Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';

import { authMiddleware, requireAdmin } from '../middleware/auth.js';

/**
 * Two routers, because these endpoints belong on two different surfaces.
 *
 * `adminScreeningRouter` mounts under /api/admin with the rest of the admin
 * API. `publicScreeningRouter` must NOT: a candidate has no account, and
 * everything under /api/admin is caught by the router-level guard in
 * staffManagement.ts before it resolves.
 */
const router = express.Router();          // admin surface
const publicRouter = express.Router();    // candidate surface, no auth

const isAdmin: any = [authMiddleware, requireAdmin(['admin', 'super-admin'])];

const INVITE_TTL_DAYS = 7;

/**
 * Scores one answer.
 *
 * Only question types with an objective right answer are scored:
 *   multiple-choice — matches expected_answer
 *   scale           — a 1-5 rating, taken proportionally
 * Free text and ranking return null: there is no honest way to mark prose
 * automatically here, and inventing a number would put a made-up figure next
 * to a real hiring decision. Those are counted as needing human review, and
 * the candidate's total is reported alongside how much of it was actually
 * scoreable.
 */
function scoreAnswer(question: any, answer: string): number | null {
  if (answer == null || String(answer).trim() === '') return 0;

  if (question.question_type === 'multiple-choice') {
    if (!question.expected_answer) return null;
    return String(answer).trim().toLowerCase() ===
           String(question.expected_answer).trim().toLowerCase()
      ? Number(question.weightage)
      : 0;
  }

  if (question.question_type === 'scale') {
    const rating = Number(answer);
    if (Number.isNaN(rating)) return 0;
    const clamped = Math.max(1, Math.min(5, rating));
    return Math.round((clamped / 5) * Number(question.weightage) * 100) / 100;
  }

  return null;
}

/* ────────────────────────────── Admin ────────────────────────────── */

// Invite a candidate to screen for a role
router.post('/job-openings/:id/invites', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { candidate_name, candidate_email } = req.body;

    if (!candidate_name?.trim() || !candidate_email?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Candidate name and email are required',
      });
    }

    const opening = await db.query(
      'SELECT id, job_title, status FROM job_openings WHERE id = $1',
      [id]
    );
    if (opening.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job opening not found' });
    }

    const questions = await db.query(
      'SELECT COUNT(*) AS count FROM job_screening_questions WHERE job_opening_id = $1',
      [id]
    );
    if (Number(questions.rows[0].count) === 0) {
      return res.status(409).json({
        success: false,
        error: 'Add at least one screening question before inviting candidates',
      });
    }

    // Unguessable: this token alone grants access to the screening.
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    const result = await db.query(
      `INSERT INTO candidate_invites (
         job_opening_id, candidate_name, candidate_email, token,
         status, expires_at, created_at
       ) VALUES ($1, $2, $3, $4, 'sent', $5, NOW())
       ON CONFLICT (job_opening_id, LOWER(candidate_email)) DO UPDATE SET
         candidate_name = EXCLUDED.candidate_name,
         token          = EXCLUDED.token,
         status         = 'sent',
         score          = NULL,
         scored_count   = NULL,
         review_count   = NULL,
         expires_at     = EXCLUDED.expires_at,
         opened_at      = NULL,
         completed_at   = NULL
       RETURNING id, token, expires_at`,
      [id, candidate_name.trim(), candidate_email.trim(), token, expiresAt.toISOString()]
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        // Path only — the caller knows its own origin, and building an
        // absolute URL from a request header would trust a spoofable Host.
        invite_path: `/screening/${row.token}`,
        expires_at: row.expires_at,
      },
    });
  } catch (error) {
    console.error('[Screening] Invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to create invite' });
  }
});

// Invites for a role
router.get('/job-openings/:id/invites', isAdmin, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, candidate_name, candidate_email, status, score,
              scored_count, review_count, expires_at, opened_at, completed_at,
              created_at,
              (expires_at < NOW()) AS is_expired
         FROM candidate_invites
        WHERE job_opening_id = $1
        ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Screening] List invites error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invites' });
  }
});

// A candidate's answers, for the reviewer
router.get('/invites/:inviteId/answers', isAdmin, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT q.id AS question_id, q.question, q.category, q.question_type,
              q.weightage, q.expected_answer,
              a.answer, a.awarded
         FROM job_screening_questions q
         LEFT JOIN candidate_answers a
                ON a.question_id = q.id AND a.invite_id = $1
        WHERE q.job_opening_id = (
                SELECT job_opening_id FROM candidate_invites WHERE id = $1
              )
        ORDER BY q.sort_order, q.id`,
      [req.params.inviteId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Screening] Answers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch answers' });
  }
});

/* ───────────────────────── Candidate (public) ───────────────────────── */

/**
 * Public by design — a candidate has no account. Access is the token alone,
 * so these two handlers never reveal anything beyond the one screening it
 * names, and never accept an invite id.
 */

publicRouter.get('/candidate-screening/:token', async (req: Request, res: Response) => {
  try {
    const invite = await db.query(
      `SELECT i.id, i.candidate_name, i.status, i.expires_at,
              o.job_title, o.department, o.job_id
         FROM candidate_invites i
         JOIN job_openings o ON o.id = i.job_opening_id
        WHERE i.token = $1`,
      [req.params.token]
    );

    if (invite.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'This screening link is not valid' });
    }

    const row = invite.rows[0];

    if (new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'This screening link has expired' });
    }
    if (row.status === 'completed') {
      return res.status(409).json({
        success: false,
        error: 'This screening has already been submitted',
      });
    }

    const questions = await db.query(
      `SELECT id, category, question, question_type, options
         FROM job_screening_questions
        WHERE job_opening_id = (SELECT job_opening_id FROM candidate_invites WHERE id = $1)
        ORDER BY sort_order, id`,
      [row.id]
    );

    // First open is recorded so a reviewer can tell "never looked" from
    // "looked and did not finish".
    await db.query(
      `UPDATE candidate_invites
          SET status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END,
              opened_at = COALESCE(opened_at, NOW())
        WHERE id = $1`,
      [row.id]
    );

    res.json({
      success: true,
      data: {
        candidate_name: row.candidate_name,
        job_title: row.job_title,
        department: row.department,
        // Weightage and expected_answer are deliberately withheld — they
        // would tell the candidate which answers score.
        questions: questions.rows,
      },
    });
  } catch (error) {
    console.error('[Screening] Fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to load screening' });
  }
});

publicRouter.post('/candidate-screening/:token', async (req: Request, res: Response) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: 'answers must be an array' });
    }

    const invite = await db.query(
      'SELECT id, job_opening_id, status, expires_at FROM candidate_invites WHERE token = $1',
      [req.params.token]
    );
    if (invite.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'This screening link is not valid' });
    }

    const row = invite.rows[0];
    if (new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'This screening link has expired' });
    }
    if (row.status === 'completed') {
      return res.status(409).json({ success: false, error: 'This screening has already been submitted' });
    }

    const questions = await db.query(
      `SELECT id, question_type, weightage, expected_answer
         FROM job_screening_questions WHERE job_opening_id = $1`,
      [row.job_opening_id]
    );
    const byId = new Map(questions.rows.map((q: any) => [q.id, q]));

    let awardedTotal = 0;
    let scoreableTotal = 0;
    let scoredCount = 0;
    let reviewCount = 0;

    for (const entry of answers) {
      const question = byId.get(Number(entry.question_id));
      if (!question) continue; // ignore answers to questions not on this role

      const awarded = scoreAnswer(question, entry.answer);

      if (awarded === null) {
        reviewCount += 1;
      } else {
        awardedTotal += awarded;
        scoreableTotal += Number(question.weightage);
        scoredCount += 1;
      }

      await db.query(
        `INSERT INTO candidate_answers (invite_id, question_id, answer, awarded, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (invite_id, question_id) DO UPDATE SET
           answer = EXCLUDED.answer, awarded = EXCLUDED.awarded`,
        [row.id, question.id, entry.answer ?? null, awarded]
      );
    }

    // Percentage of what could be scored — not of the whole questionnaire, so
    // a candidate is never penalised for questions no machine can mark.
    const score = scoreableTotal > 0
      ? Math.round((awardedTotal / scoreableTotal) * 1000) / 10
      : null;

    await db.query(
      `UPDATE candidate_invites
          SET status = 'completed', score = $1, scored_count = $2,
              review_count = $3, completed_at = NOW()
        WHERE id = $4`,
      [score, scoredCount, reviewCount, row.id]
    );

    res.json({
      success: true,
      data: { submitted: true, questions_answered: scoredCount + reviewCount },
    });
  } catch (error) {
    console.error('[Screening] Submit error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit screening' });
  }
});

export const adminScreeningRouter = router;
export const publicScreeningRouter = publicRouter;

export default router;
