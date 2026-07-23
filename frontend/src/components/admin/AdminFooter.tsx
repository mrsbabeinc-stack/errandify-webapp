import React, { useState, useEffect } from 'react';

interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down' | 'unknown';
  database: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastSync: string;
}

/**
 * These lights used to be hardcoded to 'healthy' and never checked anything —
 * the interval only refreshed the clock, so the footer reported a green API and
 * a green database even while every request on the page was failing. It now
 * calls /health, which pings the database, and goes red when that call fails.
 *
 * The third light was "Cache". There is no cache tier in this stack, so rather
 * than report the health of something that does not exist, it is gone.
 */
export const AdminFooter: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    api: 'unknown',
    database: 'unknown',
    lastSync: '—'
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch('/health', { cache: 'no-store' });
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        setStatus({
          api: response.ok ? 'healthy' : 'degraded',
          database: body?.database === 'healthy' ? 'healthy' : body?.database ? 'down' : 'unknown',
          lastSync: new Date().toLocaleTimeString()
        });
      } catch {
        if (cancelled) return;
        // The request never landed — the API is unreachable, and we cannot say
        // anything about the database from here.
        setStatus({ api: 'down', database: 'unknown', lastSync: new Date().toLocaleTimeString() });
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'down': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <footer className="admin-footer">
      <div className="footer-content">
        <div className="status-group">
          <span className="status-item">
            {getStatusIcon(status.api)} API
          </span>
          <span className="status-item">
            {getStatusIcon(status.database)} Database
          </span>
        </div>

        <div className="footer-info">
          <span className="sync-time">Checked: {status.lastSync}</span>
          <span className="footer-text">Errandify Admin v1.0</span>
        </div>
      </div>

      <style>{`
        .admin-footer {
          height: 50px;
          background: linear-gradient(to right, #0f1419, #1a1f2e);
          border-top: 1px solid #2d3748;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          padding: 0 20px;
        }

        .footer-content {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .status-group {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #a0aec0;
          font-weight: 500;
        }

        .footer-info {
          display: flex;
          gap: 16px;
          align-items: center;
          font-size: 12px;
          color: #718096;
        }

        .sync-time {
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .footer-text {
          color: #4a5568;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .admin-footer {
            height: 40px;
            padding: 0 12px;
          }

          .footer-content {
            gap: 12px;
          }

          .status-group {
            gap: 12px;
          }

          .status-item {
            font-size: 11px;
          }

          .footer-info {
            gap: 8px;
            font-size: 10px;
          }

          .footer-text {
            display: none;
          }
        }
      `}</style>
    </footer>
  );
};

export default AdminFooter;
