import db from '../index.js';
export async function migrate() {
    try {
        // Check if column already exists
        const columnCheck = await db.query(`SELECT column_name FROM information_schema.columns
       WHERE table_name = 'errands' AND column_name = 'accepted_bid_id'`);
        if (columnCheck.rows.length > 0) {
            console.log('Column accepted_bid_id already exists');
            return;
        }
        // Add the accepted_bid_id column
        await db.query(`ALTER TABLE errands ADD COLUMN accepted_bid_id INTEGER REFERENCES bids(id) ON DELETE SET NULL`);
        console.log('✓ Added accepted_bid_id column to errands table');
    }
    catch (error) {
        console.error('Migration 004 failed:', error);
        throw error;
    }
}
