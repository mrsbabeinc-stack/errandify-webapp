import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/errandify',
});

async function createTable() {
  try {
    console.log('[Migration] Creating singapore_postcodes table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS singapore_postcodes (
        postal_code VARCHAR(6) PRIMARY KEY,
        block_number VARCHAR(10),
        road_name VARCHAR(100),
        building_name VARCHAR(100),
        full_address VARCHAR(255),
        area VARCHAR(50),
        postal_sector VARCHAR(3),
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[Migration] ✅ Table created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_postal_code ON singapore_postcodes(postal_code);
    `);

    console.log('[Migration] ✅ Index created');

    // Load sample data for common postal codes
    const sampleData = [
      { postal_code: '150101', block_number: '101', road_name: 'Henderson Road', area: 'Henderson', postal_sector: '15', full_address: '101 Henderson Road Singapore 150101', latitude: 1.2708, longitude: 103.8395 },
      { postal_code: '680433', block_number: '433', road_name: 'Choa Chu Kang Avenue 4', area: 'Choa Chu Kang', postal_sector: '68', full_address: '433 Choa Chu Kang Avenue 4 Singapore 680433', latitude: 1.3887, longitude: 103.7453 },
      { postal_code: '554262', block_number: '262', road_name: 'Punggol Place', area: 'Punggol', postal_sector: '55', full_address: '262 Punggol Place Singapore 554262', latitude: 1.3909, longitude: 103.9053 },
      { postal_code: '507565', block_number: '565', road_name: 'Tampines Street 52', area: 'Tampines', postal_sector: '50', full_address: '565 Tampines Street 52 Singapore 507565', latitude: 1.3521, longitude: 103.9754 },
      { postal_code: '238857', block_number: '857', road_name: 'Tanjong Pagar Road', area: 'Tanjong Pagar', postal_sector: '23', full_address: '857 Tanjong Pagar Road Singapore 238857', latitude: 1.2756, longitude: 103.8432 },
    ];

    for (const data of sampleData) {
      await pool.query(
        `INSERT INTO singapore_postcodes (postal_code, block_number, road_name, area, postal_sector, full_address, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (postal_code) DO NOTHING`,
        [data.postal_code, data.block_number, data.road_name, data.area, data.postal_sector, data.full_address, data.latitude, data.longitude]
      );
    }

    console.log('[Migration] ✅ Sample data loaded');

    const result = await pool.query('SELECT COUNT(*) FROM singapore_postcodes');
    console.log(`[Migration] Total records: ${result.rows[0].count}`);

    await pool.end();
    console.log('[Migration] ✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] ❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

createTable();
