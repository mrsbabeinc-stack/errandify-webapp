export async function up(pool) {
    const client = await pool.connect();
    try {
        // Create leave_requests table
        await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        staff_id VARCHAR(10) NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        staff_name VARCHAR(255),
        leave_type VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        period VARCHAR(50) DEFAULT 'full-day',
        reason TEXT,
        notes TEXT,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurring_pattern JSONB,
        days_count DECIMAL(5, 1),
        status VARCHAR(50) DEFAULT 'pending',
        approved_by VARCHAR(255),
        approval_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_id ON leave_requests(staff_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type ON leave_requests(leave_type);
    `);
        console.log('✅ Migration 009: leave_requests table created');
    }
    catch (error) {
        console.error('❌ Migration 009 failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
export async function down(pool) {
    const client = await pool.connect();
    try {
        await client.query('DROP TABLE IF EXISTS leave_requests CASCADE');
        console.log('✅ Migration 009 rolled back');
    }
    catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
