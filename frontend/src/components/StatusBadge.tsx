import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showTimer?: boolean;
  expiresAt?: string;
}

export default function StatusBadge({ status, size = 'md', showTimer, expiresAt }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; emoji: string; bg: string; text: string; border: string }> = {
      open: { label: 'Open for Offers', emoji: '🔓', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
      pending: { label: 'Pending Review', emoji: '⏳', bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300' },
      accepted: { label: 'Accepted - Confirm', emoji: '✅', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
      confirmed: { label: 'Confirmed', emoji: '🟢', bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
      awaiting_start: { label: 'Awaiting Start', emoji: '⏳', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
      in_progress: { label: 'In Progress', emoji: '🔄', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
      job_completed: { label: 'Job Completed', emoji: '✔️', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
      completed: { label: 'Completed', emoji: '🎉', bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
      cancelled: { label: 'Cancelled', emoji: '❌', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
      disputed: { label: 'Under Review', emoji: '⚠️', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
      rejected: { label: 'Rejected', emoji: '❌', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
      withdrawn: { label: 'Withdrawn', emoji: '↩️', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
    };
    return configs[status] || { label: status, emoji: '•', bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300' };
  };

  const config = getStatusConfig(status);
  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m left`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h left`;
    return `${Math.floor(diff / 86400000)}d left`;
  };

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border ${sizeClasses[size]} font-semibold ${config.bg} ${config.text} ${config.border}`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
      {showTimer && expiresAt && (
        <span className="ml-1 text-xs opacity-75">⏰ {getTimeRemaining()}</span>
      )}
    </div>
  );
}
