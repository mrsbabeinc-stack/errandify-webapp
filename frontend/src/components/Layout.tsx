import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import BottomNav from './BottomNav';
import RoleToggle from './RoleToggle';
import NotificationIcon from './NotificationIcon';
import HanaAssistant from './HanaAssistant';
import HanaTaskCreation from './HanaTaskCreation';

interface LayoutProps {
  userRole: 'asker' | 'doer';
  onRoleChange: (role: 'asker' | 'doer') => void;
  onLogout: () => void;
}

export default function Layout({ userRole, onRoleChange, onLogout }: LayoutProps) {
  const [showHanaChat, setShowHanaChat] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-errandify-bg">
      {/* Top Bar with Role Toggle & Notifications */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center sticky top-0 z-50">
        <RoleToggle currentRole={userRole} onRoleChange={onRoleChange} />
        <NotificationIcon unreadCount={0} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Hana Assistant - Floating Button */}
      <HanaAssistant />

      {/* Hana Task Creation Modal */}
      <HanaTaskCreation
        isOpen={showHanaChat}
        onClose={() => setShowHanaChat(false)}
        onSwitchToManual={() => {
          setShowHanaChat(false);
          // Navigate to manual form if needed
        }}
      />

      {/* Bottom Navigation */}
      <BottomNav
        onLogout={onLogout}
        userRole={userRole}
        onCreateTask={() => setShowHanaChat(true)}
      />
    </div>
  );
}
