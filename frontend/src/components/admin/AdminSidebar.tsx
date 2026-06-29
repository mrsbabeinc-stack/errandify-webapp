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
  { id: 'home', label: 'Home', icon: '🏠', path: '/admin/dashboard' },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    children: [
      { id: 'overview', label: 'Overview', icon: '🏠', path: '/admin/dashboard/overview' },
      { id: 'users', label: 'Users & Safety', icon: '👥', path: '/admin/dashboard/users' },
      { id: 'disputes', label: 'Disputes (L1/L2/L3)', icon: '💬', path: '/admin/dashboard/disputes' },
      { id: 'operations', label: 'Operations', icon: '📊', path: '/admin/dashboard/operations' },
      { id: 'regional', label: 'Regional', icon: '🌍', path: '/admin/dashboard/regional' },
    ]
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: '🛠️',
    children: [
      { id: 'categories', label: 'Categories', icon: '🏷️', path: '/admin/manage/categories' },
      { id: 'vouchers', label: 'Vouchers', icon: '🎟️', path: '/admin/manage/vouchers' },
      { id: 'points', label: 'Errandify Points', icon: '💰', path: '/admin/manage/points' },
      { id: 'discounts', label: 'Discount Codes', icon: '🏷️', path: '/admin/manage/discounts' },
    ]
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: '📧',
    children: [
      { id: 'email', label: 'Email Campaigns', icon: '📧', path: '/admin/comms/email' },
      { id: 'notifications', label: 'Notifications', icon: '📢', path: '/admin/comms/notifications' },
      { id: 'events', label: 'Event Reminders', icon: '🎉', path: '/admin/comms/events' },
      { id: 'blog', label: 'Blog & Articles', icon: '📰', path: '/admin/comms/blog' },
      { id: 'recognition', label: 'Recognition', icon: '🏆', path: '/admin/comms/recognition' },
      { id: 'feed', label: 'Community Feed', icon: '📰', path: '/admin/comms/feed' },
      { id: 'banners', label: 'Hero Banners', icon: '🎨', path: '/admin/comms/banners' },
    ]
  },
  {
    id: 'cases',
    label: 'Cases',
    icon: '📋',
    children: [
      { id: 'case-create', label: 'Case Creation', icon: '📋', path: '/admin/cases/create' },
      { id: 'case-detail', label: 'Case Details', icon: '🔍', path: '/admin/cases/detail' },
      { id: 'case-analytics', label: 'Case Analytics', icon: '📊', path: '/admin/cases/analytics' },
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: '📊',
    children: [
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['dashboard', 'reports'])
  );
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSection = (id: string) => {
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
                        <button
                          key={child.id}
                          className={`menu-item ${isActive(child.path) ? 'active' : ''}`}
                          onClick={() => child.path && navigate(child.path)}
                        >
                          <span className="icon">{child.icon}</span>
                          <span className="label">{child.label}</span>
                        </button>
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
          width: 280px;
          height: 100vh;
          background: linear-gradient(180deg, #fff5f0 0%, #fffbf7 100%);
          color: #333;
          border-right: 2px solid #ffb88c;
          overflow-y: auto;
          transition: width 0.3s ease;
          position: fixed;
          left: 0;
          top: 60px;
          z-index: 100;
          box-shadow: 2px 0 8px rgba(255, 107, 53, 0.08);
        }

        .admin-sidebar.closed {
          width: 0;
          overflow: hidden;
        }

        .sidebar-content {
          padding: 20px 0;
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
          padding: 12px 20px;
          border: none;
          background: none;
          color: #ff6b35;
          font-size: 14px;
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

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 20px 10px 28px;
          border: none;
          background: none;
          color: #666;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
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
