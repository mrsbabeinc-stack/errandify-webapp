import db from '../db.js';
export const campaignModel = {
    async create(companyId, data) {
        const startDate = new Date(data.starts_at);
        const endDate = new Date(data.ends_at);
        const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const result = await db.query(`INSERT INTO campaigns (company_id, title, description, image_url, budget, spent, status, starts_at, ends_at, duration_days, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING *`, [companyId, data.title, data.description, data.image_url, data.budget, 0, 'draft', data.starts_at, data.ends_at, durationDays, data.created_by]);
        return result.rows[0];
    },
    async getById(id) {
        const result = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
        return result.rows[0] || null;
    },
    async getByCompanyId(companyId, filters) {
        let query = 'SELECT * FROM campaigns WHERE company_id = $1';
        const params = [companyId];
        if (filters?.status) {
            query += ` AND status = $${params.length + 1}`;
            params.push(filters.status);
        }
        query += ' ORDER BY created_at DESC';
        const result = await db.query(query, params);
        return result.rows;
    },
    async update(id, data) {
        const fields = [];
        const params = [];
        let paramCount = 1;
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'created_at') {
                fields.push(`${key} = $${paramCount}`);
                params.push(value);
                paramCount++;
            }
        });
        fields.push('updated_at = NOW()');
        params.push(id);
        const result = await db.query(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`, params);
        return result.rows[0];
    },
    async delete(id) {
        await db.query('DELETE FROM campaigns WHERE id = $1', [id]);
    },
    async getPendingForApproval() {
        const result = await db.query(`SELECT c.*, comp.name as company_name FROM campaigns c LEFT JOIN companies comp ON c.company_id = comp.id WHERE c.status = 'submitted' ORDER BY c.submitted_at ASC`, []);
        return result.rows;
    },
    async getByStatus(status) {
        const result = await db.query('SELECT * FROM campaigns WHERE status = $1 ORDER BY created_at DESC', [status]);
        return result.rows;
    },
    async getActiveCampaigns() {
        const result = await db.query(`SELECT * FROM campaigns WHERE status = 'live' AND starts_at <= NOW() AND ends_at >= NOW() ORDER BY created_at DESC`, []);
        return result.rows;
    },
};
export const adPlacementModel = {
    async create(campaignId, placementType) {
        const result = await db.query(`INSERT INTO ad_placements (campaign_id, placement_type, impressions, clicks, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`, [campaignId, placementType, 0, 0]);
        return result.rows[0];
    },
    async getByCampaignId(campaignId) {
        const result = await db.query('SELECT * FROM ad_placements WHERE campaign_id = $1 ORDER BY created_at ASC', [campaignId]);
        return result.rows;
    },
    async updateMetrics(id, impressions, clicks) {
        const result = await db.query(`UPDATE ad_placements SET impressions = impressions + $1, clicks = clicks + $2, updated_at = NOW() WHERE id = $3 RETURNING *`, [impressions, clicks, id]);
        return result.rows[0];
    },
};
export const performanceModel = {
    async upsert(campaignId, date, impressions, clicks, spend) {
        const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0;
        const result = await db.query(`INSERT INTO campaign_performance (campaign_id, performance_date, impressions, clicks, spend, ctr, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (campaign_id, performance_date) DO UPDATE SET impressions = $3, clicks = $4, spend = $5, ctr = $6 RETURNING *`, [campaignId, date, impressions, clicks, spend, ctr]);
        return result.rows[0];
    },
    async getByCampaignId(campaignId, startDate, endDate) {
        let query = 'SELECT * FROM campaign_performance WHERE campaign_id = $1';
        const params = [campaignId];
        if (startDate) {
            query += ` AND performance_date >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND performance_date <= $${params.length + 1}`;
            params.push(endDate);
        }
        query += ' ORDER BY performance_date ASC';
        const result = await db.query(query, params);
        return result.rows;
    },
};
export const scheduleModel = {
    async create(campaignId, scheduledDate, action) {
        const result = await db.query(`INSERT INTO ad_schedules (campaign_id, scheduled_date, action, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *`, [campaignId, scheduledDate, action]);
        return result.rows[0];
    },
    async getPending() {
        const result = await db.query(`SELECT * FROM ad_schedules WHERE executed_at IS NULL AND scheduled_date <= NOW() ORDER BY scheduled_date ASC`, []);
        return result.rows;
    },
    async markExecuted(id) {
        const result = await db.query(`UPDATE ad_schedules SET executed_at = NOW() WHERE id = $1 RETURNING *`, [id]);
        return result.rows[0];
    },
    async delete(id) {
        await db.query('DELETE FROM ad_schedules WHERE id = $1', [id]);
    },
};
