import React, { useState } from 'react';
import axios from 'axios';

interface RewardsShopProps {
  balance: number;
  onRedeemClick: (data: { points: number; code: string; amount: number; name: string }) => void;
  onShowError: (message: string) => void;
}

export default function RewardsShop({ balance, onRedeemClick, onShowError }: RewardsShopProps) {
  const rewards = [
    { emoji: '💳', name: '$5 Discount', desc: 'Get SGD $5 off!', points: 50, code: 'ERRAND5', amount: 5, color: 'yellow' },
    { emoji: '💳', name: '$10 Discount', desc: 'Get SGD $10 off!', points: 100, code: 'ERRAND10', amount: 10, color: 'blue' },
    { emoji: '💎', name: '$20 Discount', desc: 'Get SGD $20 off!', points: 200, code: 'ERRAND20', amount: 20, color: 'gray' },
  ];

  const recommended = [
    { emoji: '☕', name: 'Starbucks $10', points: 500, code: 'STARBUCKS10', amount: 10, color: 'orange' },
    { emoji: '🍗', name: 'KFC Voucher', points: 450, code: 'KFC450', amount: 15, color: 'red' },
    { emoji: '🎬', name: 'Cathay Cineplex', points: 350, code: 'CINEPLEX350', amount: 25, color: 'purple' },
    { emoji: '✈️', name: 'Changi Lounge', points: 1000, code: 'CHANGI1000', amount: 100, color: 'blue' },
  ];

  const handleRedeem = (points: number, code: string, amount: number, name: string) => {
    if (balance >= points) {
      onRedeemClick({ points, code, amount, name });
    } else {
      onShowError(`❌ Not enough points! You need ${points} EP`);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="text-center py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-2 border-green-300">
        <p className="text-sm font-bold text-green-600">🛍️ Shop Rewards 🛍️</p>
        <p className="text-xs text-gray-600 mt-1">Current Balance: <span className="font-bold text-green-600">{balance} EP</span></p>
      </div>

      {/* Available Rewards - Happy Cards */}
      <div className="bg-white rounded-xl border-2 border-yellow-200 overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-3">
          <h3 className="text-sm font-bold">🎁 Pick Your Prize! 🎁</h3>
          <p className="text-xs mt-1 opacity-90">Use your points to unlock amazing discounts!</p>
        </div>
        <div className="divide-y divide-yellow-100 text-xs">
          {rewards.map((reward, idx) => {
            const colorMap: Record<string, string> = {
              yellow: 'bg-yellow-50 hover:bg-yellow-100',
              blue: 'bg-blue-50 hover:bg-blue-100',
              gray: 'bg-gray-50 hover:bg-gray-100',
            };
            return (
              <div key={idx} className={`p-3 flex justify-between items-center transition ${colorMap[reward.color]}`}>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{reward.emoji} {reward.name}</p>
                  <p className={`font-bold text-${reward.color === 'yellow' ? 'orange' : reward.color}-600`}>{reward.points} EP • {reward.desc}</p>
                </div>
                <button
                  onClick={() => handleRedeem(reward.points, reward.code, reward.amount, reward.name)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    balance >= reward.points
                      ? reward.color === 'yellow'
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:shadow-lg'
                        : reward.color === 'blue'
                        ? 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white hover:shadow-lg'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                      : 'bg-gray-400 text-white opacity-50 cursor-not-allowed'
                  }`}
                  disabled={balance < reward.points}
                >
                  {balance >= reward.points ? '✨ Redeem' : '🎯 Need ' + reward.points + ' EP'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended for You Section */}
      <div className="bg-white rounded-xl border-2 border-pink-200 overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-pink-400 to-rose-500 text-white p-3">
          <h3 className="text-sm font-bold">✨ Recommended For You ✨</h3>
          <p className="text-xs mt-1 opacity-90">Personalized vouchers based on your interests</p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {recommended.map((item, idx) => {
            const colorMap: Record<string, { bg: string; border: string; btn: string }> = {
              orange: { bg: 'from-orange-50 to-yellow-50', border: 'border-orange-200', btn: 'bg-errandify-orange hover:bg-orange-600' },
              red: { bg: 'from-red-50 to-pink-50', border: 'border-red-200', btn: 'bg-red-500 hover:bg-red-600' },
              purple: { bg: 'from-purple-50 to-indigo-50', border: 'border-purple-200', btn: 'bg-purple-500 hover:bg-purple-600' },
              blue: { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200', btn: 'bg-blue-500 hover:bg-blue-600' },
            };
            const colors = colorMap[item.color];
            return (
              <div key={idx} className={`bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-lg p-2 hover:shadow-md transition`}>
                <p className="text-2xl mb-1">{item.emoji}</p>
                <p className="font-bold text-xs text-gray-900">{item.name}</p>
                <p className="text-xs font-bold mb-1" style={{ color: item.color === 'orange' ? '#f97316' : item.color === 'red' ? '#dc2626' : item.color === 'purple' ? '#a855f7' : '#0284c7' }}>
                  {item.points} EP
                </p>
                <button
                  onClick={() => handleRedeem(item.points, item.code, item.amount, item.name)}
                  className={`w-full text-white py-1 rounded text-xs font-bold transition ${colors.btn}`}
                >
                  {balance >= item.points ? 'Redeem' : 'Need ' + item.points}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
