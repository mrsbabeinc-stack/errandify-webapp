import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HanaAssistant from '../components/HanaAssistant';

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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-errandify-bg to-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="flex-1 text-xl font-bold text-errandify-brown">🚀 Earn Together</h1>
          <span className="text-xl">💰</span>
        </div>

        {/* Hero Message */}
        <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white rounded-lg p-3 mb-3 shadow-lg">
          <p className="font-bold text-sm mb-1">Share & Earn Instantly!</p>
          <p className="text-xs opacity-90">Invite friends and earn 50 EP each. No limit! 🎯</p>
        </div>

        {/* QR Code Section - Enhanced */}
        <div className="bg-white rounded-lg p-3 border-2 border-errandify-orange mb-3 shadow-md">
          <p className="text-xs font-bold text-center text-gray-700 mb-2">📱 Scan to Join</p>
          <div className="flex justify-center mb-2">
            <canvas ref={canvasRef} className="border-3 border-errandify-orange rounded-lg" />
          </div>
          <button
            onClick={handleDownloadQR}
            className="w-full bg-gradient-to-r from-errandify-orange to-orange-500 text-white px-3 py-2 rounded font-bold text-xs hover:shadow-lg transition"
          >
            ⬇️ Save QR Code
          </button>
        </div>

        {/* Code & Link - Social Style */}
        <div className="space-y-1.5 mb-3">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-0.5">Share Your Code</label>
            <div className="bg-white rounded border-2 border-errandify-orange p-2 flex gap-1 shadow-sm">
              <input
                type="text"
                value={referralData?.code || ''}
                readOnly
                className="flex-1 bg-orange-50 px-2 text-sm font-bold text-errandify-orange border-0 rounded"
              />
              <button
                onClick={handleCopyCode}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  copied === 'code' ? 'bg-green-500 text-white' : 'bg-errandify-orange text-white hover:shadow-md'
                }`}
              >
                {copied === 'code' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-0.5">Or Share Link</label>
            <div className="bg-white rounded border-2 border-blue-400 p-2 flex gap-1 shadow-sm">
              <input
                type="text"
                value={referralData?.link || ''}
                readOnly
                className="flex-1 bg-blue-50 px-2 text-xs border-0 rounded truncate font-mono"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1 rounded font-bold text-xs transition ${
                  copied === 'link' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:shadow-md'
                }`}
              >
                {copied === 'link' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats - Prominent */}
        <div className="grid grid-cols-2 gap-2 mb-3 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg p-3 border-2 border-orange-300 shadow-md">
          <div className="text-center">
            <p className="text-3xl font-bold text-errandify-orange">{referralData?.referredCount}</p>
            <p className="text-xs font-bold text-gray-700 mt-0.5">Friends Referred 👥</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-errandify-orange">{referralData?.earnedPoints}</p>
            <p className="text-xs font-bold text-gray-700 mt-0.5">Points Earned ⭐</p>
          </div>
        </div>

        {/* How It Works - Engaging */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border-2 border-blue-300 mb-3 shadow-md">
          <p className="font-bold text-gray-900 mb-2 text-sm">✨ How It Works:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">1</span>
              <span className="font-medium">Share code/link with friends</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">2</span>
              <span className="font-medium">They sign up & do their first job</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">3</span>
              <span className="font-medium">You both get 50 EP! 🎉</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">∞</span>
              <span className="font-medium">No limit! Keep earning 💰</span>
            </div>
          </div>
        </div>

        {/* Leaderboard Teaser */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 border-2 border-purple-300 text-center shadow-md">
          <p className="text-xs font-bold text-gray-900 mb-1">🏆 Top Referrers Get Bonuses!</p>
          <p className="text-xs text-gray-700">Refer 10+ friends and unlock exclusive rewards</p>
        </div>
      </div>
      <HanaAssistant />
    </div>
  );
}
