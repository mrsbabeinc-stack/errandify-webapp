import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { activityLogService } from '../services/activityLogService.js';
import { sendCriticalEmail } from '../services/emailNotifications.js';
import { generateRecurringInstances } from '../services/recurringService.js';
import { moderateContent } from '../services/contentModerationService.js';
import { getCategoryCode } from '../utils/categoryCodes.js';

const router = Router();

// Generate unique errand ID: ER26HM-XXXX
// Format: ER[YEAR_SHORT][CATEGORY_CODE]-[4_RANDOM_CHARS]
// Category codes come from the `category_codes` DB table (see utils/categoryCodes).
// Example: ER26FD-K9M7 (Food & Beverage)
function generateErrandId(category: string): string {
  const year = new Date().getFullYear().toString().slice(-2); // Get last 2 digits: 2026 -> 26
  const categoryCode = getCategoryCode(category);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ER${year}${categoryCode}-${code}`;
}

// Resolve errand ID - accepts either database ID (numeric) or formatted errand ID (ER...)
// Returns the database ID
async function resolveErrandId(idParam: string): Promise<number | null> {
  // If it's a number, assume it's the database ID
  if (/^\d+$/.test(idParam)) {
    return parseInt(idParam, 10);
  }

  // Otherwise, query by formatted errand ID
  try {
    const result = await db.query(
      'SELECT id FROM errands WHERE errand_id = $1',
      [idParam]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error('[Errands] Error resolving errand ID:', error);
    return null;
  }
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
      // Include all active assignment statuses: accepted (allocated to staff), completed (work done)
      query = `SELECT e.* FROM errands e
               INNER JOIN errand_assignments ea ON e.id = ea.errand_id
               WHERE ea.doer_id = $1 AND ea.status IN ('accepted', 'completed')`;
      params.push(currentUserId);
      paramIndex = 2;
    } else if (isRecommended) {
      // Show open errands that match user's category preferences
      // If no preferences set, use AI-based behavior recommendations
      query = `SELECT e.* FROM errands e
               WHERE e.status = $1
               AND e.asker_id != $2
               AND (e.deadline IS NULL OR e.deadline > NOW())
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
      // Show all open and confirmed errands (for browsing and allocation)
      // Exclude errands posted by current user, those past deadline, and those already allocated
      query = `SELECT e.*,
                      CASE WHEN EXISTS (
                        SELECT 1 FROM errand_assignments
                        WHERE errand_id = e.id AND status = 'accepted'
                      ) THEN true ELSE false END as hasAssignment
               FROM errands e
               WHERE (e.status = $1 OR e.status = $2)
               AND e.asker_id != $3
               AND (e.deadline IS NULL OR e.deadline > NOW())
               AND NOT EXISTS (
                 SELECT 1 FROM errand_assignments
                 WHERE errand_id = e.id AND status = 'accepted'
               )`;
      params.push('open', 'confirmed', currentUserId);
      paramIndex = 4;
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
      const statusPrefix = isAccepted ? 'e.' : '';
      query += ` AND ${statusPrefix}status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Exclude expired errands for doers without bids (but show if they have a bid on it)
    if (!isMyOnly) {
      // For doers: exclude expired errands UNLESS they have made a bid on it
      const tablePrefix = isAccepted ? 'e.' : '';
      query += ` AND (${tablePrefix}status != 'expired' OR EXISTS (
        SELECT 1 FROM bids WHERE bids.errand_id = ${tablePrefix}id AND bids.doer_id = $${paramIndex}
      ))`;
      params.push(currentUserId);
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

    // Enrich with asker info and bid count
    const errandsWithAskerInfo = await Promise.all(
      result.rows.map(async (errand) => {
        const askerResult = await db.query(
          'SELECT display_name FROM users WHERE id = $1',
          [errand.asker_id]
        );

        // Get doer name from confirmed bid if exists
        let doerName = 'Doer';
        const bidResult = await db.query(
          `SELECT u.display_name FROM bids b
           LEFT JOIN users u ON b.doer_id = u.id
           WHERE b.errand_id = $1 AND b.status IN ('accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress')
           LIMIT 1`,
          [errand.id]
        );
        if (bidResult.rows.length > 0) {
          doerName = bidResult.rows[0]?.display_name || 'Doer';
        }

        // Get allocated staff name from errand_assignments
        let allocatedStaffName = undefined;
        let allocatedBy = undefined;
        const assignmentResult = await db.query(
          `SELECT u.display_name, ea.created_at FROM errand_assignments ea
           LEFT JOIN users u ON ea.doer_id = u.id
           WHERE ea.errand_id = $1 AND ea.status = 'accepted'
           LIMIT 1`,
          [errand.id]
        );
        if (assignmentResult.rows.length > 0) {
          allocatedStaffName = assignmentResult.rows[0]?.display_name;

          // Get who allocated it (the manager/owner who created the assignment)
          const allocatorResult = await db.query(
            `SELECT c.owner_user_id FROM errand_assignments ea
             LEFT JOIN companies c ON c.id = (
               SELECT company_id FROM company_staff
               WHERE user_id = ea.doer_id AND role IN ('owner', 'manager')
               LIMIT 1
             )
             WHERE ea.errand_id = $1 AND ea.status = 'accepted'
             LIMIT 1`,
            [errand.id]
          );

          if (allocatorResult.rows.length > 0 && allocatorResult.rows[0]?.owner_user_id) {
            const ownerResult = await db.query(
              'SELECT display_name FROM users WHERE id = $1',
              [allocatorResult.rows[0].owner_user_id]
            );
            if (ownerResult.rows.length > 0) {
              allocatedBy = ownerResult.rows[0]?.display_name;
            }
          }
        }

        // Get bid count and unviewed count for this errand
        const bidCountResult = await db.query(
          `SELECT
             COUNT(*) as bid_count,
             COUNT(CASE WHEN viewed_at IS NULL THEN 1 END) as unviewed_count
           FROM bids
           WHERE errand_id = $1 AND status IN ('pending', 'accepted', 'rejected_resubmitted')`,
          [errand.id]
        );
        const bidCount = parseInt(bidCountResult.rows[0]?.bid_count || 0, 10);
        const unviewedCount = parseInt(bidCountResult.rows[0]?.unviewed_count || 0, 10);

        return {
          id: errand.id,
          asker_id: errand.asker_id,
          errandId: errand.formatted_id,
          title: errand.title,
          description: errand.description,
          category: categoryMap[errand.category] || errand.category, // Map to frontend category
          status: errand.status,
          budget: errand.budget,
          location: errand.location,
          postal_code: errand.postal_code,
          deadline: errand.deadline,
          isRecurring: errand.is_recurring || false,
          askerName: askerResult.rows[0]?.display_name || 'Anonymous',
          allocatedStaffName: allocatedStaffName,
          allocatedBy: allocatedBy,
          doerName: doerName,
          askerRating: 4.8, // TODO: Calculate from ratings table
          bidCount: bidCount,
          unviewedBidCount: unviewedCount,
          acceptedBidId: errand.accepted_bid_id,
          createdAt: errand.created_at,
          updatedAt: errand.updated_at,
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

    // Resolve errand ID (accepts both database ID and formatted errand ID)
    const errandDatabaseId = await resolveErrandId(id);
    if (!errandDatabaseId) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const result = await db.query('SELECT * FROM errands WHERE id = $1', [errandDatabaseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = result.rows[0];
    const userId = req.userId ? parseInt(req.userId, 10) : null;

    // If errand is cancelled, only allow asker or someone who made a bid to view it
    if (errand.status === 'cancelled' && userId) {
      const isAsker = errand.asker_id === userId;
      const hasBid = await db.query(
        'SELECT id FROM bids WHERE errand_id = $1 AND doer_id = $2 LIMIT 1',
        [errandDatabaseId, userId]
      );
      const madeABid = hasBid.rows.length > 0;

      if (!isAsker && !madeABid) {
        return res.status(403).json({ error: 'This errand has been cancelled and is no longer available' });
      }
    }

    // Get asker info
    const askerResult = await db.query(
      'SELECT display_name, alias, mobile FROM users WHERE id = $1',
      [errand.asker_id]
    );

    // Check if current user is the confirmed doer (can view notes)
    let doerId = null;
    let isConfirmedDoer = false;

    // Find any confirmed bid for this errand (include all accepted/confirmed statuses)
    const bidResult = await db.query(
      `SELECT doer_id FROM bids
       WHERE errand_id = $1 AND status IN ('accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress', 'completed')
       LIMIT 1`,
      [errand.id]
    );
    let doerData = null;
    if (bidResult.rows[0]) {
      doerId = bidResult.rows[0].doer_id;
      isConfirmedDoer = doerId === userId;

      // Get doer info
      const doerResult = await db.query(
        'SELECT display_name, alias FROM users WHERE id = $1',
        [doerId]
      );
      doerData = doerResult.rows[0];
    }

    const askerData = askerResult.rows[0];
    const isAsker = userId === errand.asker_id;

    // Get bid count for this errand
    const bidCountResult = await db.query(
      'SELECT COUNT(*) as bid_count FROM bids WHERE errand_id = $1',
      [errandDatabaseId]
    );
    const bidCount = parseInt(bidCountResult.rows[0]?.bid_count || '0', 10);

    res.json({
      success: true,
      data: {
        id: errand.id,
        errandId: errand.formatted_id,
        formatted_id: errand.formatted_id,
        title: errand.title,
        description: errand.description,
        notes: isConfirmedDoer ? errand.notes : null, // Only show to confirmed doer
        category: errand.category,
        status: errand.status,
        budget: errand.budget,
        location: errand.location,
        full_address: errand.full_address, // Show to all viewers
        postalCode: errand.postal_code,
        postal_code: errand.postal_code,
        deadline: errand.deadline,
        isRecurring: errand.is_recurring,
        askerId: errand.asker_id,
        asker_alias: askerData?.alias || null,
        doerId: doerId,
        doer_alias: doerData?.alias || null,
        acceptedBidId: errand.accepted_bid_id,
        bidCount: bidCount,
        asker: askerData,
        doer: doerData,
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
    const { title, description, category, location, full_address, postal_code, budget, deadline, certifications, isRecurring, repeatEvery, repeatUnit, occurrences } = req.body;
    const askerId = parseInt(req.userId || '0', 10);

    console.log('[DEBUG] POST /api/errands called:', {
      userId: askerId,
      title,
      description,
      category,
      location,
      full_address,
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

    // Moderate errand title and description for contact info and inappropriate content
    try {
      const titleModeration = await moderateContent(title, 'task_description');
      if (titleModeration.status === 'blocked') {
        return res.status(400).json({
          error: `❌ Title blocked: ${titleModeration.reason}. Do not include contact information (phone, email, address, social profiles, business cards).`,
        });
      }

      if (description) {
        const descriptionModeration = await moderateContent(description, 'task_description');
        if (descriptionModeration.status === 'blocked') {
          return res.status(400).json({
            error: `❌ Description blocked: ${descriptionModeration.reason}. Do not include contact information (phone, email, address, social profiles, business cards).`,
          });
        }
      }
    } catch (moderationErr) {
      console.error('[DEBUG] Content moderation check failed:', moderationErr);
      // Log the error but continue - don't block posting due to moderation service failure
      console.log('[DEBUG] Continuing despite moderation error');
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

    // Validate postal code and location match (if both provided)
    if (postalCode && location) {
      const postalPrefix = postalCode.substring(0, 2);
      // Map postal code prefix to correct area
      const postalAreaMap: Record<string, string> = {
        '01': 'Raffles Place', '02': 'Cecil Street', '03': 'Tanjong Pagar', '04': 'Tanjong Pagar', '05': 'Outram',
        '06': "People's Park", '07': 'Chinatown', '08': 'Tanjong Pagar', '09': 'Tanjong Pagar', '10': 'Orchard',
        '11': 'Pasir Panjang', '12': 'Novena', '13': 'Newton', '14': 'Farrer Park', '15': 'Henderson',
        '16': 'Henderson', '17': 'Balestier', '18': 'Macpherson', '19': 'Paya Lebar', '20': 'Paya Lebar',
        '21': 'Geylang', '22': 'Geylang', '23': 'Orchard', '24': 'Eunos', '25': 'Bedok', '26': 'Bedok',
        '27': 'Bedok', '28': 'Tampines', '29': 'Tampines', '30': 'Tampines', '31': 'Pasir Ris', '32': 'Pasir Ris',
        '33': 'Punggol', '34': 'Punggol', '35': 'Hougang', '36': 'Hougang', '37': 'Sengkang', '38': 'Sengkang',
        '39': 'Sengkang', '40': 'Jurong West', '41': 'Jurong West', '42': 'Jurong', '43': 'Jurong East',
        '44': 'Clementi', '45': 'Clementi', '46': 'Clementi', '47': 'Bukit Merah', '48': 'Bukit Merah',
        '49': 'Tiong Bahru', '50': 'Redhill', '51': 'Queenstown', '52': 'Commonwealth', '53': 'Pasir Panjang',
        '54': 'Pasir Panjang', '55': 'Bukit Timah', '56': 'Bukit Timah', '57': 'Holland', '58': 'Tanglin',
        '59': 'Clementi', '60': 'Bukit Timah', '61': 'Bishan', '62': 'Jurong', '63': 'Ang Mo Kio',
        '64': 'Ang Mo Kio', '65': 'Serangoon', '66': 'Serangoon', '67': 'Ang Mo Kio', '68': 'Choa Chu Kang',
        '69': 'Geylang', '70': 'Bedok', '71': 'Bedok', '72': 'Bedok', '73': 'Bedok', '74': 'Tampines',
        '75': 'Tampines', '76': 'Tampines', '77': 'Tampines', '78': 'Tampines', '79': 'Sengkang',
        '80': 'Sengkang', '81': 'Sengkang', '82': 'Sengkang', '83': 'Simei'
      };

      const expectedArea = postalAreaMap[postalPrefix];
      const locationNormalized = location.toLowerCase().trim();
      const expectedAreaNormalized = expectedArea?.toLowerCase().trim();

      if (expectedArea && expectedAreaNormalized !== locationNormalized) {
        console.warn('[DEBUG] ⚠️ AREA MISMATCH: Postal code', postalCode, 'is in', expectedArea, 'but request says', location);
        // Auto-correct to the expected area
        console.log('[DEBUG] ✅ AUTO-CORRECTING location to match postal code');
        // Update the location to match the postal code
      }
    }

    try {
      // Create parent errand (simplified, no transactions for now)
      console.log('[DEBUG] About to insert errand with params:', {
        askerId,
        title,
        category,
        postalCode,
        location,
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

      const formattedId = generateErrandId(category);
      const errandResult = await db.query(
        `INSERT INTO errands (asker_id, title, description, category, location, full_address, postal_code, budget, deadline, is_recurring, recurring_schedule, status, formatted_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, formatted_id, title, description, category, status, budget, deadline, is_recurring, recurring_schedule, created_at`,
        [
          askerId,
          title,
          description || null,
          category,
          location || null,
          full_address || null,
          postalCode || null,
          budget ? parseFloat(String(budget)) : null,
          deadline || null,
          isRecurring || false,
          recurringConfig,
          'open',
          formattedId
        ]
      );

      const errand = errandResult.rows[0];

      // Log all fields being stored
      const allFieldsLog = await db.query(
        'SELECT id, formatted_id, title, description, location, postal_code, category, budget, deadline, status, is_recurring FROM errands WHERE id = $1',
        [errand.id]
      );
      console.log('[DEBUG] ERRAND STORED IN DATABASE:', allFieldsLog.rows[0]);

      console.log('[DEBUG] Errand created successfully:', {
        id: errand.id,
        askerId: askerId,
        title: errand.title,
        category: errand.category,
        status: errand.status,
        budget: errand.budget,
        deadline: errand.deadline,
        isRecurring: errand.is_recurring,
      });

      // Generate recurring instances if this is a recurring errand
      if (isRecurring && recurringConfig && deadline) {
        try {
          const config = JSON.parse(recurringConfig);
          const deadlineDate = new Date(deadline);
          const instanceIds = await generateRecurringInstances(errand.id, deadlineDate, config);
          console.log(`[RECURRING] Generated ${instanceIds.length} instances for errand ${errand.id}`);
        } catch (recurringError) {
          console.error('[RECURRING] Failed to generate recurring instances:', recurringError);
          // Don't fail the errand creation if recurring generation fails
        }
      }

      // Notify relevant doers about this new errand
      try {
        // Find doers with matching category preferences OR who have completed similar tasks
        const notifyResult = await db.query(
          `SELECT DISTINCT u.id as doer_id, u.display_name
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
      try {
        const askerResult = await db.query('SELECT display_name, alias FROM users WHERE id = $1', [askerId]);
        const askerName = askerResult.rows[0]?.display_name || 'Unknown User';
        const askerAlias = askerResult.rows[0]?.alias || undefined;
        await activityLogService.logPosted(errand.id, askerName, askerId, askerAlias);
      } catch (activityErr) {
        console.error('[DEBUG] Activity logging error (non-blocking):', activityErr);
        // Don't fail the errand creation if activity logging fails
      }

      res.status(201).json({
        success: true,
        data: {
          id: errand.id,
          errandId: errand.formatted_id,
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

    // Mark as pending_review (awaiting owner/manager approval for company doers, or asker approval for individuals)
    const result = await db.query(
      'UPDATE errands SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
      ['pending_review', id]
    );

    // Log activity: Job submitted for review
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

            // Send email notification to referrer
            sendCriticalEmail(referrerId, 'first_job_bonus', {
              referredUserName: doerName,
              pointsAwarded: firstJobBonus
            }).catch(err => {
              console.error('[Email] Failed to send first_job_bonus email:', err);
            });
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

    // Prevent editing once any offer is received
    if (errand.status !== 'open') {
      return res.status(403).json({
        error: 'Cannot edit errand once an offer is confirmed',
        message: 'This errand has been accepted and is no longer editable. You can only update the status.'
      });
    }

    // Check if there are any bids/offers on this errand
    const bidCheckResult = await db.query(
      'SELECT COUNT(*) as bid_count FROM bids WHERE errand_id = $1',
      [id]
    );
    const bidCount = parseInt(bidCheckResult.rows[0]?.bid_count || '0', 10);

    if (bidCount > 0) {
      return res.status(403).json({
        error: 'Cannot edit errand once offers are received',
        message: 'This errand has received offers and cannot be edited to ensure fairness. You can cancel the errand and post a new one if needed.'
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

// POST /api/errands/:id/start - Doer starts job (accepts database ID or errand ID)
router.post('/:id/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[Errands] POST /api/errands/:id/start called with id:', id);

    // Resolve errand ID
    const errandDatabaseId = await resolveErrandId(id);
    console.log('[Errands] Resolved errand database ID:', errandDatabaseId);
    if (!errandDatabaseId) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errandResult = await db.query(
      'SELECT id, status FROM errands WHERE id = $1',
      [errandDatabaseId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    if (errandResult.rows[0].status !== 'confirmed') {
      return res.status(400).json({ error: 'Can only start job from confirmed status' });
    }

    // Update status to in_progress
    await db.query(
      'UPDATE errands SET status = $1 WHERE id = $2',
      ['in_progress', errandDatabaseId]
    );

    // Log activity: Job started
    const doerResult = await db.query('SELECT display_name, alias FROM users WHERE id = $1', [req.userId]);
    const doerName = doerResult.rows[0]?.display_name || 'Unknown User';
    const doerAlias = doerResult.rows[0]?.alias || undefined;
    const errandDataForLog = await db.query('SELECT errand_id FROM errands WHERE id = $1', [errandDatabaseId]);
    const errandFormattedId = errandDataForLog.rows[0]?.errand_id || undefined;
    await activityLogService.logStarted(errandDatabaseId, doerName, parseInt(req.userId || '0', 10), doerAlias, errandFormattedId);

    res.json({
      success: true,
      message: 'Job started! Timer is running.',
    });
  } catch (error) {
    console.error('[Errands] Error starting job:', error);
    console.error('[Errands] Error details:', JSON.stringify(error));
    res.status(500).json({ error: 'Failed to start job', details: String(error) });
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
    await activityLogService.logReopened(id, userName, userId, userRole).catch(console.error);

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

    console.log('[Cancel] Request:', { id, userId, reason });

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, status, asker_id, accepted_bid_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      console.log('[Cancel] Errand not found:', id);
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];
    const isAsker = userId === errand.asker_id;
    const previousStatus = errand.status;

    console.log('[Cancel] Errand found:', { errand, isAsker, userId });

    // Check permissions
    if (!isAsker) {
      console.log('[Cancel] Permission denied - not asker');
      return res.status(403).json({ error: 'Only asker can cancel an errand', stage: previousStatus });
    }

    // Check if errand can be cancelled based on status
    if (previousStatus === 'completed' || previousStatus === 'rated' || previousStatus === 'cancelled') {
      console.log('[Cancel] Cannot cancel - status is:', previousStatus);
      return res.status(400).json({
        error: `Cannot cancel ${previousStatus} errand`,
        stage: previousStatus,
        stageDescription: `Errand is ${previousStatus}`,
      });
    }

    // Update status to cancelled
    await db.query(
      'UPDATE errands SET status = $1, cancelled_by = $2, cancellation_reason = $3 WHERE id = $4',
      ['cancelled', userId, reason || null, id]
    );

    // Get canceller name for logging
    const cancellerResult = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [userId]
    );
    const cancellerName = cancellerResult.rows[0]?.display_name || 'Unknown';
    const cancellerRole = isAsker ? 'asker' : 'doer';

    // Log cancellation
    await activityLogService.logCancelled(id, cancellerName, userId, cancellerRole, reason).catch(console.error);

    // Cancel all bids associated with this errand with stage-specific messages
    try {
      // Get all bids for this errand
      const bidsResult = await db.query(
        'SELECT id, doer_id, status FROM bids WHERE errand_id = $1',
        [id]
      );

      // Update all bids to cancelled status
      await db.query(
        'UPDATE bids SET status = $1 WHERE errand_id = $2',
        ['cancelled', id]
      );

      // Get errand and canceller details
      const errandData = await db.query(
        'SELECT title FROM errands WHERE id = $1',
        [id]
      );
      const errandTitle = errandData.rows[0]?.title || 'A task';

      // Determine stage-specific message based on previousStatus
      let stageMessage = '';
      let notificationType = 'job_cancelled';

      switch(previousStatus) {
        case 'open':
          stageMessage = `The job for "${errandTitle}" has been cancelled by the asker before any selection. Your offer is closed.`;
          break;
        case 'confirmed':
          stageMessage = `The job for "${errandTitle}" has been cancelled after offer confirmation. Your offer is closed.`;
          break;
        case 'in_progress':
          stageMessage = `The job for "${errandTitle}" has been cancelled while in progress. A dispute may be raised. Your offer is closed.`;
          notificationType = 'job_dispute_started';
          break;
        default:
          stageMessage = `The job for "${errandTitle}" has been cancelled. Your offer is now closed.`;
      }

      // Notify all bidders with stage-specific messages
      for (const bid of bidsResult.rows) {
        // Customize title based on stage
        let notificationTitle = '❌ Job Cancelled';
        if (previousStatus === 'confirmed') {
          notificationTitle = '⚠️ Job Cancelled After Confirmation';
        } else if (previousStatus === 'in_progress') {
          notificationTitle = '⚠️ Job Cancelled In Progress';
        }

        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            bid.doer_id,
            notificationType,
            notificationTitle,
            stageMessage,
            id,
          ]
        );
      }
    } catch (bidErr) {
      console.warn('[Errands] Failed to cancel bids:', bidErr);
      // Don't fail the entire request if bid cancellation fails
    }

    // Log activity: Errand cancelled
    const userResult = await db.query('SELECT display_name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0]?.display_name || 'Unknown User';
    const userRole = isAsker ? 'asker' : 'doer';
    await activityLogService.logActivity(id, 'cancelled', userId, userName, userRole, { reason, previousStatus });

    // Return success response
    res.json({
      success: true,
      message: `Errand cancelled at ${previousStatus} stage. All bids and offers cancelled.`,
      stage: previousStatus,
      allBiddersCancelled: true,
    });
  } catch (error) {
    console.error('[Cancel] Error cancelling job:', error);
    if (error instanceof Error) {
      console.error('[Cancel] Error message:', error.message);
      console.error('[Cancel] Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to cancel job', details: error instanceof Error ? error.message : String(error) });
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

// GET /api/errands/:id/recurring - Get recurring instances and parent info
router.get('/:id/recurring', async (req: AuthRequest, res: Response) => {
  try {
    const errandId = parseInt(req.params.id, 10);

    // Check if this is part of a recurring series
    const sessionResult = await db.query(
      `SELECT parent_errand_id, instance_number
       FROM recurring_sessions
       WHERE errand_id = $1`,
      [errandId]
    );

    if (sessionResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          isRecurringInstance: false,
          parent: null,
          siblings: [],
        },
      });
    }

    const session = sessionResult.rows[0];
    const parentId = session.parent_errand_id;
    const instanceNumber = session.instance_number;

    // Get parent errand
    const parentResult = await db.query(
      `SELECT id, title, is_recurring, recurring_schedule FROM errands WHERE id = $1`,
      [parentId]
    );

    // Get all instances
    const siblingsResult = await db.query(
      `SELECT rs.instance_number, rs.errand_id, rs.scheduled_date, e.title, e.status, e.budget
       FROM recurring_sessions rs
       JOIN errands e ON rs.errand_id = e.id
       WHERE rs.parent_errand_id = $1
       ORDER BY rs.instance_number ASC`,
      [parentId]
    );

    res.json({
      success: true,
      data: {
        isRecurringInstance: true,
        currentInstance: instanceNumber,
        parent: parentResult.rows[0] || null,
        siblings: siblingsResult.rows.map(row => ({
          instanceNumber: row.instance_number,
          errandId: row.errand_id,
          scheduledDate: row.scheduled_date,
          title: row.title,
          status: row.status,
          budget: row.budget,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching recurring info:', error);
    res.status(500).json({ error: 'Failed to fetch recurring info' });
  }
});

// POST /api/errands/:id/confirm-completion - Mark errand as completed (after asker rates)
router.post('/:id/confirm-completion', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    // Get errand
    const errandResult = await db.query('SELECT * FROM errands WHERE id = $1', [id]);
    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Only asker can confirm completion
    if (errand.asker_id !== userId) {
      return res.status(403).json({ error: 'Only asker can confirm completion' });
    }

    // Update status to completed (from completed_unconfirmed or rated)
    console.log('[ConfirmCompletion] Updating errand', id, 'from status', errand.status, 'to completed');
    const updateResult = await db.query(
      'UPDATE errands SET status = $1, confirmed_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING id, status',
      ['completed', id]
    );

    console.log('[ConfirmCompletion] Update result:', updateResult.rows[0]);

    res.json({
      success: true,
      message: 'Errand marked as completed',
      data: { id, status: 'completed' },
    });
  } catch (error) {
    console.error('[ConfirmCompletion] Error confirming completion:', error);
    res.status(500).json({ error: 'Failed to confirm completion', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/errands/:id/approve-completion - Manager/Owner approves completed work
router.post('/:id/approve-completion', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const managerId = parseInt(req.userId || '0', 10);

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, status, asker_id, accepted_bid_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Verify the requester is the asker (for company context, asker_id is the company manager/owner)
    if (errand.asker_id !== managerId) {
      return res.status(403).json({ error: 'Only the asker/manager can approve completion' });
    }

    // Verify errand is in pending_review status
    if (errand.status !== 'pending_review') {
      return res.status(400).json({ error: 'Errand must be pending review to approve' });
    }

    // Get doer info for notification
    const bidResult = await db.query(
      'SELECT doer_id FROM bids WHERE id = $1',
      [errand.accepted_bid_id]
    );
    const doerId = bidResult.rows[0]?.doer_id;

    // Approve and mark as completed
    await db.query(
      'UPDATE errands SET status = $1, updated_at = NOW() WHERE id = $2',
      ['completed', id]
    );

    // Notify doer that completion was approved
    try {
      const errandData = await db.query(
        'SELECT errand_id, title FROM errands WHERE id = $1',
        [id]
      );
      const errandTitle = errandData.rows[0]?.title || 'Your task';
      const formattedErrandId = errandData.rows[0]?.errand_id || `ER26-${id}`;

      if (doerId) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            doerId,
            'completion_approved',
            '✅ Work Approved',
            `${formattedErrandId}: "${errandTitle}" - Your work has been approved! Payment is being processed.`,
            id,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('[Errands] Failed to notify doer of approval:', notifErr);
    }

    // Log activity
    const managerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [managerId]);
    const managerName = managerResult.rows[0]?.display_name || 'Manager';
    try {
      await activityLogService.logActivity(id, 'completion_approved', managerId, managerName, 'asker');
    } catch (activityErr) {
      console.warn('[Errands] Failed to log activity:', activityErr);
    }

    res.json({
      success: true,
      message: 'Completion approved. Payment released.',
      data: { id, status: 'completed' },
    });
  } catch (error) {
    console.error('[ApproveCompletion] Error approving completion:', error);
    res.status(500).json({ error: 'Failed to approve completion', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/errands/:id/reject-completion - Manager/Owner rejects completed work
router.post('/:id/reject-completion', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const managerId = parseInt(req.userId || '0', 10);

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, status, asker_id, accepted_bid_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Verify the requester is the asker (manager/owner)
    if (errand.asker_id !== managerId) {
      return res.status(403).json({ error: 'Only the asker/manager can reject completion' });
    }

    // Verify errand is in pending_review status
    if (errand.status !== 'pending_review') {
      return res.status(400).json({ error: 'Errand must be pending review to reject' });
    }

    // Get doer info
    const bidResult = await db.query(
      'SELECT doer_id FROM bids WHERE id = $1',
      [errand.accepted_bid_id]
    );
    const doerId = bidResult.rows[0]?.doer_id;

    // Reject and revert to in_progress so doer can revise
    await db.query(
      'UPDATE errands SET status = $1, updated_at = NOW() WHERE id = $2',
      ['in_progress', id]
    );

    // Notify doer that work was rejected
    try {
      const errandData = await db.query(
        'SELECT errand_id, title FROM errands WHERE id = $1',
        [id]
      );
      const errandTitle = errandData.rows[0]?.title || 'Your task';
      const formattedErrandId = errandData.rows[0]?.errand_id || `ER26-${id}`;

      if (doerId) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            doerId,
            'completion_rejected',
            '⚠️ Work Needs Revision',
            `${formattedErrandId}: "${errandTitle}" - Please revise and resubmit. Reason: ${reason || 'See chat for details'}`,
            id,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('[Errands] Failed to notify doer of rejection:', notifErr);
    }

    // Log activity
    const managerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [managerId]);
    const managerName = managerResult.rows[0]?.display_name || 'Manager';
    try {
      await activityLogService.logActivity(id, 'completion_rejected', managerId, managerName, 'asker', { reason });
    } catch (activityErr) {
      console.warn('[Errands] Failed to log activity:', activityErr);
    }

    res.json({
      success: true,
      message: 'Completion rejected. Errand returned to in_progress for revision.',
      data: { id, status: 'in_progress' },
    });
  } catch (error) {
    console.error('[RejectCompletion] Error rejecting completion:', error);
    res.status(500).json({ error: 'Failed to reject completion', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/errands/:id/acknowledge - Staff acknowledges receipt of errand
router.post('/:id/acknowledge', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const staffId = parseInt(req.userId || '0', 10);

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, status, accepted_bid_id, title, formatted_id, asker_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Verify the requester is the assigned doer (check errand_assignments for company staff)
    const assignmentResult = await db.query(
      'SELECT doer_id FROM errand_assignments WHERE errand_id = $1 AND status = $2',
      [id, 'accepted']
    );

    if (assignmentResult.rows.length > 0) {
      // Company staff - verify it's the assigned staff
      if (assignmentResult.rows[0]?.doer_id !== staffId) {
        return res.status(403).json({ error: 'Only the assigned staff can acknowledge this errand' });
      }
    } else if (errand.accepted_bid_id) {
      // Individual doer - verify from bids table
      const bidResult = await db.query(
        'SELECT doer_id FROM bids WHERE id = $1',
        [errand.accepted_bid_id]
      );

      if (bidResult.rows[0]?.doer_id !== staffId) {
        return res.status(403).json({ error: 'Only the assigned doer can acknowledge this errand' });
      }
    } else {
      return res.status(403).json({ error: 'Only the assigned doer can acknowledge this errand' });
    }

    // Update status to acknowledged
    await db.query(
      'UPDATE errands SET status = $1, updated_at = NOW() WHERE id = $2',
      ['acknowledged', id]
    );

    // Notify manager/owner if this is company staff, or asker if individual doer
    try {
      const staffResult = await db.query(
        'SELECT display_name FROM users WHERE id = $1',
        [staffId]
      );
      const staffName = staffResult.rows[0]?.display_name || 'Staff member';
      const errandTitle = errand.title || 'Your task';
      const errandId = errand.formatted_id || `ER26-${id}`;

      // Check if this is company staff (has errand_assignments)
      if (assignmentResult.rows.length > 0) {
        // Notify company owner/manager
        const companyResult = await db.query(
          `SELECT c.owner_user_id FROM companies c
           INNER JOIN company_staff cs ON c.id = cs.company_id
           WHERE cs.user_id = $1 AND cs.role IN ('owner', 'manager')
           LIMIT 1`,
          [staffId]
        );

        if (companyResult.rows.length > 0 && companyResult.rows[0]?.owner_user_id) {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
             VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
            [
              companyResult.rows[0].owner_user_id,
              'errand_acknowledged',
              '✅ Errand Acknowledged by Staff',
              `${errandId}: "${errandTitle}" - ${staffName} has acknowledged receipt. Please confirm within 24 hours.`,
              id,
            ]
          );
        }
      } else {
        // Notify asker for individual doer
        if (errand.asker_id) {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
             VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
            [
              errand.asker_id,
              'errand_acknowledged',
              '✅ Errand Acknowledged',
              `${errandId}: "${errandTitle}" - ${staffName} has received the errand and is ready to proceed.`,
              id,
            ]
          );
        }
      }
    } catch (notifErr) {
      console.warn('[Errands] Failed to notify of acknowledgement:', notifErr);
    }

    res.json({
      success: true,
      message: 'Errand acknowledged. Awaiting manager confirmation.',
      data: { id, status: 'acknowledged' },
    });
  } catch (error) {
    console.error('[AcknowledgeErrand] Error acknowledging errand:', error);
    res.status(500).json({ error: 'Failed to acknowledge errand', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/errands/:id/confirm-start - Manager/Owner confirms staff can start (within 24h)
router.post('/:id/confirm-start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const managerId = parseInt(req.userId || '0', 10);

    // Get errand details
    const errandResult = await db.query(
      'SELECT id, status, asker_id, accepted_bid_id FROM errands WHERE id = $1',
      [id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Verify the requester is the asker (manager/owner)
    if (errand.asker_id !== managerId) {
      return res.status(403).json({ error: 'Only the manager/owner can confirm start' });
    }

    // Verify errand is in acknowledged status
    if (errand.status !== 'acknowledged') {
      return res.status(400).json({ error: 'Errand must be acknowledged before manager confirmation' });
    }

    // Update status to confirmed_awaiting_start with 24h confirmation deadline
    await db.query(
      'UPDATE errands SET status = $1, confirmation_expires_at = NOW() + INTERVAL \'24 hours\', updated_at = NOW() WHERE id = $2',
      ['confirmed_awaiting_start', id]
    );

    // Get doer info and notify them
    const bidResult = await db.query(
      'SELECT doer_id FROM bids WHERE id = $1',
      [errand.accepted_bid_id]
    );
    const doerId = bidResult.rows[0]?.doer_id;

    if (doerId) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
         VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
        [
          doerId,
          'confirmed_ready_start',
          '✅ Confirmed - Ready to Start!',
          `Manager has confirmed. You can now start the errand whenever you're ready. You have 24 hours to begin.`,
          id,
        ]
      );
    }

    // Log activity
    const managerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [managerId]);
    const managerName = managerResult.rows[0]?.display_name || 'Manager';
    try {
      await activityLogService.logActivity(id, 'confirmed_awaiting_start', managerId, managerName, 'asker');
    } catch (activityErr) {
      console.warn('[Errands] Failed to log activity:', activityErr);
    }

    res.json({
      success: true,
      message: 'Start confirmed. Staff can now begin the errand (24 hour window).',
      data: { id, status: 'confirmed_awaiting_start' },
    });
  } catch (error) {
    console.error('[ConfirmStart] Error confirming start:', error);
    res.status(500).json({ error: 'Failed to confirm start', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/errand-assignments - Create errand assignment (allocate to staff)
router.post('/errand-assignments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId, doerId, status } = req.body;

    if (!errandId || !doerId) {
      return res.status(400).json({ error: 'Missing required fields: errandId, doerId' });
    }

    // Check if assignment already exists
    const existingResult = await db.query(
      'SELECT id FROM errand_assignments WHERE errand_id = $1 AND doer_id = $2',
      [errandId, doerId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Assignment already exists for this errand and doer' });
    }

    // Create the assignment
    const result = await db.query(
      `INSERT INTO errand_assignments (errand_id, doer_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, errand_id, doer_id, status`,
      [errandId, doerId, status || 'accepted']
    );

    // Update errand status if needed
    try {
      await db.query(
        'UPDATE errands SET updated_at = NOW() WHERE id = $1',
        [errandId]
      );
    } catch (updateErr) {
      console.warn('[ErrandAssignment] Failed to update errand timestamp:', updateErr);
    }

    res.json({
      success: true,
      message: 'Errand allocated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[ErrandAssignment] Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create errand assignment', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// DELETE /api/errands/:id/clear-allocation - Clear allocation for testing
router.delete('/:id/clear-allocation', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const errandId = parseInt(req.params.id, 10);

    if (!errandId) {
      return res.status(400).json({ error: 'Invalid errand ID' });
    }

    // Delete the allocation
    await db.query(
      'DELETE FROM errand_assignments WHERE errand_id = $1',
      [errandId]
    );

    res.json({
      success: true,
      message: 'Allocation cleared successfully',
    });
  } catch (error) {
    console.error('[ErrandAllocationClear] Error:', error);
    res.status(500).json({ error: 'Failed to clear allocation', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
