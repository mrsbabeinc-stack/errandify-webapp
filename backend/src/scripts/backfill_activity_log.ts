import db from '../db.js';

async function backfillActivityLog() {
  try {
    console.log('Backfilling activity log for existing errands...');

    // Get all completed errands with their details
    const errands = await db.query(`
      SELECT
        e.id,
        e.title,
        e.asker_id,
        u_asker.full_name as asker_name,
        e.created_at as errand_created_at,
        e.status,
        e.updated_at as errand_updated_at,
        b.id as bid_id,
        b.doer_id,
        u_doer.full_name as doer_name,
        b.amount,
        b.status as bid_status,
        b.created_at as bid_created_at,
        b.updated_at as bid_updated_at,
        j.id as job_id,
        j.started_at,
        j.completed_at,
        r.id as rating_id,
        r.created_at as rating_created_at
      FROM errands e
      LEFT JOIN users u_asker ON e.asker_id = u_asker.id
      LEFT JOIN bids b ON e.id = b.errand_id AND b.status IN ('accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress', 'completed')
      LEFT JOIN users u_doer ON b.doer_id = u_doer.id
      LEFT JOIN jobs j ON e.id = j.errand_id
      LEFT JOIN ratings r ON e.id = r.errand_id
      WHERE e.status IN ('completed', 'completed_unconfirmed')
      ORDER BY e.id DESC
      LIMIT 20
    `);

    console.log(`Found ${errands.rows.length} completed errands to process`);

    for (const errand of errands.rows) {
      // Check if activities already exist for this errand
      const existingActivities = await db.query(
        `SELECT COUNT(*) as count FROM errand_activity_log WHERE errand_id = $1`,
        [errand.id]
      );

      if (existingActivities.rows[0].count > 0) {
        console.log(`⏭️  Skipping errand ${errand.id} - activities already exist`);
        continue;
      }

      console.log(`\n📝 Processing errand ${errand.id}: "${errand.title}"`);

      const activities: any[] = [];

      // 1. Errand Posted
      activities.push({
        errand_id: errand.id,
        activity_type: 'posted',
        actor_id: errand.asker_id,
        actor_name: errand.asker_name || 'Unknown User',
        actor_role: 'asker',
        details: null,
        created_at: errand.errand_created_at,
      });
      console.log('  ✓ Posted');

      if (errand.bid_id) {
        // 2. Bid Placed
        activities.push({
          errand_id: errand.id,
          activity_type: 'bid_placed',
          actor_id: errand.doer_id,
          actor_name: errand.doer_name || 'Unknown User',
          actor_role: 'doer',
          details: JSON.stringify({ amount: errand.amount }),
          created_at: errand.bid_created_at,
        });
        console.log('  ✓ Bid Placed');

        // 3. Bid Accepted (if bid was accepted/confirmed)
        if (['accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress', 'completed'].includes(errand.bid_status)) {
          activities.push({
            errand_id: errand.id,
            activity_type: 'bid_accepted',
            actor_id: errand.asker_id,
            actor_name: errand.asker_name || 'Unknown User',
            actor_role: 'asker',
            details: null,
            created_at: new Date(new Date(errand.bid_created_at).getTime() + 5 * 60000), // 5 mins after bid
          });
          console.log('  ✓ Bid Accepted');

          // 4. Confirmed
          activities.push({
            errand_id: errand.id,
            activity_type: 'confirmed',
            actor_id: null,
            actor_name: 'System',
            actor_role: 'asker',
            details: null,
            created_at: new Date(new Date(errand.bid_created_at).getTime() + 10 * 60000), // 10 mins after bid
          });
          console.log('  ✓ Confirmed');
        }

        // 5. Started (if job exists)
        if (errand.job_id && errand.started_at) {
          activities.push({
            errand_id: errand.id,
            activity_type: 'started',
            actor_id: errand.doer_id,
            actor_name: errand.doer_name || 'Unknown User',
            actor_role: 'doer',
            details: null,
            created_at: errand.started_at,
          });
          console.log('  ✓ Started');
        }

        // 6. Completed (if job is completed)
        if (errand.job_id && errand.completed_at) {
          activities.push({
            errand_id: errand.id,
            activity_type: 'completed',
            actor_id: errand.doer_id,
            actor_name: errand.doer_name || 'Unknown User',
            actor_role: 'doer',
            details: JSON.stringify({ evidence: 'Completion evidence submitted' }),
            created_at: errand.completed_at,
          });
          console.log('  ✓ Completed');
        }

        // 7. Rating Submitted (if rating exists)
        if (errand.rating_id) {
          activities.push({
            errand_id: errand.id,
            activity_type: 'rating_submitted',
            actor_id: errand.asker_id,
            actor_name: errand.asker_name || 'Unknown User',
            actor_role: 'asker',
            details: JSON.stringify({ rating: 5 }),
            created_at: errand.rating_created_at,
          });
          console.log('  ✓ Rating Submitted');
        }
      }

      // Insert all activities for this errand
      for (const activity of activities) {
        try {
          await db.query(
            `INSERT INTO errand_activity_log (errand_id, activity_type, actor_id, actor_name, actor_role, details, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              activity.errand_id,
              activity.activity_type,
              activity.actor_id,
              activity.actor_name,
              activity.actor_role,
              activity.details,
              activity.created_at,
            ]
          );
        } catch (error) {
          console.error(`  ❌ Failed to insert activity:`, error);
        }
      }

      console.log(`  ✅ Logged ${activities.length} activities`);
    }

    console.log('\n✅ Backfill complete!');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

backfillActivityLog()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
