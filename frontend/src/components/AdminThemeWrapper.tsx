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
    <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #FFF9F5 0%, #FFF0E5 100%)', paddingBottom: '5rem'}}>
      <div style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
        {/* Header Section */}
        {(title || showBackButton) && (
          <div style={{marginBottom: '24px'}}>
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
                  marginBottom: '12px',
                  padding: 0
                }}
              >
                ← Back
              </button>
            )}
            {title && (
              <>
                <h1 style={{fontSize: '28px', fontWeight: '700', color: '#333', margin: '0 0 4px 0'}}>
                  {title}
                </h1>
                {subtitle && (
                  <p style={{fontSize: '14px', color: '#666', margin: 0}}>{subtitle}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(255, 107, 53, 0.1)', borderTop: '4px solid #FF6B35'}}>
          {children}
        </div>
      </div>
    </div>
  );
}
