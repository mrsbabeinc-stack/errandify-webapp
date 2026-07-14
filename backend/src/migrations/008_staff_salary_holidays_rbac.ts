import { Pool } from 'pg';

export async function up(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Create staff table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        staff_id VARCHAR(10) UNIQUE NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        nric VARCHAR(20) UNIQUE,
        department VARCHAR(100),
        position VARCHAR(100),
        hire_date DATE,
        employment_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        base_salary DECIMAL(12, 2),
        annual_leave_entitlement INT DEFAULT 12,
        sick_leave_entitlement INT DEFAULT 4,
        cpf_membership_no VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
      CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
    `);

    // Create staff_salary table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_salary (
        id SERIAL PRIMARY KEY,
        staff_id VARCHAR(10) NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        staff_name VARCHAR(255),
        position VARCHAR(100),
        department VARCHAR(100),
        base_salary DECIMAL(12, 2),
        total_allowances DECIMAL(12, 2) DEFAULT 0,
        gross_salary DECIMAL(12, 2),
        notes TEXT,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id)
      );
      CREATE INDEX IF NOT EXISTS idx_staff_salary_staff_id ON staff_salary(staff_id);
    `);

    // Create staff_allowances table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_allowances (
        id SERIAL PRIMARY KEY,
        staff_salary_id INT NOT NULL REFERENCES staff_salary(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        frequency VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_staff_allowances_salary_id ON staff_allowances(staff_salary_id);
    `);

    // Create staff_benefits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_benefits (
        id SERIAL PRIMARY KEY,
        staff_salary_id INT NOT NULL REFERENCES staff_salary(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2),
        frequency VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_staff_benefits_salary_id ON staff_benefits(staff_salary_id);
    `);

    // Create holidays table
    await client.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        holiday_type VARCHAR(50),
        emoji VARCHAR(10),
        description TEXT,
        apply_to_staff VARCHAR(50) DEFAULT 'all',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
      CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(holiday_type);
    `);

    // Create rbac_roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rbac_roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        role_type VARCHAR(50),
        permissions TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_rbac_roles_name ON rbac_roles(name);
    `);

    // Create rbac_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rbac_permissions (
        id SERIAL PRIMARY KEY,
        permission_code VARCHAR(100) NOT NULL UNIQUE,
        module VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_rbac_permissions_module ON rbac_permissions(module);
    `);

    // Create user_roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id INT NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
    `);

    // Insert default Singapore holidays and permissions
    await client.query(`
      INSERT INTO holidays (name, date, holiday_type, emoji, description, apply_to_staff)
      VALUES
        ('New Year Day', '2024-01-01', 'Public Holiday', '🎉', 'Public Holiday', 'all'),
        ('Chinese New Year', '2024-02-10', 'Public Holiday', '🧧', 'Public Holiday', 'all'),
        ('Chinese New Year', '2024-02-11', 'Public Holiday', '🧧', 'Public Holiday', 'all'),
        ('Good Friday', '2024-03-29', 'Public Holiday', '✝️', 'Public Holiday', 'all'),
        ('Hari Raya Puasa', '2024-04-10', 'Public Holiday', '🌙', 'Public Holiday', 'all'),
        ('Labour Day', '2024-05-01', 'Public Holiday', '👷', 'Public Holiday', 'all'),
        ('Vesak Day', '2024-05-22', 'Public Holiday', '🙏', 'Public Holiday', 'all'),
        ('Hari Raya Haji', '2024-06-17', 'Public Holiday', '🕌', 'Public Holiday', 'all'),
        ('National Day', '2024-08-09', 'Public Holiday', '🇸🇬', 'Public Holiday', 'all'),
        ('Deepavali', '2024-11-01', 'Public Holiday', '🪔', 'Public Holiday', 'all'),
        ('Christmas Day', '2024-12-25', 'Public Holiday', '🎄', 'Public Holiday', 'all')
      ON CONFLICT DO NOTHING;
    `);

    // Insert default permissions
    await client.query(`
      INSERT INTO rbac_permissions (permission_code, module, description)
      VALUES
        -- Accounts Permissions
        ('accounts.view', 'Accounts', 'View accounts'),
        ('accounts.create', 'Accounts', 'Create accounts'),
        ('accounts.edit', 'Accounts', 'Edit accounts'),
        ('accounts.delete', 'Accounts', 'Delete accounts'),
        ('accounts.export', 'Accounts', 'Export accounts'),
        ('accounts.reconcile', 'Accounts', 'Reconcile accounts'),

        -- HR Permissions
        ('hr.view', 'HR', 'View HR records'),
        ('hr.create', 'HR', 'Create HR records'),
        ('hr.edit', 'HR', 'Edit HR records'),
        ('hr.delete', 'HR', 'Delete HR records'),
        ('hr.manage_staff', 'HR', 'Manage staff'),

        -- Payroll Permissions
        ('payroll.view', 'Payroll', 'View payroll'),
        ('payroll.create', 'Payroll', 'Create payroll'),
        ('payroll.process', 'Payroll', 'Process payroll'),
        ('payroll.export', 'Payroll', 'Export payroll'),

        -- Leave Permissions
        ('leave.view', 'Leave', 'View leave records'),
        ('leave.approve', 'Leave', 'Approve leave requests'),
        ('leave.manage', 'Leave', 'Manage leave'),

        -- Expense Claims
        ('claims.view', 'Expense Claims', 'View expense claims'),
        ('claims.approve', 'Expense Claims', 'Approve claims'),
        ('claims.process', 'Expense Claims', 'Process claims'),

        -- Financial Reports
        ('reports.view', 'Financial Reports', 'View reports'),
        ('reports.generate', 'Financial Reports', 'Generate reports'),
        ('reports.export', 'Financial Reports', 'Export reports'),

        -- Invoicing
        ('invoicing.view', 'Invoicing', 'View invoices'),
        ('invoicing.create', 'Invoicing', 'Create invoices'),
        ('invoicing.edit', 'Invoicing', 'Edit invoices'),
        ('invoicing.send', 'Invoicing', 'Send invoices'),

        -- Vendor Management
        ('vendors.view', 'Vendor Management', 'View vendors'),
        ('vendors.manage', 'Vendor Management', 'Manage vendors'),

        -- Client Management
        ('clients.view', 'Client Management', 'View clients'),
        ('clients.manage', 'Client Management', 'Manage clients'),

        -- Recruitment
        ('recruitment.view', 'Recruitment', 'View recruitment'),
        ('recruitment.post_job', 'Recruitment', 'Post job openings'),
        ('recruitment.review_apps', 'Recruitment', 'Review applications'),
        ('recruitment.hire', 'Recruitment', 'Hire candidates'),

        -- Admin
        ('admin.view', 'Admin', 'View admin panel'),
        ('admin.manage_users', 'Admin', 'Manage users'),
        ('admin.manage_roles', 'Admin', 'Manage roles'),
        ('admin.settings', 'Admin', 'Access settings')
      ON CONFLICT DO NOTHING;
    `);

    // Create default roles
    await client.query(`
      INSERT INTO rbac_roles (name, description, role_type, permissions)
      VALUES
        (
          'Administrator',
          'Full system access',
          'built-in',
          ARRAY[
            'accounts.view', 'accounts.create', 'accounts.edit', 'accounts.delete', 'accounts.export', 'accounts.reconcile',
            'hr.view', 'hr.create', 'hr.edit', 'hr.delete', 'hr.manage_staff',
            'payroll.view', 'payroll.create', 'payroll.process', 'payroll.export',
            'leave.view', 'leave.approve', 'leave.manage',
            'claims.view', 'claims.approve', 'claims.process',
            'reports.view', 'reports.generate', 'reports.export',
            'invoicing.view', 'invoicing.create', 'invoicing.edit', 'invoicing.send',
            'vendors.view', 'vendors.manage',
            'clients.view', 'clients.manage',
            'recruitment.view', 'recruitment.post_job', 'recruitment.review_apps', 'recruitment.hire',
            'admin.view', 'admin.manage_users', 'admin.manage_roles', 'admin.settings'
          ]
        ),
        (
          'Finance Manager',
          'Manage financial operations',
          'built-in',
          ARRAY[
            'accounts.view', 'accounts.create', 'accounts.edit', 'accounts.export', 'accounts.reconcile',
            'payroll.view', 'payroll.create', 'payroll.process', 'payroll.export',
            'claims.view', 'claims.approve', 'claims.process',
            'reports.view', 'reports.generate', 'reports.export',
            'invoicing.view', 'invoicing.create', 'invoicing.edit', 'invoicing.send',
            'vendors.view', 'vendors.manage',
            'clients.view'
          ]
        ),
        (
          'HR Manager',
          'Manage HR operations',
          'built-in',
          ARRAY[
            'hr.view', 'hr.create', 'hr.edit', 'hr.manage_staff',
            'payroll.view',
            'leave.view', 'leave.approve', 'leave.manage',
            'claims.view', 'claims.approve',
            'recruitment.view', 'recruitment.post_job', 'recruitment.review_apps', 'recruitment.hire'
          ]
        ),
        (
          'Staff Member',
          'Basic employee access',
          'built-in',
          ARRAY[
            'hr.view',
            'leave.view',
            'claims.view',
            'reports.view',
            'invoicing.view',
            'clients.view'
          ]
        ),
        (
          'Viewer',
          'Read-only access',
          'built-in',
          ARRAY[
            'accounts.view',
            'hr.view',
            'payroll.view',
            'leave.view',
            'claims.view',
            'reports.view',
            'invoicing.view',
            'vendors.view',
            'clients.view',
            'recruitment.view'
          ]
        )
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Migration 008: Staff, Salary, Holidays, RBAC tables created');
  } catch (error) {
    console.error('❌ Migration 008 failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DROP TABLE IF EXISTS user_roles CASCADE');
    await client.query('DROP TABLE IF EXISTS rbac_permissions CASCADE');
    await client.query('DROP TABLE IF EXISTS rbac_roles CASCADE');
    await client.query('DROP TABLE IF EXISTS holidays CASCADE');
    await client.query('DROP TABLE IF EXISTS staff_benefits CASCADE');
    await client.query('DROP TABLE IF EXISTS staff_allowances CASCADE');
    await client.query('DROP TABLE IF EXISTS staff_salary CASCADE');
    await client.query('DROP TABLE IF EXISTS staff CASCADE');

    console.log('✅ Migration 008 rolled back');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
