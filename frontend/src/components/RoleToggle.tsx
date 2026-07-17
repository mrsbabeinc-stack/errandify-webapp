import { useNavigate } from 'react-router-dom';

interface RoleToggleProps {
  currentRole: 'asker' | 'doer' | 'admin' | 'support_l2' | 'support_l3';
  onRoleChange: (role: 'asker' | 'doer') => void;
}

export default function RoleToggle({ currentRole, onRoleChange }: RoleToggleProps) {
  const navigate = useNavigate();
  const isAdmin = currentRole === 'admin' || currentRole === 'support_l2' || currentRole === 'support_l3';

  const handleAdminClick = () => {
    console.log('[RoleToggle] Admin button clicked, navigating to /admin/dashboard');
    // Admin user is already logged in - just navigate directly to admin dashboard
    localStorage.setItem('current_role', 'admin');
    console.log('[RoleToggle] About to navigate...');
    navigate('/admin/dashboard');
    console.log('[RoleToggle] Navigation called');
  };

  return (
    <div className="flex gap-2 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-md border border-orange-200 p-1.5">
      <button
        onClick={() => onRoleChange('asker')}
        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
          currentRole === 'asker'
            ? 'bg-gradient-to-r from-errandify-orange to-orange-400 text-white shadow-lg scale-105'
            : 'bg-white text-gray-700 hover:bg-orange-100 hover:text-errandify-orange'
        }`}
      >
        👤 Asker
      </button>
      <button
        onClick={() => onRoleChange('doer')}
        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
          currentRole === 'doer'
            ? 'bg-gradient-to-r from-errandify-orange to-orange-400 text-white shadow-lg scale-105'
            : 'bg-white text-gray-700 hover:bg-orange-100 hover:text-errandify-orange'
        }`}
      >
        💼 Doer
      </button>

      {/* Admin Button (only for admin users) - ONE CLICK to professional admin interface */}
      {isAdmin && (
        <button
          onClick={handleAdminClick}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 bg-gray-800 text-white hover:bg-gray-900 hover:shadow-lg"
          title="Enter professional admin dashboard"
        >
          ⚙️ Admin
        </button>
      )}
    </div>
  );
}
