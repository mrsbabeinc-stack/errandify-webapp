import db from '../db.js';

export interface Campaign {
  id: number;
  company_id: number;
  title: string;
  description?: string;
  image_url?: string;
  budget: number;
  spent: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'live' | 'expired' | 'paused';
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  starts_at: string;
  ends_at: string;
  duration_days: number;
  admin_notes?: string;
  rejection_reason?: string;
  created_by?: number;
  stripe_charge_id?: string;
  updated_at: string;
  /** Where the action button sends people — see migration 080. */
  target_url?: string;
  target_url_type?: 'website' | 'instagram' | 'facebook' | 'tiktok';
  /** Which slot was bought. Matches the wizard's vocabulary. */
  placement_type?: 'hero-banner' | 'in-feed-ads';
  cta_text?: string;
}

export interface AdPlacement {
  id: number;
  campaign_id: number;
  placement_type: 'homepage_banner' | 'browse_sidebar' | 'email_newsletter' | 'company_profile';
  impressions: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignPerformance {
  id: number;
  campaign_id: number;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  created_at: string;
}

export interface AdSchedule {
  id: number;
  campaign_id: number;
  scheduled_date: string;
  action: 'start' | 'end';
  executed_at?: string;
  created_at: string;
}

export const campaignModel = {
  async create(companyId: number, data: {
    title: string;
    description?: string;
    image_url?: string;
    budget: number;
    starts_at: string;
    ends_at: string;
    created_by: number;
    // What the buyer picked in the wizard. Both were previously discarded, so
    // a paid banner had no destination and no slot; see migration 080.
    target_url?: string;
    target_url_type?: string;
    placement_type?: string;
    cta_text?: string;
  }): Promise<Campaign> {
    const startDate = new Date(data.starts_at);
    const endDate = new Date(data.ends_at);
    // At least one day: a campaign that starts and ends the same day would
    // otherwise divide by zero in the share-of-voice rotation.
    const durationDays = Math.max(1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    const PLACEMENTS = ['hero-banner', 'in-feed-ads'];
    const placement = PLACEMENTS.includes(data.placement_type || '')
      ? data.placement_type
      : 'hero-banner';

    const result = await db.query(
      `INSERT INTO campaigns (company_id, title, description, image_url, budget, spent, status, starts_at, ends_at, duration_days, created_by, target_url, target_url_type, placement_type, cta_text, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()) RETURNING *`,
      [companyId, data.title, data.description, data.image_url, data.budget, 0, 'draft', data.starts_at, data.ends_at, durationDays, data.created_by,
       data.target_url || null, data.target_url_type || null, placement, data.cta_text || 'Learn More']
    );
    return result.rows[0];
  },

  async getById(id: number): Promise<Campaign | null> {
    const result = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async getByCompanyId(companyId: number, filters?: { status?: string }): Promise<Campaign[]> {
    let query = 'SELECT * FROM campaigns WHERE company_id = $1';
    const params: any[] = [companyId];
    if (filters?.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  },

  async update(id: number, data: Partial<Campaign>): Promise<Campaign> {
    const fields: string[] = [];
    const params: any[] = [];
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

  async delete(id: number): Promise<void> {
    await db.query('DELETE FROM campaigns WHERE id = $1', [id]);
  },

  async getPendingForApproval(): Promise<Campaign[]> {
    // companies has no 'name' column — the company's name lives in
    // company_name — so this join raised "column comp.name does not exist" and
    // the approval queue 500'd. It went unnoticed because the router's broken
    // guard returned 403 before the query ever ran.
    const result = await db.query(`SELECT c.*, comp.company_name FROM campaigns c LEFT JOIN companies comp ON c.company_id = comp.id WHERE c.status = 'submitted' ORDER BY c.submitted_at ASC`, []);
    return result.rows;
  },

  async getByStatus(status: string): Promise<Campaign[]> {
    const result = await db.query('SELECT * FROM campaigns WHERE status = $1 ORDER BY created_at DESC', [status]);
    return result.rows;
  },

  async getActiveCampaigns(): Promise<Campaign[]> {
    const result = await db.query(`SELECT * FROM campaigns WHERE status = 'live' AND starts_at <= NOW() AND ends_at >= NOW() ORDER BY created_at DESC`, []);
    return result.rows;
  },
};

export const adPlacementModel = {
  async create(campaignId: number, placementType: string): Promise<AdPlacement> {
    const result = await db.query(`INSERT INTO ad_placements (campaign_id, placement_type, impressions, clicks, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`, [campaignId, placementType, 0, 0]);
    return result.rows[0];
  },

  async getByCampaignId(campaignId: number): Promise<AdPlacement[]> {
    const result = await db.query('SELECT * FROM ad_placements WHERE campaign_id = $1 ORDER BY created_at ASC', [campaignId]);
    return result.rows;
  },

  async updateMetrics(id: number, impressions: number, clicks: number): Promise<AdPlacement> {
    const result = await db.query(`UPDATE ad_placements SET impressions = impressions + $1, clicks = clicks + $2, updated_at = NOW() WHERE id = $3 RETURNING *`, [impressions, clicks, id]);
    return result.rows[0];
  },
};

export const performanceModel = {
  async upsert(campaignId: number, date: string, impressions: number, clicks: number, spend: number): Promise<CampaignPerformance> {
    const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0;
    const result = await db.query(`INSERT INTO campaign_performance (campaign_id, performance_date, impressions, clicks, spend, ctr, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (campaign_id, performance_date) DO UPDATE SET impressions = $3, clicks = $4, spend = $5, ctr = $6 RETURNING *`, [campaignId, date, impressions, clicks, spend, ctr]);
    return result.rows[0];
  },

  async getByCampaignId(campaignId: number, startDate?: string, endDate?: string): Promise<CampaignPerformance[]> {
    let query = 'SELECT * FROM campaign_performance WHERE campaign_id = $1';
    const params: any[] = [campaignId];
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
  async create(campaignId: number, scheduledDate: string, action: 'start' | 'end'): Promise<AdSchedule> {
    const result = await db.query(`INSERT INTO ad_schedules (campaign_id, scheduled_date, action, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *`, [campaignId, scheduledDate, action]);
    return result.rows[0];
  },

  async getPending(): Promise<AdSchedule[]> {
    const result = await db.query(`SELECT * FROM ad_schedules WHERE executed_at IS NULL AND scheduled_date <= NOW() ORDER BY scheduled_date ASC`, []);
    return result.rows;
  },

  async markExecuted(id: number): Promise<AdSchedule> {
    const result = await db.query(`UPDATE ad_schedules SET executed_at = NOW() WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
  },

  async delete(id: number): Promise<void> {
    await db.query('DELETE FROM ad_schedules WHERE id = $1', [id]);
  },
};
