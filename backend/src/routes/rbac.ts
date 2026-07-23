import express, { Request, Response } from 'express';
import db from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Every route in this file was unauthenticated.
 *
 * The router is mounted at /api/admin, so these were reachable by anyone:
 * GET /api/admin/roles and /permissions returned 200 to an anonymous caller,
 * and POST /api/admin/roles created a role with no credentials at all —
 * verified against a running server, not inferred.
 *
 * That is a privilege-escalation path: roles are the thing that grants
 * administrative access, and they could be created, edited and deleted by
 * anybody who knew the URL. Applied at router level rather than per route so a
 * handler added later cannot be forgotten.
 */
router.use(authMiddleware, requireAdmin(['admin', 'super-admin']));

// Get all roles
router.get('/roles', async (req: Request, res: Response) => {
  try {
    // The dashboard prints "Users: n • Permissions: n" per role and had nothing
    // to print, so it showed 0 for a role holding 117 permissions. Counted here
    // rather than by a request per role from the client.
    const result = await db.query(`
      SELECT r.id, r.name, r.description, r.created_at,
             (SELECT COUNT(*) FROM rbac_role_permissions rp WHERE rp.role_id = r.id)::int
               AS permission_count,
             -- rbac_user_roles.user_id is varchar; compare as text, same as
             -- the /rbac-users join.
             (SELECT COUNT(*) FROM rbac_user_roles ur WHERE ur.role_id::text = r.id::text)::int
               AS user_count
      FROM rbac_roles r
      ORDER BY r.created_at ASC
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
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name'
      });
    }

    const result = await db.query(
      `INSERT INTO rbac_roles (name, description, created_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || '', new Date().toISOString()]
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
    const { name, description } = req.body;

    const result = await db.query(
      `UPDATE rbac_roles SET
        name = COALESCE($1, name),
        description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [name, description, id]
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
      'SELECT COUNT(*) as count FROM rbac_user_roles WHERE role_id = $1',
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
      SELECT id, permission_key, module, description
      FROM rbac_permissions
      ORDER BY module, permission_key
    `);

    // Group by module
    const grouped = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.module]) {
        acc[row.module] = [];
      }
      acc[row.module].push({
        id: row.id,
        key: row.permission_key,
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
// Renamed from '/users'. admin.ts is mounted first and now serves
// GET /api/admin/users for platform user management, which would silently
// shadow this one — two different payloads behind one path is a trap. This
// role-annotated list keeps its own address.
router.get('/rbac-users', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      -- users has no 'name' or 'department' column; display names live in
      -- display_name with alias taking precedence. This query 500'd every time.
      SELECT u.id, COALESCE(u.alias, u.display_name) AS name, u.email,
        ARRAY_REMOVE(ARRAY_AGG(r.name), NULL) as roles, u.created_at
      FROM users u
      -- rbac_user_roles.user_id is varchar while users.id is integer, so this
      -- join needs an explicit cast; without it Postgres raises
      -- "operator does not exist: character varying = integer".
      LEFT JOIN rbac_user_roles ur ON u.id::text = ur.user_id
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
      'SELECT id FROM rbac_user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Role already assigned to user'
      });
    }

    const result = await db.query(
      `INSERT INTO rbac_user_roles (user_id, role_id, assigned_at)
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
      'DELETE FROM rbac_user_roles WHERE user_id = $1 AND role_id = $2 RETURNING id',
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
       INNER JOIN rbac_user_roles ur ON r.id = ur.role_id
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

// Get permissions for a role
router.get('/roles/:roleId/permissions', async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const result = await db.query(`
      SELECT p.id, p.permission_key, p.module, p.description
      FROM rbac_permissions p
      INNER JOIN rbac_role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.permission_key
    `, [roleId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[RBAC] Get role permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch role permissions' });
  }
});

// Assign permissions to a role
router.post('/roles/:roleId/permissions', async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        error: 'permissionIds must be an array'
      });
    }

    // Delete existing permissions for this role
    await db.query('DELETE FROM rbac_role_permissions WHERE role_id = $1', [roleId]);

    // Insert new permissions
    for (const permId of permissionIds) {
      await db.query(
        'INSERT INTO rbac_role_permissions (role_id, permission_id) VALUES ($1, $2)',
        [roleId, permId]
      );
    }

    res.json({ success: true, message: `Assigned ${permissionIds.length} permissions to role` });
  } catch (error) {
    console.error('[RBAC] Assign role permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign permissions' });
  }
});

export default router;
