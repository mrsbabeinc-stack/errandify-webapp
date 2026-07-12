import { Router, Request, Response } from 'express';
import pool from '../db';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/demo/seed - Create demo company for testing
router.post('/seed', authMiddleware, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create demo owner user
    const ownerRes = await client.query(
      `INSERT INTO users (name, email, phone, user_type, email_verified, phone_verified)
       VALUES ($1, $2, $3, $4, true, true)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['John Lim', 'john.lim@rumahemas.sg', '+6581234567', 'user']
    );
    const ownerId = ownerRes.rows[0].id;

    // Create demo company
    const companyRes = await client.query(
      `INSERT INTO companies (uen, name, description, owner_id, email, phone, address, postal_code, area, subscription_tier, company_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (uen) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        'UEN202401001',
        'Rumah Emas Demo Company',
        'Demo company for testing the Errandify company module',
        ownerId,
        'contact@rumahemas.sg',
        '+6565123456',
        '101 Tanjong Pagar Road, Singapore 088518',
        '088518',
        'Tanjong Pagar',
        'silver',
        'active'
      ]
    );
    const companyId = companyRes.rows[0].id;

    // Create demo employees
    const employees = [
      { name: 'Sarah Wong', email: 'sarah.wong@rumahemas.sg', phone: '+6587654321', role: 'manager', skills: 'Cleaning, Customer Service, Coordination' },
      { name: 'Priya Kumar', email: 'priya.kumar@rumahemas.sg', phone: '+6581112222', role: 'employee', skills: 'Delivery, Packing, Inventory' },
      { name: 'Ahmad Hassan', email: 'ahmad.hassan@rumahemas.sg', phone: '+6583334444', role: 'employee', skills: 'Customer Support, Troubleshooting' }
    ];

    const employeeIds = [];
    for (const emp of employees) {
      const empRes = await client.query(
        `INSERT INTO users (name, email, phone, user_type, email_verified, phone_verified)
         VALUES ($1, $2, $3, $4, true, true)
         ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [emp.name, emp.email, emp.phone, 'user']
      );
      employeeIds.push(empRes.rows[0].id);

      // Tag to company
      await client.query(
        `INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [companyId, empRes.rows[0].id, emp.role, emp.skills, 'active']
      );
    }

    // Create company wallet
    await client.query(
      `INSERT INTO company_wallets (company_id, balance, total_earned, total_withdrawn)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id) DO UPDATE SET balance = EXCLUDED.balance`,
      [companyId, 500.00, 1250.00, 750.00]
    );

    // Create company subscription
    await client.query(
      `INSERT INTO company_subscriptions (company_id, tier, monthly_fee, start_date, status)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (company_id) DO UPDATE SET tier = EXCLUDED.tier`,
      [companyId, 'silver', 99.00, 'active']
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Demo company seeded successfully',
      data: {
        company_id: companyId,
        owner_id: ownerId,
        owner_email: 'john.lim@rumahemas.sg',
        company_name: 'Rumah Emas Demo Company',
        employees_count: 3,
        employee_details: employees,
        wallet_balance: 500.00,
        subscription_tier: 'silver'
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error seeding demo company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed demo company',
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;
