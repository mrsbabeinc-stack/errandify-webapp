import express, { Request, Response } from 'express';
import db from '../db.js';

import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Guarded at router level. These rows carry performance judgements about named
 * employees, so they are admin-only for the same reason leave records are.
 */
router.use(authMiddleware, requireAdmin(['admin', 'super-admin']));

/**
 * days_remaining is computed in SQL from end_date rather than stored, so it is
 * correct on the day it is read instead of on the day the row was written.
 * Clamped at 0 — an overdue probation reads as 0 days left, not negative.
 * Dates are cast to text so they survive JSON as calendar dates (see the note
 * in routes/leaves.ts about the UTC day-shift).
 */
const SELECT_PROBATION = `
  SELECT id AS probation_id,
         staff_id,
         staff_name,
         start_date::text AS start_date,
         end_date::text   AS end_date,
         probation_length_days,
         status,
         review_score,
         COALESCE(reviewer_notes, '') AS reviewer_notes,
         reviewed_by,
         created_at AS created_date,
         GREATEST(end_date - CURRENT_DATE, 0) AS days_remaining
    FROM probation_records
`;

// List probation records
router.get('/probation', async (req: Request, res: Response) => {
  try {
    const { status, staffId } = req.query;
    let query = SELECT_PROBATION + ' WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (staffId) {
      query += ` AND staff_id = $${params.length + 1}`;
      params.push(staffId);
    }

    query += ' ORDER BY end_date ASC';

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Probation] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch probation records' });
  }
});

// Start a probation period
router.post('/probation', async (req: Request, res: Response) => {
  try {
    const { staff_id, start_date, probation_length_days } = req.body;

    if (!staff_id || !start_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: staff_id, start_date',
      });
    }

    const lengthDays = Number(probation_length_days) || 90;
    if (lengthDays <= 0) {
      return res.status(400).json({ success: false, error: 'Probation length must be greater than zero' });
    }

    // The name is read from the staff record rather than accepted from the
    // client: the screen used to let an admin type any name against any id,
    // which made the two disagree.
    const staff = await db.query(
      'SELECT staff_id, first_name, last_name FROM staff WHERE staff_id = $1',
      [staff_id]
    );
    if (staff.rows.length === 0) {
      return res.status(404).json({ success: false, error: `No staff member with id ${staff_id}` });
    }
    const staffName = `${staff.rows[0].first_name} ${staff.rows[0].last_name}`.trim();

    const existing = await db.query(
      `SELECT id FROM probation_records WHERE staff_id = $1 AND status = 'active'`,
      [staff_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `${staffName} is already on an active probation period`,
      });
    }

    const result = await db.query(
      `INSERT INTO probation_records (
         staff_id, staff_name, start_date, end_date,
         probation_length_days, status, created_at, last_modified
       ) VALUES ($1, $2, $3, $3::date + $4::int, $4, 'active', NOW(), NOW())
       RETURNING id`,
      [staff_id, staffName, start_date, lengthDays]
    );

    const created = await db.query(SELECT_PROBATION + ' WHERE id = $1', [result.rows[0].id]);
    res.status(201).json({ success: true, data: created.rows[0] });
  } catch (error) {
    console.error('[Probation] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create probation record' });
  }
});

// Record the outcome of a probation review
router.put('/probation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, review_score, reviewer_notes, reviewed_by } = req.body;

    if (status && !['active', 'passed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, passed or failed',
      });
    }

    if (review_score !== undefined && review_score !== null) {
      const score = Number(review_score);
      if (Number.isNaN(score) || score < 0 || score > 100) {
        return res.status(400).json({ success: false, error: 'Review score must be between 0 and 100' });
      }
    }

    const decided = status === 'passed' || status === 'failed';

    const result = await db.query(
      `UPDATE probation_records SET
         status         = COALESCE($1, status),
         review_score   = COALESCE($2, review_score),
         reviewer_notes = COALESCE($3, reviewer_notes),
         reviewed_by    = CASE WHEN $5 THEN $4 ELSE reviewed_by END,
         reviewed_at    = CASE WHEN $5 THEN NOW() ELSE reviewed_at END,
         last_modified  = NOW()
       WHERE id = $6
       RETURNING id`,
      [
        status ?? null,
        review_score ?? null,
        reviewer_notes ?? null,
        reviewed_by || 'Admin',
        decided,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Probation record not found' });
    }

    const updated = await db.query(SELECT_PROBATION + ' WHERE id = $1', [id]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('[Probation] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update probation record' });
  }
});

// Delete a probation record
router.delete('/probation/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'DELETE FROM probation_records WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Probation record not found' });
    }
    res.json({ success: true, message: 'Probation record deleted' });
  } catch (error) {
    console.error('[Probation] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete probation record' });
  }
});

export default router;
