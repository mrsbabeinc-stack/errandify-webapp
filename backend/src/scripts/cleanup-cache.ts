/**
 * Cache Cleanup Script
 * Removes stale entries (> 90 days old) from postal_code_cache
 * Run: npx ts-node backend/src/scripts/cleanup-cache.ts
 */

import db from '../db.js';

interface CleanupResult {
  deleted_count: number;
  remaining_count: number;
  freed_space_mb: number;
}

async function cleanupStaleCache(): Promise<CleanupResult> {
  try {
    console.log('🧹 Cleaning up stale cache entries...\n');

    // Get size before cleanup
    const sizeBefore = await db.query(`
      SELECT pg_total_relation_size('postal_code_cache') as size_bytes
    `);
    const beforeMB = sizeBefore.rows[0].size_bytes / 1024 / 1024;

    // Count stale records
    const countBefore = await db.query(`
      SELECT COUNT(*) as count
      FROM postal_code_cache
      WHERE last_verified_at <= NOW() - INTERVAL '90 days'
    `);
    const staleCount = parseInt(countBefore.rows[0].count, 10);

    if (staleCount === 0) {
      console.log('✅ No stale entries found - cache is fresh');
      const totalCount = await db.query('SELECT COUNT(*) as count FROM postal_code_cache');
      return {
        deleted_count: 0,
        remaining_count: parseInt(totalCount.rows[0].count, 10),
        freed_space_mb: 0,
      };
    }

    console.log(`Found ${staleCount} stale entries (> 90 days old)`);
    console.log('Deleting...\n');

    // Delete stale records (but keep manually corrected ones forever)
    const deleteResult = await db.query(`
      DELETE FROM postal_code_cache
      WHERE last_verified_at <= NOW() - INTERVAL '90 days'
        AND manually_corrected = FALSE
      RETURNING postal_code
    `);

    const deletedCount = deleteResult.rows.length;
    console.log(`✅ Deleted ${deletedCount} stale entries:`);
    deleteResult.rows.forEach((row, index) => {
      if (index < 10) {
        console.log(`   - ${row.postal_code}`);
      }
    });
    if (deletedCount > 10) {
      console.log(`   ... and ${deletedCount - 10} more`);
    }

    // Get size after cleanup
    const sizeAfter = await db.query(`
      SELECT pg_total_relation_size('postal_code_cache') as size_bytes
    `);
    const afterMB = sizeAfter.rows[0].size_bytes / 1024 / 1024;
    const freedMB = Math.max(0, beforeMB - afterMB);

    // Count remaining records
    const countAfter = await db.query(`
      SELECT COUNT(*) as count
      FROM postal_code_cache
    `);
    const remainingCount = parseInt(countAfter.rows[0].count, 10);

    console.log(`\n📊 Cleanup Results:`);
    console.log(`   Deleted: ${deletedCount} entries`);
    console.log(`   Remaining: ${remainingCount} entries`);
    console.log(`   Space freed: ${freedMB.toFixed(2)} MB`);
    console.log(`   Table size: ${beforeMB.toFixed(2)} MB → ${afterMB.toFixed(2)} MB\n`);

    // Manually corrected entries (kept forever)
    const manualCount = await db.query(`
      SELECT COUNT(*) as count
      FROM postal_code_cache
      WHERE manually_corrected = TRUE
    `);
    console.log(`ℹ️  Manually corrected entries (kept): ${manualCount.rows[0].count}\n`);

    return {
      deleted_count: deletedCount,
      remaining_count: remainingCount,
      freed_space_mb: freedMB,
    };
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    throw err;
  }
}

async function vacuumCache(): Promise<void> {
  try {
    console.log('🗑️ Vacuuming table (reclaiming space)...');
    await db.query('VACUUM ANALYZE postal_code_cache');
    console.log('✅ Vacuum complete\n');
  } catch (err) {
    console.error('⚠️ Vacuum failed (non-critical):', err);
  }
}

async function getDetailedCacheInfo() {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN last_verified_at > NOW() - INTERVAL '90 days' THEN 1 END) as fresh,
        COUNT(CASE WHEN last_verified_at <= NOW() - INTERVAL '90 days' THEN 1 END) as stale,
        COUNT(CASE WHEN manually_corrected = TRUE THEN 1 END) as manually_corrected,
        ROUND(AVG(EXTRACT(DAY FROM NOW() - last_verified_at)), 1) as avg_age_days,
        MAX(last_verified_at) as newest,
        MIN(last_verified_at) as oldest
      FROM postal_code_cache
    `);

    const row = result.rows[0];
    console.log('📋 Cache Details:');
    console.log(`   Total entries: ${row.total}`);
    console.log(`   Fresh (< 90 days): ${row.fresh}`);
    console.log(`   Stale (> 90 days): ${row.stale}`);
    console.log(`   Manually corrected: ${row.manually_corrected}`);
    console.log(`   Average age: ${row.avg_age_days} days`);
    console.log(`   Newest entry: ${row.newest}`);
    console.log(`   Oldest entry: ${row.oldest}\n`);
  } catch (err) {
    console.error('Error getting cache info:', err);
  }
}

// CLI interface
const command = process.argv[2];

(async () => {
  try {
    if (command === 'cleanup') {
      await getDetailedCacheInfo();
      const result = await cleanupStaleCache();
      await vacuumCache();

      console.log('✨ Cache cleanup complete!');
      process.exit(0);
    } else if (command === 'info') {
      await getDetailedCacheInfo();
      process.exit(0);
    } else {
      console.log('\n🧹 Postal Code Cache Cleanup Tool\n');
      console.log('Usage:');
      console.log('  npx ts-node backend/src/scripts/cleanup-cache.ts info');
      console.log('  npx ts-node backend/src/scripts/cleanup-cache.ts cleanup\n');
      console.log('Examples:');
      console.log('  # View cache info without deleting');
      console.log('  npx ts-node backend/src/scripts/cleanup-cache.ts info\n');
      console.log('  # Delete entries older than 90 days');
      console.log('  npx ts-node backend/src/scripts/cleanup-cache.ts cleanup\n');
      console.log('Note:');
      console.log('  - Manually corrected entries are never deleted');
      console.log('  - Cleanup is safe and can run anytime');
      console.log('  - Run monthly for optimal performance\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();

export { cleanupStaleCache, vacuumCache };
