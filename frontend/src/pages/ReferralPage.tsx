import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
        }
      );
      setReferralData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
      // Mock data for demo
      setReferralData({
        code: 'ERRAND' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        link: `https://errandify.ai/join?ref=ERRAND${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        referredCount: 5,
        earnedPoints: 250,
      });
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4 flex items-center justify-center">
        <p className="text-gray-600">Loading referral data...</p>
      </div>
    );
  }

  if (!referralData) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-red-600 mb-4">Failed to load referral data</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-errandify-brown font-bold">‹</button>
          <h1 className="flex-1 text-lg font-bold text-errandify-brown">🎁 Referral Rewards</h1>
        </div>

        {/* Hero Pitch - Warm & Classy */}
        <div className="bg-gradient-to-r from-amber-100 to-amber-50 text-errandify-brown rounded-lg p-2.5 mb-2 shadow-sm border border-amber-200 text-center">
          <p className="text-sm font-bold mb-0.5">Earn 50 EP Per Friend</p>
          <p className="text-xs opacity-80">Share your code. Build your community. 🌟</p>
        </div>

        {/* QR Code - Elegant */}
        <div className="bg-white rounded-lg p-2.5 mb-2 shadow-sm border border-amber-200 text-center">
          <p className="text-xs font-semibold text-errandify-brown mb-1.5">📱 Share This Code</p>
          <canvas ref={canvasRef} className="border border-amber-300 rounded mx-auto" />
          <div className="space-y-1 mt-1.5">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full bg-gradient-to-r from-errandify-orange to-orange-500 text-white px-3 py-2.5 rounded-lg font-bold text-sm hover:shadow-lg hover:from-orange-500 hover:to-orange-600 transition-all transform hover:scale-105 animate-pulse"
            >
              🚀 SHARE & EARN 💸
            </button>
            <button
              onClick={handleDownloadQR}
              className="w-full bg-errandify-brown text-white px-2 py-1.5 rounded font-semibold text-xs hover:shadow-md transition"
            >
              Save QR Code
            </button>
          </div>
        </div>

        {/* Code & Link - Action Buttons */}
        <div className="space-y-1.5 mb-2">
          {/* Code Button */}
          <div className="bg-white rounded-lg p-2 border border-amber-200 shadow-sm">
            <p className="text-xs font-semibold text-errandify-brown mb-1">📋 Your Referral Code</p>
            <div className="flex gap-1">
              <input
                type="text"
                value={referralData?.code || ''}
                readOnly
                className="flex-1 bg-amber-50 px-2 py-1.5 rounded font-bold text-errandify-orange border border-amber-300 text-xs text-center"
              />
              <button
                onClick={handleCopyCode}
                className={`px-3 py-1.5 rounded font-bold text-xs whitespace-nowrap transition ${
                  copied === 'code'
                    ? 'bg-green-600 text-white'
                    : 'bg-errandify-brown text-white hover:shadow-md'
                }`}
              >
                {copied === 'code' ? '✅ Done!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Link Button */}
          <div className="bg-white rounded-lg p-2 border border-amber-200 shadow-sm">
            <p className="text-xs font-semibold text-errandify-brown mb-1">🔗 Share Link</p>
            <div className="flex gap-1">
              <input
                type="text"
                value={referralData?.link || ''}
                readOnly
                className="flex-1 bg-amber-50 px-2 py-1.5 rounded text-errandify-orange border border-amber-300 text-xs truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded font-bold text-xs whitespace-nowrap transition ${
                  copied === 'link'
                    ? 'bg-green-600 text-white'
                    : 'bg-errandify-brown text-white hover:shadow-md'
                }`}
              >
                {copied === 'link' ? '✅ Done!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats - Elegant */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-white rounded-lg p-2.5 shadow-sm border border-amber-200 text-center">
            <p className="text-2xl font-bold text-errandify-brown">{referralData?.referredCount}</p>
            <p className="text-xs text-errandify-brown opacity-70">Friends</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 shadow-sm border border-amber-200 text-center">
            <p className="text-2xl font-bold text-errandify-brown">{referralData?.earnedPoints}</p>
            <p className="text-xs text-errandify-brown opacity-70">Points</p>
          </div>
        </div>

        {/* How It Works - Warm & Simple */}
        <div className="bg-white rounded-lg p-2.5 shadow-sm border border-amber-200">
          <p className="font-semibold text-errandify-brown mb-1.5 text-sm">How It Works</p>
          <div className="space-y-1 text-xs text-errandify-brown">
            <p className="flex items-center gap-2">
              <span className="bg-amber-100 text-errandify-brown rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
              <span>Share your code</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="bg-amber-100 text-errandify-brown rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
              <span>Friend signs up</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="bg-amber-100 text-errandify-brown rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
              <span>They do their first job</span>
            </p>
            <p className="flex items-center gap-2 font-semibold">
              <span className="bg-errandify-brown text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">✓</span>
              <span>You both get 50 EP! 🎉</span>
            </p>
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
      </div>
    </div>
  );
}
