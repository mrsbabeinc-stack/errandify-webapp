import { Router, Request, Response } from 'express';
import db from '../db.js';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import { getCategoryCode } from '../utils/categoryCodes.js';
import { requireCompanyRole, resolveMyCompany, resolveCompanyRole } from '../utils/companyRole.js';

const router = Router();

// GET /api/companies/user/my-company - Get current user's company
router.get('/companies/user/my-company', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);

    // Resolve the company this user actually belongs to — as owner, manager, or
    // active staff. This previously returned company 3 for EVERY user with
    // fabricated wallet/EP/contact values, so the dashboard showed one demo
    // company to everyone and disagreed with the workspace access checks.
    // Role comes from the shared resolver (company_staff.role is authoritative for
    // staff) rather than a CASE that labelled everyone non-owner as "staff".
    const membership = await resolveMyCompany(userId);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'You are not linked to a company yet',
        data: null,
      });
    }

    const result = await db.query(
      `SELECT c.id, c.company_name AS name, c.uen,
              c.subscription_status AS subscription_tier,
              c.logo_url, c.email, c.phone, c.address, c.postal_code, c.website,
              c.average_rating AS rating, c.errandify_points AS ep_balance,
              c.certified, c.total_projects_completed
         FROM companies c
        WHERE c.id = $1`,
      [membership.companyId]
    );

    if (result.rows.length === 0) {
      // No company for this user — the UI should offer registration rather than
      // silently showing someone else's company.
      return res.status(404).json({
        success: false,
        message: 'You are not linked to a company yet',
        data: null,
      });
    }

    const c = result.rows[0];

    // Wallet balance comes from the wallets table when present
    let walletBalance = 0;
    try {
      const w = await db.query(
        'SELECT balance FROM company_wallets WHERE company_id = $1 LIMIT 1',
        [c.id]
      );
      walletBalance = Number(w.rows[0]?.balance ?? 0);
    } catch {
      walletBalance = 0;
    }

    res.json({
      success: true,
      data: {
        id: c.id,
        name: c.name,
        company_name: c.name,
        uen: c.uen,
        subscription_tier: c.subscription_tier,
        // Role drives which screens the company module shows
        my_role: membership.role,
        can_act_for_company: membership.canActForCompany,
        on_leave: membership.onLeave,
        wallet_balance: walletBalance,
        ep_balance: Number(c.ep_balance ?? 0),
        logo_url: c.logo_url || '',
        rating: Number(c.rating ?? 0),
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        postal_code: c.postal_code || '',
        website: c.website || '',
        certified: c.certified ?? false,
        total_projects_completed: Number(c.total_projects_completed ?? 0),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
      error: error.message,
    });
  }
});

// POST /api/companies - Create new company
router.post('/companies', authMiddleware, async (req: Request, res: Response) => {
  // db exposes getClient(), not connect() — the old call threw and took the
  // whole server down, so company registration never worked.
  const client = await db.getClient();

  try {
    const userId = (req as any).userId;
    const {
      name, uen, email, phone, address, postal_code, description, website,
      business_type, industry,
      // Named human we can actually reach — the company line often goes unanswered
      contact_person_name, contact_person_role, contact_person_email, contact_person_phone,
      // What work they do and where — drives marketplace matching
      service_categories, service_areas, staff_count,
      // Singapore business facts
      incorporation_date, gst_registered, gst_number, billing_email,
      // ACRA Business Profile — the document we verify against. There is no ACRA
      // API lookup: what the company uploads IS the source of truth, and an
      // Errandify admin matches a director on it to the SingPass-verified user.
      acraDocument, acraDocumentName, acraDocumentMime, acraProfileDate,
    } = req.body;

    if (!name || !uen) {
      return res.status(400).json({ success: false, message: 'Company name and UEN are required' });
    }
    if (!contact_person_name || !contact_person_email || !contact_person_phone) {
      return res.status(400).json({
        success: false,
        message: 'Contact person name, email and phone are required so we can reach you about verification',
      });
    }
    if (!acraDocument || typeof acraDocument !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Attach your ACRA Business Profile — we verify your company against it',
      });
    }
    if (!/^data:(application\/pdf|image\/(png|jpe?g|webp));base64,/i.test(acraDocument)) {
      return res.status(400).json({ success: false, message: 'Attach a PDF or photo of your ACRA Business Profile' });
    }
    if (acraDocument.length > 8_000_000) {
      return res.status(413).json({ success: false, message: 'That file is too large — please keep it under about 6MB' });
    }
    if (acraProfileDate) {
      const d = new Date(acraProfileDate);
      const monthsOld = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
      if (Number.isNaN(d.getTime()) || monthsOld > 6) {
        return res.status(400).json({
          success: false,
          message: 'Your ACRA Business Profile must be dated within the last 6 months',
        });
      }
    }

    // One UEN, one company — a second claimant should join the existing company,
    // not create a duplicate (there is a unique constraint behind this too).
    const dupe = await client.query('SELECT id, company_name FROM companies WHERE uen = $1', [uen]);
    if (dupe.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `${dupe.rows[0].company_name} is already registered with that UEN. Ask their owner to invite you instead.`,
      });
    }

    await client.query('BEGIN');

    // Column names corrected: company_name / owner_user_id / status / subscription_status
    const companyRes = await client.query(
      `INSERT INTO companies (
         uen, company_name, description, owner_user_id, email, phone, address, postal_code,
         website, business_type, industry,
         contact_person_name, contact_person_role, contact_person_email, contact_person_phone,
         service_categories, service_areas, staff_count,
         incorporation_date, gst_registered, gst_number, billing_email,
         subscription_status, status, certified
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'free','active',FALSE)
       RETURNING *`,
      [
        uen, name, description || '', userId, email || null, phone || null,
        address || null, postal_code || null, website || null,
        business_type || null, industry || null,
        contact_person_name, contact_person_role || null, contact_person_email, contact_person_phone,
        Array.isArray(service_categories) ? service_categories : null,
        Array.isArray(service_areas) ? service_areas : null,
        Number(staff_count) || 0,
        incorporation_date || null, !!gst_registered, gst_number || null,
        billing_email || contact_person_email,
      ]
    );
    const company = companyRes.rows[0];

    // Create wallet
    await client.query(
      `INSERT INTO company_wallets (company_id, balance, total_earned, total_withdrawn)
       VALUES ($1, $2, $3, $4)`,
      [company.id, 0, 0, 0]
    );

    // Start on the free tier — a company shouldn't be granted a paid plan just
    // for registering, and it isn't verified yet. Columns corrected:
    // subscription_tier / price / started_at (not tier / monthly_fee / start_date).
    await client.query(
      `INSERT INTO company_subscriptions
         (company_id, subscription_tier, price, billing_cycle, started_at, auto_renew)
       VALUES ($1, 'free', 0, 'monthly', NOW(), FALSE)`,
      [company.id]
    );

    // Queue the ACRA profile for review in the same transaction, so a company
    // can never exist without a verification request attached to it.
    await client.query(
      `INSERT INTO company_verifications
         (company_id, submitted_by, acra_profile_date, status,
          document_data, document_mime, document_name)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)`,
      [company.id, userId, acraProfileDate || null, acraDocument,
       acraDocumentMime || null, acraDocumentName || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      // Registration is NOT complete until Errandify approves the ACRA check
      message: "Company registered and sent for verification. We'll check your ACRA profile and let you know — you can post errands and make offers once approved.",
      nextStep: 'awaiting_verification',
      data: company,
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
      `SELECT c.*, cw.balance as wallet_balance, cs.subscription_tier
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
      // Was INSERT INTO employees — a table that never existed. company_staff
      // already holds exactly this, and /staff reads from it.
      `INSERT INTO company_staff (company_id, user_id, role, position, status, join_date)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (company_id, user_id) DO UPDATE SET role = $3, skills = $4
       RETURNING e.*, COALESCE(u.alias, u.display_name) as user_name, u.email as user_email`,
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

    let query = `SELECT e.*, COALESCE(u.alias, u.display_name) as user_name, u.email as user_email
                 FROM company_staff e
                 JOIN users u ON e.user_id = u.id
                 WHERE e.company_id = $1`;
    const params: any[] = [companyId];

    if (status) {
      query += ` AND e.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY e.join_date DESC`;

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
      `UPDATE company_staff
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

// POST /api/companies/:companyId/employees/bulk-import - Invite many staff by NRIC/FIN
//
// This used to CREATE user accounts from a name/email/phone list, with
// email_verified and phone_verified hardcoded to true. That bypassed SingPass
// entirely — people who had never verified their identity could be created,
// tagged to a company and allocated errands. It also wrote users.name and
// users.user_type, neither of which exists, so every row failed anyway.
//
// The rule is that everyone registers with SingPass FIRST and is invited after.
// That holds for foreigners too: FIN holders (F, G, M prefixes) get SingPass the
// same as citizens and PRs (S, T), so one path covers everybody. Nobody is
// created here, and nobody joins a company without accepting.
router.post('/companies/:companyId/employees/bulk-import', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const rows = Array.isArray(req.body?.employees) ? req.body.employees : [];
    if (rows.length === 0) return res.status(400).json({ error: 'Add at least one person to invite.' });
    if (rows.length > 100) return res.status(400).json({ error: 'Please invite up to 100 people at a time.' });

    const invited: any[] = [];
    const skipped: any[] = [];

    for (const row of rows) {
      const nric = String(row?.nric || '').trim().toUpperCase();
      // Never echo a full NRIC/FIN back — PDPC treats even partial ones as
      // identifiers, so this is only enough for the owner to spot the row.
      const label = nric ? `${nric.slice(0, 1)}****${nric.slice(-1)}` : '(blank)';

      // S/T = citizens and PRs, F/G/M = FIN holders. Foreigners use the same
      // SingPass route, so one check covers everyone.
      if (!/^[STFGM][0-9]{7}[A-Z]$/.test(nric)) {
        skipped.push({ nric: label, reason: "That doesn't look like an NRIC or FIN" });
        continue;
      }

      const wanted = String(row?.role || 'staff').toLowerCase();
      if (!['manager', 'staff'].includes(wanted)) {
        skipped.push({ nric: label, reason: 'Role must be manager or staff' });
        continue;
      }
      if (wanted === 'manager' && gate.membership?.role !== 'owner') {
        skipped.push({ nric: label, reason: 'Only the owner can invite a manager' });
        continue;
      }

      const found = await db.query('SELECT id, display_name, alias FROM users WHERE nric_hash = $1', [
        hashNric(nric),
      ]);
      if (found.rows.length === 0) {
        skipped.push({ nric: label, reason: 'No Errandify account yet — they need to sign up with SingPass first' });
        continue;
      }
      const person = found.rows[0];

      const existing = await db.query(
        `SELECT company_id FROM company_staff
          WHERE user_id = $1 AND status IN ('pending','active','on_leave')`,
        [person.id]
      );
      if (existing.rows.some((r: any) => Number(r.company_id) === companyId)) {
        skipped.push({ nric: label, reason: 'Already on your team' });
        continue;
      }
      if (existing.rows.length > 0) {
        skipped.push({ nric: label, reason: 'Already with another company' });
        continue;
      }

      await db.query(
        `INSERT INTO company_staff (company_id, user_id, role, position, status, invited_by, invited_at, join_date)
         VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())`,
        [companyId, person.id, wanted, row?.position || null, req.userId]
      );

      invited.push({ userId: person.id, name: person.alias || person.display_name, role: wanted });
    }

    res.json({
      success: true,
      message: invited.length
        ? `Invited ${invited.length} ${invited.length === 1 ? 'person' : 'people'}. They'll join your team once they accept.`
        : 'Nobody could be invited — see the reasons below.',
      data: { invited, skipped, invitedCount: invited.length, skippedCount: skipped.length },
    });
  } catch (error) {
    console.error('[Company] Bulk invite error:', error);
    res.status(500).json({ error: 'Could not send those invites. Please try again.' });
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

    // leave_requests keys on staff_id and has no company_id of its own, so the
    // company is reached through company_staff.
    let query = `SELECT el.*, COALESCE(u.alias, u.display_name) as user_name, u.email as user_email
                 FROM leave_requests el
                 -- leave_requests.staff_id is VARCHAR while company_staff.user_id
                 -- is INTEGER, so the join has to be cast explicitly.
                 JOIN company_staff cs ON cs.user_id::text = el.staff_id
                 JOIN users u ON u.id::text = el.staff_id
                 WHERE cs.company_id = $1`;
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
router.post('/companies/:companyId/logo', authMiddleware, async (req: any, res: Response) => {
  try {
    const { companyId } = req.params;
    const userId = parseInt(req.userId, 10);

    // Ownership check — previously ANY signed-in user could overwrite ANY
    // company's logo, which is both an IDOR and a brand-impersonation risk.
    const membership = await resolveCompanyRole(userId, companyId);
    // Was a direct owner_user_id/manager_user_id check that ignored
    // company_staff — the same inconsistency as requireVerifiedCompany.
    if (!membership?.canActForCompany) {
      return res.status(403).json({ success: false, message: 'Only the company owner or manager can change the logo' });
    }

    // Accepts a data URI (no cloud storage configured) or an https URL
    const { logoUrl } = req.body;
    if (!logoUrl || typeof logoUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'Please choose a logo image' });
    }
    const isDataUri = /^data:image\/(png|jpe?g|webp|svg\+xml);base64,/i.test(logoUrl);
    const isHttps = /^https:\/\//i.test(logoUrl);
    if (!isDataUri && !isHttps) {
      return res.status(400).json({ success: false, message: 'Logo must be a PNG, JPG, WEBP or SVG image' });
    }
    if (isDataUri && logoUrl.length > 2_000_000) {
      return res.status(413).json({ success: false, message: 'Logo is too large — please use an image under about 1.5MB' });
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

// ============================================================================
// STAFF INVITES
// Invited by NRIC, never email: an NRIC is tied to a SingPass-verified human we
// already have, whereas an email is guessable and transferable. We match on
// nric_hash so the raw NRIC is never stored to send an invite. No company data
// is visible until the person accepts.
// ============================================================================

function hashNric(nric: string): string {
  return crypto.createHash('sha256').update(nric.trim().toUpperCase()).digest('hex');
}

// POST /api/companies/:companyId/staff/invite
router.post('/companies/:companyId/staff/invite', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const { nric, role, position } = req.body;

    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    if (!nric || !/^[STFGM]\d{7}[A-Z]$/i.test(String(nric).trim())) {
      return res.status(400).json({ error: "That doesn't look like an NRIC/FIN (e.g. S1234567A)" });
    }
    const wanted = (role || 'staff').toLowerCase();
    if (!['manager', 'staff'].includes(wanted)) {
      return res.status(400).json({ error: 'Role must be manager or staff' });
    }
    // Only an owner may appoint a manager — a manager can't promote peers
    if (wanted === 'manager' && gate.membership?.role !== 'owner') {
      return res.status(403).json({ error: 'Only the company owner can invite a manager' });
    }

    // The person must already exist — they sign up with SingPass first
    const u = await db.query(
      'SELECT id, display_name FROM users WHERE nric_hash = $1',
      [hashNric(String(nric))]
    );
    if (u.rows.length === 0) {
      return res.status(404).json({
        error: 'No Errandify account found for that NRIC. Ask them to sign up with SingPass first, then invite them again.',
        reason: 'no_account',
      });
    }
    const invitee = u.rows[0];

    if (Number(invitee.id) === Number(req.userId)) {
      return res.status(400).json({ error: "You're already part of this company" });
    }

    // Someone can only belong to one company
    const elsewhere = await db.query(
      `SELECT c.company_name FROM company_staff cs
         JOIN companies c ON c.id = cs.company_id
        WHERE cs.user_id = $1 AND cs.status IN ('pending','active','on_leave') AND cs.company_id <> $2`,
      [invitee.id, companyId]
    );
    if (elsewhere.rows.length > 0) {
      return res.status(409).json({
        error: `${invitee.display_name} is already with ${elsewhere.rows[0].company_name}.`,
      });
    }

    const existing = await db.query(
      'SELECT id, status FROM company_staff WHERE company_id = $1 AND user_id = $2',
      [companyId, invitee.id]
    );
    if (existing.rows.length > 0 && ['pending', 'active', 'on_leave'].includes(existing.rows[0].status)) {
      return res.status(409).json({
        error: existing.rows[0].status === 'pending'
          ? `${invitee.display_name} already has an invite waiting.`
          : `${invitee.display_name} is already on your team.`,
      });
    }

    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE company_staff SET role = $1, position = $2, status = 'pending',
                invited_by = $3, invited_at = NOW(), responded_at = NULL
          WHERE id = $4`,
        [wanted, position || null, req.userId, existing.rows[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO company_staff (company_id, user_id, role, position, status, invited_by, invited_at, join_date)
         VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())`,
        [companyId, invitee.id, wanted, position || null, req.userId]
      );
    }

    // Tell them it's waiting
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, is_read)
       VALUES ($1, 'company_invite', 'Company invitation',
               $2, FALSE)`,
      [invitee.id, `${gate.membership?.companyName} invited you to join as ${wanted}. Accept from your account to get started.`]
    );

    console.log('[Company] Invited user', invitee.id, 'to company', companyId, 'as', wanted);
    res.status(201).json({
      success: true,
      message: `Invite sent to ${invitee.display_name}. They'll appear on your team once they accept.`,
      data: { userId: invitee.id, name: invitee.display_name, role: wanted, status: 'pending' },
    });
  } catch (error) {
    console.error('[Company] Staff invite failed:', error);
    res.status(500).json({ error: 'Could not send that invite' });
  }
});

// GET /api/companies/:companyId/staff — the team (owner/manager)
router.get('/companies/:companyId/staff', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const r = await db.query(
      `SELECT cs.id, cs.user_id, cs.role, cs.position, cs.status, cs.invited_at, cs.join_date,
              u.display_name, u.alias, u.profile_image_url
         FROM company_staff cs
         JOIN users u ON u.id = cs.user_id
        WHERE cs.company_id = $1 AND cs.status <> 'declined'
        ORDER BY CASE cs.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, u.display_name`,
      [companyId]
    );

    res.json({
      success: true,
      data: {
        staff: r.rows,
        // Only active staff can be given work
        allocatable: r.rows.filter((s: any) => s.status === 'active'),
        pendingInvites: r.rows.filter((s: any) => s.status === 'pending').length,
      },
    });
  } catch (error) {
    console.error('[Company] Staff list failed:', error);
    res.status(500).json({ error: 'Could not load your team' });
  }
});

// GET /api/companies/invites/mine — invites waiting for me
router.get('/companies/invites/mine', authMiddleware, async (req: any, res: Response) => {
  try {
    const r = await db.query(
      `SELECT cs.id, cs.role, cs.position, cs.invited_at,
              c.id AS company_id, c.company_name, c.uen, c.logo_url,
              inviter.display_name AS invited_by_name
         FROM company_staff cs
         JOIN companies c ON c.id = cs.company_id
         LEFT JOIN users inviter ON inviter.id = cs.invited_by
        WHERE cs.user_id = $1 AND cs.status = 'pending'
        ORDER BY cs.invited_at DESC`,
      [req.userId]
    );
    res.json({ success: true, data: { invites: r.rows } });
  } catch (error) {
    console.error('[Company] My invites failed:', error);
    res.status(500).json({ error: 'Could not load your invites' });
  }
});

// POST /api/companies/invites/:inviteId/:action — accept | decline
router.post('/companies/invites/:inviteId/:action', authMiddleware, async (req: any, res: Response) => {
  try {
    const { inviteId, action } = req.params;
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Unknown action' });
    }

    // Only the invitee may respond — nobody can accept on someone's behalf
    const inv = await db.query(
      `SELECT cs.id, cs.company_id, cs.role, c.company_name
         FROM company_staff cs JOIN companies c ON c.id = cs.company_id
        WHERE cs.id = $1 AND cs.user_id = $2 AND cs.status = 'pending'`,
      [inviteId, req.userId]
    );
    if (inv.rows.length === 0) {
      return res.status(404).json({ error: 'That invite is no longer available' });
    }

    // Separate statements — Postgres can't infer a type when the same parameter
    // is both a value and a CASE comparison.
    if (action === 'accept') {
      await db.query(
        "UPDATE company_staff SET status = 'active', responded_at = NOW(), join_date = NOW() WHERE id = $1",
        [inviteId]
      );
    } else {
      await db.query(
        "UPDATE company_staff SET status = 'declined', responded_at = NOW() WHERE id = $1",
        [inviteId]
      );
    }
    const next = action === 'accept' ? 'active' : 'declined';

    console.log('[Company] Invite', inviteId, action + 'ed by user', req.userId);
    res.json({
      success: true,
      message: action === 'accept'
        ? `You've joined ${inv.rows[0].company_name} as ${inv.rows[0].role}.`
        : 'Invite declined.',
      data: { companyId: inv.rows[0].company_id, status: next },
    });
  } catch (error) {
    console.error('[Company] Invite response failed:', error);
    res.status(500).json({ error: 'Could not respond to that invite' });
  }
});

// ============================================================================
// ALLOCATION + STAFF WORK
// A confirmed company errand is allocated to a staff member by the owner or
// manager. Staff only ever see what they've been given — they never browse the
// marketplace, make offers, or receive payment (the company is paid).
// ============================================================================

// POST /api/companies/:companyId/errands/:errandId/allocate — assign to a staff member
router.post('/companies/:companyId/errands/:errandId/allocate', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const errandId = parseInt(req.params.errandId, 10);
    const { staffUserId } = req.body;

    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    if (!staffUserId) return res.status(400).json({ error: 'Choose a staff member' });

    // The errand must belong to this company
    const order = await db.query(
      'SELECT id FROM company_orders WHERE company_id = $1 AND errand_id = $2',
      [companyId, errandId]
    );
    if (order.rows.length === 0) {
      return res.status(404).json({ error: "That errand isn't linked to your company" });
    }

    // Staff must be on the team...
    const staff = await db.query(
      `SELECT cs.status, u.display_name
         FROM company_staff cs JOIN users u ON u.id = cs.user_id
        WHERE cs.company_id = $1 AND cs.user_id = $2`,
      [companyId, staffUserId]
    );
    if (staff.rows.length === 0) {
      return res.status(400).json({ error: 'That person is not on your staff list' });
    }

    // ...and not away. Checked at SAVE time, not just when the picker rendered —
    // a stale screen must not be able to assign someone who's on leave.
    if (staff.rows[0].status === 'on_leave') {
      return res.status(409).json({
        error: `${staff.rows[0].display_name} is on leave and can't take this errand.`,
        reason: 'staff_on_leave',
      });
    }
    if (staff.rows[0].status !== 'active') {
      return res.status(409).json({ error: `${staff.rows[0].display_name} is no longer active staff.` });
    }

    const upd = await db.query(
      `UPDATE company_orders
          SET assigned_staff_id = $1, status = 'assigned', updated_at = NOW()
        WHERE company_id = $2 AND errand_id = $3
        RETURNING id, errand_id, assigned_staff_id, status`,
      [staffUserId, companyId, errandId]
    );

    console.log('[Company] Errand', errandId, 'allocated to staff', staffUserId);
    res.json({ success: true, message: `Allocated to ${staff.rows[0].display_name}`, data: upd.rows[0] });
  } catch (error) {
    console.error('[Company] Allocate failed:', error);
    res.status(500).json({ error: 'Could not allocate that errand' });
  }
});

/**
 * GET /api/companies/:companyId/subscription — this company's plan.
 *
 * Deliberately not reusing GET /api/subscriptions/status: that route returns a
 * hardcoded silver tier to every caller regardless of what they actually pay
 * for. Reading it here would show a company someone else's plan. This reads
 * company_subscriptions, so a company with no plan gets null and the panel
 * shows nothing rather than an invented subscription.
 */
router.get('/companies/:companyId/subscription', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager', 'staff']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const result = await db.query(
      `SELECT id, subscription_tier AS tier, billing_cycle, price,
              started_at, expires_at AS renewal_date, auto_renew,
              max_staff_members, max_errands_per_month,
              CASE WHEN expires_at IS NULL OR expires_at > NOW() THEN 'active' ELSE 'expired' END AS status
         FROM company_subscriptions
        WHERE company_id = $1
        ORDER BY started_at DESC NULLS LAST
        LIMIT 1`,
      [companyId]
    );

    const row = result.rows[0] || null;
    res.json({ success: true, data: row ? { ...row, price: row.price === null ? null : Number(row.price) } : null });
  } catch (error) {
    console.error('[Company] Subscription fetch failed:', error);
    res.status(500).json({ error: 'Could not load subscription' });
  }
});

/**
 * GET /api/companies/:companyId/advertising — this company's campaigns.
 * Drafts and rejected campaigns are included; the panel colours by status.
 */
router.get('/companies/:companyId/advertising', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const result = await db.query(
      `SELECT id, title, description, status, budget, spent,
              starts_at, ends_at, duration_days, created_at
         FROM campaigns
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [companyId]
    );

    // budget/spent are NUMERIC and arrive as strings; the panel does arithmetic
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        ...r,
        budget: r.budget === null ? null : Number(r.budget),
        spent: r.spent === null ? 0 : Number(r.spent),
      })),
    });
  } catch (error) {
    console.error('[Company] Advertising fetch failed:', error);
    res.status(500).json({ error: 'Could not load campaigns' });
  }
});

/**
 * GET /api/companies/:companyId/allocations — the manager's view of who has
 * what. ManagerStaffAllocations had no backend and fell back to invented rows.
 *
 * company_orders is the record of allocation. Its status vocabulary is not the
 * one the panel speaks, so it is translated here rather than in the component:
 *   assigned    -> allocated   (given out, not yet picked up)
 *   in_progress -> accepted    (staff pressed start)
 *   completed   -> completed
 * Anything else passes through unchanged.
 *
 * There is no decline_reason column on company_orders, so that field is null
 * until a decline flow exists to populate it — better an absent field than a
 * fabricated reason.
 */
router.get('/companies/:companyId/allocations', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const result = await db.query(
      `SELECT co.id,
              COALESCE(u.alias, u.display_name) AS staff_name,
              e.title AS errand_title,
              COALESCE(e.formatted_id, e.id::text) AS errand_id,
              CASE co.status
                WHEN 'assigned'    THEN 'allocated'
                WHEN 'in_progress' THEN 'accepted'
                ELSE co.status
              END AS status,
              co.updated_at AS allocated_at,
              co.decline_reason
         FROM company_orders co
         JOIN errands e ON e.id = co.errand_id
         -- Declining clears assigned_staff_id to return the errand to the pool,
         -- so fall back to declined_by; otherwise the one row a manager most
         -- needs to see would show no name, or be filtered out entirely.
         LEFT JOIN users u ON u.id = COALESCE(co.assigned_staff_id, co.declined_by)
        WHERE co.company_id = $1
          AND (co.assigned_staff_id IS NOT NULL OR co.status = 'declined')
        ORDER BY co.updated_at DESC`,
      [companyId]
    );

    res.json({ success: true, allocations: result.rows });
  } catch (error) {
    console.error('[Company] Allocations fetch failed:', error);
    res.status(500).json({ error: 'Could not load allocations' });
  }
});

// GET /api/companies/:companyId/staff/my-work — what I've been allocated
router.get('/companies/:companyId/staff/my-work', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const userId = parseInt(req.userId, 10);

    // Any role can view their own allocated work (an owner may also do jobs)
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager', 'staff']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const result = await db.query(
      `SELECT e.id, e.formatted_id, e.title, e.description, e.category, e.budget,
              e.deadline, e.location, e.postal_code, e.status AS errand_status,
              co.status AS job_status, co.updated_at AS allocated_at
         FROM company_orders co
         JOIN errands e ON e.id = co.errand_id
        WHERE co.company_id = $1 AND co.assigned_staff_id = $2
        ORDER BY
          CASE co.status WHEN 'in_progress' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END,
          e.deadline NULLS LAST`,
      [companyId, userId]
    );

    const jobs = result.rows;
    res.json({
      success: true,
      data: {
        jobs,
        role: gate.membership?.role,
        onLeave: gate.membership?.onLeave ?? false,
        summary: {
          today: jobs.filter((j: any) => j.deadline && new Date(j.deadline).toDateString() === new Date().toDateString()).length,
          inProgress: jobs.filter((j: any) => j.job_status === 'in_progress').length,
          total: jobs.length,
        },
      },
    });
  } catch (error) {
    console.error('[Company] Staff work failed:', error);
    res.status(500).json({ error: 'Could not load your jobs' });
  }
});

// POST /api/companies/:companyId/staff/jobs/:errandId/:action — start | complete
router.post('/companies/:companyId/staff/jobs/:errandId/:action', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const errandId = parseInt(req.params.errandId, 10);
    const action = req.params.action;
    const userId = parseInt(req.userId, 10);

    if (!['start', 'complete'].includes(action)) {
      return res.status(400).json({ error: 'Unknown action' });
    }

    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager', 'staff']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    // Staff may only touch jobs allocated to them
    const own = await db.query(
      'SELECT status FROM company_orders WHERE company_id = $1 AND errand_id = $2 AND assigned_staff_id = $3',
      [companyId, errandId, userId]
    );
    if (own.rows.length === 0) {
      return res.status(403).json({ error: "That job isn't allocated to you" });
    }

    const next = action === 'start' ? 'in_progress' : 'completed';
    if (action === 'start' && own.rows[0].status !== 'assigned') {
      return res.status(409).json({ error: 'That job has already been started' });
    }

    // Both rows move together. Without this, a failure on the second statement
    // leaves the job marked started while the errand still says otherwise.
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE company_orders SET status = $1, updated_at = NOW() WHERE company_id = $2 AND errand_id = $3",
        [next, companyId, errandId]
      );

      // Two separate statements rather than reusing $1 as both a value and a CASE
      // comparison — Postgres can't infer a consistent type for that.
      if (action === 'complete') {
        await client.query(
          "UPDATE errands SET status = 'completed_unconfirmed', completed_at = NOW() WHERE id = $1",
          [errandId]
        );
      } else {
        await client.query("UPDATE errands SET status = 'in_progress' WHERE id = $1", [errandId]);
      }
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    console.log('[Company] Staff', userId, action === 'start' ? 'started' : 'completed', 'errand', errandId);
    res.json({
      success: true,
      message: action === 'start' ? "You're on the job" : 'Marked as done — the asker will confirm',
      data: { errandId, jobStatus: next },
    });
  } catch (error) {
    console.error('[Company] Staff job action failed:', error);
    res.status(500).json({ error: 'Could not update that job' });
  }
});

// ============================================================================
// VERIFICATION GATE
// A company cannot post errands or make offers until Errandify has approved its
// ACRA verification. Enforced server-side so it can't be bypassed from the UI.
// ============================================================================

interface GateResult {
  ok: boolean;
  status?: number;
  error?: string;
  reason?: 'not_found' | 'not_member' | 'not_verified' | 'pending' | 'rejected';
}

/** Caller must be owner/manager AND the company must be verified. */
async function requireVerifiedCompany(companyId: number, userId: number): Promise<GateResult> {
  const c = await db.query('SELECT certified FROM companies WHERE id = $1', [companyId]);
  if (c.rows.length === 0) {
    return { ok: false, status: 404, error: 'Company not found', reason: 'not_found' };
  }
  const { certified } = c.rows[0];

  // Use the shared resolver rather than reading owner_user_id/manager_user_id
  // directly. This checked only those two columns and ignored company_staff, so
  // someone recorded as an owner THERE — which is how staff are actually
  // linked — passed requireCompanyRole everywhere else and was refused here.
  // Two helpers answering the same question differently.
  const membership = await resolveCompanyRole(userId, companyId);
  if (!membership?.canActForCompany) {
    return { ok: false, status: 403, error: 'Only the company owner or manager can do this', reason: 'not_member' };
  }

  if (!certified) {
    // Tell them exactly where they are in the process, not just "no"
    const v = await db.query(
      `SELECT status, rejection_reason FROM company_verifications
        WHERE company_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [companyId]
    );
    const last = v.rows[0];
    if (last?.status === 'pending') {
      return {
        ok: false, status: 403, reason: 'pending',
        error: "Your company verification is still being reviewed. You can post and make offers once it's approved.",
      };
    }
    if (last?.status === 'rejected') {
      return {
        ok: false, status: 403, reason: 'rejected',
        error: `Your verification wasn't approved: ${last.rejection_reason} Please submit an updated ACRA profile.`,
      };
    }
    return {
      ok: false, status: 403, reason: 'not_verified',
      error: 'Verify your company first. Attach your ACRA Business Profile in Company Profile to start posting errands and making offers.',
    };
  }

  return { ok: true };
}

// POST /api/companies/errands — post an errand AS THE COMPANY (verified only)
router.post('/companies/errands', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const {
      companyId, title, description, category, location,
      full_address, postal_code, budget, deadline,
    } = req.body;

    const cid = parseInt(companyId, 10);
    if (!cid) return res.status(400).json({ error: 'companyId is required' });

    const gate = await requireVerifiedCompany(cid, userId);
    if (!gate.ok) {
      return res.status(gate.status || 403).json({ error: gate.error, reason: gate.reason });
    }

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const formattedId = generateCompanyErrandId(category);

    // Both rows must land together — otherwise a failed link leaves an errand
    // that exists but doesn't belong to the company.
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO errands
           (asker_id, title, description, category, location, full_address,
            postal_code, budget, deadline, status, formatted_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)
         RETURNING id, formatted_id, title, category, budget, deadline, status, created_at`,
        [userId, title, description || '', category, location || null, full_address || null,
         postal_code || null, budget || 0, deadline || null, formattedId]
      );
      const errand = result.rows[0];

      // NOTE: no company_orders row here. That table is the ALLOCATION record —
      // work the company must deliver. An errand the company POSTS is done by
      // somebody else, so there is nothing to allocate. The row is created when
      // the company WINS an offer (see bids.ts accept).
      await client.query(
        `UPDATE errands SET company_posted_by = $1 WHERE id = $2`,
        [cid, errand.id]
      );

      await client.query('COMMIT');
      console.log('[Company] Errand posted by company', cid, '->', errand.formatted_id);
      res.status(201).json({ success: true, data: errand });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Company] Post errand failed:', error);
    res.status(500).json({ error: 'Could not post the errand' });
  }
});

/** Same ER26<cat>-<4> format used everywhere else. */
function generateCompanyErrandId(category: string): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const categoryCode = getCategoryCode(category);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `ER${year}${categoryCode}-${code}`;
}

// ============================================================================
// COMPANY VERIFICATION (ACRA Business Profile)
//
// Stripe Connect already performs the regulatory KYB, so this is a marketplace
// TRUST signal, not a compliance gate. The ACRA profile contains directors'
// personal data, so the document is held only while the request is pending and
// is discarded the moment a decision is made — we keep the outcome, not the file.
// ============================================================================

// POST /api/companies/:companyId/verification — submit an ACRA profile for review
router.post('/companies/:companyId/verification', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const userId = parseInt(req.userId, 10);
    const { document, documentName, documentMime, acraProfileDate, matchedOfficer } = req.body;

    // Only the owner or manager may submit on the company's behalf
    const own = await db.query(
      'SELECT owner_user_id, manager_user_id FROM companies WHERE id = $1',
      [companyId]
    );
    if (own.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const { owner_user_id, manager_user_id } = own.rows[0];
    if (![owner_user_id, manager_user_id].map(Number).includes(userId)) {
      return res.status(403).json({ error: 'Only the company owner or manager can submit verification' });
    }

    if (!document || typeof document !== 'string') {
      return res.status(400).json({ error: 'Please attach your ACRA Business Profile' });
    }
    if (!/^data:(application\/pdf|image\/(png|jpe?g|webp));base64,/i.test(document)) {
      return res.status(400).json({ error: 'Attach a PDF or image of your ACRA Business Profile' });
    }
    if (document.length > 8_000_000) {
      return res.status(413).json({ error: 'File is too large — please attach a file under about 6MB' });
    }

    // ACRA profiles should be recent; a stale one proves neither current status nor officers
    if (acraProfileDate) {
      const d = new Date(acraProfileDate);
      const monthsOld = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
      if (Number.isNaN(d.getTime()) || monthsOld > 6) {
        return res.status(400).json({
          error: 'Your ACRA Business Profile must be dated within the last 6 months',
        });
      }
    }

    // Replace any earlier pending request rather than stacking duplicates
    await db.query(
      "DELETE FROM company_verifications WHERE company_id = $1 AND status = 'pending'",
      [companyId]
    );

    const r = await db.query(
      `INSERT INTO company_verifications
         (company_id, submitted_by, acra_profile_date, matched_officer,
          status, document_data, document_mime, document_name)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
       RETURNING id, status, submitted_at`,
      [companyId, userId, acraProfileDate || null, matchedOfficer || null,
       document, documentMime || null, documentName || null]
    );

    console.log('[Verification] Submitted for company', companyId, 'by user', userId);
    res.status(201).json({
      success: true,
      message: "Submitted for review. We'll let you know once it's checked.",
      data: r.rows[0],
    });
  } catch (error) {
    console.error('[Verification] Submit failed:', error);
    res.status(500).json({ error: 'Could not submit your verification' });
  }
});

// GET /api/companies/:companyId/verification — the company's own status
router.get('/companies/:companyId/verification', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const members = await getCompanyMemberIds(companyId, parseInt(req.userId, 10));
    if (members === null) return res.status(404).json({ error: 'Company not found' });
    if (members.length === 0) return res.status(403).json({ error: 'You do not have access to this company' });

    const c = await db.query(
      `SELECT certified, certification_date, company_name, uen, logo_url, description,
              email, phone, address, postal_code, website,
              contact_person_name, contact_person_email, contact_person_phone,
              service_categories, service_areas, staff_count
         FROM companies WHERE id = $1`,
      [companyId]
    );
    // Never return document_data — it is only for the reviewer
    const v = await db.query(
      `SELECT id, status, submitted_at, acra_profile_date, matched_officer,
              reviewed_at, rejection_reason
         FROM company_verifications
        WHERE company_id = $1
        ORDER BY submitted_at DESC LIMIT 1`,
      [companyId]
    );

    const co = c.rows[0] || {};
    const filled = (x: any) => (Array.isArray(x) ? x.length > 0 : !!(x && String(x).trim()));

    // A fuller profile gets verified faster and performs better in the
    // marketplace, so we show what's missing rather than just a percentage.
    const checklist = [
      { key: 'company_name', label: 'Company name', done: filled(co.company_name), required: true },
      { key: 'uen', label: 'UEN', done: filled(co.uen), required: true },
      { key: 'contact_person', label: 'Contact person', done: filled(co.contact_person_name) && filled(co.contact_person_email) && filled(co.contact_person_phone), required: true },
      { key: 'address', label: 'Business address', done: filled(co.address) && filled(co.postal_code), required: true },
      { key: 'service_categories', label: 'Services you offer', done: filled(co.service_categories), required: true, why: 'We use this to show you matching errands' },
      { key: 'service_areas', label: 'Areas you cover', done: filled(co.service_areas), required: false, why: 'Neighbours nearby find you first' },
      { key: 'logo_url', label: 'Company logo', done: filled(co.logo_url), required: false, why: 'Shows on your offers and every advert you run' },
      { key: 'description', label: 'Short description', done: filled(co.description), required: false, why: 'Helps askers choose you over a stranger' },
      { key: 'phone', label: 'Company phone', done: filled(co.phone), required: false },
      { key: 'website', label: 'Website', done: filled(co.website), required: false },
    ];

    const doneCount = checklist.filter((i) => i.done).length;
    const missingRequired = checklist.filter((i) => i.required && !i.done);

    res.json({
      success: true,
      data: {
        certified: co.certified ?? false,
        certification_date: co.certification_date ?? null,
        latestRequest: v.rows[0] || null,
        profile: {
          checklist,
          completeness: Math.round((doneCount / checklist.length) * 100),
          missingRequired: missingRequired.map((i) => i.label),
          readyToSubmit: missingRequired.length === 0,
          hasLogo: filled(co.logo_url),
        },
      },
    });
  } catch (error) {
    console.error('[Verification] Status failed:', error);
    res.status(500).json({ error: 'Could not load verification status' });
  }
});

// ============================================================================
// COMPANY WORKSPACE — Asker and Doer
// The company acts through its people: owner, manager and staff. An errand
// posted by any of them is the company's errand; an offer submitted by any of
// them is the company's offer. This keeps the company workspace completely
// separate from a person's own Home/Browse pages.
// ============================================================================

/** User ids that act on behalf of this company. Returns [] if the caller isn't one of them. */
async function getCompanyMemberIds(companyId: number, requesterId: number): Promise<number[] | null> {
  const c = await db.query(
    'SELECT owner_user_id, manager_user_id FROM companies WHERE id = $1',
    [companyId]
  );
  if (c.rows.length === 0) return null;

  const staff = await db.query(
    "SELECT user_id FROM company_staff WHERE company_id = $1 AND user_id IS NOT NULL AND status = 'active'",
    [companyId]
  );

  const ids = [
    c.rows[0].owner_user_id,
    c.rows[0].manager_user_id,
    ...staff.rows.map((r: any) => r.user_id),
  ].filter((v: any) => v != null).map(Number);

  const unique = Array.from(new Set(ids));
  // Access control: only someone who acts for this company may see its workspace
  return unique.includes(Number(requesterId)) ? unique : [];
}

// GET /api/companies/:companyId/asker/errands — errands this company posted
router.get('/companies/:companyId/asker/errands', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });
    const members = await getCompanyMemberIds(companyId, parseInt(req.userId, 10)) || [];

    const result = await db.query(
      `SELECT e.id, e.formatted_id, e.title, e.category, e.budget, e.deadline,
              e.location, e.postal_code, e.status, e.created_at, e.accepted_bid_id,
              u.display_name AS posted_by,
              COUNT(b.id)::int AS offer_count,
              COUNT(b.id) FILTER (WHERE b.status = 'pending')::int AS pending_offers
         FROM errands e
         JOIN users u ON u.id = e.asker_id
         LEFT JOIN bids b ON b.errand_id = e.id
        WHERE e.asker_id = ANY($1::int[])
        GROUP BY e.id, u.display_name
        ORDER BY
          CASE WHEN e.status = 'open' THEN 0 WHEN e.status = 'in_progress' THEN 1 ELSE 2 END,
          e.deadline NULLS LAST`,
      [members]
    );

    const errands = result.rows;
    res.json({
      success: true,
      data: {
        errands,
        summary: {
          total: errands.length,
          offersToReview: errands.reduce((n: number, e: any) => n + (e.pending_offers || 0), 0),
          inProgress: errands.filter((e: any) => e.status === 'in_progress').length,
        },
      },
    });
  } catch (error) {
    console.error('[Company] Asker errands error:', error);
    res.status(500).json({ error: 'Failed to fetch company errands' });
  }
});

// GET /api/companies/:companyId/doer/marketplace — open errands the company can offer on
router.get('/companies/:companyId/doer/marketplace', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    // Only owner/manager browse for work — staff see what they're allocated
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager'], { requireCertified: true });
    if (!gate.ok) {
      // Distinguish "wrong role" from "not verified" — the UI shows different help
      const reason = gate.membership && !gate.membership.certified ? 'not_verified' : 'wrong_role';
      return res.status(gate.status || 403).json({ error: gate.error, reason });
    }
    const members = await getCompanyMemberIds(companyId, parseInt(req.userId, 10)) || [];

    const { category, area } = req.query;

    const result = await db.query(
      `SELECT e.id, e.formatted_id, e.title, e.category, e.budget, e.deadline,
              e.location, e.postal_code, e.created_at,
              COALESCE(u.alias, u.display_name) AS posted_by,
              COUNT(b.id)::int AS offer_count,
              BOOL_OR(b.doer_id = ANY($1::int[])) AS already_offered
         FROM errands e
         JOIN users u ON u.id = e.asker_id
         LEFT JOIN bids b ON b.errand_id = e.id
        WHERE e.status = 'open'
          AND NOT (e.asker_id = ANY($1::int[]))          -- never bid on our own errands
          AND ($2::text IS NULL OR e.category = $2)
          AND ($3::text IS NULL OR e.location ILIKE '%' || $3 || '%')
        GROUP BY e.id, u.alias, u.display_name
        ORDER BY e.deadline NULLS LAST
        LIMIT 50`,
      [members, category || null, area || null]
    );

    res.json({ success: true, data: { errands: result.rows, total: result.rows.length } });
  } catch (error) {
    console.error('[Company] Marketplace error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace' });
  }
});

// GET /api/companies/:companyId/doer/offers — offers this company submitted
router.get('/companies/:companyId/doer/offers', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });
    const members = await getCompanyMemberIds(companyId, parseInt(req.userId, 10)) || [];

    const result = await db.query(
      `SELECT b.id, b.offer_id, b.amount, b.status, b.created_at,
              e.id AS errand_id, e.formatted_id, e.title, e.category,
              e.location, e.deadline, e.status AS errand_status,
              u.display_name AS submitted_by
         FROM bids b
         JOIN errands e ON e.id = b.errand_id
         JOIN users u ON u.id = b.doer_id
        WHERE b.doer_id = ANY($1::int[])
        ORDER BY
          CASE WHEN b.status = 'pending' THEN 0 WHEN b.status = 'accepted' THEN 1 ELSE 2 END,
          b.created_at DESC
        LIMIT 100`,
      [members]
    );

    const offers = result.rows;
    res.json({
      success: true,
      data: {
        offers,
        summary: {
          total: offers.length,
          pending: offers.filter((o: any) => o.status === 'pending').length,
          won: offers.filter((o: any) => o.status === 'accepted').length,
        },
      },
    });
  } catch (error) {
    console.error('[Company] Company offers error:', error);
    res.status(500).json({ error: 'Failed to fetch company offers' });
  }
});

// GET /api/companies/:companyId/disputes — every dispute this company is a party to
//
// GET /api/disputes is admin-only (it returns the whole platform), so the
// company Dispute Center needs its own scoped view. A company is a party if it
// filed the dispute, posted the errand, or won the errand with a MyBizOffer.
router.get('/companies/:companyId/disputes', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const gate = await requireCompanyRole(req.userId, companyId, ['owner', 'manager']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const result = await db.query(
      `SELECT d.id, d.status, d.dispute_type, d.description, d.created_at,
              d.resolved_at, d.has_appeal, d.appeal_submitted_at,
              d.filed_by_user_id, d.raised_by_staff_id, d.company_id,
              e.id AS errand_id, e.formatted_id, e.title, e.budget, e.asker_id,
              ab.amount AS accepted_amount,
              COALESCE(staff.alias, staff.display_name) AS staff_name
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
         LEFT JOIN users staff ON staff.id = d.raised_by_staff_id
        WHERE d.company_id = $1
           OR e.company_posted_by = $1
           OR ab.company_id = $1
        ORDER BY d.created_at DESC
        LIMIT 100`,
      [companyId]
    );

    // Shaped to the Dispute Center's existing view model so the UI it already
    // has keeps working — it was built against a hardcoded array of this shape.
    const disputes = result.rows.map((d: any) => {
      let status: string;
      if (d.has_appeal || d.appeal_submitted_at) status = 'Appealed';
      else if (d.status === 'resolved') status = 'Resolved';
      else if (d.status === 'level_1') status = 'Open';
      else status = 'In Review';

      const involvedParty = d.raised_by_staff_id
        ? 'Staff Member'
        : Number(d.filed_by_user_id) === Number(d.asker_id)
        ? 'Asker'
        : 'Doer';

      return {
        id: d.id,
        errandId: d.formatted_id,
        errandDbId: d.errand_id,
        involvedParty,
        staffName: d.staff_name || null,
        jobTitle: d.title,
        amount: Number(d.accepted_amount ?? d.budget ?? 0),
        dateRaised: d.created_at,
        resolvedAt: d.resolved_at,
        status,
        reason: d.description,
        disputeType: d.dispute_type,
        filedByUs: Number(d.company_id) === companyId,
      };
    });

    res.json({ success: true, data: { disputes, total: disputes.length } });
  } catch (error) {
    console.error('[Company] Disputes list error:', error);
    res.status(500).json({ error: 'Failed to load your disputes' });
  }
});

/* ------------------------------------------------------------------ *
 * Staff dispute requests
 *
 * Staff on a company errand cannot file a dispute themselves — the dispute
 * belongs to the business, which is the counterparty on the errand and the
 * party that gets paid. So staff RAISE a request, and the owner or manager
 * decides:
 *   approve -> a real dispute is filed under the company (payment held,
 *              other party notified, chat disabled by the normal flow)
 *   reject  -> the request stays an internal record; nothing happens on the
 *              errand and the other party is never told
 * ------------------------------------------------------------------ */

const DISPUTE_TYPES = [
  'payment_not_released',
  'work_not_completed',
  'low_quality',
  'safety_concern',
  'other',
];

// POST /api/companies/:companyId/dispute-requests — staff raises one
router.post('/companies/:companyId/dispute-requests', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const userId = parseInt(req.userId, 10);
    // Owner/manager may raise one too — it just skips straight to filing below
    const gate = await requireCompanyRole(userId, companyId, ['owner', 'manager', 'staff']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const { errandId, type, description, evidence } = req.body || {};
    if (!errandId || !type || !description) {
      return res.status(400).json({ error: 'errandId, type and description are required' });
    }
    if (!DISPUTE_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Unknown dispute type' });
    }
    if (String(description).trim().length < 20) {
      return res.status(400).json({ error: 'Please describe what happened in a bit more detail (at least 20 characters).' });
    }

    // The errand must actually be this company's work, and this staff member
    // must be the one assigned to it — otherwise anyone on the team could raise
    // a dispute on a job they had nothing to do with.
    const order = await db.query(
      `SELECT co.id, co.assigned_staff_id, e.title, e.status AS errand_status
         FROM company_orders co
         JOIN errands e ON e.id = co.errand_id
        WHERE co.company_id = $1 AND co.errand_id = $2
        LIMIT 1`,
      [companyId, parseInt(errandId, 10)]
    );
    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'That errand is not one of your company jobs.' });
    }
    const job = order.rows[0];
    if (gate.membership!.role === 'staff' && Number(job.assigned_staff_id) !== userId) {
      return res.status(403).json({ error: 'You can only raise an issue on an errand assigned to you.' });
    }

    const existing = await db.query(
      `SELECT id FROM company_dispute_requests
        WHERE errand_id = $1 AND raised_by_staff_id = $2 AND status = 'pending_company'`,
      [parseInt(errandId, 10), userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'You already have an issue waiting for your owner or manager on this errand.',
        requestId: existing.rows[0].id,
      });
    }

    const created = await db.query(
      `INSERT INTO company_dispute_requests
         (company_id, errand_id, raised_by_staff_id, dispute_type, description, evidence)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, status, created_at`,
      [companyId, parseInt(errandId, 10), userId, type, String(description).trim(), evidence || null]
    );

    // Let the people who can act on it know — best effort, never fails the raise
    try {
      const approvers = await db.query(
        `SELECT DISTINCT uid FROM (
           SELECT owner_user_id AS uid FROM companies WHERE id = $1
           UNION SELECT manager_user_id FROM companies WHERE id = $1
           UNION SELECT user_id FROM company_staff
                   WHERE company_id = $1 AND role IN ('owner','manager') AND status = 'active'
         ) a WHERE uid IS NOT NULL`,
        [companyId]
      );
      const raiser = await db.query('SELECT display_name FROM users WHERE id = $1', [userId]);
      const who = raiser.rows[0]?.display_name || 'A team member';
      for (const row of approvers.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id)
           VALUES ($1, 'company_dispute_request', $2, $3, $4)`,
          [
            row.uid,
            'Staff raised an issue',
            `${who} raised an issue on "${job.title}" and needs your approval before it becomes a dispute.`,
            parseInt(errandId, 10),
          ]
        );
      }
    } catch (notifyErr) {
      console.warn('[Company] Could not notify approvers of dispute request:', notifyErr);
    }

    res.status(201).json({ success: true, data: created.rows[0] });
  } catch (error) {
    console.error('[Company] Raise dispute request error:', error);
    res.status(500).json({ error: 'Could not raise this issue. Please try again.' });
  }
});

// GET /api/companies/:companyId/dispute-requests — owner/manager see all, staff see their own
router.get('/companies/:companyId/dispute-requests', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const userId = parseInt(req.userId, 10);
    const gate = await requireCompanyRole(userId, companyId, ['owner', 'manager', 'staff']);
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    const staffOnly = gate.membership!.role === 'staff';
    const result = await db.query(
      `SELECT r.id, r.errand_id, r.dispute_type, r.description, r.status,
              r.review_note, r.reviewed_at, r.dispute_id, r.created_at,
              e.formatted_id, e.title, e.location,
              u.display_name AS raised_by,
              rev.display_name AS reviewed_by
         FROM company_dispute_requests r
         JOIN errands e ON e.id = r.errand_id
         LEFT JOIN users u ON u.id = r.raised_by_staff_id
         LEFT JOIN users rev ON rev.id = r.reviewed_by_id
        WHERE r.company_id = $1
          AND ($2::boolean = false OR r.raised_by_staff_id = $3)
        ORDER BY CASE WHEN r.status = 'pending_company' THEN 0 ELSE 1 END,
                 r.created_at DESC
        LIMIT 100`,
      [companyId, staffOnly, userId]
    );

    const rows = result.rows;
    res.json({
      success: true,
      data: {
        requests: rows,
        canReview: gate.membership!.canActForCompany,
        summary: {
          pending: rows.filter((r: any) => r.status === 'pending_company').length,
          approved: rows.filter((r: any) => r.status === 'approved').length,
          rejected: rows.filter((r: any) => r.status === 'rejected').length,
        },
      },
    });
  } catch (error) {
    console.error('[Company] List dispute requests error:', error);
    res.status(500).json({ error: 'Failed to load issue requests' });
  }
});

// POST /api/companies/:companyId/dispute-requests/:id/decide — owner/manager approve or reject
router.post('/companies/:companyId/dispute-requests/:id/decide', authMiddleware, async (req: any, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const requestId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId, 10);
    const { decision, note } = req.body || {};

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be "approve" or "reject"' });
    }
    // Only owner/manager decide — and only a certified company can file a dispute
    const gate = await requireCompanyRole(userId, companyId, ['owner', 'manager'], {
      requireCertified: decision === 'approve',
    });
    if (!gate.ok) return res.status(gate.status || 403).json({ error: gate.error });

    // Lock the row so two managers clicking at once can't both file a dispute
    const client = await db.getClient();
    let reqRow: any;
    try {
      await client.query('BEGIN');
      const found = await client.query(
        `SELECT * FROM company_dispute_requests
          WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [requestId, companyId]
      );
      if (found.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Issue request not found' });
      }
      reqRow = found.rows[0];
      if (reqRow.status !== 'pending_company') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `This issue was already ${reqRow.status}.` });
      }

      if (decision === 'reject') {
        // Nothing touches the errand — it stays an internal record only
        await client.query(
          `UPDATE company_dispute_requests
              SET status = 'rejected', reviewed_by_id = $1, reviewed_at = NOW(),
                  review_note = $2, updated_at = NOW()
            WHERE id = $3`,
          [userId, note || null, requestId]
        );
      } else {
        await client.query(
          `UPDATE company_dispute_requests
              SET status = 'approved', reviewed_by_id = $1, reviewed_at = NOW(),
                  review_note = $2, updated_at = NOW()
            WHERE id = $3`,
          [userId, note || null, requestId]
        );
      }
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    if (decision === 'reject') {
      try {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id)
           VALUES ($1, 'company_dispute_request', $2, $3, $4)`,
          [
            reqRow.raised_by_staff_id,
            'Issue reviewed',
            note
              ? `Your issue was not taken forward as a dispute. Note from your manager: ${note}`
              : 'Your issue was reviewed and not taken forward as a dispute. It has been logged internally.',
            reqRow.errand_id,
          ]
        );
      } catch (notifyErr) {
        console.warn('[Company] Could not notify staff of rejection:', notifyErr);
      }
      return res.json({ success: true, data: { status: 'rejected', disputeId: null } });
    }

    // Approved — file the real dispute under the company. The approver is the
    // filer of record (they are authorised to act for the business); the staff
    // member who surfaced it is kept for the audit trail.
    const { createDispute, holdPayment } = await import('../services/disputeResolutionService.js');
    const filed = await createDispute({
      errandId: reqRow.errand_id,
      filedByUserId: userId,
      type: reqRow.dispute_type,
      description: reqRow.description,
      evidence: reqRow.evidence || undefined,
    });

    if (!filed.success || !filed.disputeId) {
      // Put it back in the queue rather than silently losing it
      await db.query(
        `UPDATE company_dispute_requests
            SET status = 'pending_company', reviewed_by_id = NULL, reviewed_at = NULL,
                updated_at = NOW()
          WHERE id = $1`,
        [requestId]
      );
      return res.status(500).json({ error: 'Could not file the dispute. The issue is still pending — please try again.' });
    }

    await db.query(
      `UPDATE disputes SET company_id = $1, raised_by_staff_id = $2 WHERE id = $3`,
      [companyId, reqRow.raised_by_staff_id, filed.disputeId]
    );
    await db.query(
      `UPDATE company_dispute_requests SET dispute_id = $1, updated_at = NOW() WHERE id = $2`,
      [filed.disputeId, requestId]
    );

    // Payment is held for the duration, same as any other dispute
    try {
      await holdPayment(reqRow.errand_id, `Dispute #${filed.disputeId} filed by company`);
    } catch (holdErr) {
      console.warn('[Company] Could not hold payment for dispute:', holdErr);
    }

    try {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_errand_id)
         VALUES ($1, 'company_dispute_request', $2, $3, $4)`,
        [
          reqRow.raised_by_staff_id,
          'Issue approved — dispute filed',
          `Your issue was approved and filed as a dispute (#${filed.disputeId}) under ${gate.membership!.companyName}.`,
          reqRow.errand_id,
        ]
      );
    } catch (notifyErr) {
      console.warn('[Company] Could not notify staff of approval:', notifyErr);
    }

    res.json({ success: true, data: { status: 'approved', disputeId: filed.disputeId } });
  } catch (error) {
    console.error('[Company] Decide dispute request error:', error);
    res.status(500).json({ error: 'Could not record that decision. Please try again.' });
  }
});

export default router;
