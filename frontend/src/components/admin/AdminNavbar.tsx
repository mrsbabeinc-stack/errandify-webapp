import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import RoleToggle from './RoleToggle';

interface AdminNavbarProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onMenuToggle, isMenuOpen = true }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBackToUser = () => {
    localStorage.setItem('current_role', 'asker');
    navigate('/myerrand');
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

          <div className="navbar-brand">
            <span className="brand-icon">⚙️</span>
            <span className="brand-name">Errandify Admin</span>
          </div>
        </div>

        <div className="navbar-center">
          <div className="breadcrumb">
            Dashboard → Overview
          </div>
        </div>

        <div className="navbar-right">
          <RoleToggle />

          <div className="user-menu">
            <button
              className="user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="user-avatar">👤</span>
              <span className="user-name">{user?.display_name || 'Admin'}</span>
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
          background: linear-gradient(to right, #0f1419, #1a1f2e);
          border-bottom: 1px solid #2d3748;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          padding: 0 20px;
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
          border: 1px solid #2d3748;
          background: transparent;
          color: #cbd5e0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .menu-toggle:hover {
          background: rgba(255,255,255,0.1);
          border-color: #4a5568;
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
          color: #e2e8f0;
          white-space: nowrap;
        }

        .navbar-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .breadcrumb {
          font-size: 13px;
          color: #a0aec0;
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
          border: 1px solid #2d3748;
          background: rgba(255,255,255,0.05);
          color: #cbd5e0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .user-button:hover {
          background: rgba(255,255,255,0.1);
          border-color: #4a5568;
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
          background: #1a1f2e;
          border: 1px solid #2d3748;
          border-radius: 6px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
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
          color: #cbd5e0;
          text-align: left;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .dropdown-item:hover {
          background: rgba(255,255,255,0.05);
          color: #e2e8f0;
        }

        .dropdown-item.logout {
          color: #f87171;
        }

        .dropdown-item.logout:hover {
          background: rgba(248, 113, 113, 0.1);
        }

        .dropdown-divider {
          height: 1px;
          background: #2d3748;
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
