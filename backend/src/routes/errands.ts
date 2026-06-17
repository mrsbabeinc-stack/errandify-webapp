import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Get all errands (with filters)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { category, status, sort, myOnly, accepted } = req.query;
    const currentUserId = req.userId ? parseInt(req.userId, 10) : null;

    if (!currentUserId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    let query: string;
    const params: any[] = [];
    let paramIndex = 1;

    const isMyOnly = myOnly === 'true' || myOnly === true;
    const isAccepted = accepted === 'true' || accepted === true;

    if (isMyOnly) {
      // Show errands posted by current user (for askers)
      query = 'SELECT * FROM errands WHERE asker_id = $1';
      params.push(currentUserId);
      paramIndex = 2;
    } else if (isAccepted) {
      // Show errands accepted by current user (for doers) - join with assignments
      query = `SELECT e.* FROM errands e
               INNER JOIN errand_assignments ea ON e.id = ea.errand_id
               WHERE ea.doer_id = $1 AND ea.status = 'accepted'`;
      params.push(currentUserId);
      paramIndex = 2;
    } else {
      // Show all open errands excluding ones posted by current user
      query = 'SELECT * FROM errands WHERE status = $1 AND asker_id != $2';
      params.push('open', currentUserId);
      paramIndex = 3;
    }

    // Filter by category
    if (category) {
      const tablePrefix = isAccepted ? 'e.' : '';
      query += ` AND ${tablePrefix}category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Filter by status (additional status filter for myOnly)
    if (status && isMyOnly) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Sorting
    const tablePrefix = isAccepted ? 'e.' : '';
    if (sort === 'budget-high') {
      query += ` ORDER BY ${tablePrefix}budget DESC NULLS LAST`;
    } else if (sort === 'deadline') {
      query += ` ORDER BY ${tablePrefix}deadline ASC NULLS LAST`;
    } else {
      query += ` ORDER BY ${tablePrefix}created_at DESC`;
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
        isRecurring: errand.is_recurring,
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
    const askerId = parseInt(req.userId || '0', 10);

    console.log('[DEBUG] POST /api/errands called:', {
      userId: askerId,
      title,
      category,
      budget,
      deadline,
    });

    if (!title || !category) {
      console.error('[DEBUG] Missing required fields:', { title, category });
      return res
        .status(400)
        .json({ error: 'title and category required' });
    }

    if (!askerId || askerId === 0) {
      console.error('[DEBUG] Invalid userId:', askerId);
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check for duplicate/similar errands posted by same user in last 24 hours
    try {
      const duplicateCheck = await db.query(
        `SELECT id, title, category, created_at FROM errands
         WHERE asker_id = $1
         AND status = 'open'
         AND created_at > NOW() - INTERVAL '24 hours'
         AND (
           LOWER(title) = LOWER($2)
           OR (LOWER(title) LIKE LOWER($3) OR LOWER($2) LIKE LOWER($4))
         )
         LIMIT 1`,
        [
          askerId,
          title,
          `%${title.substring(0, 10)}%`, // First 10 chars for partial match
          `%${title.substring(0, 10)}%`
        ]
      );

      if (duplicateCheck.rows.length > 0) {
        const existingErrand = duplicateCheck.rows[0];
        console.log('[DEBUG] Duplicate errand detected:', existingErrand.id);
        return res.status(409).json({
          error: 'Duplicate errand',
          message: `You already have an open errand with a similar title: "${existingErrand.title}". Posted ${Math.floor((Date.now() - new Date(existingErrand.created_at).getTime()) / 60000)} minutes ago.`,
          existingErrandId: existingErrand.id
        });
      }
    } catch (dupErr) {
      console.error('Duplicate check error:', dupErr);
      // Don't fail the request if duplicate check fails, just log it
    }

    // Extract postal code from location for matching/filtering
    let postalCode: string | null = null;
    if (location) {
      const postalMatch = location.match(/\d{6}/);
      postalCode = postalMatch ? postalMatch[0] : null;
    }

    try {
      // Create parent errand (simplified, no transactions for now)
      console.log('[DEBUG] About to insert errand with params:', {
        askerId,
        title,
        category,
        postalCode,
      });

      const errandResult = await db.query(
        `INSERT INTO errands (asker_id, title, description, category, location, postal_code, budget, deadline, is_recurring, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, title, description, category, status, budget, deadline, is_recurring, created_at`,
        [
          askerId,
          title,
          description || null,
          category,
          location || null,
          postalCode || null,
          budget ? parseFloat(String(budget)) : null,
          deadline || null,
          isRecurring || false,
          'open'
        ]
      );

      const errand = errandResult.rows[0];
      console.log('[DEBUG] Errand created successfully:', errand.id);

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
          isRecurring: errand.is_recurring,
          createdAt: errand.created_at,
        },
      });
    } catch (err) {
      throw err;
    }
  } catch (error: any) {
    console.error('Create errand error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to create errand',
      details: error.message
    });
  }
});

// Mark errand as completed by doer
router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const doerId = parseInt(req.userId || '0', 10);

    // Check if errand is confirmed
    const errandResult = await db.query(
      'SELECT status, accepted_bid_id, stripe_payment_intent_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    if (errand.status !== 'confirmed') {
      return res.status(400).json({ error: 'Errand must be confirmed before completion' });
    }

    // Verify this doer accepted the bid
    if (errand.accepted_bid_id) {
      const bidResult = await db.query(
        'SELECT doer_id FROM bids WHERE id = $1',
        [errand.accepted_bid_id]
      );

      if (bidResult.rows[0]?.doer_id !== doerId) {
        return res.status(403).json({ error: 'Only the assigned doer can mark as completed' });
      }
    }

    // Mark as completed
    const result = await db.query(
      'UPDATE errands SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
      ['completed', id]
    );

    // TODO: Release escrowed payment to doer
    // TODO: Prompt asker for rating

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        message: 'Errand marked as completed. Awaiting rating from asker.',
      },
    });
  } catch (error) {
    console.error('Complete errand error:', error);
    res.status(500).json({ error: 'Failed to complete errand' });
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
