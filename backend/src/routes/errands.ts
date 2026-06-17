import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Get all errands (with filters)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { category, status, sort } = req.query;

    let query = 'SELECT * FROM errands WHERE status = $1';
    const params: any[] = ['open'];
    let paramIndex = 2;

    // Filter by category
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      query = query.replace('status = $1', 'status = $1');
      params[0] = status;
    }

    // Sorting
    if (sort === 'budget-high') {
      query += ' ORDER BY budget DESC NULLS LAST';
    } else if (sort === 'deadline') {
      query += ' ORDER BY deadline ASC NULLS LAST';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await db.query(query, params);

    // Enrich with asker info
    const errandsWithAskerInfo = await Promise.all(
      result.rows.map(async (errand) => {
        const askerResult = await db.query(
          'SELECT display_name FROM users WHERE id = $1',
          [errand.asker_id]
        );
        return {
          id: errand.id,
          title: errand.title,
          description: errand.description,
          category: errand.category,
          status: errand.status,
          budget: errand.budget,
          location: errand.location,
          deadline: errand.deadline,
          askerName: askerResult.rows[0]?.display_name || 'Anonymous',
          askerRating: 4.8, // TODO: Calculate from ratings table
          createdAt: errand.created_at,
        };
      })
    );

    res.json({
      success: true,
      data: errandsWithAskerInfo,
    });
  } catch (error) {
    console.error('Get errands error:', error);
    res.status(500).json({ error: 'Failed to fetch errands' });
  }
});

// Get single errand
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM errands WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = result.rows[0];

    // Get asker info
    const askerResult = await db.query(
      'SELECT display_name, mobile FROM users WHERE id = $1',
      [errand.asker_id]
    );

    // Get sessions if recurring
    let sessions = [];
    if (errand.is_recurring) {
      const sessionsResult = await db.query(
        'SELECT id, session_number, start_date, deadline, budget, status FROM errand_sessions WHERE errand_id = $1 ORDER BY session_number ASC',
        [errand.id]
      );
      sessions = sessionsResult.rows;
    }

    res.json({
      success: true,
      data: {
        id: errand.id,
        title: errand.title,
        description: errand.description,
        category: errand.category,
        status: errand.status,
        budget: errand.budget,
        location: errand.location,
        postalCode: errand.postal_code,
        deadline: errand.deadline,
        certifications: errand.certifications ? JSON.parse(errand.certifications) : undefined,
        isRecurring: errand.is_recurring,
        recurringConfig: errand.recurring_config ? JSON.parse(errand.recurring_config) : null,
        sessions: sessions.length > 0 ? sessions : undefined,
        askerId: errand.asker_id,
        asker: askerResult.rows[0],
        createdAt: errand.created_at,
      },
    });
  } catch (error) {
    console.error('Get errand error:', error);
    res.status(500).json({ error: 'Failed to fetch errand' });
  }
});

// Create errand (asker only)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, location, budget, deadline, certifications, isRecurring, repeatEvery, repeatUnit, occurrences } = req.body;

    if (!title || !category) {
      return res
        .status(400)
        .json({ error: 'title and category required' });
    }

    // Extract postal code from location for matching/filtering
    let postalCode: string | null = null;
    if (location) {
      const postalMatch = location.match(/\d{6}/);
      postalCode = postalMatch ? postalMatch[0] : null;
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create parent errand
      const errandResult = await client.query(
        `INSERT INTO errands (asker_id, title, description, category, location, postal_code, budget, deadline, certifications, is_recurring, recurring_config, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, title, description, category, status, budget, deadline, certifications, is_recurring, recurring_config, created_at`,
        [
          req.userId,
          title,
          description || null,
          category,
          location || null,
          postalCode,
          budget || null,
          deadline || null,
          certifications ? JSON.stringify(certifications) : null,
          isRecurring || false,
          isRecurring ? JSON.stringify({ repeatEvery, repeatUnit, occurrences }) : null,
          'open'
        ]
      );

      const errand = errandResult.rows[0];
      let sessions = [];

      // Generate sessions if recurring
      if (isRecurring && repeatEvery && repeatUnit && occurrences) {
        const startDate = new Date(deadline);
        const budgetPerSession = budget ? parseFloat(budget) / occurrences : null;

        for (let i = 1; i <= occurrences; i++) {
          const sessionStart = new Date(startDate);

          // Add interval based on unit
          switch (repeatUnit) {
            case 'day':
              sessionStart.setDate(sessionStart.getDate() + (i - 1) * repeatEvery);
              break;
            case 'week':
              sessionStart.setDate(sessionStart.getDate() + (i - 1) * repeatEvery * 7);
              break;
            case 'month':
              sessionStart.setMonth(sessionStart.getMonth() + (i - 1) * repeatEvery);
              break;
          }

          const sessionResult = await client.query(
            `INSERT INTO errand_sessions (errand_id, session_number, start_date, deadline, budget, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, session_number, start_date, deadline, budget, status`,
            [errand.id, i, sessionStart.toISOString(), sessionStart.toISOString(), budgetPerSession, 'pending']
          );

          sessions.push(sessionResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          id: errand.id,
          title: errand.title,
          description: errand.description,
          category: errand.category,
          status: errand.status,
          budget: errand.budget,
          deadline: errand.deadline,
          location: location || null,
          postalCode: postalCode,
          certifications: errand.certifications ? JSON.parse(errand.certifications) : undefined,
          isRecurring: errand.is_recurring,
          recurringConfig: errand.recurring_config ? JSON.parse(errand.recurring_config) : null,
          sessions: sessions.length > 0 ? sessions : undefined,
          createdAt: errand.created_at,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create errand error:', error);
    res.status(500).json({ error: 'Failed to create errand' });
  }
});

// Update errand
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, budget, deadline, location } = req.body;

    // Check ownership
    const checkResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if (checkResult.rows[0].asker_id !== parseInt(req.userId || '0', 10)) {
      return res.status(403).json({ error: 'Not authorized to update this errand' });
    }

    // Update fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (budget !== undefined) {
      updates.push(`budget = $${paramIndex}`);
      values.push(budget);
      paramIndex++;
    }
    if (deadline !== undefined) {
      updates.push(`deadline = $${paramIndex}`);
      values.push(deadline);
      paramIndex++;
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex}`);
      values.push(location);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE errands SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, title, status`;

    const result = await db.query(query, values);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update errand error:', error);
    res.status(500).json({ error: 'Failed to update errand' });
  }
});

export default router;
