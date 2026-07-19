import db from '../db.js';

async function seedAdvertisingData() {
  try {
    console.log('Seeding advertising system with test data...');

    const companyResult = await db.query('SELECT id FROM companies LIMIT 1', []);
    if (companyResult.rows.length === 0) {
      console.log('No companies found. Skipping advertising seed.');
      return;
    }

    const companyId = companyResult.rows[0].id;
    console.log(`Using company ID: ${companyId}`);

    const userResult = await db.query('SELECT id FROM users LIMIT 1', []);
    if (userResult.rows.length === 0) {
      console.log('No users found. Skipping advertising seed.');
      return;
    }

    const userId = userResult.rows[0].id;

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const threeWeeksFromNow = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

    const campaign1 = await db.query(
      `INSERT INTO campaigns (company_id, title, description, image_url, budget, spent, status, starts_at, ends_at, duration_days, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING *`,
      [companyId, 'Summer Cleaning Special', 'Professional home and office cleaning', 'https://via.placeholder.com/1200x400/FF6B35', 500, 0, 'draft', nextWeek.toISOString(), twoWeeksFromNow.toISOString(), 7, userId]
    );

    console.log('Created draft campaign:', campaign1.rows[0].id);

    const campaign2 = await db.query(
      `INSERT INTO campaigns (company_id, title, description, image_url, budget, spent, status, starts_at, ends_at, duration_days, created_by, created_at, updated_at, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW()) RETURNING *`,
      [companyId, 'Fast Delivery Services', 'Same-day delivery across Singapore', 'https://via.placeholder.com/1200x400/FF8C5A', 300, 0, 'submitted', twoWeeksFromNow.toISOString(), threeWeeksFromNow.toISOString(), 7, userId]
    );

    console.log('Created submitted campaign:', campaign2.rows[0].id);

    const startDate3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const endDate3 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const campaign3 = await db.query(
      `INSERT INTO campaigns (company_id, title, description, image_url, budget, spent, status, starts_at, ends_at, duration_days, created_by, created_at, updated_at, submitted_at, approved_at, stripe_charge_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW(), NOW(), $12) RETURNING *`,
      [companyId, 'Healthcare & Wellness Services', 'Professional healthcare services', 'https://via.placeholder.com/1200x400/FF6B35', 750, 320, 'live', startDate3.toISOString(), endDate3.toISOString(), 17, userId, `test_charge_${Date.now()}`]
    );

    console.log('Created live campaign:', campaign3.rows[0].id);

    const campaign4 = await db.query(
      `INSERT INTO campaigns (company_id, title, description, image_url, budget, spent, status, starts_at, ends_at, duration_days, created_by, created_at, updated_at, submitted_at, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW(), $12) RETURNING *`,
      [companyId, 'Rejected Campaign', 'This campaign was rejected', 'https://via.placeholder.com/1200x400/cccccc', 200, 0, 'rejected', twoWeeksFromNow.toISOString(), threeWeeksFromNow.toISOString(), 7, userId, 'Campaign description contains sensitive information']
    );

    console.log('Created rejected campaign:', campaign4.rows[0].id);

    const placements = ['homepage_banner', 'browse_sidebar', 'email_newsletter', 'company_profile'];
    for (const placement of placements) {
      await db.query(
        `INSERT INTO ad_placements (campaign_id, placement_type, impressions, clicks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [campaign3.rows[0].id, placement, Math.floor(Math.random() * 1000) + 100, Math.floor(Math.random() * 100) + 10]
      );
    }

    console.log('Created ad placements for live campaign');

    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getTime() - (3 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const impressions = Math.floor(Math.random() * 1000) + 500;
      const clicks = Math.floor(impressions * (Math.random() * 0.1 + 0.02));
      const spend = Math.random() * 100 + 50;
      const ctr = (clicks / impressions) * 100;

      await db.query(
        `INSERT INTO campaign_performance (campaign_id, performance_date, impressions, clicks, spend, ctr, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [campaign3.rows[0].id, dateStr, impressions, clicks, spend, ctr]
      );
    }

    console.log('Created performance data for live campaign');
    console.log('✅ Advertising seed data created successfully!');
  } catch (error) {
    console.error('Failed to seed advertising data:', error);
    process.exit(1);
  }
}

seedAdvertisingData();
