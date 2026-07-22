import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// POST /api/admin/migrate-notifications - Fix old notification formatting
// This updates all old notifications to use the new format with full errand IDs and aliases
router.post('/migrate-notifications', authMiddleware, requireAdmin(), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    console.log(`[Migration] Starting notification format migration for user ${userId}`);

    // Fix 1: Update "New offer Placed" notifications
    const fix1 = await db.query(
      `UPDATE notifications n
       SET 
         title = 'New Offer Place',
         message = CONCAT(
           e.errand_id,
           ' • ',
           COALESCE(b.offer_id, 'OF26XX-XXXX'),
           ': ',
           COALESCE(u.alias, u.display_name),
           ' has placed an offer for $',
           b.amount
         )
       FROM errands e
       JOIN bids b ON e.id = b.errand_id
       JOIN users u ON b.doer_id = u.id
       WHERE n.type = 'bid_placed'
       AND n.related_errand_id = e.id
       AND n.title IN ('New offer Placed', 'New Offer Placed')`
    );

    console.log(`[Migration] Fixed ${fix1.rowCount} 'New Offer' notifications`);

    // Fix 2: Update "Offer Not Selected" notifications
    const fix2 = await db.query(
      `UPDATE notifications n
       SET 
         message = e.errand_id || ': Your offer wasn''t selected'
       FROM errands e
       WHERE n.type = 'bid_rejected'
       AND n.related_errand_id = e.id
       AND n.title = 'Offer Not Selected'
       AND n.message NOT LIKE 'ER%-%'`
    );

    console.log(`[Migration] Fixed ${fix2.rowCount} 'Offer Not Selected' notifications`);

    // Fix 3: Update "Errand Started" notifications
    const fix3 = await db.query(
      `UPDATE notifications n
       SET 
         message = e.errand_id || ': Started'
       FROM errands e
       WHERE n.type IN ('task_started', 'errand_started')
       AND n.related_errand_id = e.id
       AND n.title LIKE '%Errand Started%'
       AND n.message NOT LIKE 'ER%-%'`
    );

    console.log(`[Migration] Fixed ${fix3.rowCount} 'Errand Started' notifications`);

    // Fix 4: Update any remaining notifications with old ER format
    // This is a catch-all for any other notifications with ER\d+ (not ER\d{2}XX-XXXX)
    const fix4Result = await db.query(
      `SELECT n.id, n.message, e.errand_id
       FROM notifications n
       JOIN errands e ON n.related_errand_id = e.id
       WHERE n.message ~ 'ER[0-9]+'
       AND n.message NOT LIKE 'ER%-%'
       LIMIT 100`
    );

    let fix4Count = 0;
    for (const row of fix4Result.rows) {
      // Replace old format with new
      const oldPattern = /ER\d+/;
      const newMessage = row.message.replace(oldPattern, row.errand_id);
      
      if (newMessage !== row.message) {
        await db.query(
          'UPDATE notifications SET message = $1 WHERE id = $2',
          [newMessage, row.id]
        );
        fix4Count++;
      }
    }

    console.log(`[Migration] Fixed ${fix4Count} other notifications with old ER format`);

    const totalFixed = (fix1.rowCount || 0) + (fix2.rowCount || 0) + (fix3.rowCount || 0) + fix4Count;

    res.json({
      success: true,
      message: `Notification format migration complete`,
      stats: {
        newOfferNotifications: fix1.rowCount || 0,
        offerNotSelectedNotifications: fix2.rowCount || 0,
        errandStartedNotifications: fix3.rowCount || 0,
        otherNotifications: fix4Count,
        totalFixed: totalFixed
      }
    });

  } catch (error) {
    console.error('[Migration] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
