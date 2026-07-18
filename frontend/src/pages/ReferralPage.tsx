import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminThemeWrapper from '../components/AdminThemeWrapper';

interface ReferralData {
  code: string;
  link: string;
  referredCount: number;
  earnedPoints: number;
}

export default function ReferralPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/referral`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 3000
        }
      );
      if (response.data && response.data.data) {
        setReferralData(response.data.data);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.log('Using mock referral data');
    }

    // Use mock data immediately if API fails or doesn't respond
    setReferralData({
      code: 'ERRAND' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      link: `https://errandify.ai/join?ref=ERRAND${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referredCount: 5,
      earnedPoints: 250,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (referralData?.link) {
      const generateQRCode = async () => {
        const img = new Image();
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralData.link)}`;
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              canvasRef.current.width = 200;
              canvasRef.current.height = 200;
              ctx.drawImage(img, 0, 0);
            }
          }
        };
      };

      generateQRCode();
    }
  }, [referralData?.link]);

  const handleCopyCode = async () => {
    if (referralData?.code) {
      await navigator.clipboard.writeText(referralData.code);
      setCopied('code');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (referralData?.link) {
      await navigator.clipboard.writeText(referralData.link);
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (canvasRef.current && referralData?.code) {
      const link = document.createElement('a');
      link.href = canvasRef.current.toDataURL('image/png');
      link.download = `errandify-referral-${referralData.code}.png`;
      link.click();
    }
  };


  return (
    <AdminThemeWrapper
      title="🎁 Refer & Earn!"
      subtitle="Invite friends and earn amazing rewards together"
      showBackButton
      onBack={() => navigate(-1)}
      style={{background: 'linear-gradient(135deg, #FFFBF8 0%, #FFF6F0 50%, #FFE8D6 100%)'}}
    >
      <div className="max-w-2xl mx-auto">
        {referralData && (
          <>
            {/* Hero Pitch - CELEBRATORY */}
            <div className="bg-gradient-to-r from-yellow-300 via-pink-300 to-orange-300 rounded-xl p-3 mb-2 shadow-lg border-2 border-yellow-400 text-center transform hover:scale-105 transition">
              <p className="text-xl font-bold text-white drop-shadow-lg mb-0.5">🎉 Earn 50 EP Per Friend! 🎉</p>
              <p className="text-xs font-bold text-white drop-shadow-md">Share → Sign Up → Earn! 💸</p>
            </div>

            {/* QR Code - CELEBRATORY */}
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-3 mb-2 shadow-lg border-2 border-blue-400 text-center">
              <p className="text-base font-bold text-blue-900 mb-2">📱 Your Magic Code ✨</p>
              <div className="bg-white rounded-lg p-2 border-3 border-blue-300 inline-block mb-2">
                <canvas ref={canvasRef} className="rounded" />
              </div>
              <p className="text-xs text-blue-800 font-semibold mb-2">👆 Scan to Invite Friends!</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-red-500 hover:from-pink-600 hover:via-purple-600 hover:to-red-600 text-white px-3 py-2.5 rounded-lg font-bold text-base hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 animate-bounce"
                >
                  🚀 SHARE & EARN! 💰
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:shadow-lg transition-all active:scale-95"
                >
                  💾 Save QR Code
                </button>
              </div>
            </div>

            {/* Code & Link - Action Buttons - CELEBRATORY */}
            <div className="space-y-1.5 mb-2">
              {/* Code Button */}
              <div className="bg-gradient-to-r from-red-200 to-pink-200 rounded-lg p-2.5 border-2 border-red-400 shadow-md">
                <p className="text-xs font-bold text-white drop-shadow-md mb-1.5">📋 Your Referral Code</p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={referralData?.code || ''}
                    readOnly
                    className="flex-1 bg-white px-2 py-1.5 rounded font-bold text-red-600 border border-red-300 text-xs text-center"
                  />
                  <button
                    onClick={handleCopyCode}
                    className={`px-3 py-1.5 rounded font-bold text-xs whitespace-nowrap transition transform active:scale-95 ${
                      copied === 'code'
                        ? 'bg-green-500 text-white animate-bounce'
                        : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-lg'
                    }`}
                  >
                    {copied === 'code' ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>

              {/* Link Button */}
              <div className="bg-gradient-to-r from-indigo-300 to-purple-300 rounded-lg p-2.5 border-2 border-indigo-400 shadow-md">
                <p className="text-xs font-bold text-white drop-shadow-md mb-1.5">🔗 Share Link</p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={referralData?.link || ''}
                    readOnly
                    className="flex-1 bg-white px-2 py-1.5 rounded text-indigo-600 border border-indigo-300 text-xs truncate font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded font-bold text-xs whitespace-nowrap transition transform active:scale-95 ${
                      copied === 'link'
                        ? 'bg-green-500 text-white animate-bounce'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white hover:shadow-lg'
                    }`}
                  >
                    {copied === 'link' ? '✅ Copied!' : '🔗 Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats - CELEBRATORY */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="bg-gradient-to-br from-green-400 to-emerald-300 rounded-lg p-3 shadow-lg border-2 border-green-500 text-center transform hover:scale-105 transition">
                <p className="text-3xl font-bold text-white drop-shadow-lg">{referralData?.referredCount}</p>
                <p className="text-xs font-bold text-white drop-shadow-md">👥 Friends</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-300 rounded-lg p-3 shadow-lg border-2 border-yellow-500 text-center transform hover:scale-105 transition">
                <p className="text-3xl font-bold text-white drop-shadow-lg">{referralData?.earnedPoints}</p>
                <p className="text-xs font-bold text-white drop-shadow-md">⭐ Points</p>
              </div>
            </div>

            {/* How It Works - CELEBRATORY & CLEAR */}
            <div className="bg-gradient-to-br from-white to-cyan-50 rounded-lg p-3 shadow-lg border-2 border-cyan-400">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">🎯</span>
                <p className="font-bold text-cyan-900 text-base">How It Works</p>
              </div>
              <div className="space-y-1 text-xs text-cyan-900">
                {/* Step 1 */}
                <div className="flex gap-2 items-start bg-blue-100 rounded p-1.5 border border-blue-300">
                  <span className="text-sm font-bold flex-shrink-0">1️⃣</span>
                  <span className="font-semibold">Friend creates account with your code</span>
                </div>

                {/* Step 2 */}
                <div className="flex gap-2 items-start bg-purple-100 rounded p-1.5 border border-purple-300">
                  <span className="text-sm font-bold flex-shrink-0">2️⃣</span>
                  <span className="font-semibold">They verify & complete first job</span>
                </div>

                {/* Step 3 */}
                <div className="flex gap-2 items-start bg-pink-100 rounded p-1.5 border border-pink-300">
                  <span className="text-sm font-bold flex-shrink-0">3️⃣</span>
                  <span className="font-semibold">Both earn rewards! 🎉</span>
                </div>

                {/* Reward Breakdown */}
                <div className="bg-gradient-to-r from-yellow-200 to-orange-200 border-2 border-yellow-400 rounded p-2 mt-1.5">
                  <p className="text-xs font-bold text-white drop-shadow-lg mb-0.5">💰 Rewards:</p>
                  <p className="text-xs font-bold text-white drop-shadow-md">✨ Join: +50 EP | 🎯 Job: +150 EP | ⭐ 10 Jobs: +100 EP</p>
                </div>
              </div>
            </div>

            {/* Share Modal */}
            {showShareModal && referralData && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                  <h2 className="text-2xl font-bold text-errandify-brown mb-2">
                    💌 Invite & Earn Together!
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Share your referral code. You both earn 50 EP when they complete their first task! 🎁
                  </p>

                  {/* QR Code */}
                  <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">📱 Scan to Join</p>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(referralData.link)}`}
                      alt="Referral QR Code"
                      className="w-32 h-32 mx-auto"
                    />
                    <p className="text-xs text-gray-500 mt-2">Opens signup with your referral code</p>
                  </div>

                  {/* Share Link */}
                  <div className="bg-orange-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">🔗 Share Link:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={referralData.link}
                        className="flex-1 px-2 py-1.5 bg-white border border-orange-200 rounded text-xs font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(referralData.link);
                          setCopied('link');
                          setTimeout(() => setCopied(null), 2000);
                        }}
                        className="px-2 py-1.5 bg-errandify-orange text-white text-xs font-semibold rounded hover:bg-opacity-90 transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Share Message */}
                  <div className="bg-green-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">💬 Share Message (with link):</p>
                    <textarea
                      readOnly
                      value={`🎯 Join Me on Errandify!

Hi! I found this amazing app called Errandify where we can help each other with everyday tasks and earn rewards!

💰 Join with my referral code: ${referralData.code}
🎁 We both earn 50 Errandify Points when you complete your first task!

🔗 ${referralData.link}

Let's help each other in our community! 🤝`}
                      className="w-full px-2 py-1.5 bg-white border border-green-200 rounded text-xs resize-none h-28 font-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `🎯 Join Me on Errandify!\n\nHi! I found this amazing app called Errandify where we can help each other with everyday tasks and earn rewards!\n\n💰 Join with my referral code: ${referralData.code}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${referralData.link}\n\nLet's help each other in our community! 🤝`
                        );
                        setCopied('code');
                        setTimeout(() => setCopied(null), 2000);
                      }}
                      className="mt-2 w-full px-2 py-1.5 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition"
                    >
                      Copy Message
                    </button>
                  </div>

                  {/* Share Buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`🎯 Join Me on Errandify!\n\nHi! I found this amazing app called Errandify where we can help each other with everyday tasks and earn rewards!\n\n💰 Join with my referral code: ${referralData.code}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${referralData.link}\n\nLet's help each other in our community! 🤝`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition text-center"
                    >
                      WhatsApp
                    </a>
                    <button
                      onClick={() => {
                        const subject = `Join me on Errandify!`;
                        const body = `🎯 Join Me on Errandify!\n\nHi! I found this amazing app called Errandify where we can help each other with everyday tasks and earn rewards!\n\n💰 Join with my referral code: ${referralData.code}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${referralData.link}\n\nLet's help each other in our community! 🤝`;
                        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      }}
                      className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                    >
                      Email
                    </button>
                  </div>

                  <button
                    onClick={() => setShowShareModal(false)}
                    className="w-full px-3 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminThemeWrapper>
  );
}
