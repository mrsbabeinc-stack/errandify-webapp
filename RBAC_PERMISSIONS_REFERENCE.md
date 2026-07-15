# RBAC (Role-Based Access Control) - Comprehensive Permissions Reference

**Date:** 2026-07-15 | **Status:** Production Ready | **Total Permissions:** 100+ | **Total Roles:** 7

---

## Overview

This document outlines all available permissions across 20+ modules in Errandify and how they map to the 7 pre-configured roles.

---

## Module Breakdown & Permissions

### 1. Accounts & Ledger (8 permissions)
- `accounts.view` - View account records
- `accounts.create` - Create new accounts
- `accounts.edit` - Edit account details
- `accounts.delete` - Delete accounts
- `accounts.export` - Export account data
- `accounts.reconcile` - Reconcile account balances
- `accounts.ledger_view` - View ledger entries
- `accounts.ledger_edit` - Edit ledger entries

### 2. HR & Staff Management (7 permissions)
- `hr.view` - View HR records
- `hr.create` - Create HR records
- `hr.edit` - Edit HR records
- `hr.delete` - Delete HR records
- `hr.manage_staff` - Manage staff members
- `hr.staff_info_edit` - Edit staff information
- `hr.staff_info_delete` - Delete staff records

### 3. Payroll & Compensation (8 permissions)
- `payroll.view` - View payroll data
- `payroll.create` - Create payroll records
- `payroll.edit` - Edit payroll records
- `payroll.process` - Process payroll
- `payroll.export` - Export payroll
- `salary.view` - View salary information
- `salary.edit` - Edit salary and benefits
- `salary.allowances` - Manage allowances
- `salary.benefits` - Manage benefits

### 4. Leave Management (9 permissions)
- `leave.view` - View leave records
- `leave.apply` - Apply for leave
- `leave.approve` - Approve leave requests
- `leave.reject` - Reject leave requests
- `leave.manage` - Manage all leave
- `leave.calendar` - View leave calendar
- `holidays.view` - View holidays
- `holidays.manage` - Manage holidays

### 5. Expense Claims & Reimbursement (5 permissions)
- `claims.view` - View expense claims
- `claims.create` - Create claims
- `claims.approve` - Approve claims
- `claims.reject` - Reject claims
- `claims.process` - Process claims

### 6. Financial Reports & Analytics (4 permissions)
- `reports.view` - View financial reports
- `reports.generate` - Generate reports
- `reports.export` - Export reports
- `reports.ai_insights` - Access AI-powered insights

### 7. Invoicing & Billing (5 permissions)
- `invoicing.view` - View invoices
- `invoicing.create` - Create invoices
- `invoicing.edit` - Edit invoices
- `invoicing.send` - Send invoices
- `invoicing.payment_track` - Track payments

### 8. Vendor Management (5 permissions)
- `vendors.view` - View vendors
- `vendors.create` - Create vendors
- `vendors.edit` - Edit vendors
- `vendors.delete` - Delete vendors
- `vendors.manage` - Full vendor management

### 9. Client Management (5 permissions)
- `clients.view` - View clients
- `clients.create` - Create clients
- `clients.edit` - Edit clients
- `clients.delete` - Delete clients
- `clients.manage` - Full client management

### 10. Recruitment & Hiring (5 permissions)
- `recruitment.view` - View recruitment data
- `recruitment.post_job` - Post job openings
- `recruitment.review_apps` - Review applications
- `recruitment.interview` - Conduct interviews
- `recruitment.hire` - Hire candidates

### 11. Errand Management (5 permissions)
- `errands.view` - View errands
- `errands.create` - Create errands
- `errands.edit` - Edit errands
- `errands.allocate` - Allocate errands to staff
- `errands.review` - Review errand completion

### 12. Cases & Dispute Resolution (5 permissions)
- `cases.view` - View cases
- `cases.create` - Create cases
- `cases.investigate` - Investigate cases
- `cases.resolve` - Resolve cases
- `cases.manage` - Manage all cases

### 13. Advertising & Marketing (4 permissions)
- `advertising.view` - View campaigns
- `advertising.create` - Create campaigns
- `advertising.approve` - Approve campaigns
- `advertising.manage` - Manage all campaigns

### 14. Content & Blog (5 permissions)
- `blog.view` - View articles
- `blog.create` - Create articles
- `blog.edit` - Edit articles
- `blog.delete` - Delete articles
- `blog.publish` - Publish articles

### 15. Email Campaigns (4 permissions)
- `email.view` - View email campaigns
- `email.create` - Create campaigns
- `email.send` - Send campaigns
- `email.analytics` - View analytics

### 16. Events Management (5 permissions)
- `events.view` - View events
- `events.create` - Create events
- `events.edit` - Edit events
- `events.delete` - Delete events
- `events.manage` - Manage all events

### 17. Errandify Points & Rewards (4 permissions)
- `points.view` - View points
- `points.grant` - Grant points
- `points.rules` - Manage earning rules
- `points.redemption` - Manage redemptions

### 18. User Management & Safety (8 permissions)
- `users.view` - View users
- `users.create` - Create users
- `users.edit` - Edit users
- `users.delete` - Delete users
- `users.ban` - Ban users
- `safety.view` - View safety alerts
- `safety.manage` - Manage safety issues

### 19. Discounts & Promotions (3 permissions)
- `discounts.view` - View discount codes
- `discounts.create` - Create codes
- `discounts.manage` - Manage codes

### 20. Payments & Transactions (3 permissions)
- `payments.view` - View payments
- `payments.process` - Process payments
- `payments.refund` - Issue refunds

### 21. Notifications & Alerts (3 permissions)
- `notifications.view` - View notifications
- `notifications.create` - Create notifications
- `notifications.manage` - Manage notifications

### 22. System & Admin (8 permissions)
- `admin.view` - View admin panel
- `admin.manage_users` - Manage users
- `admin.manage_roles` - Manage roles
- `admin.settings` - Access settings
- `admin.system_config` - Configure system
- `admin.audit_logs` - View audit logs
- `admin.compliance` - Access compliance
- `admin.auth` - Manage authentication

---

## Pre-configured Roles

### 1. 👑 Administrator
**Description:** Full system access - all modules and operations  
**Permissions:** 80+ (all permissions)

**Access to:**
- All Accounts operations (view, create, edit, delete, export, reconcile, ledger)
- All HR operations (view, create, edit, delete, manage staff)
- All Payroll operations (view, create, edit, process, export)
- All Salary management (view, edit, allowances, benefits)
- All Leave management (view, apply, approve, reject, manage, calendar)
- All Holiday management (view, manage)
- All Expense claims (view, create, approve, reject, process)
- All Reports (view, generate, export, AI insights)
- All Invoicing (view, create, edit, send, payment tracking)
- All Vendor management (view, create, edit, delete, manage)
- All Client management (view, create, edit, delete, manage)
- All Recruitment (view, post, review, interview, hire)
- All Errand management (view, create, edit, allocate, review)
- All Cases (view, create, investigate, resolve, manage)
- All Marketing (advertising, blog, email, events, discounts)
- All Errandify Points (view, grant, rules, redemption)
- All User management (view, create, edit, delete, ban)
- All Safety (view, manage)
- All Payments (view, process, refund)
- All Notifications (view, create, manage)
- All Admin functions (view, manage users/roles, settings, config, logs, compliance, auth)

---

### 2. 💰 Finance Manager
**Description:** Manage financial operations and reporting  
**Permissions:** 25+

**Access to:**
- Accounts (view, create, edit, export, reconcile, ledger view)
- Payroll (view, create, edit, process, export)
- Salary (view only)
- Expense Claims (view, approve, reject, process)
- Reports (view, generate, export)
- Invoicing (view, create, edit, send, payment tracking)
- Vendors (view, create, edit, manage)
- Clients (view, create, edit)
- Payments (view, process, refund)
- Admin (view, audit logs)

---

### 3. 👥 HR Manager
**Description:** Manage HR operations, staff, and leave  
**Permissions:** 30+

**Access to:**
- HR (view, create, edit, manage staff, staff info edit)
- Payroll (view only)
- Salary (view, edit, allowances, benefits)
- Leave (view, apply, approve, reject, manage, calendar)
- Holidays (view, manage)
- Expense Claims (view, approve, reject)
- Recruitment (view, post, review, interview, hire)
- Errandify Points (view, grant)
- User Management (view, create, edit)
- Notifications (view, create)
- Admin (view, audit logs)

---

### 4. 🏢 Operations Manager
**Description:** Manage errands, cases, and operational tasks  
**Permissions:** 15+

**Access to:**
- Errand Management (view, create, edit, allocate, review)
- Cases (view, create, investigate, resolve)
- Leave (view, calendar)
- Expense Claims (view)
- Payments (view)
- Notifications (view)
- Admin (view, audit logs)

---

### 5. 📱 Marketing Manager
**Description:** Manage advertising, events, and promotions  
**Permissions:** 20+

**Access to:**
- Advertising (view, create, approve, manage)
- Blog & Articles (view, create, edit, publish)
- Email Campaigns (view, create, send, analytics)
- Events (view, create, edit, manage)
- Discounts (view, create, manage)
- Errandify Points (view)
- Notifications (view, create, manage)
- Admin (view, audit logs)

---

### 6. 👤 Staff Member
**Description:** Basic employee access  
**Permissions:** 10+

**Access to:**
- HR (view)
- Leave (view, apply, calendar)
- Expense Claims (view, create)
- Reports (view)
- Invoicing (view)
- Clients (view)
- Errandify Points (view)
- Payments (view)
- Notifications (view)

---

### 7. 👁️ Viewer
**Description:** Read-only access to all modules  
**Permissions:** 20+ (all view permissions)

**Access to:**
- View-only across ALL modules
- No create/edit/delete/manage permissions
- No admin access

---

## Permission Hierarchy

```
Administrator (Full Access)
├── Finance Manager
├── HR Manager
├── Operations Manager
├── Marketing Manager
├── Staff Member
└── Viewer
```

---

## Implementation in Frontend

To check if a user has a permission:

```typescript
import { rbacAPI } from './services/adminAPI';

// Check single permission
const canApprove = await rbacAPI.checkPermission(userId, 'leave.approve');

// Check multiple permissions
const canManagePayroll = await rbacAPI.checkPermission(userId, 'payroll.process');
```

To restrict a component:

```typescript
{userPermissions.includes('leave.approve') && (
  <button onClick={handleApprove}>Approve Leave</button>
)}
```

---

## Best Practices

1. **Principle of Least Privilege** - Assign only the minimum permissions required
2. **Regular Audits** - Review user permissions quarterly
3. **Role-based Assignment** - Use roles instead of individual permissions
4. **Compliance Tracking** - Monitor who performs sensitive operations
5. **Separation of Duties** - Prevent conflicts of interest with role splits

---

## Adding New Permissions

To add a new permission:

1. **Add to migration** in `008_staff_salary_holidays_rbac.ts`:
   ```sql
   ('module.action', 'Module Name', 'Description')
   ```

2. **Update relevant roles** with the new permission array

3. **Deploy migration** to update database

4. **Update frontend** to check permission before showing UI

---

**Total Coverage:** 20+ modules | 100+ permissions | 7 roles | Production Ready ✅
