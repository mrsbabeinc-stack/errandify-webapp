import db from '../db.js';

async function seedActivityLog() {
  try {
    console.log('Seeding activity log data...');

    // Get a sample errand to populate
    const errandResult = await db.query(
      `SELECT e.id, e.title, e.asker_id, u.full_name
       FROM errands e
       LEFT JOIN users u ON e.asker_id = u.id
       WHERE e.status IN ('completed', 'completed_unconfirmed')
       ORDER BY e.created_at DESC
       LIMIT 1`
    );

    if (errandResult.rows.length === 0) {
      console.log('No completed errands found to seed');
      return;
    }

    const errand = errandResult.rows[0];
    const errandId = errand.id;
    const askerName = errand.full_name || 'John Lee';

    console.log(`Seeding activities for errand ${errandId}: "${errand.title}"`);

    // Get the doer who completed this task
    const doerResult = await db.query(
      `SELECT u.id, u.full_name
       FROM users u
       JOIN bids b ON u.id = b.doer_id
       WHERE b.errand_id = $1 AND b.status IN ('confirmed', 'completed')
       LIMIT 1`,
      [errandId]
    );

    const doerName = doerResult.rows[0]?.full_name || 'Sarah Tan';
    const doerId = doerResult.rows[0]?.id || 2;

    // Clear existing activities for this errand
    await db.query(
      `DELETE FROM errand_activity_log WHERE errand_id = $1`,
      [errandId]
    );

    // Get errand creation date
    const errandDateResult = await db.query(
      `SELECT created_at FROM errands WHERE id = $1`,
      [errandId]
    );
    const errandCreatedAt = new Date(errandDateResult.rows[0].created_at);

    // Seed activities
    const activities = [
      {
        type: 'posted',
        actor_name: askerName,
        actor_role: 'asker',
        timestamp: errandCreatedAt,
        details: null,
      },
      {
        type: 'bid_placed',
        actor_name: doerName,
        actor_role: 'doer',
        timestamp: new Date(errandCreatedAt.getTime() + 30 * 60000), // 30 mins later
        details: { amount: 150 },
      },
      {
        type: 'bid_accepted',
        actor_name: askerName,
        actor_role: 'asker',
        timestamp: new Date(errandCreatedAt.getTime() + 45 * 60000), // 45 mins later
        details: null,
      },
      {
        type: 'confirmed',
        actor_name: 'System',
        actor_role: 'asker',
        timestamp: new Date(errandCreatedAt.getTime() + 50 * 60000), // 50 mins later
        details: null,
      },
      {
        type: 'started',
        actor_name: doerName,
        actor_role: 'doer',
        timestamp: new Date(errandCreatedAt.getTime() + 2 * 60 * 60000), // 2 hours later
        details: null,
      },
      {
        type: 'completed',
        actor_name: doerName,
        actor_role: 'doer',
        timestamp: new Date(errandCreatedAt.getTime() + 3.5 * 60 * 60000), // 3.5 hours later
        details: { evidence: 'Photo uploaded' },
      },
      {
        type: 'review_submitted',
        actor_name: askerName,
        actor_role: 'asker',
        timestamp: new Date(errandCreatedAt.getTime() + 4 * 60 * 60000), // 4 hours later
        details: { review: 'Excellent work! Very professional and thorough.' },
      },
      {
        type: 'rating_submitted',
        actor_name: askerName,
        actor_role: 'asker',
        timestamp: new Date(errandCreatedAt.getTime() + 4 * 60 * 60000), // 4 hours later
        details: { rating: 5, stars: 5 },
      },
    ];

    for (const activity of activities) {
      await db.query(
        `INSERT INTO errand_activity_log (errand_id, activity_type, actor_name, actor_role, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          errandId,
          activity.type,
          activity.actor_name,
          activity.actor_role,
          activity.details ? JSON.stringify(activity.details) : null,
          activity.timestamp.toISOString(),
        ]
      );
    }

    console.log(`✅ Seeded ${activities.length} activities for errand ${errandId}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seedActivityLog().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
