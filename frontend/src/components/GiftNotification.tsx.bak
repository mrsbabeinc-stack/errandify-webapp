import React, { useEffect, useState } from 'react';

interface GiftNotificationProps {
  senderName: string;
  recipientName: string;
  points: number;
  isSent: boolean; // true if user sent the gift, false if they received it
  onDismiss: () => void;
}

export default function GiftNotification({ senderName, recipientName, points, isSent, onDismiss }: GiftNotificationProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Start animation
    setTimeout(() => setIsOpen(true), 100);

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsOpen(false);
      setTimeout(onDismiss, 600);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-500 ${
        isOpen
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-96 opacity-0 scale-75'
      }`}
    >
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 rounded-lg shadow-2xl p-4 max-w-sm">
        {/* Gift Box Animation */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-5xl animate-bounce">🎁</div>
          <div className="flex-1 ml-4">
            {isSent ? (
              <>
                <h3 className="text-white font-bold text-lg">🎉 Gift Sent! 🎉</h3>
                <p className="text-white text-sm mt-1">
                  ✨ Gift to <span className="font-bold">({recipientName})</span> - <span className="font-bold text-xl">{points} EP</span> ✨
                </p>
              </>
            ) : (
              <>
                <h3 className="text-white font-bold text-lg">🎉 You Got a Gift! 🎉</h3>
                <p className="text-white text-sm mt-1">
                  ✨ From <span className="font-bold">({senderName})</span> - <span className="font-bold text-xl">{points} EP</span>! ✨
                </p>
              </>
            )}
          </div>
        </div>

        {/* Sparkles */}
        <div className="flex justify-center gap-2 mt-3">
          <span className="text-2xl animate-spin">✨</span>
          <span className="text-2xl animate-pulse">💝</span>
          <span className="text-2xl animate-spin" style={{ animationDirection: 'reverse' }}>✨</span>
        </div>

        {/* Message */}
        <p className="text-white text-center text-xs mt-3 font-semibold">
          {isSent ? (
            "💕 What a kind gesture! They'll see it soon! 💕"
          ) : (
            "💕 What a kind gesture! Check MyRewardSpace! 💕"
          )}
        </p>

        {/* Dismiss Button */}
        <button
          onClick={() => {
            setIsOpen(false);
            setTimeout(onDismiss, 600);
          }}
          className="w-full mt-3 bg-white text-rose-600 py-2 rounded font-bold text-sm hover:bg-rose-50 transition"
        >
          {isSent ? "💌 Got It!" : "💌 Claim Gift"}
        </button>
      </div>
    </div>
  );
}
