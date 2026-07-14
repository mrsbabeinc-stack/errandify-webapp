import express, { Request, Response } from 'express';
import db from '../db.js';

const router = express.Router();

// Get all roles
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT id, name, description, role_type, permissions, created_at, last_modified
      FROM rbac_roles
      ORDER BY created_at ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[RBAC] Get roles error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

// Get role by ID
router.get('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM rbac_roles WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[RBAC] Get role error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch role' });
  }
});

// Create role
router.post('/roles', async (req: Request, res: Response) => {
  try {
    const { name, description, role_type, permissions } = req.body;

    if (!name || !role_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, role_type'
      });
    }

    const result = await db.query(
      `INSERT INTO rbac_roles (name, description, role_type, permissions, created_at, last_modified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name, description || '', role_type, permissions || [],
        new Date().toISOString(), new Date().toISOString()
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[RBAC] Create role error:', error);
    res.status(500).json({ success: false, error: 'Failed to create role' });
  }
});

// Update role
router.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, role_type, permissions } = req.body;

    const result = await db.query(
      `UPDATE rbac_roles SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        role_type = COALESCE($3, role_type),
        permissions = COALESCE($4, permissions),
        last_modified = $5
       WHERE id = $6
       RETURNING *`,
      [name, description, role_type, permissions, new Date().toISOString(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[RBAC] Update role error:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

// Delete role
router.delete('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if role is assigned to users
    const assigned = await db.query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
      [id]
    );

    if (assigned.rows[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete role that is assigned to users'
      });
    }

    const result = await db.query('DELETE FROM rbac_roles WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    console.error('[RBAC] Delete role error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete role' });
  }
});

// Get all permissions
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT permission_code, module, description
      FROM rbac_permissions
      ORDER BY module, permission_code
    `);

    // Group by module
    const grouped = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.module]) {
        acc[row.module] = [];
      }
      acc[row.module].push({
        code: row.permission_code,
        description: row.description
      });
      return acc;
    }, {});

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('[RBAC] Get permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
});

// Get all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.department,
        ARRAY_AGG(r.name) as roles, u.created_at
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN rbac_roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[RBAC] Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Assign role to user
router.post('/users/:userId/roles/:roleId', async (req: Request, res: Response) => {
  try {
    const { userId, roleId } = req.params;

    // Check if already assigned
    const existing = await db.query(
      'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Role already assigned to user'
      });
    }

    const result = await db.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, roleId, new Date().toISOString()]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[RBAC] Assign role error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign role' });
  }
});

// Remove role from user
router.delete('/users/:userId/roles/:roleId', async (req: Request, res: Response) => {
  try {
    const { userId, roleId } = req.params;
    const result = await db.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING id',
      [userId, roleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    res.json({ success: true, message: 'Role removed from user' });
  } catch (error) {
    console.error('[RBAC] Remove role error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove role' });
  }
});

// Check user permission
router.post('/check-permission', async (req: Request, res: Response) => {
  try {
    const { userId, permissionCode } = req.body;

    if (!userId || !permissionCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or permissionCode'
      });
    }

    // Get all roles for user
    const userRoles = await db.query(
      `SELECT r.id, r.permissions FROM rbac_roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );

    // Check if any role has the permission
    const hasPermission = userRoles.rows.some((role: any) => {
      return role.permissions && role.permissions.includes(permissionCode);
    });

    res.json({ success: true, hasPermission });
  } catch (error) {
    console.error('[RBAC] Check permission error:', error);
    res.status(500).json({ success: false, error: 'Failed to check permission' });
  }
});

export default router;
