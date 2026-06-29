import React, { useState, useEffect } from 'react';

interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  cache: 'healthy' | 'degraded' | 'down';
  lastSync: string;
}

export const AdminFooter: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    api: 'healthy',
    database: 'healthy',
    cache: 'healthy',
    lastSync: new Date().toLocaleTimeString()
  });

  useEffect(() => {
    // Poll system status every 30 seconds
    const interval = setInterval(() => {
      // In production, call actual health check API
      setStatus(prev => ({
        ...prev,
        lastSync: new Date().toLocaleTimeString()
      }));
    }, 30000);

    return () => clearInterval(interval);
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
          <span className="status-item">
            {getStatusIcon(status.cache)} Cache
          </span>
        </div>

        <div className="footer-info">
          <span className="sync-time">Last sync: {status.lastSync}</span>
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
