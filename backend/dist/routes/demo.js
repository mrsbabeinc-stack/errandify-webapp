import { Router } from 'express';
import db from '../db.js';
const router = Router();
// POST /api/demo/seed - Create demo owner, manager, and staff accounts (PUBLIC - no auth required)
router.post('/seed', async (_req, res) => {
    try {
        // Create demo owner user (or get existing)
        let ownerId;
        try {
            const existingOwner = await db.query(`SELECT id FROM users WHERE mobile = $1 LIMIT 1`, ['+6590000001']);
            if (existingOwner.rows.length > 0) {
                ownerId = existingOwner.rows[0].id;
            }
            else {
                const ownerRes = await db.query(`INSERT INTO users (nric_hash, display_name, mobile, role)
           VALUES ($1, $2, $3, $4)
           RETURNING id`, ['hash_demo_owner', 'Demo Owner', '+6590000001', 'asker']);
                ownerId = ownerRes.rows[0].id;
            }
        }
        catch (error) {
            console.error('Error creating owner:', error);
            throw error;
        }
        // Create demo company (or get existing)
        let companyId;
        try {
            const existingCompany = await db.query(`SELECT id FROM companies WHERE uen = $1 LIMIT 1`, ['UEN999999999']);
            if (existingCompany.rows.length > 0) {
                companyId = existingCompany.rows[0].id;
            }
            else {
                const companyRes = await db.query(`INSERT INTO companies (uen, name, description, owner_id, email, phone, address, postal_code, area, subscription_tier, company_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`, [
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
                ]);
                companyId = companyRes.rows[0].id;
            }
        }
        catch (error) {
            // If companies table doesn't exist, default to 1
            console.log('Note: companies table may not exist yet, proceeding with demo staff creation');
            companyId = 1;
        }
        // Add owner to employees as owner role (if employees table exists)
        try {
            const existingOwnerAssignment = await db.query(`SELECT id FROM employees WHERE company_id = $1 AND user_id = $2 LIMIT 1`, [companyId, ownerId]);
            if (existingOwnerAssignment.rows.length === 0) {
                await db.query(`INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
           VALUES ($1, $2, $3, $4, $5, NOW())`, [companyId, ownerId, 'owner', 'Company Management', 'active']);
            }
        }
        catch (error) {
            console.log('Note: employees table may not exist, skipping owner assignment');
        }
        // Create demo manager & staff accounts
        const employees = [
            { name: 'Demo Manager', phone: '+6590000002', role: 'manager', skills: 'Cleaning, Customer Service, Coordination' },
            { name: 'Demo Staff 1', phone: '+6590000003', role: 'staff', skills: 'Delivery, Packing, Inventory' },
            { name: 'Demo Staff 2', phone: '+6590000004', role: 'staff', skills: 'Customer Support, Troubleshooting' }
        ];
        const staffIds = [];
        for (const emp of employees) {
            try {
                // Check if user already exists by phone
                const existingEmp = await db.query(`SELECT id FROM users WHERE mobile = $1 LIMIT 1`, [emp.phone]);
                let empId;
                if (existingEmp.rows.length > 0) {
                    empId = existingEmp.rows[0].id;
                }
                else {
                    const empRes = await db.query(`INSERT INTO users (nric_hash, display_name, mobile, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id`, [`hash_${emp.phone}`, emp.name, emp.phone, 'asker']);
                    empId = empRes.rows[0].id;
                }
                staffIds.push({ id: empId, ...emp });
                // Tag to company as staff member (if employees table exists)
                try {
                    const existingAssignment = await db.query(`SELECT id FROM employees WHERE company_id = $1 AND user_id = $2 LIMIT 1`, [companyId, empId]);
                    if (existingAssignment.rows.length === 0) {
                        await db.query(`INSERT INTO employees (company_id, user_id, role, skills, status, hire_date)
               VALUES ($1, $2, $3, $4, $5, NOW())`, [companyId, empId, emp.role, emp.skills, 'active']);
                    }
                }
                catch (error) {
                    console.log('Note: Could not assign employee to company');
                }
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Error seeding demo accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to seed demo accounts',
            error: error.message
        });
    }
});
export default router;
