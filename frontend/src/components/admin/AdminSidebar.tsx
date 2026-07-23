import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { id: 'home', label: 'Dashboard', icon: '🏠', path: '/admin/dashboard' },
  { id: 'users-safety', label: 'Safety Monitoring', icon: '👥', path: '/admin/dashboard/users' },
  { id: 'screening-reviews', label: 'Screening Reviews', icon: '⚖️', path: '/admin/safety/screening-reviews' },
  {
    id: 'management',
    label: 'User & Admin Management',
    icon: '👥',
    children: [
      { id: 'admin-users', label: 'Admin Users', icon: '🔐', path: '/admin/operations/auth-management' },
      { id: 'user-management', label: 'User Management', icon: '🚫', path: '/admin/operations/user-management' },
    ]
  },
  {
    id: 'disputes-cases',
    label: 'Disputes & Cases',
    icon: '⚖️',
    children: [
      { id: 'disputes', label: 'Disputes (L1/L2/L3)', icon: '⚖️', path: '/admin/dashboard/disputes' },
      { id: 'cases', label: 'Case Management', icon: '📋', path: '/admin/cases' },
    ]
  },
  {
    id: 'operations-issues',
    label: 'Operations & Issues',
    icon: '📦',
    children: [
      { id: 'errand-management', label: 'Errand Management', icon: '📦', path: '/admin/operations/errand-management' },
      { id: 'payments', label: 'Payments & Refunds', icon: '💳', path: '/admin/operations/payments' },
      { id: 'audit-compliance', label: 'Audit & Compliance', icon: '📋', path: '/admin/config/audit-compliance' },
      { id: 'alerts-notifications', label: 'Alerts & Notifications', icon: '🔔', path: '/admin/config/alerts-notifications' },
    ]
  },
  {
    id: 'system-setup',
    label: 'System Setup',
    icon: '⚙️',
    children: [
      { id: 'system-config', label: 'System Configuration', icon: '⚙️', path: '/admin/config/system-configuration' },
      { id: 'company-deep', label: 'Company Deep Management', icon: '🏭', path: '/admin/config/company-management' },
      { id: 'categories', label: 'Categories', icon: '🏷️', path: '/admin/manage/categories' },
      { id: 'vouchers', label: 'Vouchers', icon: '🎟️', path: '/admin/manage/vouchers' },
      {
        id: 'points-section',
        label: 'Errandify Points',
        icon: '💰',
        children: [
          { id: 'points', label: 'EP Ledger', icon: '📊', path: '/admin/manage/points' },
          { id: 'grant-points', label: 'Grant EP', icon: '✨', path: '/admin/manage/grant-points' },
          { id: 'point-rules', label: 'EP Rules', icon: '📋', path: '/admin/manage/point-rules' },
        ]
      },
      { id: 'discounts', label: 'Discount Codes', icon: '🏷️', path: '/admin/manage/discounts' },
      { id: 'notification-test', label: 'Notification Test', icon: '🔔', path: '/admin/notification-test' },
    ]
  },
  {
    id: 'company-management',
    label: 'B2B Management',
    icon: '🏢',
    children: [
      { id: 'company-intelligence', label: 'Client Intelligence', icon: '🎯', path: '/admin/company/intelligence' },
      { id: 'company-mgmt', label: 'Client Management', icon: '👔', path: '/admin/company/management' },
      { id: 'subscriptions', label: 'Subscription Packages', icon: '📦', path: '/admin/company/subscriptions' },
      { id: 'advertising', label: 'Advertising Approval', icon: '📸', path: '/admin/company/advertising' },
      { id: 'partner-tiers', label: 'Partner Tiers', icon: '👑', path: '/admin/company/partner-tiers' },
    ]
  },
  {
    id: 'growth-acquisition',
    label: 'Growth & Acquisition',
    icon: '📈',
    children: [
      { id: 'lead-generation', label: 'Lead Generation', icon: '🎯', path: '/admin/growth/leads' },
      { id: 'referral-tracking', label: 'Referral Tracking', icon: '🎁', path: '/admin/referral-tracking' },
    ]
  },
  {
    id: 'payment-management',
    label: 'Payment Management',
    icon: '💳',
    children: [
      { id: 'payment-holds', label: 'Payment Holds & Disputes', icon: '⏳', path: '/admin/payment-management' },
    ]
  },
  {
    id: 'communications',
    label: 'Communications (Marcom)',
    icon: '📧',
    children: [
      { id: 'email', label: 'Email Campaigns', icon: '📧', path: '/admin/comms/email' },
      { id: 'notifications', label: 'Notifications', icon: '📢', path: '/admin/comms/notifications' },
      { id: 'events', label: 'Event Management', icon: '🎉', path: '/admin/comms/events' },
      { id: 'event-reminders', label: 'Event Reminders', icon: '⏰', path: '/admin/comms/event-reminders' },
      { id: 'blog', label: 'Blog & Articles', icon: '📰', path: '/admin/comms/blog' },
      { id: 'recognition', label: 'Recognition', icon: '🏆', path: '/admin/comms/recognition' },
      { id: 'feed', label: 'Community Feed', icon: '📰', path: '/admin/comms/feed' },
      { id: 'announcements', label: 'Announcements', icon: '📢', path: '/admin/comms/announcements' },
      { id: 'news', label: 'News', icon: '📰', path: '/admin/comms/news' },
      { id: 'banners', label: 'Hero Banners', icon: '🎨', path: '/admin/comms/banners' },
    ]
  },
  {
    id: 'human-resources',
    label: 'Human Resources',
    icon: '👥',
    children: [
      { id: 'staff-info', label: 'Staff Management', icon: '👤', path: '/admin/staff-info' },
      { id: 'recruitment', label: 'Recruitment & Onboarding', icon: '🎯', path: '/admin/recruitment' },
      {
        id: 'attendance-tracking',
        label: 'Attendance & Time',
        icon: '⏰',
        children: [
          { id: 'attendance', label: 'Dashboard', icon: '📊', path: '/admin/attendance' },
          // One timesheet screen, not two: the old 'Timesheets' entry pointed at
          // a mock-backed duplicate of this one.
          { id: 'timesheet-approvals', label: 'Timesheets', icon: '📋', path: '/admin/timesheet-approvals' },
          { id: 'attendance-reports', label: 'Reports', icon: '📈', path: '/admin/attendance-reports' },
        ]
      },
      {
        id: 'leave-time-off',
        label: 'Leave Management',
        icon: '🏖️',
        children: [
          { id: 'leave-mgmt', label: 'Leave Requests', icon: '📋', path: '/admin/leave-management' },
          { id: 'holidays', label: 'Holidays', icon: '📅', path: '/admin/holidays' },
        ]
      },
      { id: 'probation-mgmt', label: 'Probation Management', icon: '👤', path: '/admin/probation' },
    ]
  },
  {
    id: 'payroll-compensation',
    label: 'Payroll & Compensation',
    icon: '💸',
    children: [
      { id: 'staff-salary', label: 'Compensation & Benefits', icon: '💰', path: '/admin/staff-salary-benefits' },
      { id: 'payroll', label: 'Payroll Processing', icon: '💳', path: '/admin/payroll' },
    ]
  },
  {
    id: 'approvals-workflows',
    label: 'Approvals & Workflows',
    icon: '✓',
    children: [
      { id: 'approval-workflow', label: 'Approval Workflows', icon: '✓', path: '/admin/approvals' },
    ]
  },
  {
    id: 'finance-accounting',
    label: 'Finance & Accounting',
    icon: '📊',
    children: [
      { id: 'budget', label: 'Budget Management', icon: '💰', path: '/admin/budget' },
      { id: 'accounts', label: 'General Accounts', icon: '💳', path: '/admin/accounts' },
      { id: 'apar', label: 'AP/AR Management', icon: '📤📥', path: '/admin/apar' },
      { id: 'tax-mgmt', label: 'Tax Management', icon: '💰', path: '/admin/tax' },
      { id: 'fixed-assets', label: 'Fixed Assets & Depreciation', icon: '🏭', path: '/admin/fixed-assets' },
      { id: 'expense-claims', label: 'Expense Claims', icon: '📝', path: '/admin/expense-claims' },
      { id: 'invoicing', label: 'Invoicing & Billing', icon: '📋', path: '/admin/invoicing' },
      { id: 'vendor-mgmt', label: 'Vendor Management', icon: '🏢', path: '/admin/vendors' },
      { id: 'cash-flow', label: 'Cash Flow Forecasting', icon: '📈', path: '/admin/cash-flow' },
      { id: 'hr-accounts-reports', label: 'HR & Accounts Reports', icon: '📊', path: '/admin/hr-accounts-reports' },
      { id: 'financial-reports', label: 'Reports', icon: '📊', path: '/admin/financial-reports' },
      { id: 'clients', label: 'Clients & AR', icon: '👥', path: '/admin/clients' },
    ]
  },
  {
    id: 'integrations',
    label: 'Module Integrations',
    icon: '🔗',
    children: [
      { id: 'payroll-gl-int', label: 'Payroll → GL', icon: '💼', path: '/admin/payroll-gl' },
      { id: 'expense-ap-int', label: 'Expense → AP', icon: '📝', path: '/admin/expense-ap' },
      { id: 'leave-payroll-int', label: 'Leave → Payroll', icon: '🏖️', path: '/admin/leave-payroll' },
      { id: 'staff-budget-int', label: 'Staff → Budget', icon: '👥', path: '/admin/staff-budget' },
    ]
  },
  {
    id: 'reporting-analytics',
    label: 'Reporting & Analytics',
    icon: '📊',
    children: [
      { id: 'advanced-reporting', label: 'Advanced Reporting', icon: '📊', path: '/admin/advanced-reporting' },
      { id: 'ai-features', label: 'AI Features', icon: '🤖', path: '/admin/ai-features' },
    ]
  },
  {
    id: 'compliance-security',
    label: 'Compliance & Security',
    icon: '🔐',
    children: [
      { id: 'compliance', label: 'SG Compliance Center', icon: '🇸🇬', path: '/admin/compliance' },
      { id: 'security', label: 'Security & Encryption', icon: '🔐', path: '/admin/security' },
    ]
  },
  {
    id: 'admin-access',
    label: 'Admin & Access',
    icon: '⚙️',
    children: [
      { id: 'rbac', label: 'Access Control & Roles', icon: '🔐', path: '/admin/rbac' },
    ]
  },
  {
    id: 'hana-faq',
    label: 'Hana FAQ Knowledge Base',
    icon: '🤖',
    children: [
      { id: 'hana-faq-browser', label: 'FAQ Browser', icon: '📚', path: '/admin/hana-faq' },
      { id: 'hana-categories', label: 'FAQ Categories', icon: '📂', path: '/admin/hana-faq-categories' },
      { id: 'hana-manage', label: 'Manage FAQs', icon: '✏️', path: '/admin/hana-faq-manage' },
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: '📊',
    children: [
      { id: 'regional', label: 'Regional Performance', icon: '🌍', path: '/admin/dashboard/regional' },
      { id: 'financial', label: 'Financial Health', icon: '💰', path: '/admin/reports/financial' },
      { id: 'user-behavior', label: 'User Behavior', icon: '👥', path: '/admin/reports/user-behavior' },
      { id: 'market', label: 'Market Analysis', icon: '📈', path: '/admin/reports/market' },
      { id: 'category', label: 'Category Analysis', icon: '🎯', path: '/admin/reports/category' },
      { id: 'vulnerable', label: 'Vulnerable Users', icon: '👨‍👩‍👧‍👦', path: '/admin/reports/vulnerable' },
      { id: 'trends', label: 'Market Trends', icon: '🎓', path: '/admin/reports/trends' },
      { id: 'actions', label: 'Action Plans', icon: '🚀', path: '/admin/reports/actions' },
      { id: 'gtm', label: 'GTM & Acquisition', icon: '🎯', path: '/admin/reports/gtm' },
      { id: 'errand-perf', label: 'Errand Performance', icon: '⏱️', path: '/admin/reports/errand-perf' },
      { id: 'demographics', label: 'Demographics', icon: '👥', path: '/admin/reports/demographics' },
    ]
  },
];

export const AdminSidebar: React.FC<{ isOpen?: boolean }> = ({ isOpen = true }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine which section should be expanded based on current route
  const getActiveSections = () => {
    const pathname = location.pathname;
    const activeSections = new Set<string>();

    for (const item of menuItems) {
      if (item.children) {
        // Check if any child matches current path
        const hasActiveChild = item.children.some(child => {
          if (child.children) {
            // Check grandchildren too (level-2 subsections)
            return child.children.some(grandchild => grandchild.path && pathname.includes(grandchild.path));
          }
          return child.path && pathname.includes(child.path);
        });
        if (hasActiveChild) {
          activeSections.add(item.id);
          // Also add the active child section
          const activeChild = item.children.find(child => {
            if (child.children) {
              return child.children.some(grandchild => grandchild.path && pathname.includes(grandchild.path));
            }
            return child.path && pathname.includes(child.path);
          });
          if (activeChild) {
            activeSections.add(activeChild.id);
          }
        }
      }
    }
    return activeSections;
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(getActiveSections())
  );

  // Keep sections expanded when route changes - don't collapse
  React.useEffect(() => {
    const activeSections = getActiveSections();
    setExpandedSections(prev => new Set([...prev, ...activeSections]));
  }, [location.pathname]);

  const toggleSection = (id: string) => {
    // Allow multiple sections to be open at the same time
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (path?: string) => path && location.pathname === path;

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.id} className="menu-section">
              {item.children ? (
                <>
                  <button
                    className="menu-header"
                    onClick={() => toggleSection(item.id)}
                  >
                    <span className="icon">{item.icon}</span>
                    <span className="label">{item.label}</span>
                    <span className={`arrow ${expandedSections.has(item.id) ? 'open' : ''}`}>▼</span>
                  </button>

                  {expandedSections.has(item.id) && (
                    <div className="submenu">
                      {item.children.map((child) => (
                        <div key={child.id}>
                          {child.children ? (
                            <>
                              <button
                                className={`menu-item has-submenu ${expandedSections.has(child.id) ? 'open' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSection(child.id);
                                }}
                                style={{
                                  userSelect: 'none',
                                  transition: 'all 0.2s',
                                  cursor: 'pointer'
                                }}
                              >
                                <span className="icon">{child.icon}</span>
                                <span className="label">{child.label}</span>
                                <span className={`arrow ${expandedSections.has(child.id) ? 'open' : ''}`}>▶</span>
                              </button>
                              {expandedSections.has(child.id) && (
                                <div className="submenu level-2">
                                  {child.children.map((grandchild) => (
                                    <button
                                      key={grandchild.id}
                                      className={`menu-item ${isActive(grandchild.path) ? 'active' : ''}`}
                                      onClick={() => grandchild.path && navigate(grandchild.path)}
                                    >
                                      <span className="icon">{grandchild.icon}</span>
                                      <span className="label">{grandchild.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <button
                              className={`menu-item ${isActive(child.path) ? 'active' : ''}`}
                              onClick={() => child.path && navigate(child.path)}
                            >
                              <span className="icon">{child.icon}</span>
                              <span className="label">{child.label}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => item.path && navigate(item.path)}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>

      <style>{`
        .admin-sidebar {
          width: 240px;
          background: linear-gradient(180deg, #fff5f0 0%, #fffbf7 100%);
          color: #333;
          border-right: 2px solid #ffb88c;
          overflow-y: auto;
          transition: width 0.3s ease;
          flex-shrink: 0;
          box-shadow: 2px 0 8px rgba(255, 107, 53, 0.08);
        }

        .admin-sidebar.closed {
          width: 0;
          overflow: hidden;
        }

        .sidebar-content {
          padding: 12px 0;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .menu-section {
          display: flex;
          flex-direction: column;
        }

        .menu-header {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: none;
          color: #ff6b35;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .menu-header:hover {
          background: rgba(255, 107, 53, 0.08);
          color: #ff6b35;
        }

        .menu-header .icon {
          flex-shrink: 0;
          font-size: 16px;
        }

        .menu-header .label {
          flex: 1;
          min-width: 0;
        }

        .menu-header .arrow {
          flex-shrink: 0;
          font-size: 12px;
          transition: transform 0.2s;
        }

        .menu-header .arrow.open {
          transform: rotate(180deg);
        }

        .submenu {
          display: flex;
          flex-direction: column;
          background: rgba(255, 107, 53, 0.04);
          border-left: 2px solid #ff6b35;
        }

        .submenu.level-2 {
          background: rgba(255, 107, 53, 0.08);
          border-left: none;
          padding-left: 12px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 16px 10px 24px;
          border: none;
          background: none;
          color: #ff6b35;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .menu-item.has-submenu {
          padding: 8px 16px 8px 24px;
          font-weight: 600;
          color: #ff6b35;
          background: rgba(255, 107, 53, 0.05);
        }

        .menu-item.has-submenu:hover {
          background: rgba(255, 107, 53, 0.15);
        }

        .menu-item.has-submenu.open {
          background: rgba(255, 107, 53, 0.1);
        }

        .menu-item.has-submenu .arrow {
          font-size: 10px;
          margin-left: auto;
          transition: transform 0.2s;
        }

        .menu-item.has-submenu .arrow.open {
          transform: rotate(90deg);
        }

        .menu-item:hover {
          background: rgba(255, 107, 53, 0.1);
          color: #ff6b35;
        }

        .menu-item.active {
          background: rgba(255, 107, 53, 0.15);
          color: #ff6b35;
          border-left: 3px solid #ff6b35;
          padding-left: 25px;
          font-weight: 600;
        }

        .submenu.level-2 .menu-item {
          padding-left: 40px;
        }

        .submenu.level-2 .menu-item.active {
          padding-left: 37px;
        }

        .menu-item .icon {
          flex-shrink: 0;
          font-size: 16px;
        }

        .menu-item .label {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Scrollbar styling */
        .admin-sidebar::-webkit-scrollbar {
          width: 6px;
        }

        .admin-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }

        .admin-sidebar::-webkit-scrollbar-thumb {
          background: #ffb88c;
          border-radius: 3px;
        }

        .admin-sidebar::-webkit-scrollbar-thumb:hover {
          background: #ff8c42;
        }
      `}</style>
    </aside>
  );
};

export default AdminSidebar;
