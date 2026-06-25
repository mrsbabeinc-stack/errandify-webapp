interface RoleToggleProps {
  currentRole: 'asker' | 'doer';
  onRoleChange: (role: 'asker' | 'doer') => void;
  onMyAccountClick: () => void;
}

export default function RoleToggle({ currentRole, onRoleChange, onMyAccountClick }: RoleToggleProps) {
  return (
    <div className="flex gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      <button
        onClick={onMyAccountClick}
        className="px-4 py-1.5 rounded-md font-bold text-sm bg-errandify-orange text-white hover:bg-orange-600 transition-colors"
      >
        MyAccount
      </button>
    </div>
  );
}
