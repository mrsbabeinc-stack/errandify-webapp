interface RoleToggleProps {
  currentRole: 'asker' | 'doer';
  onRoleChange: (role: 'asker' | 'doer') => void;
}

export default function RoleToggle({ currentRole, onRoleChange }: RoleToggleProps) {
  return (
    <div className="fixed top-2 left-4 z-50 bg-white rounded-lg shadow-sm p-1 flex gap-1 border border-gray-200">
      <button
        onClick={() => onRoleChange('asker')}
        className={`px-3 py-1 rounded-md font-semibold text-sm transition-colors ${
          currentRole === 'asker'
            ? 'bg-errandify-orange text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Asker
      </button>
      <button
        onClick={() => onRoleChange('doer')}
        className={`px-3 py-1 rounded-md font-semibold text-sm transition-colors ${
          currentRole === 'doer'
            ? 'bg-errandify-orange text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Doer
      </button>
    </div>
  );
}
