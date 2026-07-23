import express, { Request, Response } from 'express';
import db from '../db.js';

import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware, requireAdmin(['admin', 'super-admin']));

/**
 * Reads against the pre-existing job_openings shape: the column is job_title,
 * not title, and job_id is the varchar business key that job_applications
 * points at. Both are aliased here so the screen sees the names it expects
 * without the table having to be renamed underneath application intake.
 *
 * Both counts are derived rather than stored, so neither can drift from the
 * rows it describes.
 */
const SELECT_OPENING = `
  SELECT o.id,
         o.job_id,
         o.job_title AS title,
         o.department,
         o.reporting_to,
         o.team_size,
         o.description AS job_description,
         o.requirements,
         o.responsibilities,
         o.salary_min,
         o.salary_max,
         o.salary_range,
         o.employment_type,
         o.work_arrangement,
         o.status,
         o.published_at,
         o.closed_at,
         o.closing_date::text AS closing_date,
         o.created_at,
         COALESCE(q.count, 0) AS question_count,
         COALESCE(a.count, 0) AS candidates_count
    FROM job_openings o
    LEFT JOIN (
      SELECT job_opening_id, COUNT(*) AS count
        FROM job_screening_questions GROUP BY job_opening_id
    ) q ON q.job_opening_id = o.id
    LEFT JOIN (
      SELECT job_id, COUNT(*) AS count
        FROM job_applications GROUP BY job_id
    ) a ON a.job_id = o.job_id
`;

// List openings
router.get('/job-openings', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let query = SELECT_OPENING + ' WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[JobOpenings] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch job openings' });
  }
});

// One opening, with its screening questions
router.get('/job-openings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const opening = await db.query(SELECT_OPENING + ' WHERE o.id = $1', [id]);

    if (opening.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job opening not found' });
    }

    const questions = await db.query(
      `SELECT id, category, question, question_type, options, weightage, expected_answer
         FROM job_screening_questions
        WHERE job_opening_id = $1
        ORDER BY sort_order, id`,
      [id]
    );

    res.json({
      success: true,
      data: { ...opening.rows[0], screening_questions: questions.rows },
    });
  } catch (error) {
    console.error('[JobOpenings] Get error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch job opening' });
  }
});

// Create an opening
router.post('/job-openings', async (req: Request, res: Response) => {
  try {
    const {
      title, department, reporting_to, team_size, job_description,
      requirements, responsibilities, salary_min, salary_max, work_arrangement,
      employment_type,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'Job title is required' });
    }

    if (salary_min != null && salary_max != null && Number(salary_max) < Number(salary_min)) {
      return res.status(400).json({
        success: false,
        error: 'Maximum salary cannot be lower than minimum salary',
      });
    }

    // job_id is the business key job_applications points at, and it is NOT
    // NULL and unique. Generated here because nothing else allocates one.
    const result = await db.query(
      `INSERT INTO job_openings (
         job_id, job_title, department, reporting_to, team_size, description,
         requirements, responsibilities, salary_min, salary_max, salary_range,
         employment_type, work_arrangement, status, created_at, last_modified
       ) VALUES (
         'JOB-' || LPAD(NEXTVAL('job_openings_id_seq')::text, 4, '0'),
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,'onsite'),'draft',NOW(),NOW()
       )
       RETURNING id`,
      [
        String(title).trim(), department || null, reporting_to || null,
        Number(team_size) || 0, job_description || null, requirements || null,
        responsibilities || null, salary_min ?? null, salary_max ?? null,
        // Keeps the pre-existing free-text column readable for anything still
        // displaying it, derived from the numbers rather than typed twice.
        salary_min != null && salary_max != null
          ? `SGD ${Number(salary_min).toLocaleString()} - ${Number(salary_max).toLocaleString()}`
          : null,
        employment_type || null,
        work_arrangement || null,
      ]
    );

    const created = await db.query(SELECT_OPENING + ' WHERE o.id = $1', [result.rows[0].id]);
    res.status(201).json({ success: true, data: created.rows[0] });
  } catch (error) {
    console.error('[JobOpenings] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create job opening' });
  }
});

// Update an opening, including publish/close transitions
router.put('/job-openings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title, department, reporting_to, team_size, job_description,
      requirements, responsibilities, salary_min, salary_max,
      work_arrangement, status,
    } = req.body;

    if (status && !['draft', 'published', 'open', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: draft, published or closed',
      });
    }

    /**
     * The dashboard calls the live state "published"; the database — and
     * routes/recruitment.ts, which refuses applications unless status = 'open'
     * — calls it 'open'. Translating here keeps the screen's vocabulary
     * without breaking intake.
     */
    const dbStatus = status === 'published' ? 'open' : (status ?? null);

    const result = await db.query(
      `UPDATE job_openings SET
         job_title        = COALESCE($1, job_title),
         department       = COALESCE($2, department),
         reporting_to     = COALESCE($3, reporting_to),
         team_size        = COALESCE($4, team_size),
         description      = COALESCE($5, description),
         requirements     = COALESCE($6, requirements),
         responsibilities = COALESCE($7, responsibilities),
         salary_min       = COALESCE($8, salary_min),
         salary_max       = COALESCE($9, salary_max),
         salary_range     = CASE
                              WHEN $8 IS NOT NULL AND $9 IS NOT NULL
                              THEN 'SGD ' || to_char($8::numeric, 'FM999,999')
                                   || ' - ' || to_char($9::numeric, 'FM999,999')
                              ELSE salary_range
                            END,
         work_arrangement = COALESCE($10, work_arrangement),
         status           = COALESCE($11, status),
         -- Stamped on the first publish only, so re-saving a live opening does
         -- not keep moving the date it went out.
         published_at     = CASE WHEN $11 = 'open' AND published_at IS NULL
                                 THEN NOW() ELSE published_at END,
         closed_at        = CASE WHEN $11 = 'closed' THEN NOW()
                                 WHEN $11 IS NOT NULL THEN NULL
                                 ELSE closed_at END,
         last_modified    = NOW()
       WHERE id = $12
       RETURNING id`,
      [
        title ?? null, department ?? null, reporting_to ?? null,
        team_size ?? null, job_description ?? null, requirements ?? null,
        responsibilities ?? null, salary_min ?? null, salary_max ?? null,
        work_arrangement ?? null, dbStatus, id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job opening not found' });
    }

    const updated = await db.query(SELECT_OPENING + ' WHERE o.id = $1', [id]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (error: any) {
    console.error('[JobOpenings] Update error:', error);
    if (error?.constraint === 'job_opening_salary_ordered') {
      return res.status(400).json({
        success: false,
        error: 'Maximum salary cannot be lower than minimum salary',
      });
    }
    res.status(500).json({ success: false, error: 'Failed to update job opening' });
  }
});

router.delete('/job-openings/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'DELETE FROM job_openings WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job opening not found' });
    }
    res.json({ success: true, message: 'Job opening deleted' });
  } catch (error) {
    console.error('[JobOpenings] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete job opening' });
  }
});

/* ─────────────────────── Screening questions ─────────────────────── */

router.post('/job-openings/:id/questions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, question, question_type, options, weightage, expected_answer } = req.body;

    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, error: 'Question text is required' });
    }

    const opening = await db.query('SELECT id FROM job_openings WHERE id = $1', [id]);
    if (opening.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job opening not found' });
    }

    const weight = Number(weightage) || 3;
    if (weight < 1 || weight > 5) {
      return res.status(400).json({ success: false, error: 'Weightage must be between 1 and 5' });
    }

    const result = await db.query(
      `INSERT INTO job_screening_questions (
         job_opening_id, category, question, question_type, options,
         weightage, expected_answer, sort_order, created_at
       ) VALUES (
         $1, COALESCE($2,'experience'), $3, COALESCE($4,'text'), $5, $6, $7,
         (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM job_screening_questions WHERE job_opening_id = $1),
         NOW()
       )
       RETURNING id, category, question, question_type, options, weightage, expected_answer`,
      [
        id, category || null, String(question).trim(), question_type || null,
        options ? JSON.stringify(options) : null, weight, expected_answer || null,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[JobOpenings] Add question error:', error);
    res.status(500).json({ success: false, error: 'Failed to add screening question' });
  }
});

router.delete('/job-openings/questions/:questionId', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'DELETE FROM job_screening_questions WHERE id = $1 RETURNING id',
      [req.params.questionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Screening question not found' });
    }
    res.json({ success: true, message: 'Screening question deleted' });
  } catch (error) {
    console.error('[JobOpenings] Delete question error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete screening question' });
  }
});

export default router;
