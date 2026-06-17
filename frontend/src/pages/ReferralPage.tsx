import { useNavigate, useEffect, useRef } from 'react-router-dom';

export default function ReferralPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const referralCode = 'FRIEND123';
  const referralLink = `https://errandify.ai/join?ref=${referralCode}`;

  // Generate QR Code using QR Server API
  useEffect(() => {
    const generateQRCode = async () => {
      const img = new Image();
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}`;
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = 300;
            canvasRef.current.height = 300;
            ctx.drawImage(img, 0, 0);
          }
        }
      };
    };

    generateQRCode();
  }, [referralLink]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied!');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    alert('Referral code copied!');
  };

  const handleDownloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.href = canvasRef.current.toDataURL('image/png');
      link.download = `errandify-referral-${referralCode}.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">Referral Program</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        {/* Referral Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-errandify-brown mb-4">Invite Friends & Earn Rewards</h2>

          <div className="bg-errandify-orange/10 border border-errandify-orange rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-4">
              Share your referral code with friends. When they sign up and complete their first errand, you both get 50 Errandify Points!
            </p>
          </div>

          {/* Your Referral Code */}
          <div className="mb-6">
            <label className="text-sm font-bold text-gray-700 block mb-2">Your Referral Code</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-lg font-bold text-errandify-orange">
                {referralCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="bg-errandify-orange text-white px-4 py-2 rounded-lg font-bold"
              >
                Copy
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="mb-6">
            <label className="text-sm font-bold text-gray-700 block mb-3">QR Code (Share with Friends)</label>
            <div className="flex flex-col items-center gap-4 bg-gray-50 rounded-lg p-6">
              <canvas ref={canvasRef} className="border-4 border-errandify-orange rounded-lg" />
              <button
                onClick={handleDownloadQR}
                className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-bold"
              >
                ⬇️ Download QR Code
              </button>
            </div>
          </div>

          {/* Referral Link */}
          <div className="mb-6">
            <label className="text-sm font-bold text-gray-700 block mb-2">Referral Link</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700 break-all">
                {referralLink}
              </div>
              <button
                onClick={handleCopyLink}
                className="bg-errandify-orange text-white px-4 py-2 rounded-lg font-bold whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Referral Stats */}
          <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-200">
            <div>
              <p className="text-2xl font-bold text-errandify-orange">5</p>
              <p className="text-sm text-gray-600">Friends Referred</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-errandify-orange">250 EP</p>
              <p className="text-sm text-gray-600">Earned</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-errandify-brown mb-4">How It Works</h3>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="font-bold text-errandify-orange">1.</span>
              <span className="text-gray-700">Share your referral code or link with friends</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-errandify-orange">2.</span>
              <span className="text-gray-700">They sign up using your code</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-errandify-orange">3.</span>
              <span className="text-gray-700">They complete their first errand</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-errandify-orange">4.</span>
              <span className="text-gray-700">You both get 50 Errandify Points!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
