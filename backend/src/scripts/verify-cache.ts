/**
 * Cache Verification Script
 * Monitors postal_code_cache table to ensure lookups are being saved
 * Run: npx ts-node backend/src/scripts/verify-cache.ts
 */

import db from '../db.js';

interface CacheStats {
  total_records: number;
  fresh_records: number; // < 90 days old
  stale_records: number; // > 90 days old
  manually_corrected: number;
  by_provider: Record<string, number>;
  average_age_days: number;
  cache_hit_estimate: number;
}

async function getCacheStats(): Promise<CacheStats> {
  try {
    // Get basic stats
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(CASE WHEN last_verified_at > NOW() - INTERVAL '90 days' THEN 1 END) as fresh_records,
        COUNT(CASE WHEN last_verified_at <= NOW() - INTERVAL '90 days' THEN 1 END) as stale_records,
        COUNT(CASE WHEN manually_corrected = TRUE THEN 1 END) as manually_corrected,
        ROUND(AVG(EXTRACT(DAY FROM NOW() - last_verified_at)), 1) as average_age_days
      FROM postal_code_cache
    `);

    // Get provider breakdown
    const providerResult = await db.query(`
      SELECT provider, COUNT(*) as count
      FROM postal_code_cache
      GROUP BY provider
      ORDER BY count DESC
    `);

    const stats = statsResult.rows[0];
    const providers: Record<string, number> = {};

    providerResult.rows.forEach((row) => {
      providers[row.provider] = parseInt(row.count, 10);
    });

    // Estimate cache hit rate (if we see lots of lookups of same postal codes)
    const hitRateResult = await db.query(`
      SELECT
        ROUND(100.0 * COUNT(*) FILTER (WHERE lookup_count > 1) / COUNT(*), 1) as cache_hit_rate
      FROM (
        SELECT COUNT(*) as lookup_count
        FROM postal_code_cache
        WHERE manually_corrected = FALSE
        GROUP BY postal_code
      ) subquery
    `);

    const cache_hit_estimate = hitRateResult.rows[0]?.cache_hit_rate || 0;

    return {
      total_records: parseInt(stats.total_records, 10),
      fresh_records: parseInt(stats.fresh_records, 10),
      stale_records: parseInt(stats.stale_records, 10),
      manually_corrected: parseInt(stats.manually_corrected, 10),
      by_provider: providers,
      average_age_days: parseFloat(stats.average_age_days) || 0,
      cache_hit_estimate,
    };
  } catch (err) {
    console.error('Error getting cache stats:', err);
    throw err;
  }
}

async function listRecentCacheEntries(limit: number = 10) {
  try {
    const result = await db.query(`
      SELECT
        postal_code,
        full_address,
        planning_area,
        provider,
        confidence,
        manually_corrected,
        ROUND(EXTRACT(DAY FROM NOW() - last_verified_at), 1) as age_days,
        created_at
      FROM postal_code_cache
      ORDER BY last_verified_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  } catch (err) {
    console.error('Error listing cache entries:', err);
    throw err;
  }
}

async function checkCacheHealth() {
  try {
    const stats = await getCacheStats();

    console.log('\n========================================');
    console.log('📊 POSTAL CODE CACHE HEALTH CHECK');
    console.log('========================================\n');

    console.log('📈 Cache Statistics:');
    console.log(`   Total records: ${stats.total_records}`);
    console.log(`   Fresh (< 90 days): ${stats.fresh_records}`);
    console.log(`   Stale (> 90 days): ${stats.stale_records}`);
    console.log(`   Manually corrected: ${stats.manually_corrected}`);
    console.log(`   Average age: ${stats.average_age_days} days`);
    console.log(`   Estimated hit rate: ${stats.cache_hit_estimate}%`);

    console.log('\n🔌 By Provider:');
    Object.entries(stats.by_provider).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count}`);
    });

    console.log('\n📝 Recent Cache Entries:');
    const recent = await listRecentCacheEntries(5);
    recent.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.postal_code}`);
      console.log(`      Address: ${entry.full_address}`);
      console.log(`      Area: ${entry.planning_area}`);
      console.log(`      Provider: ${entry.provider}, Confidence: ${entry.confidence}`);
      console.log(`      Age: ${entry.age_days} days`);
      if (entry.manually_corrected) {
        console.log(`      ⚠️ MANUALLY CORRECTED`);
      }
      console.log('');
    });

    // Health checks
    console.log('✅ Health Checks:');
    const healthOk =
      stats.total_records > 0 &&
      stats.fresh_records > 0 &&
      stats.stale_records < stats.total_records * 0.1 && // Less than 10% stale
      stats.average_age_days < 45; // Average less than 45 days old

    if (healthOk) {
      console.log('   ✅ Cache is healthy - data being saved correctly');
    } else {
      console.log('   ⚠️ Cache may have issues:');
      if (stats.total_records === 0) {
        console.log('      - No cached records found (check if table exists)');
      }
      if (stats.stale_records > stats.total_records * 0.1) {
        console.log('      - Many stale records (consider running cleanup)');
      }
      if (stats.average_age_days > 45) {
        console.log('      - Cache age is high (consider reducing TTL)');
      }
    }

    console.log('\n========================================\n');

    return stats;
  } catch (err) {
    console.error('\n❌ Cache verification failed:', err);
    throw err;
  }
}

// CLI interface
const command = process.argv[2];

(async () => {
  try {
    if (command === 'health') {
      await checkCacheHealth();
    } else if (command === 'recent') {
      const limit = parseInt(process.argv[3] || '20', 10);
      const entries = await listRecentCacheEntries(limit);
      console.log('\n📝 Recent Cache Entries:\n');
      entries.forEach((entry) => {
        console.log(`${entry.postal_code} → ${entry.planning_area} (${entry.provider})`);
      });
    } else {
      console.log('\n🔍 Postal Code Cache Verification Tool\n');
      console.log('Usage:');
      console.log('  npx ts-node backend/src/scripts/verify-cache.ts health');
      console.log('  npx ts-node backend/src/scripts/verify-cache.ts recent [limit]');
      console.log('\nExamples:');
      console.log('  npx ts-node backend/src/scripts/verify-cache.ts health');
      console.log('  npx ts-node backend/src/scripts/verify-cache.ts recent 20');
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();

export { getCacheStats, checkCacheHealth };
