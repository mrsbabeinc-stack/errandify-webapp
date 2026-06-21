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
          <h1 className="text-lg font-bold text-errandify-brown">🎁 Referral</h1>
          <span className="ml-auto text-lg">💰</span>
        </div>

        {/* Hero Banner - Compact */}
        <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white rounded-lg p-2 mb-2 text-xs text-center font-bold">
          Earn 50 EP per friend! No limits 🎯
        </div>

        {/* QR Code - Compact */}
        <div className="bg-white rounded-lg p-2 border-2 border-errandify-orange mb-2 text-center">
          <canvas ref={canvasRef} className="border-2 border-errandify-orange rounded mx-auto" />
          <button
            onClick={handleDownloadQR}
            className="w-full mt-1 bg-errandify-orange text-white px-2 py-1 rounded text-xs font-bold"
          >
            Download QR
          </button>
        </div>

        {/* Code & Link - Minimal */}
        <div className="space-y-0.5 mb-2">
          <div className="bg-white rounded border border-errandify-orange p-1.5 flex gap-0.5">
            <input
              type="text"
              value={referralData?.code || ''}
              readOnly
              className="flex-1 bg-transparent px-1 text-xs font-bold text-errandify-orange border-0"
            />
            <button
              onClick={handleCopyCode}
              className={`px-2 py-1 rounded text-xs font-bold ${
                copied === 'code' ? 'bg-green-500 text-white' : 'bg-errandify-orange text-white'
              }`}
            >
              {copied === 'code' ? '✓' : 'Copy'}
            </button>
          </div>
          <div className="bg-white rounded border border-blue-400 p-1.5 flex gap-0.5">
            <input
              type="text"
              value={referralData?.link || ''}
              readOnly
              className="flex-1 bg-transparent px-1 text-xs border-0 truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`px-2 py-1 rounded text-xs font-bold ${
                copied === 'link' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
              }`}
            >
              {copied === 'link' ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Stats - Compact */}
        <div className="grid grid-cols-2 gap-1 mb-2 bg-orange-50 rounded-lg p-2 border border-orange-300 text-center">
          <div>
            <p className="text-2xl font-bold text-errandify-orange">{referralData?.referredCount}</p>
            <p className="text-xs text-gray-600">Referred</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-errandify-orange">{referralData?.earnedPoints}</p>
            <p className="text-xs text-gray-600">Earned</p>
          </div>
        </div>

        {/* How It Works - Minimal */}
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-300 text-xs text-gray-700 space-y-0.5">
          <p className="font-bold">✨ How:</p>
          <p>1️⃣ Share code</p>
          <p>2️⃣ Friend signs up</p>
          <p>3️⃣ They do first job</p>
          <p>4️⃣ Both earn 50 EP 🎉</p>
        </div>
      </div>
      <HanaAssistant />
    </div>
  );
}
