import React, { useState } from 'react';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';
import AdminFooter from './AdminFooter';

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window === 'undefined' ? true : window.innerWidth > 1024
  );

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="admin-layout">
      <AdminNavbar onMenuToggle={handleMenuToggle} isMenuOpen={sidebarOpen} onLogout={onLogout} />

      <div className="admin-container">
        <AdminSidebar isOpen={sidebarOpen} />

        {/* Only rendered on small screens (CSS-gated). Without it the drawer
            can only be dismissed by finding the hamburger again. */}
        {sidebarOpen && (
          <div
            className="admin-scrim"
            role="presentation"
            onClick={() => setSidebarOpen(false)}
          />
        )}

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

        .admin-scrim {
          display: none;
        }

        /*
          Mobile: the sidebar becomes an overlay drawer.

          It used to stay in the flex flow at 220px wide no matter the screen,
          so on a 360px phone the content column was left with about 140px and
          every heading wrapped one word per line — "Dashboar/d", "Critical/
          Blockers/- Act/Now". Zeroing the margin, which is all the old media
          query did, does nothing while the sidebar is still a flex sibling
          taking up its share of the row.

          Fixed positioning takes it out of the flow entirely, so the content
          gets the full width and the sidebar slides over it when asked for.
        */
        @media (max-width: 1024px) {
          .admin-main,
          .admin-main.with-sidebar {
            margin-left: 0;
            width: 100%;
            min-width: 0;
          }

          .admin-sidebar {
            position: fixed;
            top: 60px;
            bottom: 0;
            left: 0;
            width: 264px;
            max-width: 82vw;
            z-index: 60;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            box-shadow: 0 8px 30px rgba(176, 96, 48, 0.18);
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .admin-scrim {
            display: block;
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(74, 50, 33, 0.35);
            z-index: 55;
          }
        }

        @media (max-width: 768px) {
          .admin-content {
            padding: 12px;
          }

          .admin-main {
            margin-left: 0;
          }

          /* Many admin screens hard-code multi-column inline grids
             (repeat(4, 1fr), fixed minmax(280px…) etc.) that don't fit a phone,
             so cards run off the right edge. Re-flow every inline grid to an
             auto-fit that can never be wider than the viewport — the
             min(160px, 100%) floor keeps a single card full-width when even
             160px won't fit, so nothing is ever cut off. */
          .admin-content [style*="grid-template-columns"] {
            grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr)) !important;
          }

          /* Section headings were often white-space:nowrap and overran the
             screen; let them wrap on a phone. */
          .admin-content h1,
          .admin-content h2,
          .admin-content h3 {
            white-space: normal !important;
            overflow-wrap: anywhere;
          }

          /* Compact: admin cards hard-code desktop-sized inline padding, so on a
             phone every card eats a screenful. Trim the largest paddings — a
             modest reduction that keeps the cards readable but far denser. */
          .admin-content [style*="padding: 32px"],
          .admin-content [style*="padding:32px"] { padding: 14px !important; }
          .admin-content [style*="padding: 30px"],
          .admin-content [style*="padding:30px"] { padding: 14px !important; }
          .admin-content [style*="padding: 28px"],
          .admin-content [style*="padding:28px"] { padding: 14px !important; }
          .admin-content [style*="padding: 24px"],
          .admin-content [style*="padding:24px"] { padding: 13px !important; }
          .admin-content [style*="padding: 20px"],
          .admin-content [style*="padding:20px"] { padding: 12px !important; }
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
