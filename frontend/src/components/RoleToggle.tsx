import { useNavigate } from 'react-router-dom';

interface RoleToggleProps {
  currentRole: 'asker' | 'doer' | 'admin' | 'support_l2' | 'support_l3';
  onRoleChange: (role: 'asker' | 'doer') => void;
}

export default function RoleToggle({ currentRole, onRoleChange }: RoleToggleProps) {
  const navigate = useNavigate();
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
        // Instantly navigate to admin dashboard - no dropdown needed!
        navigate('/admin/dashboard');
      } else {
        alert(data.error || 'Failed to access admin mode');
      }
    } catch (error) {
      console.error('Admin mode error:', error);
      alert('Failed to access admin mode');
    }
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

      {/* Admin Button (only for admin users) - ONE CLICK to professional admin interface */}
      {isAdmin && (
        <button
          onClick={handleAdminClick}
          className="px-3 py-1 rounded-md font-semibold text-sm transition-colors bg-gray-800 text-white hover:bg-gray-900"
          title="Enter professional admin dashboard"
        >
          ⚙️ Admin
        </button>
      )}
    </div>
  );
}
