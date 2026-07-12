import { Router, Response } from 'express';
import db from '../db.js';

const router = Router();

// POST /api/demo/seed - Create demo owner, manager, and staff accounts (PUBLIC - no auth required)
router.post('/seed', async (_req: any, res: Response) => {
  try {
    // Create demo owner user
    const ownerRes = await db.query(
      `INSERT INTO users (nric_hash, display_name, mobile, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nric_hash) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      ['hash_demo_owner', 'Demo Owner', '+6590000001', 'asker']
    );
    const ownerId = ownerRes.rows[0].id;

    // Create demo company
    let companyId: number;
    try {
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
      companyId = companyRes.rows[0].id;
    } catch (error) {
      // If companies table doesn't exist, get or create it
      console.log('Note: companies table may not exist yet, proceeding with demo staff creation');
      companyId = 1; // Default to company_id 1 for testing
    }

    // Add owner to employees as owner role (if employees table exists)
    try {
      await db.query(
        `INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [companyId, ownerId, 'owner', 'Company Management', 'active']
      );
    } catch (error) {
      console.log('Note: employees table may not exist, skipping owner assignment');
    }

    // Create demo manager & staff accounts
    const employees = [
      { name: 'Demo Manager', phone: '+6590000002', role: 'manager', skills: 'Cleaning, Customer Service, Coordination' },
      { name: 'Demo Staff 1', phone: '+6590000003', role: 'staff', skills: 'Delivery, Packing, Inventory' },
      { name: 'Demo Staff 2', phone: '+6590000004', role: 'staff', skills: 'Customer Support, Troubleshooting' }
    ];

    const staffIds: any[] = [];
    for (const emp of employees) {
      try {
        const empRes = await db.query(
          `INSERT INTO users (nric_hash, display_name, mobile, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (nric_hash) DO UPDATE SET display_name = EXCLUDED.display_name
           RETURNING id`,
          [`hash_${emp.phone}`, emp.name, emp.phone, 'asker']
        );
        staffIds.push({ id: empRes.rows[0].id, ...emp });

        // Tag to company as staff member (if employees table exists)
        try {
          await db.query(
            `INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
            [companyId, empRes.rows[0].id, emp.role, emp.skills, 'active']
          );
        } catch (error) {
          console.log('Note: Could not assign employee to company');
        }
      } catch (error) {
        console.error(`Error creating staff ${emp.name}:`, error);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Demo accounts seeded successfully',
      data: {
        company_id: companyId,
        owner: {
          id: ownerId,
          phone: '+6590000001',
          name: 'Demo Owner'
        },
        staff: staffIds.map(s => ({
          id: s.id,
          phone: s.phone,
          name: s.name,
          role: s.role
        }))
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
