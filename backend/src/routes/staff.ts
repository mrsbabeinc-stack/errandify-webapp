import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import crypto from 'crypto';

const router = Router();

// Ensure tables exist
const initTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS company_staff_assignments (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        status VARCHAR(20) DEFAULT 'active',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        removed_at TIMESTAMP,
        notes TEXT,
        CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(company_id, user_id) WHERE status = 'active'
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS staff_invitations (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        user_id INTEGER,
        email VARCHAR(255) NOT NULL,
        invite_code VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'pending',
        invited_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        declined_at TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
        CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_company_staff_company_id ON company_staff_assignments(company_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_company_staff_user_id ON company_staff_assignments(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_staff_invitations_company ON staff_invitations(company_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email)`);
  } catch (error) {
    console.warn('Tables may already exist:', error instanceof Error ? error.message : error);
  }
};

initTables();

// POST /api/staff/invite - Company invites individual to join
router.post('/invite', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, email, user_id, role = 'staff' } = req.body;
    const inviting_user_id = parseInt(req.userId || '0', 10);

    if (!company_id || (!email && !user_id)) {
      return res.status(400).json({ success: false, error: 'company_id and (email or user_id) required' });
    }

    // Check if user is company admin/manager
    const adminCheck = await db.query(
      `SELECT * FROM company_staff_assignments
       WHERE company_id = $1 AND user_id = $2 AND role IN ('manager', 'supervisor')`,
      [company_id, inviting_user_id]
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Not authorized to invite staff' });
    }

    const invite_code = crypto.randomBytes(32).toString('hex');

    if (user_id) {
      // Invite existing user
      await db.query(
        `INSERT INTO staff_invitations (company_id, user_id, email, invite_code, invited_by_user_id, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         ON CONFLICT (invite_code) DO NOTHING`,
        [company_id, user_id, email, invite_code, inviting_user_id]
      );

      return res.json({
        success: true,
        message: `✅ Invitation sent to ${email}`,
        invite_code,
        user_id
      });
    } else {
      // Invite by email (not yet signed up)
      await db.query(
        `INSERT INTO staff_invitations (company_id, email, invite_code, invited_by_user_id, status)
         VALUES ($1, $2, $3, $4, 'pending')
         ON CONFLICT (invite_code) DO NOTHING`,
        [company_id, email, invite_code, inviting_user_id]
      );

      return res.json({
        success: true,
        message: `✅ Invitation sent to ${email}. They can sign up and accept.`,
        invite_code,
        email
      });
    }
  } catch (error) {
    console.error('Invite staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

// GET /api/staff/invitations - Get pending invitations for current user
router.get('/invitations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user_id = parseInt(req.userId || '0', 10);

    const invitations = await db.query(
      `SELECT
        si.id,
        si.invite_code,
        si.company_id,
        c.name as company_name,
        c.logo_url,
        si.status,
        si.created_at,
        si.expires_at
      FROM staff_invitations si
      JOIN companies c ON si.company_id = c.id
      WHERE (si.user_id = $1 OR si.email = (SELECT email FROM users WHERE id = $1))
      AND si.status IN ('pending')
      AND si.expires_at > NOW()
      ORDER BY si.created_at DESC`,
      [user_id]
    );

    res.json({
      success: true,
      data: invitations.rows
    });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invitations' });
  }
});

// POST /api/staff/accept-invite - Accept company invitation
router.post('/accept-invite', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { invite_code } = req.body;
    const user_id = parseInt(req.userId || '0', 10);

    if (!invite_code) {
      return res.status(400).json({ success: false, error: 'invite_code required' });
    }

    // Get invitation
    const inviteRes = await db.query(
      `SELECT * FROM staff_invitations WHERE invite_code = $1 AND status = 'pending' AND expires_at > NOW()`,
      [invite_code]
    );

    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired invitation' });
    }

    const invitation = inviteRes.rows[0];

    // Update invitation as accepted
    await db.query(
      `UPDATE staff_invitations SET status = 'accepted', user_id = $1, accepted_at = NOW() WHERE invite_code = $2`,
      [user_id, invite_code]
    );

    // Create or update assignment
    await db.query(
      `INSERT INTO company_staff_assignments (company_id, user_id, role, status)
       VALUES ($1, $2, 'staff', 'active')
       ON CONFLICT (company_id, user_id) DO UPDATE SET status = 'active'`,
      [invitation.company_id, user_id]
    );

    res.json({
      success: true,
      message: '✅ You have joined the company!',
      company_id: invitation.company_id
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept invitation' });
  }
});

// POST /api/staff/decline-invite - Decline invitation
router.post('/decline-invite', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { invite_code } = req.body;

    if (!invite_code) {
      return res.status(400).json({ success: false, error: 'invite_code required' });
    }

    await db.query(
      `UPDATE staff_invitations SET status = 'declined', declined_at = NOW() WHERE invite_code = $1`,
      [invite_code]
    );

    res.json({
      success: true,
      message: '✅ Invitation declined'
    });
  } catch (error) {
    console.error('Decline invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to decline invitation' });
  }
});

// GET /api/staff/members?company_id=X - List company staff
router.get('/members', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const company_id = req.query.company_id as string;

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'company_id required' });
    }

    const members = await db.query(
      `SELECT
        csa.id,
        csa.user_id,
        csa.role,
        csa.status,
        csa.assigned_at,
        u.display_name,
        u.email,
        u.errandify_points,
        (SELECT COUNT(*) FROM errands WHERE asker_id = u.id OR created_by_id = u.id) as task_count
      FROM company_staff_assignments csa
      JOIN users u ON csa.user_id = u.id
      WHERE csa.company_id = $1 AND csa.status = 'active'
      ORDER BY csa.assigned_at DESC`,
      [company_id]
    );

    res.json({
      success: true,
      data: members.rows
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff members' });
  }
});

// DELETE /api/staff/remove - Remove staff (keep user active)
router.delete('/remove', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, user_id } = req.body;
    const requester_id = parseInt(req.userId || '0', 10);

    if (!company_id || !user_id) {
      return res.status(400).json({ success: false, error: 'company_id and user_id required' });
    }

    // Check if requester is company admin/manager
    const adminCheck = await db.query(
      `SELECT * FROM company_staff_assignments
       WHERE company_id = $1 AND user_id = $2 AND role IN ('manager', 'supervisor')`,
      [company_id, requester_id]
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Not authorized to remove staff' });
    }

    // Remove staff (mark as removed, user account stays active)
    await db.query(
      `UPDATE company_staff_assignments
       SET status = 'removed', removed_at = NOW()
       WHERE company_id = $1 AND user_id = $2`,
      [company_id, user_id]
    );

    res.json({
      success: true,
      message: '✅ Staff member removed. User account remains active.',
      user_id
    });
  } catch (error) {
    console.error('Remove staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove staff' });
  }
});

// GET /api/staff/search - Search individuals to invite
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q, company_id } = req.query as { q: string; company_id: string };

    if (!q || !company_id) {
      return res.status(400).json({ success: false, error: 'q (search query) and company_id required' });
    }

    const searchPattern = `%${q}%`;

    const users = await db.query(
      `SELECT
        u.id,
        u.display_name,
        u.email,
        u.errandify_points,
        (SELECT COUNT(*) FROM errands WHERE asker_id = u.id) as task_count,
        CASE
          WHEN EXISTS(SELECT 1 FROM company_staff_assignments WHERE company_id = $2 AND user_id = u.id AND status = 'active')
          THEN 'already_staff'
          WHEN EXISTS(SELECT 1 FROM staff_invitations WHERE company_id = $2 AND user_id = u.id AND status = 'pending')
          THEN 'invited'
          ELSE 'available'
        END as status
      FROM users u
      WHERE (u.display_name ILIKE $1 OR u.email ILIKE $1)
      AND u.id NOT IN (
        SELECT user_id FROM company_staff_assignments
        WHERE company_id = $2 AND status = 'active'
      )
      LIMIT 20`,
      [searchPattern, company_id]
    );

    res.json({
      success: true,
      data: users.rows
    });
  } catch (error) {
    console.error('Search staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

export default router;
