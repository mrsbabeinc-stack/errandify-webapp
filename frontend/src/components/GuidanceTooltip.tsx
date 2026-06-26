import React, { useState } from 'react';

interface GuidanceTooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function GuidanceTooltip({
  title,
  content,
  children,
  position = 'top',
}: GuidanceTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }[position];

  return (
    <div className="relative inline-block group">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <div
          className={`absolute ${positionClasses} left-1/2 transform -translate-x-1/2 z-50 w-64 bg-gray-900 text-white rounded-lg shadow-lg p-3`}
        >
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' :
              position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' :
              position === 'left' ? '-right-1 top-1/2 -translate-y-1/2' :
              '-left-1 top-1/2 -translate-y-1/2'
            }`}
          />

          <h4 className="font-bold text-sm mb-1">{title}</h4>
          <p className="text-xs leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  );
}
