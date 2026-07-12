import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/demo/seed - Create demo owner, manager, and staff accounts
router.post('/seed', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    // Create demo owner user
    const ownerRes = await db.query(
      `INSERT INTO users (name, email, phone, user_type, email_verified, phone_verified)
       VALUES ($1, $2, $3, $4, true, true)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['Demo Owner', 'demo.owner@errandify.ai', '+6590000001', 'user']
    );
    const ownerId = ownerRes.rows[0].id;

    // Create demo company
    const companyRes = await db.query(
      `INSERT INTO companies (uen, name, description, owner_id, email, phone, address, postal_code, area, subscription_tier, company_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (uen) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        'UEN999999999',
        'Demo Company',
        'Demo company for testing staff allocation and management',
        ownerId,
        'demo@errandify.ai',
        '+6590000001',
        '123 Demo Street, Singapore 123456',
        '123456',
        'Bukit Merah',
        'silver',
        'active'
      ]
    );
    const companyId = companyRes.rows[0].id;

    // Add owner to company_employees as owner role
    await db.query(
      `INSERT INTO company_employees (company_id, user_id, role, status, date_joined)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [companyId, ownerId, 'owner', 'active']
    );

    // Create demo manager & staff accounts
    const employees = [
      { name: 'Demo Manager', email: 'demo.manager@errandify.ai', phone: '+6590000002', role: 'manager', skills: 'Cleaning, Customer Service, Coordination' },
      { name: 'Demo Staff 1', email: 'demo.staff1@errandify.ai', phone: '+6590000003', role: 'staff', skills: 'Delivery, Packing, Inventory' },
      { name: 'Demo Staff 2', email: 'demo.staff2@errandify.ai', phone: '+6590000004', role: 'staff', skills: 'Customer Support, Troubleshooting' }
    ];

    for (const emp of employees) {
      const empRes = await db.query(
        `INSERT INTO users (name, email, phone, user_type, email_verified, phone_verified, average_rating, skills)
         VALUES ($1, $2, $3, $4, true, true, $5, $6)
         ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [emp.name, emp.email, emp.phone, 'user', 4.8, emp.skills]
      );

      // Tag to company as staff member
      await db.query(
        `INSERT INTO company_employees (company_id, user_id, role, status, date_joined)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [companyId, empRes.rows[0].id, emp.role, 'active']
      );
    }

    res.status(201).json({
      success: true,
      message: 'Demo accounts seeded successfully',
      data: {
        company_id: companyId,
        owner: {
          id: ownerId,
          email: 'demo.owner@errandify.ai',
          phone: '+6590000001',
          name: 'Demo Owner'
        },
        manager: {
          email: 'demo.manager@errandify.ai',
          phone: '+6590000002',
          name: 'Demo Manager'
        },
        staff: [
          {
            email: 'demo.staff1@errandify.ai',
            phone: '+6590000003',
            name: 'Demo Staff 1'
          },
          {
            email: 'demo.staff2@errandify.ai',
            phone: '+6590000004',
            name: 'Demo Staff 2'
          }
        ]
      }
    });
  } catch (error: any) {
    console.error('Error seeding demo accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed demo accounts',
      error: error.message
    });
  }
});

export default router;
