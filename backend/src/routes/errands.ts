import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Get all errands (with filters)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { category, status, sort, myOnly, accepted, recommended } = req.query;
    const currentUserId = req.userId ? parseInt(req.userId, 10) : null;

    if (!currentUserId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    console.log('[Errands] GET /errands - currentUserId:', currentUserId, 'filters:', { myOnly, accepted, recommended, category, status });

    let query: string;
    const params: any[] = [];
    let paramIndex = 1;

    const isMyOnly = myOnly === 'true' || myOnly === true;
    const isAccepted = accepted === 'true' || accepted === true;
    const isRecommended = recommended === 'true' || recommended === true;

    if (isMyOnly) {
      // Show errands posted by current user (for askers)
      query = 'SELECT * FROM errands WHERE asker_id = $1';
      params.push(currentUserId);
      paramIndex = 2;
      console.log('[Errands] Query mode: myOnly (asker errands)');
    } else if (isAccepted) {
      // Show errands accepted by current user (for doers) - join with assignments
      query = `SELECT e.* FROM errands e
               INNER JOIN errand_assignments ea ON e.id = ea.errand_id
               WHERE ea.doer_id = $1 AND ea.status = 'accepted'`;
      params.push(currentUserId);
      paramIndex = 2;
      console.log('[Errands] Query mode: accepted (doer accepted errands)');
    } else if (isRecommended) {
      // Show open errands that match user's category preferences
      query = `SELECT e.* FROM errands e
               WHERE e.status = $1
               AND e.asker_id != $2
               AND e.category = ANY(
                 COALESCE((SELECT category_preferences FROM users WHERE id = $2), ARRAY[]::text[])
               )`;
      params.push('open', currentUserId);
      paramIndex = 3;
      console.log('[Errands] Query mode: recommended (by category preference)');
    } else {
      // Show all open errands excluding ones posted by current user
      query = 'SELECT * FROM errands WHERE status = $1 AND asker_id != $2';
      params.push('open', currentUserId);
      paramIndex = 3;
      console.log('[Errands] Query mode: all open errands (excluding own)');
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

    console.log('[Errands] EXECUTING QUERY:', {
      query,
      params,
      paramCount: params.length,
    });

    const result = await db.query(query, params);
    console.log('[Errands] Query returned', result.rows.length, 'errands');
    console.log('[Errands] Full query result:', result.rows);

    if (result.rows.length > 0) {
      console.log('[Errands] Results:', result.rows.map(e => ({
        id: e.id,
        title: e.title,
        asker_id: e.asker_id,
        status: e.status,
        category: e.category,
      })));
    } else {
      // Debug: check all errands in DB
      const allErrands = await db.query('SELECT id, title, asker_id, status, category FROM errands LIMIT 20');
      console.log('[Errands] No results found. All errands in DB:', allErrands.rows);
    }

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

    console.log('[Errands] Returning', errandsWithAskerInfo.length, 'enriched errands');
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
    // DISABLED FOR TESTING: Allow multiple errands with same title
    // try {
    //   const duplicateCheck = await db.query(
    //     `SELECT id, title, category, created_at FROM errands
    //      WHERE asker_id = $1
    //      AND status = 'open'
    //      AND created_at > NOW() - INTERVAL '24 hours'
    //      AND (
    //        LOWER(title) = LOWER($2)
    //        OR (LOWER(title) LIKE LOWER($3) OR LOWER($2) LIKE LOWER($4))
    //      )
    //      LIMIT 1`,
    //     [
    //       askerId,
    //       title,
    //       `%${title.substring(0, 10)}%`, // First 10 chars for partial match
    //       `%${title.substring(0, 10)}%`
    //     ]
    //   );
    //
    //   if (duplicateCheck.rows.length > 0) {
    //     const existingErrand = duplicateCheck.rows[0];
    //     console.log('[DEBUG] Duplicate errand detected:', existingErrand.id);
    //     return res.status(409).json({
    //       error: 'Duplicate errand',
    //       message: `You already have an open errand with a similar title: "${existingErrand.title}". Posted ${Math.floor((Date.now() - new Date(existingErrand.created_at).getTime()) / 60000)} minutes ago.`,
    //       existingErrandId: existingErrand.id
    //     });
    //   }
    // } catch (dupErr) {
    //   console.error('Duplicate check error:', dupErr);
    //   // Don't fail the request if duplicate check fails, just log it
    // }

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

      // Build recurring config if provided
      let recurringConfig = null;
      if (isRecurring && repeatEvery && repeatUnit) {
        recurringConfig = JSON.stringify({
          repeatEvery: parseInt(String(repeatEvery), 10),
          repeatUnit: repeatUnit,
          occurrences: occurrences ? parseInt(String(occurrences), 10) : null,
        });
      }

      const errandResult = await db.query(
        `INSERT INTO errands (asker_id, title, description, category, location, postal_code, budget, deadline, is_recurring, recurring_schedule, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, title, description, category, status, budget, deadline, is_recurring, recurring_schedule, created_at`,
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
          recurringConfig,
          'open'
        ]
      );

      const errand = errandResult.rows[0];
      console.log('[DEBUG] Errand created successfully:', {
        id: errand.id,
        askerId: askerId,
        title: errand.title,
        category: errand.category,
        status: errand.status,
        budget: errand.budget,
        deadline: errand.deadline,
      });

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
          recurringSchedule: errand.recurring_schedule,
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

// Check for similar errands (warn but allow if location or timing is different)
router.post('/check-duplicate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { title, category, location, deadline, time } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'title and category required' });
    }

    // Get user's errands from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db.query(
      `SELECT id, title, category, location, deadline, time, created_at
       FROM errands
       WHERE asker_id = $1
       AND created_at > $2
       AND status != 'cancelled'
       ORDER BY created_at DESC`,
      [userId, twentyFourHoursAgo.toISOString()]
    );

    // Check for similar errands using fuzzy matching on title and category
    const similar = result.rows.filter((errand) => {
      const titleSimilarity = calculateSimilarity(title.toLowerCase(), errand.title.toLowerCase());
      const categoryMatch = category === errand.category;

      // Flag as similar if title is 70%+ similar AND category matches
      // Allow if location or timing is different
      if (titleSimilarity >= 0.7 && categoryMatch) {
        const locationMatch = location === errand.location;
        const timeMatch = deadline === errand.deadline && time === errand.time;

        // Only flag as true duplicate if BOTH location AND time match
        // If either is different, it's just a similar errand (allow with warning)
        return locationMatch && timeMatch;
      }
      return false;
    });

    // Also get "similar but different" errands (same title+category but different location/time)
    const similarButDifferent = result.rows.filter((errand) => {
      const titleSimilarity = calculateSimilarity(title.toLowerCase(), errand.title.toLowerCase());
      const categoryMatch = category === errand.category;

      if (titleSimilarity >= 0.7 && categoryMatch) {
        const locationMatch = location === errand.location;
        const timeMatch = deadline === errand.deadline && time === errand.time;

        // Return if similar but location OR time is different
        return !(locationMatch && timeMatch);
      }
      return false;
    });

    res.json({
      success: true,
      data: {
        isDuplicate: similar.length > 0, // True duplicate (same everything)
        isSimilar: similarButDifferent.length > 0, // Warning: similar but different location/time
        similar: similar.slice(0, 1), // Return top duplicate (if exact match)
        similarButDifferent: similarButDifferent.slice(0, 1), // Return warning candidate
        count: similar.length,
        message: similarButDifferent.length > 0
          ? `You posted a similar errand before at a different time/location. Is this a new request?`
          : null,
      },
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    res.status(500).json({ error: 'Failed to check duplicates' });
  }
});

// Levenshtein similarity calculation (0-1, where 1 is identical)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// DEBUG ENDPOINT: Check all errands and users (remove after testing)
router.get('/debug/all', async (req: Request, res: Response) => {
  try {
    const errands = await db.query('SELECT id, asker_id, title, status, category FROM errands ORDER BY created_at DESC LIMIT 50');
    const users = await db.query('SELECT id, display_name, mobile FROM users ORDER BY id DESC LIMIT 50');

    res.json({
      success: true,
      data: {
        errands: errands.rows,
        users: users.rows,
        errandCount: errands.rows.length,
        userCount: users.rows.length,
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

export default router;
