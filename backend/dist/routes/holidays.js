import express from 'express';
import db from '../db.js';
const router = express.Router();
// Get all holidays
router.get('/holidays', async (req, res) => {
    try {
        const { year, type } = req.query;
        let query = 'SELECT * FROM holidays WHERE 1=1';
        const params = [];
        if (year) {
            query += ` AND EXTRACT(YEAR FROM date) = $${params.length + 1}`;
            params.push(year);
        }
        if (type && type !== 'all') {
            query += ` AND holiday_type = $${params.length + 1}`;
            params.push(type);
        }
        query += ' ORDER BY date ASC';
        const result = await db.query(query, params);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('[Holidays] Get holidays error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch holidays' });
    }
});
// Get holiday by ID
router.get('/holidays/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM holidays WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Holiday not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Holidays] Get holiday error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch holiday' });
    }
});
// Create holiday
router.post('/holidays', async (req, res) => {
    try {
        const { name, date, holiday_type, emoji, description, apply_to_staff } = req.body;
        if (!name || !date || !holiday_type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, date, holiday_type'
            });
        }
        const result = await db.query(`INSERT INTO holidays (name, date, holiday_type, emoji, description, apply_to_staff, created_at, last_modified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [
            name, date, holiday_type, emoji || '🎉', description || '',
            apply_to_staff || 'all', new Date().toISOString(), new Date().toISOString()
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Holidays] Create holiday error:', error);
        res.status(500).json({ success: false, error: 'Failed to create holiday' });
    }
});
// Update holiday
router.put('/holidays/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, date, holiday_type, emoji, description, apply_to_staff } = req.body;
        const result = await db.query(`UPDATE holidays SET
        name = COALESCE($1, name),
        date = COALESCE($2, date),
        holiday_type = COALESCE($3, holiday_type),
        emoji = COALESCE($4, emoji),
        description = COALESCE($5, description),
        apply_to_staff = COALESCE($6, apply_to_staff),
        last_modified = $7
       WHERE id = $8
       RETURNING *`, [name, date, holiday_type, emoji, description, apply_to_staff, new Date().toISOString(), id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Holiday not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Holidays] Update holiday error:', error);
        res.status(500).json({ success: false, error: 'Failed to update holiday' });
    }
});
// Delete holiday
router.delete('/holidays/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM holidays WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Holiday not found' });
        }
        res.json({ success: true, message: 'Holiday deleted' });
    }
    catch (error) {
        console.error('[Holidays] Delete holiday error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete holiday' });
    }
});
// Get holiday stats
router.get('/holidays/stats/summary', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN holiday_type = 'Public Holiday' THEN 1 ELSE 0 END) as public_holidays,
        SUM(CASE WHEN holiday_type = 'Company Holiday' THEN 1 ELSE 0 END) as company_holidays,
        SUM(CASE WHEN holiday_type = 'Special Event' THEN 1 ELSE 0 END) as special_events
      FROM holidays
    `);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('[Holidays] Get stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});
export default router;
