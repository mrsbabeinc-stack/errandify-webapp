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
      background: 'linear-gradient(135deg, #FFF9F5 0%, #FFF0E5 100%)',
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
        padding: '8px 20px'
      }}>
        {/* Header Section */}
        {(title || showBackButton) && (
          <div style={{marginBottom: '8px', flexShrink: 0}}>
            {showBackButton && (
              <button
                onClick={onBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF6B35',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  padding: 0
                }}
              >
                ← Back
              </button>
            )}
            {title && (
              <>
                <h1 style={{fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 2px 0'}}>
                  {title}
                </h1>
                {subtitle && (
                  <p style={{fontSize: '12px', color: '#666', margin: 0}}>{subtitle}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: 'none'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
