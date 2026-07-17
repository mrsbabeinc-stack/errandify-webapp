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
    <div style={{background: 'white', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: '60px'}}>
      <div style={{background: 'linear-gradient(135deg, #FFF9F5 0%, #FFF0E5 100%)', flex: 1, overflow: 'hidden'}}>
        <div style={{maxWidth: '100%', margin: '0', padding: '4px 16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          {/* Header Section */}
          {(title || showBackButton) && (
            <div style={{marginBottom: '6px', flexShrink: 0}}>
              {showBackButton && (
                <button
                  onClick={onBack}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FF6B35',
                    fontSize: '12px',
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
                  <h1 style={{fontSize: '20px', fontWeight: '700', color: '#333', margin: '0', lineHeight: '1.2'}}>
                    {title}
                  </h1>
                  {subtitle && (
                    <p style={{fontSize: '11px', color: '#666', margin: 0}}>{subtitle}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div style={{background: 'white', borderRadius: '8px', padding: '12px', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.08)', flex: 1, overflow: 'hidden'}}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
