import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import RoleToggle from './RoleToggle';
import HanaAssistant from './HanaAssistant';

interface LayoutProps {
  userRole: 'asker' | 'doer';
  onRoleChange: (role: 'asker' | 'doer') => void;
  onLogout: () => void;
}

export default function Layout({ userRole, onRoleChange, onLogout }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-errandify-bg">
      {/* Role Toggle - Top Left */}
      <RoleToggle currentRole={userRole} onRoleChange={onRoleChange} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Hana Assistant - Floating Button */}
      <HanaAssistant />

      {/* Bottom Navigation */}
      <BottomNav onLogout={onLogout} />
    </div>
  );
}
