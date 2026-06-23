import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useErrandifyPoints } from '../hooks/useErrandifyPoints';

export default function ErrandifyPointsPage() {
  const navigate = useNavigate();
  const { points, loading } = useErrandifyPoints();
  const [animateBalance, setAnimateBalance] = useState(false);

  useEffect(() => {
    setAnimateBalance(true);
  }, []);

  const earningMethods = [
    { icon: '✅', label: 'Complete errand', points: '+10 EP', color: 'bg-green-50' },
    { icon: '👥', label: 'Refer friend', points: '+50 EP', color: 'bg-blue-50' },
    { icon: '⭐', label: 'Complete review', points: '+5 EP', color: 'bg-yellow-50' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-errandify-orange/5 to-white p-3 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="mb-2 text-lg text-gray-600 font-bold">‹ Back</button>

        {/* Balance Card - Ultra Compact */}
        <div className="bg-gradient-to-br from-errandify-orange to-orange-600 rounded-lg shadow-md p-4 mb-4 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>

          <p className="text-xs opacity-90 relative z-10">Your Balance</p>
          <div className={`text-4xl font-bold relative z-10 transition-all duration-700 ${animateBalance ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            {loading ? '...' : `${points} EP`}
          </div>
          <p className="text-xs opacity-90 relative z-10">Ready to redeem 🎉</p>
        </div>

        {/* How to Earn - Compact Grid */}
        <div className="mb-4">
          <h2 className="text-sm font-bold text-errandify-brown mb-2">Ways to Earn</h2>
          <div className="grid grid-cols-3 gap-2">
            {earningMethods.map((method, idx) => (
              <div
                key={idx}
                className={`${method.color} rounded-md p-2 text-center border-2 border-transparent hover:border-errandify-orange transition-all duration-300 cursor-pointer transform hover:scale-105`}
                style={{
                  animation: `slideIn 0.5s ease-out ${idx * 0.1}s both`,
                }}
              >
                <span className="text-2xl block">{method.icon}</span>
                <p className="text-xs font-semibold text-gray-800 mt-1">{method.label}</p>
                <p className="font-bold text-errandify-orange text-xs">{method.points}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Preview */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-md p-3 mb-4 border-2 border-dashed border-purple-200">
          <div className="flex gap-2 items-center">
            <div className="text-3xl">🎁</div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Unlock Rewards</p>
              <p className="text-xs text-gray-600">Discounts, vouchers & perks!</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/my-account?tab=rewards')}
          className="w-full bg-errandify-orange hover:bg-orange-600 text-white py-3 rounded-md font-bold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          Redeem Points 🚀
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
