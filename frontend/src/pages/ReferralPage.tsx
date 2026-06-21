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
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-lg text-gray-600 font-bold">
          ‹ Back
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">🎁 Referral Program</h1>
          <p className="text-gray-600">Share your code & earn Errandify Points when friends join</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* QR Code */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-4">Share Your Referral Code</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-3">
                <canvas ref={canvasRef} className="border-4 border-errandify-orange rounded-lg shadow-md" />
                <button
                  onClick={handleDownloadQR}
                  className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
                >
                  ⬇️ Download QR Code
                </button>
              </div>

              {/* Or Divider */}
              <div className="w-full flex items-center gap-3 text-gray-400">
                <div className="flex-1 border-t"></div>
                <span className="text-sm">or</span>
                <div className="flex-1 border-t"></div>
              </div>

              {/* Share Options */}
              <div className="w-full space-y-3">
                {/* Code */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Referral Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralData.code}
                      readOnly
                      className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-lg font-bold text-errandify-orange border border-gray-200"
                    />
                    <button
                      onClick={handleCopyCode}
                      className={`px-4 py-3 rounded-lg font-semibold text-sm transition whitespace-nowrap ${
                        copied === 'code'
                          ? 'bg-green-500 text-white'
                          : 'bg-errandify-orange text-white hover:bg-opacity-90'
                      }`}
                    >
                      {copied === 'code' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Link */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Referral Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralData.link}
                      readOnly
                      className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-sm border border-gray-200 truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-4 py-3 rounded-lg font-semibold text-sm transition whitespace-nowrap ${
                        copied === 'link'
                          ? 'bg-green-500 text-white'
                          : 'bg-errandify-orange text-white hover:bg-opacity-90'
                      }`}
                    >
                      {copied === 'link' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="text-center">
              <p className="text-3xl font-bold text-errandify-orange">{referralData.referredCount}</p>
              <p className="text-sm text-gray-600 mt-1">Friends Referred</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-errandify-orange">{referralData.earnedPoints} EP</p>
              <p className="text-sm text-gray-600 mt-1">Points Earned</p>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">How It Works</h3>
            <ol className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-3">
                <span className="font-bold text-errandify-orange flex-shrink-0">1.</span>
                <span>Share your code or link with friends</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-errandify-orange flex-shrink-0">2.</span>
                <span>They sign up using your referral code</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-errandify-orange flex-shrink-0">3.</span>
                <span>They complete their first errand</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-errandify-orange flex-shrink-0">4.</span>
                <span>You both earn 50 Errandify Points! 🎉</span>
              </li>
            </ol>
          </div>

          {/* Benefits */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-semibold text-gray-900 mb-3">Your Benefits</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span>⭐</span>
                <span>Earn 50 EP per successful referral</span>
              </li>
              <li className="flex gap-2">
                <span>🎁</span>
                <span>Your friend gets 50 EP too!</span>
              </li>
              <li className="flex gap-2">
                <span>💰</span>
                <span>Unlimited referrals - earn as much as you want</span>
              </li>
              <li className="flex gap-2">
                <span>🏆</span>
                <span>Top referrers get bonus rewards</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <HanaAssistant />
    </div>
  );
}
