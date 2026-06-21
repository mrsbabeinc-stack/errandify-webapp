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
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="flex-1 text-lg font-black text-errandify-brown">🚀 Earn & Share</h1>
        </div>

        {/* Hero Pitch */}
        <div className="bg-errandify-orange text-white rounded-lg p-2 mb-2 shadow-md text-center">
          <p className="text-sm font-black mb-0.5">💰 Get 50 EP Per Friend</p>
          <p className="text-xs opacity-90">No limits. Earn forever. 🎯</p>
        </div>

        {/* QR Code */}
        <div className="bg-amber-50 rounded-lg p-2 mb-2 shadow-md border-2 border-errandify-orange text-center">
          <p className="text-xs font-bold text-errandify-brown mb-1">📱 Scan to Join</p>
          <canvas ref={canvasRef} className="border-2 border-errandify-orange rounded mx-auto" />
          <button
            onClick={handleDownloadQR}
            className="w-full mt-1 bg-errandify-orange text-white px-2 py-1.5 rounded font-bold text-xs"
          >
            ⬇️ Save QR
          </button>
        </div>

        {/* Code & Link - Action Buttons */}
        <div className="space-y-1 mb-2">
          <button
            onClick={handleCopyCode}
            className={`w-full p-2 rounded font-bold text-xs transition ${
              copied === 'code'
                ? 'bg-errandify-brown text-white'
                : 'bg-errandify-orange text-white hover:shadow-md'
            }`}
          >
            {copied === 'code' ? '✅ COPIED!' : `📋 Code: ${referralData?.code}`}
          </button>
          <button
            onClick={handleCopyLink}
            className={`w-full p-2 rounded font-bold text-xs transition ${
              copied === 'link'
                ? 'bg-errandify-brown text-white'
                : 'bg-amber-700 text-white hover:shadow-md'
            }`}
          >
            {copied === 'link' ? '✅ COPIED!' : '🔗 Copy Link'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className="bg-errandify-orange text-white rounded-lg p-2.5 shadow-md text-center">
            <p className="text-2xl font-black">{referralData?.referredCount}</p>
            <p className="text-xs font-bold">Referred</p>
          </div>
          <div className="bg-errandify-brown text-white rounded-lg p-2.5 shadow-md text-center">
            <p className="text-2xl font-black">{referralData?.earnedPoints}</p>
            <p className="text-xs font-bold">Earned</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-amber-50 rounded-lg p-2.5 shadow-md border-l-4 border-errandify-orange">
          <p className="font-bold text-errandify-brown mb-1.5 text-sm">✨ How It Works:</p>
          <div className="space-y-0.5 text-xs text-errandify-brown">
            <p className="flex items-center gap-2"><span className="bg-errandify-orange text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span> Share code</p>
            <p className="flex items-center gap-2"><span className="bg-errandify-orange text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span> Friend signs up</p>
            <p className="flex items-center gap-2"><span className="bg-errandify-orange text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span> They do 1 job</p>
            <p className="flex items-center gap-2"><span className="bg-errandify-orange text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">∞</span> <span className="font-bold">Both earn 50 EP! 🎉</span></p>
          </div>
        </div>
      </div>
      <HanaAssistant />
    </div>
  );
}
