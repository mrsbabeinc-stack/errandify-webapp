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
    <div className="min-h-screen bg-gradient-to-b from-orange-400 via-errandify-bg to-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="flex-1 text-xl font-black text-white drop-shadow-lg">🚀 EARN FREE MONEY</h1>
        </div>

        {/* Hero Pitch - Engaging */}
        <div className="bg-white rounded-xl p-2.5 mb-2 shadow-lg border-2 border-errandify-orange">
          <p className="text-center text-sm font-black text-errandify-orange mb-1">💰 +50 EP PER FRIEND</p>
          <p className="text-center text-xs text-gray-800">Zero effort. Unlimited earnings. Start now! 🔥</p>
        </div>

        {/* QR Code - Highlighted */}
        <div className="bg-white rounded-xl p-2.5 mb-2 shadow-lg border-3 border-errandify-orange text-center">
          <p className="text-xs font-bold text-gray-700 mb-1.5">📱 Scan & Share</p>
          <canvas ref={canvasRef} className="border-2 border-errandify-orange rounded-lg mx-auto shadow-md" />
          <button
            onClick={handleDownloadQR}
            className="w-full mt-1.5 bg-gradient-to-r from-errandify-orange to-orange-600 text-white px-2 py-1.5 rounded-lg text-xs font-black shadow-md hover:shadow-lg transition"
          >
            ⬇️ Save QR
          </button>
        </div>

        {/* Code & Link - Action Buttons */}
        <div className="space-y-1 mb-2">
          <button
            onClick={handleCopyCode}
            className={`w-full p-2 rounded-lg font-black text-xs transition shadow-md ${
              copied === 'code'
                ? 'bg-green-500 text-white'
                : 'bg-errandify-orange text-white hover:shadow-lg active:scale-95'
            }`}
          >
            {copied === 'code' ? '✅ CODE COPIED!' : `📋 Copy Code: ${referralData?.code}`}
          </button>
          <button
            onClick={handleCopyLink}
            className={`w-full p-2 rounded-lg font-black text-xs transition shadow-md ${
              copied === 'link'
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 text-white hover:shadow-lg active:scale-95'
            }`}
          >
            {copied === 'link' ? '✅ LINK COPIED!' : '🔗 Copy Link'}
          </button>
        </div>

        {/* Stats - Bold & Attention-Grabbing */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-xl p-2.5 shadow-lg text-center">
            <p className="text-2xl font-black">{referralData?.referredCount}</p>
            <p className="text-xs font-bold">Friends 👥</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-xl p-2.5 shadow-lg text-center">
            <p className="text-2xl font-black">{referralData?.earnedPoints}</p>
            <p className="text-xs font-bold">EP 💰</p>
          </div>
        </div>

        {/* How It Works - Exciting */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-2.5 shadow-lg">
          <p className="font-black text-sm mb-1.5">⚡ 4 STEPS TO RICHES:</p>
          <div className="space-y-0.5 text-xs font-bold">
            <p className="flex items-center gap-1.5"><span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span> Share your code</p>
            <p className="flex items-center gap-1.5"><span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span> Friend signs up</p>
            <p className="flex items-center gap-1.5"><span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span> They do 1 job</p>
            <p className="flex items-center gap-1.5"><span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs">∞</span> <span className="font-black">BOTH GET 50 EP! 🎉</span></p>
          </div>
        </div>
      </div>
      <HanaAssistant />
    </div>
  );
}
