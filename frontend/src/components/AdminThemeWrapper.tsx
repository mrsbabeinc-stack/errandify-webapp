import React from 'react';

interface AdminThemeWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function AdminThemeWrapper({
  children,
  title,
  subtitle,
  showBackButton = false,
  onBack,
}: AdminThemeWrapperProps) {
  return (
    <div style={{
      background: 'white',
      height: 'calc(100vh - 60px)',
      width: '100vw',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <div style={{
        flex: 1,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        padding: '60px 20px 8px 20px'
      }}>
        {/* Back Button - Always visible at top */}
        {showBackButton && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#FF6B35',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              marginBottom: '12px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'opacity 0.2s',
              zIndex: 100
            }}
            title="Go back"
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            ← Back
          </button>
        )}

        {/* Title Section */}
        {title && (
          <div style={{marginBottom: '12px', flexShrink: 0, position: 'relative'}}>
            <h1 style={{fontSize: '28px', fontWeight: '700', color: '#333', margin: '0 0 4px 0'}}>
              {title}
            </h1>
            {subtitle && (
              <p style={{fontSize: '13px', color: '#666', margin: 0}}>{subtitle}</p>
            )}
          </div>
        )}

        {/* Content - Scrollable */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
