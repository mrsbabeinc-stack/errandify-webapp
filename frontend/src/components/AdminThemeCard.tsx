import React from 'react';

interface AdminThemeCardProps {
  children: React.ReactNode;
  title?: string;
  emoji?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AdminThemeCard({
  children,
  title,
  emoji,
  className = '',
  style = {},
}: AdminThemeCardProps) {
  return (
    <div
      className={className}
      style={{
        padding: '16px',
        backgroundColor: '#FFF9F5',
        borderRadius: '8px',
        borderLeft: '4px solid #FF6B35',
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#FF6B35',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '-16px -16px 16px -16px',
            padding: '12px 16px',
            backgroundColor: 'rgba(255, 107, 53, 0.05)',
            borderRadius: '6px 6px 0 0',
          }}
        >
          {emoji && <span>{emoji}</span>}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
