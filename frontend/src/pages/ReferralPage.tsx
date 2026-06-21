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
          <button
            onClick={handleDownloadQR}
            className="w-full mt-1.5 bg-errandify-brown text-white px-2 py-1.5 rounded font-semibold text-xs hover:shadow-md transition"
          >
            Save QR Code
          </button>
        </div>

        {/* Code & Link - Action Buttons */}
        <div className="space-y-1 mb-2">
          <button
            onClick={handleCopyCode}
            className={`w-full p-2 rounded font-semibold text-xs transition ${
              copied === 'code'
                ? 'bg-errandify-brown text-white'
                : 'bg-amber-100 text-errandify-brown border border-amber-300 hover:shadow-md'
            }`}
          >
            {copied === 'code' ? '✅ Code Copied!' : `Code: ${referralData?.code}`}
          </button>
          <button
            onClick={handleCopyLink}
            className={`w-full p-2 rounded font-semibold text-xs transition ${
              copied === 'link'
                ? 'bg-errandify-brown text-white'
                : 'bg-amber-100 text-errandify-brown border border-amber-300 hover:shadow-md'
            }`}
          >
            {copied === 'link' ? '✅ Link Copied!' : 'Copy Share Link'}
          </button>
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
      </div>
      <HanaAssistant />
    </div>
  );
}
