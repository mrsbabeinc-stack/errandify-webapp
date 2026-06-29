import React, { useState } from 'react';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';
import AdminFooter from './AdminFooter';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="admin-layout">
      <AdminNavbar onMenuToggle={handleMenuToggle} isMenuOpen={sidebarOpen} />

      <div className="admin-container">
        <AdminSidebar isOpen={sidebarOpen} />

        <main className={`admin-main ${sidebarOpen ? 'with-sidebar' : 'full-width'}`}>
          <div className="admin-content">
            {children}
          </div>
        </main>
      </div>

      <AdminFooter />

      <style>{`
        .admin-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #0f1419;
        }

        .admin-container {
          display: flex;
          flex: 1;
          margin-top: 60px;
          margin-bottom: 50px;
        }

        .admin-main {
          flex: 1;
          transition: margin-left 0.3s ease;
          margin-left: 280px;
          overflow-y: auto;
        }

        .admin-main.full-width {
          margin-left: 0;
        }

        .admin-main.with-sidebar {
          margin-left: 280px;
        }

        .admin-content {
          padding: 32px;
          min-height: calc(100vh - 140px);
        }

        /* Scrollbar styling */
        .admin-main::-webkit-scrollbar {
          width: 8px;
        }

        .admin-main::-webkit-scrollbar-track {
          background: transparent;
        }

        .admin-main::-webkit-scrollbar-thumb {
          background: #4a5568;
          border-radius: 4px;
        }

        .admin-main::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }

        /* Mobile responsiveness */
        @media (max-width: 1024px) {
          .admin-main {
            margin-left: 0;
          }

          .admin-main.with-sidebar {
            margin-left: 0;
          }

          .admin-sidebar {
            width: 220px;
          }
        }

        @media (max-width: 768px) {
          .admin-content {
            padding: 16px;
            min-height: calc(100vh - 100px);
          }

          .admin-main {
            margin-left: 0;
          }
        }

        /* Dark theme for the entire app */
        .admin-layout {
          color: #e2e8f0;
        }

        .admin-layout a {
          color: #60a5fa;
          text-decoration: none;
        }

        .admin-layout a:hover {
          text-decoration: underline;
        }

        .admin-layout button {
          font-family: inherit;
        }

        .admin-layout input,
        .admin-layout select,
        .admin-layout textarea {
          background: #1a1f2e;
          color: #e2e8f0;
          border: 1px solid #2d3748;
          border-radius: 6px;
          padding: 8px 12px;
          font-family: inherit;
          font-size: 14px;
        }

        .admin-layout input:focus,
        .admin-layout select:focus,
        .admin-layout textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .admin-layout input::placeholder {
          color: #718096;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
