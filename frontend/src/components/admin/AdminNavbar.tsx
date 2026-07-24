import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminNavbarProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  onLogout?: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onMenuToggle, isMenuOpen = true, onLogout }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Get user from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const userName = user?.display_name || user?.name || 'Admin';

  const handleLogout = () => {
    if (onLogout) {
      // Use the App's logout handler which properly updates state and redirects
      onLogout();
    } else {
      // Fallback if onLogout prop is not provided: clear and redirect with hard reload
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('current_role');
      localStorage.removeItem('singpass_state');
      localStorage.removeItem('singpass_nonce');
      localStorage.removeItem('singpass_mode');
      // Use window.location.href for hard redirect to ensure /auth route is served
      window.location.href = '/auth';
    }
  };

  const handleBackToUser = () => {
    localStorage.setItem('current_role', 'asker');
    navigate('/home');
  };

  const handleBack = () => {
    // Go back a step; if there's no in-app history to pop (e.g. deep-linked
    // straight into a section), fall back to the admin dashboard so the button
    // is never a dead end.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <nav className="admin-navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <button
            className="menu-toggle"
            onClick={onMenuToggle}
            title={isMenuOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isMenuOpen ? '◀' : '▶'}
          </button>

          <button
            className="nav-back"
            onClick={handleBack}
            title="Back"
            aria-label="Back"
          >
            ←
          </button>

          <div className="navbar-brand">
            <span className="brand-icon">⚙️</span>
            <span className="brand-name">Errandify Admin</span>
          </div>
        </div>

        <div className="navbar-center">
          <div className="breadcrumb">
            {(() => {
              const path = location.pathname;
              if (path === '/admin/dashboard') return 'Home';
              if (path === '/admin/dashboard/users') return 'Users & Safety';
              if (path === '/admin/operations/auth-management') return 'Admin Users';
              if (path === '/admin/operations/user-management') return 'User Management';
              if (path === '/admin/dashboard/disputes') return 'Disputes (L1/L2/L3)';
              if (path === '/admin/cases') return 'Cases Management';
              if (path === '/admin/operations/errand-management') return 'Errand Management';
              if (path === '/admin/operations/payments') return 'Payments & Refunds';
              if (path === '/admin/config/audit-compliance') return 'Audit & Compliance';
              if (path === '/admin/config/alerts-notifications') return 'Alerts & Notifications';
              return 'Admin';
            })()}
          </div>
        </div>

        <div className="navbar-right">
          <div className="user-menu">
            <button
              className="user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="user-avatar">👤</span>
              <span className="user-name">{userName}</span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showUserMenu && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => navigate('/admin/settings')}>
                  ⚙️ Settings
                </button>
                <button className="dropdown-item" onClick={() => navigate('/admin/profile')}>
                  👤 Profile
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item" onClick={handleBackToUser}>
                  ← Back to User Mode
                </button>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .admin-navbar {
          height: 60px;
          background: linear-gradient(to right, #ff6b35, #ff8c42);
          border-bottom: 2px solid #ff5722;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          padding: 0 20px;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.2);
        }

        .navbar-content {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .navbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .menu-toggle {
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.1);
          color: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .menu-toggle:hover {
          background: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.5);
        }

        .nav-back {
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.1);
          color: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-back:hover {
          background: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.5);
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .brand-icon {
          font-size: 20px;
        }

        .brand-name {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
        }

        .navbar-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .breadcrumb {
          font-size: 13px;
          color: rgba(255,255,255,0.8);
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 20px;
          justify-content: flex-end;
          min-width: 0;
        }

        .user-menu {
          position: relative;
        }

        .user-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.15);
          color: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .user-button:hover {
          background: rgba(255,255,255,0.25);
          border-color: rgba(255,255,255,0.5);
        }

        .user-avatar {
          font-size: 14px;
        }

        .user-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dropdown-arrow {
          font-size: 10px;
          margin-left: 4px;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: #fff;
          border: 1px solid #ffb88c;
          border-radius: 6px;
          box-shadow: 0 8px 24px rgba(255, 107, 53, 0.15);
          min-width: 180px;
          margin-top: 4px;
          z-index: 1000;
          overflow: hidden;
        }

        .dropdown-item {
          display: block;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          color: #333;
          text-align: left;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .dropdown-item:hover {
          background: #fff5f0;
          color: #ff6b35;
        }

        .dropdown-item.logout {
          color: #ff6b35;
        }

        .dropdown-item.logout:hover {
          background: #ffe6d9;
        }

        .dropdown-divider {
          height: 1px;
          background: #ffb88c;
          margin: 4px 0;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .brand-name {
            display: none;
          }

          .navbar-center {
            display: none;
          }

          .user-name {
            max-width: 80px;
          }
        }
      `}</style>
    </nav>
  );
};

export default AdminNavbar;
