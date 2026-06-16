interface RoleToggleProps {
  currentRole: 'asker' | 'doer';
  onRoleChange: (role: 'asker' | 'doer') => void;
}

export default function RoleToggle({ currentRole, onRoleChange }: RoleToggleProps) {
  return (
    <div className="fixed top-4 left-4 z-50 bg-white rounded-lg shadow-md p-2 flex gap-2">
      <button
        onClick={() => onRoleChange('asker')}
        className={`px-3 py-1 rounded font-medium transition-colors ${
          currentRole === 'asker'
            ? 'bg-errandify-orange text-white'
            : 'bg-gray-200 text-errandify-brown hover:bg-gray-300'
        }`}
      >
        Asker
      </button>
      <button
        onClick={() => onRoleChange('doer')}
        className={`px-3 py-1 rounded font-medium transition-colors ${
          currentRole === 'doer'
            ? 'bg-errandify-orange text-white'
            : 'bg-gray-200 text-errandify-brown hover:bg-gray-300'
        }`}
      >
        Doer
      </button>
    </div>
  );
}
