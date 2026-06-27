import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { activityLogService } from '../services/activityLogService.js';

const router = Router();

// Category codes mapping
const categoryCodeMap: { [key: string]: string } = {
  'home-maintenance': 'HM',
  'cleaning-household': 'CL',
  'food-beverage': 'FD',
  'furniture-assembly': 'FR',
  'shopping-errands': 'SH',
  'delivery-moving': 'DV',
  'travel-mobility': 'TR',
  'event-planning': 'EV',
  'childcare-education': 'CH',
  'eldercare-healthcare': 'EL',
  'pet-care': 'PC',
  'personal-care': 'PS',
  'tech-support': 'TC',
  'creative-arts': 'AR',
  'admin-business': 'AD',
  'charity-community': 'CC',
};

// Generate unique errand ID: ER26-XX-XXXXXX
// Format: ER[YEAR_SHORT]-[CATEGORY_CODE]-[6_RANDOM_CHARS]
// Example: ER26-FD-K9M7X2 (Food & Beverage)
function generateErrandId(category: string): string {
  const year = new Date().getFullYear().toString().slice(-2); // Get last 2 digits: 2026 -> 26
  const categoryCode = categoryCodeMap[category.toLowerCase()] || 'XX';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ER${year}-${categoryCode}-${code}`;
}

// Get all errands (with filters)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Errands GET] Request received - userId:', req.userId);
    const { category, status, sort, myOnly, accepted, recommended } = req.query;
    const currentUserId = req.userId ? parseInt(req.userId, 10) : null;

    console.log('[Errands GET] currentUserId:', currentUserId, 'filters:', { myOnly, accepted, recommended });

    if (!currentUserId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }


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
    } else if (isAccepted) {
      // Show errands accepted by current user (for doers) - join with assignments
      query = `SELECT e.* FROM errands e
               INNER JOIN errand_assignments ea ON e.id = ea.errand_id
               WHERE ea.doer_id = $1 AND ea.status = 'accepted'`;
      params.push(currentUserId);
      paramIndex = 2;
    } else if (isRecommended) {
      // Show open errands that match user's category preferences
      // If no preferences set, use AI-based behavior recommendations
      query = `SELECT e.* FROM errands e
               WHERE e.status = $1
               AND e.asker_id != $2
               AND (
                 -- Match user's category preferences if set
                 e.category = ANY(
                   COALESCE((SELECT category_preferences FROM users WHERE id = $2), ARRAY[]::text[])
                 )
                 OR
                 -- If no category preferences, recommend based on completed task history
                 (
                   (SELECT category_preferences FROM users WHERE id = $2) IS NULL OR
                   ARRAY_LENGTH((SELECT category_preferences FROM users WHERE id = $2), 1) IS NULL
                 )
                 AND e.category IN (
                   SELECT DISTINCT category FROM errands
                   WHERE id IN (
                     SELECT errand_id FROM errand_assignments
                     WHERE doer_id = $2 AND status = 'completed'
                   )
                 )
               )`;
      params.push('open', currentUserId);
      paramIndex = 3;
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
    console.log('[Errands GET] Query executed - found', result.rows.length, 'raw rows');

    // Map internal category names to frontend category IDs
    const categoryMap: Record<string, string> = {
      'homehelp': 'home-maintenance',
      'petcare': 'pet-care',
      'childcare': 'childcare-tutoring',
      'eldercare': 'childcare-tutoring', // Map eldercare to childcare-tutoring for now
      'delivery': 'delivery-moving',
      'eventhelp': 'moving-help', // No exact match, use moving-help
      'tech-support': 'tech-support',
      'data-entry': 'home-maintenance', // Map data-entry to home-maintenance
      // Handle frontend category IDs passed through (just return as-is)
      'home-maintenance': 'home-maintenance',
      'cleaning-laundry': 'cleaning-laundry',
      'shopping-errands': 'shopping-errands',
      'delivery-moving': 'delivery-moving',
      'childcare-tutoring': 'childcare-tutoring',
      'pet-care': 'pet-care',
      'moving-help': 'moving-help',
    };

    // Enrich with asker info
    const errandsWithAskerInfo = await Promise.all(
      result.rows.map(async (errand) => {
        const askerResult = await db.query(
          'SELECT display_name FROM users WHERE id = $1',
          [errand.asker_id]
        );
        return {
          id: errand.id,
          errandId: errand.errand_id,
          title: errand.title,
          description: errand.description,
          category: categoryMap[errand.category] || errand.category, // Map to frontend category
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

    console.log('[Errands] Returning', errandsWithAskerInfo.length, 'errands with categories:', errandsWithAskerInfo.map(e => ({ id: e.id, title: e.title, category: e.category })));
    res.json({
      success: true,
      data: errandsWithAskerInfo,
    });
  } catch (error) {
    console.error('Get errands error:', error);
    res.status(500).json({ error: 'Failed to fetch errands' });
  }
});

// Get single errand (numeric ID only - /categories and /search are handled by other routers)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only handle numeric IDs
    if (!/^\d+$/.test(id)) {
      return res.status(404).json({ error: 'Not found' });
    }

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
        errandId: errand.errand_id,
        title: errand.title,
        description: errand.description,
        notes: errand.notes,
        category: errand.category,
        status: errand.status,
        budget: errand.budget,
        location: errand.location,
        postalCode: errand.postal_code,
        postal_code: errand.postal_code,
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
    const { title, description, category, location, postal_code, budget, deadline, certifications, isRecurring, repeatEvery, repeatUnit, occurrences } = req.body;
    const askerId = parseInt(req.userId || '0', 10);

    console.log('[DEBUG] POST /api/errands called:', {
      userId: askerId,
      title,
      category,
      budget,
      deadline,
      postal_code,
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

    // Use postal_code from request if provided, otherwise try to extract from location
    let postalCode: string | null = postal_code || null;
    if (!postalCode && location) {
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

      const errandId = generateErrandId(category);
      const errandResult = await db.query(
        `INSERT INTO errands (asker_id, title, description, category, location, postal_code, budget, deadline, is_recurring, recurring_schedule, status, errand_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, errand_id, title, description, category, status, budget, deadline, is_recurring, recurring_schedule, created_at`,
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
          'open',
          errandId
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

      // Notify relevant doers about this new errand
      try {
        // Find doers with matching category preferences OR who have completed similar tasks
        const notifyResult = await db.query(
          `SELECT DISTINCT u.id as doer_id, u.display_name, u.fcm_token
           FROM users u
           WHERE u.role = 'doer'
           AND (
             -- Match category preferences if set
             $1 = ANY(COALESCE(u.category_preferences, ARRAY[]::text[]))
             OR
             -- If no category preferences, find by completed task history
             (
               u.category_preferences IS NULL OR
               ARRAY_LENGTH(u.category_preferences, 1) IS NULL
             )
             AND $1 IN (
               SELECT DISTINCT category FROM errands
               WHERE id IN (
                 SELECT errand_id FROM errand_assignments
                 WHERE doer_id = u.id AND status = 'completed'
               )
             )
             OR
             -- Always notify doers with no history yet (new doers)
             (
               u.category_preferences IS NULL AND
               NOT EXISTS (
                 SELECT 1 FROM errand_assignments WHERE doer_id = u.id
               )
             )
           )`,
          [category]
        );

        console.log(`[NOTIFICATIONS] Found ${notifyResult.rows.length} doers to notify for category: ${category}`);

        // Create notifications for each matching doer
        for (const doer of notifyResult.rows) {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_id, related_type, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              doer.doer_id,
              'new_errand_match',
              '🎉 New Task Matching Your Interests!',
              `"${errand.title}" posted in ${category} - $${errand.budget}`,
              errand.id,
              'errand'
            ]
          );
        }

        console.log(`[NOTIFICATIONS] Created notifications for ${notifyResult.rows.length} doers`);
      } catch (notifyErr) {
        console.error('[NOTIFICATIONS] Error sending notifications:', notifyErr);
        // Don't fail the errand creation if notifications fail
      }

      // Log activity: Errand posted
      const askerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [askerId]);
      const askerName = askerResult.rows[0]?.display_name || 'Unknown User';
      await activityLogService.logPosted(errand.id, askerName, askerId);

      res.status(201).json({
        success: true,
        data: {
          id: errand.id,
          errandId: errand.errand_id,
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

    // Log activity: Job completed
    const doerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [doerId]);
    const doerName = doerResult.rows[0]?.display_name || 'Unknown User';
    await activityLogService.logCompleted(id, doerName, doerId);

    // Track referral: Check if this is doer's first completed job
    try {
      const completedCount = await db.query(
        `SELECT COUNT(*) as count FROM errands
         WHERE doer_id = $1 AND status IN ('completed', 'completed_confirmed', 'completed_unconfirmed')`,
        [doerId]
      );

      // If this is their first completed job (count = 1), award referral bonus
      if (completedCount.rows[0].count === 1) {
        // Check if they have a referrer
        const referralInfo = await db.query(
          `SELECT referrer_id FROM referral_tracking
           WHERE referred_user_id = $1 AND status = 'joined'`,
          [doerId]
        );

        if (referralInfo.rows.length > 0) {
          const referrerId = referralInfo.rows[0].referrer_id;
          const firstJobBonus = 50;

          // Update tracking status
          await db.query(
            `UPDATE referral_tracking
             SET status = 'first_job_completed', first_job_completed_at = NOW()
             WHERE referred_user_id = $1`,
            [doerId]
          );

          // Award first job bonus
          await db.query(
            `INSERT INTO referral_rewards (referrer_id, reward_type, points_amount)
             VALUES ($1, $2, $3)`,
            [referrerId, 'first_job', firstJobBonus]
          );

          // Update referrer's points
          await db.query(
            `UPDATE users SET errandify_points = errandify_points + $1 WHERE id = $2`,
            [firstJobBonus, referrerId]
          );

          // Log EP transaction
          await db.query(
            `INSERT INTO ep_transactions (user_id, transaction_type, points_change, description, created_at)
             SELECT $1, 'referral_first_job', $2, 'Referral first job bonus - ' || $3 || ' completed first errand', NOW()
             FROM users WHERE id = $1`,
            [referrerId, firstJobBonus, doerName]
          );

          // Send notification to referrer
          try {
            await db.query(
              `INSERT INTO notifications (user_id, type, title, message, data, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [
                referrerId,
                'referral_first_job',
                'Referral Bonus Earned',
                `${doerName} completed their first errand! You earned +50 EP`,
                JSON.stringify({ referrer_id: referrerId, referred_user_id: doerId, bonus_amount: firstJobBonus })
              ]
            );
          } catch (notifError) {
            console.error('Failed to create referral notification:', notifError);
          }
        }
      }

      // Check for 10th job milestone
      if (completedCount.rows[0].count === 10) {
        const loyaltyInfo = await db.query(
          `SELECT referrer_id FROM referral_tracking
           WHERE referred_user_id = $1 AND status IN ('first_job_completed', 'loyal')`,
          [doerId]
        );

        if (loyaltyInfo.rows.length > 0) {
          const referrerId = loyaltyInfo.rows[0].referrer_id;
          const loyaltyBonus = 100;

          // Update tracking status to 'loyal'
          await db.query(
            `UPDATE referral_tracking
             SET status = 'loyal' WHERE referred_user_id = $1`,
            [doerId]
          );

          // Award loyalty bonus
          await db.query(
            `INSERT INTO referral_rewards (referrer_id, reward_type, points_amount)
             VALUES ($1, $2, $3)`,
            [referrerId, 'loyalty', loyaltyBonus]
          );

          // Update referrer's points
          await db.query(
            `UPDATE users SET errandify_points = errandify_points + $1 WHERE id = $2`,
            [loyaltyBonus, referrerId]
          );

          // Log EP transaction
          await db.query(
            `INSERT INTO ep_transactions (user_id, transaction_type, points_change, description, created_at)
             SELECT $1, 'referral_loyalty', $2, 'Referral loyalty bonus - ' || $3 || ' reached 10 errands', NOW()
             FROM users WHERE id = $1`,
            [referrerId, loyaltyBonus, doerName]
          );

          // Send notification to referrer
          try {
            await db.query(
              `INSERT INTO notifications (user_id, type, title, message, data, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [
                referrerId,
                'referral_loyalty',
                'Loyalty Milestone!',
                `${doerName} is now a Loyal Member with 10+ errands! You earned +100 EP`,
                JSON.stringify({ referrer_id: referrerId, referred_user_id: doerId, bonus_amount: loyaltyBonus })
              ]
            );
          } catch (notifError) {
            console.error('Failed to create loyalty milestone notification:', notifError);
          }
        }
      }
    } catch (referralError) {
      console.error('Failed to track referral milestone:', referralError);
      // Continue anyway - don't fail the entire completion
    }

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

    // Check ownership and status
    const checkResult = await db.query(
      'SELECT asker_id, status FROM errands WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = checkResult.rows[0];
    if (errand.asker_id !== parseInt(req.userId || '0', 10)) {
      return res.status(403).json({ error: 'Not authorized to update this errand' });
    }

    // Prevent editing once offer is confirmed
    if (errand.status !== 'open') {
      return res.status(403).json({
        error: 'Cannot edit errand once an offer is confirmed',
        message: 'This errand has been accepted and is no longer editable. You can only update the status.'
      });
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

// POST /api/errands/:id/confirm - Doer confirms job acceptance
router.post('/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const doerId = parseInt(req.userId || '0', 10);

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, status, accepted_bid_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    if (errand.status !== 'confirmed') {
      return res.status(400).json({ error: 'Errand must be confirmed before doer can accept' });
    }

    // Update status to confirmed_awaiting_start
    await db.query(
      'UPDATE errands SET status = $1 WHERE id = $2',
      ['confirmed_awaiting_start', id]
    );

    res.json({
      success: true,
      message: 'Job confirmed. Payment has been held in escrow. Ready to start work.',
    });
  } catch (error) {
    console.error('Error confirming job:', error);
    res.status(500).json({ error: 'Failed to confirm job' });
  }
});

// POST /api/errands/:id/start - Doer starts job
router.post('/:id/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const errandResult = await db.query(
      'SELECT id, status FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if (errandResult.rows[0].status !== 'confirmed_awaiting_start') {
      return res.status(400).json({ error: 'Can only start job from awaiting_start status' });
    }

    // Update status and set start time
    await db.query(
      'UPDATE errands SET status = $1, job_started_at = NOW() WHERE id = $2',
      ['in_progress', id]
    );

    // Log activity: Job started
    const doerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [req.userId]);
    const doerName = doerResult.rows[0]?.display_name || 'Unknown User';
    await activityLogService.logStarted(id, doerName, parseInt(req.userId || '0', 10));

    res.json({
      success: true,
      message: 'Job started! Timer is running.',
    });
  } catch (error) {
    console.error('Error starting job:', error);
    res.status(500).json({ error: 'Failed to start job' });
  }
});

// POST /api/errands/:id/end - Doer ends job
router.post('/:id/end', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const errandResult = await db.query(
      'SELECT id, status FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if (errandResult.rows[0].status !== 'in_progress') {
      return res.status(400).json({ error: 'Can only end job while in progress' });
    }

    // Update status and set end time
    await db.query(
      'UPDATE errands SET status = $1, job_ended_at = NOW(), dispute_deadline = NOW() + INTERVAL \'48 hours\' WHERE id = $2',
      ['job_completed', id]
    );

    res.json({
      success: true,
      message: 'Job ended. Waiting for asker confirmation. Payment will be released in 48 hours if no dispute.',
    });
  } catch (error) {
    console.error('Error ending job:', error);
    res.status(500).json({ error: 'Failed to end job' });
  }
});

// POST /api/errands/:id/reopen - Both asker and doer can reopen job
router.post('/:id/reopen', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);
    const { reason } = req.body;

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, status, asker_id, accepted_bid_id, dispute_deadline FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Both asker and accepted doer can reopen
    const isAsker = userId === errand.asker_id;
    const isDoer = userId === errand.accepted_bid_id; // This would need doer_id from bids table

    if (!isAsker && !isDoer) {
      return res.status(403).json({ error: 'Only asker or doer can reopen job' });
    }

    // Can only reopen within 48 hours if no dispute
    if (errand.dispute_deadline && new Date() > new Date(errand.dispute_deadline)) {
      return res.status(400).json({ error: 'Dispute period has ended. Cannot reopen job.' });
    }

    if (errand.status !== 'job_completed') {
      return res.status(400).json({ error: 'Can only reopen completed jobs' });
    }

    // Update status back to in_progress
    await db.query(
      'UPDATE errands SET status = $1, reopened_reason = $2, reopened_by = $3 WHERE id = $4',
      ['in_progress', reason || null, userId, id]
    );

    // Log activity: Job reopened
    const userResult = await db.query('SELECT display_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0]?.display_name || 'Unknown User';
    const userRole = isAsker ? 'asker' : 'doer';
    await activityLogService.logActivity(id, 'reopened', userId, userName, userRole, { reason });

    res.json({
      success: true,
      message: 'Job reopened. Work can continue.',
    });
  } catch (error) {
    console.error('Error reopening job:', error);
    res.status(500).json({ error: 'Failed to reopen job' });
  }
});

// POST /api/errands/:id/raise-dispute - Raise dispute before 48 hours
router.post('/:id/raise-dispute', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);
    const { reason } = req.body;

    const errandResult = await db.query(
      'SELECT id, status, asker_id, dispute_deadline FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Only asker can raise dispute
    if (userId !== errand.asker_id) {
      return res.status(403).json({ error: 'Only asker can raise dispute' });
    }

    // Can only dispute within 48 hours
    if (new Date() > new Date(errand.dispute_deadline)) {
      return res.status(400).json({ error: 'Dispute period has ended' });
    }

    if (errand.status !== 'job_completed') {
      return res.status(400).json({ error: 'Can only dispute completed jobs' });
    }

    // Update status to disputed - payment held indefinitely
    await db.query(
      'UPDATE errands SET status = $1, dispute_reason = $2 WHERE id = $3',
      ['disputed', reason || null, id]
    );

    // Log activity: Dispute raised
    const userResult = await db.query('SELECT display_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0]?.display_name || 'Unknown User';
    await activityLogService.logDisputeRaised(id, userName, userId, 'asker');

    res.json({
      success: true,
      message: 'Dispute raised. Admin will review. Payment is held.',
    });
  } catch (error) {
    console.error('Error raising dispute:', error);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
});

// POST /api/errands/:id/work-proof - Upload work proof before completion
router.post('/:id/work-proof', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { proof_description, proof_urls } = req.body;

    if (!proof_description || proof_description.trim().length === 0) {
      return res.status(400).json({ error: 'Work proof description required' });
    }

    // Validate proof URLs are proper image/video URLs if provided
    if (proof_urls && Array.isArray(proof_urls)) {
      for (const url of proof_urls) {
        if (!url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|mp4|mov|webm)$/i)) {
          return res.status(400).json({ error: 'Invalid image/video URL format' });
        }
      }
    }

    // Store work proof
    await db.query(
      'UPDATE errands SET work_proof_description = $1, work_proof_urls = $2, work_proof_submitted_at = NOW() WHERE id = $3',
      [proof_description, proof_urls ? JSON.stringify(proof_urls) : null, id]
    );

    res.json({
      success: true,
      message: 'Work proof uploaded successfully.',
    });
  } catch (error) {
    console.error('Error uploading work proof:', error);
    res.status(500).json({ error: 'Failed to upload work proof' });
  }
});

// POST /api/errands/:id/review - Leave a review
router.post('/:id/review', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const errandResult = await db.query(
      'SELECT id, status, asker_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Can only review after job completed (within 48 hours or after)
    if (!['job_completed', 'disputed', 'completed'].includes(errand.status)) {
      return res.status(400).json({ error: 'Can only review completed jobs' });
    }

    // Check if already reviewed by this user
    const isAsker = userId === errand.asker_id;
    const reviewField = isAsker ? 'asker_rating' : 'doer_rating';
    const commentField = isAsker ? 'asker_review_comment' : 'doer_review_comment';

    // Update review
    await db.query(
      `UPDATE errands SET ${reviewField} = $1, ${commentField} = $2 WHERE id = $3`,
      [rating, comment || null, id]
    );

    // Log activity: Review/rating submitted
    const userResult = await db.query('SELECT display_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0]?.display_name || 'Unknown User';
    const userRole = isAsker ? 'asker' : 'doer';
    await activityLogService.logRatingSubmitted(id, userName, userId, userRole, rating);

    res.json({
      success: true,
      message: 'Review submitted.',
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// POST /api/errands/:id/cancel - Cancel errand at any stage
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);
    const { reason } = req.body;

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, status, asker_id, accepted_bid_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];
    const isAsker = userId === errand.asker_id;

    // Check permissions - only asker or the accepted doer can cancel
    if (!isAsker && errand.accepted_bid_id) {
      return res.status(403).json({ error: 'Only asker or accepted doer can cancel' });
    }

    const previousStatus = errand.status;

    // Update status to cancelled
    await db.query(
      'UPDATE errands SET status = $1, cancelled_by = $2, cancellation_reason = $3 WHERE id = $4',
      ['cancelled', userId, reason || null, id]
    );

    // Log activity: Errand cancelled
    const userResult = await db.query('SELECT display_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0]?.display_name || 'Unknown User';
    const userRole = isAsker ? 'asker' : 'doer';
    await activityLogService.logActivity(id, 'cancelled', userId, userName, userRole, { reason, previousStatus });

    // If in_progress, mark as dispute/pending resolution
    if (previousStatus === 'in_progress') {
      res.status(400).json({
        error: 'Cannot cancel job in progress without asker confirmation. Contact asker to resolve dispute.',
      });
    } else {
      res.json({
        success: true,
        message: 'Errand cancelled. All bids rejected.',
        previousStatus,
      });
    }
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// POST /api/errands/:id/confirm-extension-request - Doer requests 24h extension
router.post('/:id/confirm-extension-request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);
    const { reason } = req.body;

    const errandResult = await db.query(
      'SELECT id, status, confirmation_expires_at, asker_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    if (errand.status !== 'confirmed') {
      return res.status(400).json({ error: 'Extension only available during confirmation period' });
    }

    // Send notification to asker about extension request
    res.json({
      success: true,
      message: 'Extension request sent to asker. Waiting for approval...',
      expires_at: errand.confirmation_expires_at,
    });
  } catch (error) {
    console.error('Error requesting extension:', error);
    res.status(500).json({ error: 'Failed to request extension' });
  }
});

// POST /api/errands/:id/confirm-extension-approve - Asker approves extension
router.post('/:id/confirm-extension-approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    const errandResult = await db.query(
      'SELECT id, status, asker_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Only asker can approve extension
    if (userId !== errand.asker_id) {
      return res.status(403).json({ error: 'Only asker can approve extension' });
    }

    // Extend deadline by 24h
    await db.query(
      'UPDATE errands SET confirmation_expires_at = confirmation_expires_at + INTERVAL \'24 hours\', confirmation_extended = true WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Extension approved. Doer has 24 more hours to confirm.',
    });
  } catch (error) {
    console.error('Error approving extension:', error);
    res.status(500).json({ error: 'Failed to approve extension' });
  }
});

// GET /api/errands/disputes - Get all disputes (admin only)
router.get('/disputes/list/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // TODO: Check if user is admin
    // For now, return disputes
    const result = await db.query(
      `SELECT id, title, asker_id, status, dispute_reason, created_at, dispute_deadline
       FROM errands WHERE status = 'disputed' ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// POST /api/errands/:id/resolve-dispute - Admin resolves dispute
router.post('/:id/resolve-dispute', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, payment_to, amount_percentage } = req.body;

    // TODO: Check if user is admin

    if (!resolution || !payment_to) {
      return res.status(400).json({ error: 'Resolution and payment_to required' });
    }

    const errandResult = await db.query(
      'SELECT id, status FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if (errandResult.rows[0].status !== 'disputed') {
      return res.status(400).json({ error: 'Can only resolve disputed jobs' });
    }

    // Update dispute resolution
    await db.query(
      'UPDATE errands SET status = $1, dispute_resolution = $2, dispute_resolved_at = NOW(), payment_released_to = $3, payment_percentage = $4 WHERE id = $5',
      ['completed', resolution, payment_to, amount_percentage || 100, id]
    );

    res.json({
      success: true,
      message: 'Dispute resolved. Payment will be released.',
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// GET /api/errands/recommended - Get recommended tasks based on user preferences
router.get('/recommended', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const limit = parseInt(req.query.limit as string) || 5;

    // Get user's category preferences
    const prefResult = await db.query(
      'SELECT category_preferences FROM users WHERE id = $1',
      [userId]
    );

    if (prefResult.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const preferences = prefResult.rows[0].category_preferences || [];

    if (preferences.length === 0) {
      // No preferences set - return empty
      return res.json({ success: true, data: [] });
    }

    // Get open errands matching user's preferred categories
    // Exclude errands posted by user and already bid on
    const query = `
      SELECT e.id, e.title, e.budget, e.category, e.location, e.deadline, e.status
      FROM errands e
      WHERE e.status = 'open'
        AND e.category = ANY($1::text[])
        AND e.asker_id != $2
        AND e.id NOT IN (
          SELECT errand_id FROM bids WHERE doer_id = $2
        )
      ORDER BY e.created_at DESC
      LIMIT $3
    `;

    const result = await db.query(query, [preferences, userId, limit]);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        budget: row.budget,
        category: row.category,
        location: row.location,
        deadline: row.deadline,
        status: row.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

export default router;
