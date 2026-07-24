import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const RoleToggle: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const canAccessAdmin = user?.role === 'admin' || user?.role === 'support_l2' || user?.role === 'support_l3';
  const currentRole = localStorage.getItem('current_role') || user?.role || 'asker';

  const handleRoleSwitch = async (newRole: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('current_role', newRole);
        navigate(data.redirect_url);
      } else {
        alert(data.error || 'Failed to switch role');
      }
    } catch (error) {
      console.error('Role switch error:', error);
      alert('Failed to switch role');
    } finally {
      setLoading(false);
      setShowDropdown(false);
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin': return { icon: '⚙️', label: 'Admin' };
      case 'doer': return { icon: '💼', label: 'Doer' };
      case 'asker': return { icon: '👤', label: 'Asker' };
      default: return { icon: '👤', label: 'User' };
    }
  };

  return (
    <div className="role-toggle">
      <div className="role-buttons">
        {user?.role === 'asker' && (
          <button
            onClick={() => handleRoleSwitch('asker')}
            className={`role-btn ${currentRole === 'asker' ? 'active' : ''}`}
            disabled={loading}
          >
            {getRoleDisplay('asker').icon} Asker
          </button>
        )}

        {(user?.role === 'doer' || user?.role === 'asker') && (
          <button
            onClick={() => handleRoleSwitch('doer')}
            className={`role-btn ${currentRole === 'doer' ? 'active' : ''}`}
            disabled={loading}
          >
            {getRoleDisplay('doer').icon} Doer
          </button>
        )}

        {canAccessAdmin && (
          <div className="dropdown">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`role-btn admin ${currentRole === 'admin' ? 'active' : ''}`}
              disabled={loading}
            >
              {getRoleDisplay('admin').icon} Admin ▼
            </button>

            {showDropdown && (
              <div className="dropdown-menu">
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className={`dropdown-item ${currentRole === 'admin' ? 'active' : ''}`}
                >
                  ⚙️ Switch to Admin
                </button>
                <button
                  onClick={() => handleRoleSwitch('asker')}
                  className={`dropdown-item ${currentRole === 'asker' ? 'active' : ''}`}
                >
                  👤 Back to Asker
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .role-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .role-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .role-btn {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .role-btn:hover:not(:disabled) {
          background: #f5f5f5;
          border-color: #bbb;
        }

        .role-btn.active {
          background: #B5651D;
          color: white;
          border-color: #B5651D;
        }

        .role-btn.admin {
          background: #1e293b;
          color: white;
          border-color: #0f172a;
        }

        .role-btn.admin.active {
          background: #0f172a;
        }

        .role-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          min-width: 160px;
          z-index: 1000;
          margin-top: 4px;
        }

        .dropdown-item {
          display: block;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        .dropdown-item:hover {
          background: #f5f5f5;
        }

        .dropdown-item.active {
          background: #FFF3E4;
          color: #B5651D;
          font-weight: 500;
        }

        .dropdown-item:first-child {
          border-radius: 6px 6px 0 0;
        }

        .dropdown-item:last-child {
          border-radius: 0 0 6px 6px;
        }
      `}</style>
    </div>
  );
};

export default RoleToggle;
