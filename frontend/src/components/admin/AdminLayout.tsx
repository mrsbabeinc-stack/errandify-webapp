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
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
        }

        .admin-container {
          display: flex;
          flex: 1;
          margin-top: 60px;
          margin-bottom: 40px;
        }

        .admin-main {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
        }

        .admin-main.full-width {
          width: 100%;
        }

        .admin-main.with-sidebar {
          width: 100%;
        }

        .admin-content {
          padding: 20px;
          font-size: 14px;
        }

        /* Scrollbar styling */
        .admin-main::-webkit-scrollbar {
          width: 8px;
        }

        .admin-main::-webkit-scrollbar-track {
          background: transparent;
        }

        .admin-main::-webkit-scrollbar-thumb {
          background: #ffb88c;
          border-radius: 4px;
        }

        .admin-main::-webkit-scrollbar-thumb:hover {
          background: #ff8c42;
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
          }

          .admin-main {
            margin-left: 0;
          }
        }

        /* Light theme for the entire app */
        .admin-layout {
          color: #333;
        }

        .admin-layout a {
          color: #ff6b35;
          text-decoration: none;
          font-weight: 600;
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
          background: #fff;
          color: #333;
          border: 1px solid #ffb88c;
          border-radius: 6px;
          padding: 8px 12px;
          font-family: inherit;
          font-size: 14px;
        }

        .admin-layout input:focus,
        .admin-layout select:focus,
        .admin-layout textarea:focus {
          outline: none;
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .admin-layout input::placeholder {
          color: #ccc;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
