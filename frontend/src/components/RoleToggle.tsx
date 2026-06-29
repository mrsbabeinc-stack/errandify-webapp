import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface RoleToggleProps {
  currentRole: 'asker' | 'doer' | 'admin' | 'support_l2' | 'support_l3';
  onRoleChange: (role: 'asker' | 'doer') => void;
}

export default function RoleToggle({ currentRole, onRoleChange }: RoleToggleProps) {
  const navigate = useNavigate();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const isAdmin = currentRole === 'admin' || currentRole === 'support_l2' || currentRole === 'support_l3';

  const handleAdminClick = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: 'admin' })
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('current_role', 'admin');
        navigate('/admin/dashboard');
      } else {
        alert(data.error || 'Failed to switch to admin mode');
      }
    } catch (error) {
      console.error('Admin mode error:', error);
      alert('Failed to switch to admin mode');
    }
  };

  const handleBackToUser = () => {
    localStorage.setItem('current_role', 'asker');
    onRoleChange('asker');
    setShowAdminMenu(false);
  };

  return (
    <div className="flex gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      <button
        onClick={() => onRoleChange('asker')}
        className={`px-3 py-1 rounded-md font-semibold text-sm transition-colors ${
          currentRole === 'asker'
            ? 'bg-errandify-orange text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        👤 Asker
      </button>
      <button
        onClick={() => onRoleChange('doer')}
        className={`px-3 py-1 rounded-md font-semibold text-sm transition-colors ${
          currentRole === 'doer'
            ? 'bg-errandify-orange text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        💼 Doer
      </button>

      {/* Admin Button (only for admin users) */}
      {isAdmin && (
        <div className="relative">
          <button
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            className={`px-3 py-1 rounded-md font-semibold text-sm transition-colors ${
              currentRole === 'admin'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⚙️ Admin {isAdmin ? '▼' : ''}
          </button>

          {/* Admin Dropdown Menu */}
          {showAdminMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
              <button
                onClick={handleAdminClick}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-semibold text-gray-700 border-b border-gray-100"
              >
                ⚙️ Switch to Admin
              </button>
              <button
                onClick={handleBackToUser}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-semibold text-gray-700"
              >
                ← Back to Asker
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
