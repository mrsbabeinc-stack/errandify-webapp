import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/companies/user/my-company - Get current user's company
router.get('/companies/user/my-company', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Return demo company data for now
    const demoCompany = {
      id: 1,
      name: 'Rumah Emas Demo Company',
      uen: 'UEN202401001',
      subscription_tier: 'gold',
      wallet_balance: 15240,
      ep_balance: 3450,
      logo_url: '',
      rating: 4.8,
      email: 'contact@rumahemas.com',
      phone: '+6581234567',
      address: '123 Business Street, Singapore',
      billing_type: 'annual',
      renewal_date: '2027-08-01'
    };

    res.json({
      success: true,
      data: demoCompany
    });
  } catch (error: any) {
    console.error('Error fetching user company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
      error: error.message
    });
  }
});

// POST /api/companies - Create new company
router.post('/companies', authMiddleware, async (req: Request, res: Response) => {
  const client = await db.connect();

  try {
    const userId = (req as any).userId;
    const { name, uen, email, phone, address, postal_code, area, description } = req.body;

    if (!name || !uen) {
      return res.status(400).json({
        success: false,
        message: 'Company name and UEN are required'
      });
    }

    await client.query('BEGIN');

    // Create company
    const companyRes = await client.query(
      `INSERT INTO companies (uen, name, description, owner_id, email, phone, address, postal_code, area, subscription_tier, company_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [uen, name, description || '', userId, email, phone, address, postal_code, area, 'silver', 'active']
    );
    const company = companyRes.rows[0];

    // Create wallet
    await client.query(
      `INSERT INTO company_wallets (company_id, balance, total_earned, total_withdrawn)
       VALUES ($1, $2, $3, $4)`,
      [company.id, 0, 0, 0]
    );

    // Create subscription
    await client.query(
      `INSERT INTO company_subscriptions (company_id, tier, monthly_fee, start_date, status)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [company.id, 'silver', 99.00, 'active']
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// GET /api/companies/:companyId - Get company details
router.get('/companies/:companyId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const result = await db.query(
      `SELECT c.*, cw.balance as wallet_balance, cs.tier as subscription_tier
       FROM companies c
       LEFT JOIN company_wallets cw ON c.id = cw.company_id
       LEFT JOIN company_subscriptions cs ON c.id = cs.company_id
       WHERE c.id = $1`,
      [companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
      error: error.message
    });
  }
});

// PUT /api/companies/:companyId - Update company
router.put('/companies/:companyId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { name, email, phone, address, description } = req.body;

    const result = await db.query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           description = COALESCE($5, description),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, email, phone, address, description, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
});

// POST /api/companies/:companyId/employees - Tag employee
router.post('/companies/:companyId/employees', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { userId, role = 'employee', skills } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await db.query(
      `INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (company_id, user_id) DO UPDATE SET role = $3, skills = $4
       RETURNING e.*, u.name as user_name, u.email as user_email`,
      [companyId, userId, role, skills || '', 'active']
    );

    res.status(201).json({
      success: true,
      message: 'Employee tagged to company',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error tagging employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to tag employee',
      error: error.message
    });
  }
});

// GET /api/companies/:companyId/employees - List employees
router.get('/companies/:companyId/employees', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { status } = req.query;

    let query = `SELECT e.*, u.name as user_name, u.email as user_email
                 FROM employees e
                 JOIN users u ON e.user_id = u.id
                 WHERE e.company_id = $1`;
    const params: any[] = [companyId];

    if (status) {
      query += ` AND e.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY e.hire_date DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: error.message
    });
  }
});

// DELETE /api/companies/:companyId/employees/:userId - Remove employee
router.delete('/companies/:companyId/employees/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId, userId } = req.params;

    await db.query(
      `UPDATE employees
       SET status = $1, updated_at = NOW()
       WHERE company_id = $2 AND user_id = $3`,
      ['resigned', companyId, userId]
    );

    res.json({
      success: true,
      message: 'Employee removed from company'
    });
  } catch (error: any) {
    console.error('Error removing employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove employee',
      error: error.message
    });
  }
});

// POST /api/companies/:companyId/employees/bulk-import - Bulk import employees
router.post('/companies/:companyId/employees/bulk-import', authMiddleware, async (req: Request, res: Response) => {
  const client = await db.connect();

  try {
    const { companyId } = req.params;
    const { employees } = req.body;

    if (!Array.isArray(employees)) {
      return res.status(400).json({
        success: false,
        message: 'Employees must be an array'
      });
    }

    await client.query('BEGIN');

    let successful = 0;
    let failed = 0;

    for (const emp of employees) {
      try {
        // Create or get user
        const userRes = await client.query(
          `INSERT INTO users (name, email, phone, user_type, email_verified, phone_verified)
           VALUES ($1, $2, $3, $4, true, true)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [emp.name, emp.email, emp.phone, 'user']
        );

        const userId = userRes.rows[0].id;

        // Tag to company
        await client.query(
          `INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (company_id, user_id) DO UPDATE SET role = $3`,
          [companyId, userId, emp.role || 'employee', emp.skills || '', 'active']
        );

        successful++;
      } catch (err) {
        failed++;
        console.error('Failed to import employee:', emp, err);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Bulk import completed',
      data: { successful, failed }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error bulk importing employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk import employees',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// POST /api/companies/:companyId/leaves - Request leave
router.post('/companies/:companyId/leaves', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const userId = (req as any).userId;
    const { start_date, end_date, leave_type, reason } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const result = await db.query(
      `INSERT INTO employee_leaves (company_id, user_id, start_date, end_date, leave_type, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [companyId, userId, start_date, end_date, leave_type || 'paid', reason || '', 'pending']
    );

    res.status(201).json({
      success: true,
      message: 'Leave request submitted',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave request',
      error: error.message
    });
  }
});

// GET /api/companies/:companyId/leaves - Get leave requests
router.get('/companies/:companyId/leaves', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { status } = req.query;

    let query = `SELECT el.*, u.name as user_name, u.email as user_email
                 FROM employee_leaves el
                 JOIN users u ON el.user_id = u.id
                 WHERE el.company_id = $1`;
    const params: any[] = [companyId];

    if (status) {
      query += ` AND el.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY el.start_date DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
});

// PUT /api/companies/leaves/:leaveId/approve - Approve/deny leave
router.put('/companies/leaves/:leaveId/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { leaveId } = req.params;
    const { status, notes } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or denied'
      });
    }

    const result = await db.query(
      `UPDATE employee_leaves
       SET status = $1, approval_notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, notes || '', leaveId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    res.json({
      success: true,
      message: `Leave request ${status}`,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave request',
      error: error.message
    });
  }
});

// POST /api/companies/:companyId/suggest-categories - AI suggest errand categories
router.post('/companies/:companyId/suggest-categories', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { industry, bio } = req.body;

    // Default category suggestions based on industry
    const categoryMap: { [key: string]: string[] } = {
      'cleaning': ['Cleaning', 'Facility Management', 'Disinfection'],
      'delivery': ['Delivery', 'Logistics', 'Warehousing'],
      'security': ['Security', 'Event Management', 'Surveillance'],
      'maintenance': ['Maintenance', 'Repairs', 'Installation'],
      'catering': ['Catering', 'Food Delivery', 'Event Catering'],
      'transport': ['Transportation', 'Moving', 'Logistics'],
      'beauty': ['Beauty Services', 'Salon', 'Spa Services'],
      'fitness': ['Fitness', 'Personal Training', 'Wellness'],
      'tech': ['Technical Support', 'IT Services', 'Software'],
      'education': ['Tutoring', 'Training', 'Workshops'],
    };

    let suggestions: string[] = [];

    // Find matching categories based on industry
    for (const [key, categories] of Object.entries(categoryMap)) {
      if (industry?.toLowerCase().includes(key) || bio?.toLowerCase().includes(key)) {
        suggestions = [...suggestions, ...categories];
      }
    }

    // Default if no match found
    if (suggestions.length === 0) {
      suggestions = ['General Services', 'Consultation', 'Support'];
    }

    // Remove duplicates
    suggestions = [...new Set(suggestions)];

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 5), // Return top 5
      message: 'AI-suggested errand categories based on your business'
    });
  } catch (error: any) {
    console.error('Error suggesting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suggest categories',
      error: error.message
    });
  }
});

// GET /api/companies/:companyId/reviews - Get company reviews
router.get('/companies/:companyId/reviews', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    // Get all reviews for the company
    const result = await db.query(
      `SELECT cr.id, cr.rating, cr.comment, u.display_name as rater_name, cr.created_at
       FROM company_reviews cr
       JOIN users u ON cr.rater_id = u.id
       WHERE cr.company_id = $1
       ORDER BY cr.created_at DESC
       LIMIT 20`,
      [companyId]
    );

    // Calculate average rating
    const avgResult = await db.query(
      `SELECT AVG(rating) as average_rating FROM company_reviews WHERE company_id = $1`,
      [companyId]
    );

    const averageRating = parseFloat(avgResult.rows[0]?.average_rating || 0);

    res.json({
      success: true,
      data: result.rows,
      average_rating: averageRating,
      total_reviews: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
});

// POST /api/companies/:companyId/reviews - Add company review
router.post('/companies/:companyId/reviews', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { rating, comment, taskId } = req.body;
    const userId = (req as any).userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const result = await db.query(
      `INSERT INTO company_reviews (company_id, rater_id, rating, comment, task_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [companyId, userId, rating, comment || '', taskId || null]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message
    });
  }
});

// POST /api/companies/:companyId/logo - Upload company logo
router.post('/companies/:companyId/logo', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    // In production, handle file upload here (e.g., to S3, Cloudinary, etc.)
    // For now, accept logo URL from request body or generate a placeholder
    const { logoUrl } = req.body;

    if (!logoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Logo URL is required'
      });
    }

    const result = await db.query(
      `UPDATE companies
       SET logo_url = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [logoUrl, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: error.message
    });
  }
});

export default router;
