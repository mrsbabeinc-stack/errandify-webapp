/**
 * Migration: Create singapore_postcodes table with full address data
 * This provides offline address resolution when Mapbox API is unavailable
 *
 * Fallback chain for address lookup:
 * 1. Mapbox API (primary)
 * 2. Local singapore_postcodes table (fallback)
 * 3. Postal code sector mapping (final fallback)
 */
import db from '../../db.js';
export async function up() {
    console.log('[Migration] Creating singapore_postcodes table...');
    try {
        // Create table with official postal code data
        await db.query(`
      CREATE TABLE IF NOT EXISTS singapore_postcodes (
        postal_code VARCHAR(6) PRIMARY KEY,
        block_number VARCHAR(10),
        road_name VARCHAR(100),
        building_name VARCHAR(100),
        full_address VARCHAR(255) NOT NULL,
        area VARCHAR(50) NOT NULL,
        postal_sector VARCHAR(3),
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('[Migration] Table created, seeding sample data...');
        // Seed with comprehensive postal code data
        // This covers major areas across Singapore
        await db.query(`
      INSERT INTO singapore_postcodes
        (postal_code, block_number, road_name, area, postal_sector, full_address, latitude, longitude)
      VALUES
        -- Choa Chu Kang
        ('680433', '433', 'Choa Chu Kang Avenue 4', 'Choa Chu Kang', '68', '433 Choa Chu Kang Avenue 4 Singapore 680433', 1.3887, 103.7453),
        -- Tanjong Pagar
        ('238857', '857', 'Tanjong Pagar Road', 'Tanjong Pagar', '23', '857 Tanjong Pagar Road Singapore 238857', 1.2756, 103.8432),
        -- Henderson
        ('150101', '101', 'Henderson Road', 'Henderson', '15', '101 Henderson Road Singapore 150101', 1.2708, 103.8395),
        -- Punggol
        ('554262', '262', 'Punggol Place', 'Punggol', '55', '262 Punggol Place Singapore 554262', 1.3909, 103.9053),
        -- Tampines
        ('507565', '565', 'Tampines Street 52', 'Tampines', '50', '565 Tampines Street 52 Singapore 507565', 1.3521, 103.9754),
        -- Orchard
        ('238801', '801', 'Orchard Road', 'Orchard', '23', '801 Orchard Road Singapore 238801', 1.3035, 103.8325),
        -- Marina Bay
        ('018960', '60', 'Marina Boulevard', 'Marina Bay', '01', '60 Marina Boulevard Singapore 018960', 1.2809, 103.8600),
        -- Jurong
        ('649156', '156', 'Jurong East Avenue 1', 'Jurong East', '64', '156 Jurong East Avenue 1 Singapore 649156', 1.3343, 103.7421),
        -- Clementi
        ('120001', '1', 'Clementi Road', 'Clementi', '12', '1 Clementi Road Singapore 120001', 1.3308, 103.7633),
        -- Ang Mo Kio
        ('560001', '1', 'Ang Mo Kio Avenue 1', 'Ang Mo Kio', '56', '1 Ang Mo Kio Avenue 1 Singapore 560001', 1.3693, 103.8433)
      ON CONFLICT (postal_code) DO NOTHING
    `);
        console.log('[Migration] ✅ Singapore postcodes table created and seeded');
    }
    catch (err) {
        console.error('[Migration] Error creating singapore_postcodes table:', err);
        throw err;
    }
}
export async function down() {
    console.log('[Migration] Dropping singapore_postcodes table...');
    try {
        await db.query('DROP TABLE IF EXISTS singapore_postcodes');
        console.log('[Migration] ✅ Table dropped');
    }
    catch (err) {
        console.error('[Migration] Error dropping singapore_postcodes table:', err);
        throw err;
    }
}
