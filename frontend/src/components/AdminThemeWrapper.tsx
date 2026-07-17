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
    <div style={{background: 'white', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
      <div style={{background: 'linear-gradient(135deg, #FFF9F5 0%, #FFF0E5 100%)', flex: 1, overflow: 'hidden'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '8px 20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          {/* Header Section */}
          {(title || showBackButton) && (
            <div style={{marginBottom: '12px', flexShrink: 0}}>
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
                    marginBottom: '8px',
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
          <div style={{background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 12px rgba(255, 107, 53, 0.1)', flex: 1, overflow: 'auto'}}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
