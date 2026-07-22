export async function up(pool) {
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
        // Insert default permissions - COMPREHENSIVE MODULE COVERAGE
        await client.query(`
      INSERT INTO rbac_permissions (permission_code, module, description)
      VALUES
        -- Accounts & Ledger
        ('accounts.view', 'Accounts', 'View accounts'),
        ('accounts.create', 'Accounts', 'Create new accounts'),
        ('accounts.edit', 'Accounts', 'Edit accounts'),
        ('accounts.delete', 'Accounts', 'Delete accounts'),
        ('accounts.export', 'Accounts', 'Export account data'),
        ('accounts.reconcile', 'Accounts', 'Reconcile accounts'),
        ('accounts.ledger_view', 'Accounts', 'View ledger entries'),
        ('accounts.ledger_edit', 'Accounts', 'Edit ledger entries'),

        -- HR & Staff Management
        ('hr.view', 'HR', 'View HR records'),
        ('hr.create', 'HR', 'Create HR records'),
        ('hr.edit', 'HR', 'Edit HR records'),
        ('hr.delete', 'HR', 'Delete HR records'),
        ('hr.manage_staff', 'HR', 'Manage staff members'),
        ('hr.staff_info_edit', 'HR', 'Edit staff information'),
        ('hr.staff_info_delete', 'HR', 'Delete staff records'),

        -- Payroll & Compensation
        ('payroll.view', 'Payroll', 'View payroll'),
        ('payroll.create', 'Payroll', 'Create payroll records'),
        ('payroll.edit', 'Payroll', 'Edit payroll records'),
        ('payroll.process', 'Payroll', 'Process payroll'),
        ('payroll.export', 'Payroll', 'Export payroll'),
        ('salary.view', 'Salary', 'View salary information'),
        ('salary.edit', 'Salary', 'Edit salary and benefits'),
        ('salary.allowances', 'Salary', 'Manage allowances'),
        ('salary.benefits', 'Salary', 'Manage benefits'),

        -- Leave Management
        ('leave.view', 'Leave', 'View leave records'),
        ('leave.apply', 'Leave', 'Apply for leave'),
        ('leave.approve', 'Leave', 'Approve leave requests'),
        ('leave.reject', 'Leave', 'Reject leave requests'),
        ('leave.manage', 'Leave', 'Manage all leave'),
        ('leave.calendar', 'Leave', 'View leave calendar'),
        ('holidays.view', 'Holidays', 'View holidays'),
        ('holidays.manage', 'Holidays', 'Manage holidays'),

        -- Expense Claims & Reimbursement
        ('claims.view', 'Expense Claims', 'View expense claims'),
        ('claims.create', 'Expense Claims', 'Create claims'),
        ('claims.approve', 'Expense Claims', 'Approve claims'),
        ('claims.reject', 'Expense Claims', 'Reject claims'),
        ('claims.process', 'Expense Claims', 'Process claims'),

        -- Financial Reports & Analytics
        ('reports.view', 'Reports', 'View financial reports'),
        ('reports.generate', 'Reports', 'Generate reports'),
        ('reports.export', 'Reports', 'Export reports'),
        ('reports.ai_insights', 'Reports', 'Access AI-powered insights'),

        -- Invoicing & Billing
        ('invoicing.view', 'Invoicing', 'View invoices'),
        ('invoicing.create', 'Invoicing', 'Create invoices'),
        ('invoicing.edit', 'Invoicing', 'Edit invoices'),
        ('invoicing.send', 'Invoicing', 'Send invoices'),
        ('invoicing.payment_track', 'Invoicing', 'Track payments'),

        -- Vendor & Client Management
        ('vendors.view', 'Vendor Management', 'View vendors'),
        ('vendors.create', 'Vendor Management', 'Create vendors'),
        ('vendors.edit', 'Vendor Management', 'Edit vendors'),
        ('vendors.delete', 'Vendor Management', 'Delete vendors'),
        ('vendors.manage', 'Vendor Management', 'Full vendor management'),
        ('clients.view', 'Client Management', 'View clients'),
        ('clients.create', 'Client Management', 'Create clients'),
        ('clients.edit', 'Client Management', 'Edit clients'),
        ('clients.delete', 'Client Management', 'Delete clients'),
        ('clients.manage', 'Client Management', 'Full client management'),

        -- Recruitment & Hiring
        ('recruitment.view', 'Recruitment', 'View recruitment'),
        ('recruitment.post_job', 'Recruitment', 'Post job openings'),
        ('recruitment.review_apps', 'Recruitment', 'Review applications'),
        ('recruitment.interview', 'Recruitment', 'Conduct interviews'),
        ('recruitment.hire', 'Recruitment', 'Hire candidates'),

        -- Errand & Operations Management
        ('errands.view', 'Errand Management', 'View errands'),
        ('errands.create', 'Errand Management', 'Create errands'),
        ('errands.edit', 'Errand Management', 'Edit errands'),
        ('errands.allocate', 'Errand Management', 'Allocate errands'),
        ('errands.review', 'Errand Management', 'Review errand completion'),

        -- Cases & Dispute Resolution
        ('cases.view', 'Cases', 'View cases'),
        ('cases.create', 'Cases', 'Create cases'),
        ('cases.investigate', 'Cases', 'Investigate cases'),
        ('cases.resolve', 'Cases', 'Resolve cases'),
        ('cases.manage', 'Cases', 'Manage all cases'),

        -- Advertising & Marketing
        ('advertising.view', 'Advertising', 'View campaigns'),
        ('advertising.create', 'Advertising', 'Create campaigns'),
        ('advertising.approve', 'Advertising', 'Approve campaigns'),
        ('advertising.manage', 'Advertising', 'Manage all campaigns'),

        -- Content & Blog
        ('blog.view', 'Blog & Articles', 'View articles'),
        ('blog.create', 'Blog & Articles', 'Create articles'),
        ('blog.edit', 'Blog & Articles', 'Edit articles'),
        ('blog.delete', 'Blog & Articles', 'Delete articles'),
        ('blog.publish', 'Blog & Articles', 'Publish articles'),

        -- Email & Communications
        ('email.view', 'Email Campaigns', 'View email campaigns'),
        ('email.create', 'Email Campaigns', 'Create campaigns'),
        ('email.send', 'Email Campaigns', 'Send campaigns'),
        ('email.analytics', 'Email Campaigns', 'View analytics'),

        -- Events Management
        ('events.view', 'Events', 'View events'),
        ('events.create', 'Events', 'Create events'),
        ('events.edit', 'Events', 'Edit events'),
        ('events.delete', 'Events', 'Delete events'),
        ('events.manage', 'Events', 'Manage all events'),

        -- Errandify Points & Rewards
        ('points.view', 'Errandify Points', 'View points'),
        ('points.grant', 'Errandify Points', 'Grant points'),
        ('points.rules', 'Errandify Points', 'Manage earning rules'),
        ('points.redemption', 'Errandify Points', 'Manage redemptions'),

        -- User Management & Safety
        ('users.view', 'User Management', 'View users'),
        ('users.create', 'User Management', 'Create users'),
        ('users.edit', 'User Management', 'Edit users'),
        ('users.delete', 'User Management', 'Delete users'),
        ('users.ban', 'User Management', 'Ban users'),
        ('safety.view', 'Safety & Moderation', 'View safety alerts'),
        ('safety.manage', 'Safety & Moderation', 'Manage safety issues'),

        -- Discounts & Promotions
        ('discounts.view', 'Discount Codes', 'View discount codes'),
        ('discounts.create', 'Discount Codes', 'Create codes'),
        ('discounts.manage', 'Discount Codes', 'Manage codes'),

        -- Payments & Transactions
        ('payments.view', 'Payments', 'View payments'),
        ('payments.process', 'Payments', 'Process payments'),
        ('payments.refund', 'Payments', 'Issue refunds'),

        -- Notifications & Alerts
        ('notifications.view', 'Notifications', 'View notifications'),
        ('notifications.create', 'Notifications', 'Create notifications'),
        ('notifications.manage', 'Notifications', 'Manage notifications'),

        -- System & Admin
        ('admin.view', 'Admin', 'View admin panel'),
        ('admin.manage_users', 'Admin', 'Manage users'),
        ('admin.manage_roles', 'Admin', 'Manage roles'),
        ('admin.settings', 'Admin', 'Access settings'),
        ('admin.system_config', 'Admin', 'Configure system'),
        ('admin.audit_logs', 'Admin', 'View audit logs'),
        ('admin.compliance', 'Admin', 'Access compliance'),
        ('admin.auth', 'Admin', 'Manage authentication')
      ON CONFLICT DO NOTHING;
    `);
        // Create default roles with COMPREHENSIVE permissions
        await client.query(`
      INSERT INTO rbac_roles (name, description, role_type, permissions)
      VALUES
        (
          'Administrator',
          'Full system access - all modules and operations',
          'built-in',
          ARRAY[
            'accounts.view', 'accounts.create', 'accounts.edit', 'accounts.delete', 'accounts.export', 'accounts.reconcile', 'accounts.ledger_view', 'accounts.ledger_edit',
            'hr.view', 'hr.create', 'hr.edit', 'hr.delete', 'hr.manage_staff', 'hr.staff_info_edit', 'hr.staff_info_delete',
            'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.process', 'payroll.export',
            'salary.view', 'salary.edit', 'salary.allowances', 'salary.benefits',
            'leave.view', 'leave.apply', 'leave.approve', 'leave.reject', 'leave.manage', 'leave.calendar',
            'holidays.view', 'holidays.manage',
            'claims.view', 'claims.create', 'claims.approve', 'claims.reject', 'claims.process',
            'reports.view', 'reports.generate', 'reports.export', 'reports.ai_insights',
            'invoicing.view', 'invoicing.create', 'invoicing.edit', 'invoicing.send', 'invoicing.payment_track',
            'vendors.view', 'vendors.create', 'vendors.edit', 'vendors.delete', 'vendors.manage',
            'clients.view', 'clients.create', 'clients.edit', 'clients.delete', 'clients.manage',
            'recruitment.view', 'recruitment.post_job', 'recruitment.review_apps', 'recruitment.interview', 'recruitment.hire',
            'errands.view', 'errands.create', 'errands.edit', 'errands.allocate', 'errands.review',
            'cases.view', 'cases.create', 'cases.investigate', 'cases.resolve', 'cases.manage',
            'advertising.view', 'advertising.create', 'advertising.approve', 'advertising.manage',
            'blog.view', 'blog.create', 'blog.edit', 'blog.delete', 'blog.publish',
            'email.view', 'email.create', 'email.send', 'email.analytics',
            'events.view', 'events.create', 'events.edit', 'events.delete', 'events.manage',
            'points.view', 'points.grant', 'points.rules', 'points.redemption',
            'users.view', 'users.create', 'users.edit', 'users.delete', 'users.ban',
            'safety.view', 'safety.manage',
            'discounts.view', 'discounts.create', 'discounts.manage',
            'payments.view', 'payments.process', 'payments.refund',
            'notifications.view', 'notifications.create', 'notifications.manage',
            'admin.view', 'admin.manage_users', 'admin.manage_roles', 'admin.settings', 'admin.system_config', 'admin.audit_logs', 'admin.compliance', 'admin.auth'
          ]
        ),
        (
          'Finance Manager',
          'Manage financial operations and reporting',
          'built-in',
          ARRAY[
            'accounts.view', 'accounts.create', 'accounts.edit', 'accounts.export', 'accounts.reconcile', 'accounts.ledger_view',
            'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.process', 'payroll.export',
            'salary.view',
            'claims.view', 'claims.approve', 'claims.reject', 'claims.process',
            'reports.view', 'reports.generate', 'reports.export',
            'invoicing.view', 'invoicing.create', 'invoicing.edit', 'invoicing.send', 'invoicing.payment_track',
            'vendors.view', 'vendors.create', 'vendors.edit', 'vendors.manage',
            'clients.view', 'clients.create', 'clients.edit',
            'payments.view', 'payments.process', 'payments.refund',
            'admin.view', 'admin.audit_logs'
          ]
        ),
        (
          'HR Manager',
          'Manage HR operations, staff, and leave',
          'built-in',
          ARRAY[
            'hr.view', 'hr.create', 'hr.edit', 'hr.manage_staff', 'hr.staff_info_edit',
            'payroll.view',
            'salary.view', 'salary.edit', 'salary.allowances', 'salary.benefits',
            'leave.view', 'leave.apply', 'leave.approve', 'leave.reject', 'leave.manage', 'leave.calendar',
            'holidays.view', 'holidays.manage',
            'claims.view', 'claims.approve', 'claims.reject',
            'recruitment.view', 'recruitment.post_job', 'recruitment.review_apps', 'recruitment.interview', 'recruitment.hire',
            'points.view', 'points.grant',
            'users.view', 'users.create', 'users.edit',
            'notifications.view', 'notifications.create',
            'admin.view', 'admin.audit_logs'
          ]
        ),
        (
          'Operations Manager',
          'Manage errands, cases, and operational tasks',
          'built-in',
          ARRAY[
            'errands.view', 'errands.create', 'errands.edit', 'errands.allocate', 'errands.review',
            'cases.view', 'cases.create', 'cases.investigate', 'cases.resolve',
            'leave.view', 'leave.calendar',
            'claims.view',
            'payments.view',
            'notifications.view',
            'admin.view', 'admin.audit_logs'
          ]
        ),
        (
          'Marketing Manager',
          'Manage advertising, events, and promotions',
          'built-in',
          ARRAY[
            'advertising.view', 'advertising.create', 'advertising.approve', 'advertising.manage',
            'blog.view', 'blog.create', 'blog.edit', 'blog.publish',
            'email.view', 'email.create', 'email.send', 'email.analytics',
            'events.view', 'events.create', 'events.edit', 'events.manage',
            'discounts.view', 'discounts.create', 'discounts.manage',
            'points.view',
            'notifications.view', 'notifications.create', 'notifications.manage',
            'admin.view', 'admin.audit_logs'
          ]
        ),
        (
          'Staff Member',
          'Basic employee access',
          'built-in',
          ARRAY[
            'hr.view',
            'leave.view', 'leave.apply', 'leave.calendar',
            'claims.view', 'claims.create',
            'reports.view',
            'invoicing.view',
            'clients.view',
            'points.view',
            'payments.view',
            'notifications.view'
          ]
        ),
        (
          'Viewer',
          'Read-only access to all modules',
          'built-in',
          ARRAY[
            'accounts.view', 'accounts.ledger_view',
            'hr.view',
            'payroll.view',
            'salary.view',
            'leave.view', 'leave.calendar',
            'holidays.view',
            'claims.view',
            'reports.view',
            'invoicing.view',
            'vendors.view',
            'clients.view',
            'recruitment.view',
            'errands.view',
            'cases.view',
            'advertising.view',
            'blog.view',
            'email.view',
            'events.view',
            'points.view',
            'users.view',
            'discounts.view',
            'payments.view',
            'notifications.view',
            'admin.view'
          ]
        )
      ON CONFLICT DO NOTHING;
    `);
        console.log('✅ Migration 008: Staff, Salary, Holidays, RBAC tables created');
    }
    catch (error) {
        console.error('❌ Migration 008 failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
export async function down(pool) {
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
    }
    catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
