import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ReferralPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const referralCode = 'FRIEND123';
  const referralLink = `https://errandify.ai/join?ref=${referralCode}`;

  useEffect(() => {
    const generateQRCode = async () => {
      const img = new Image();
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`;
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
  }, [referralLink]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    alert('Code copied!');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Link copied!');
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
    <div className="min-h-screen bg-gray-50 p-3 flex flex-col">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-3 text-lg text-gray-600 font-bold self-start"
        >
          ‹ Back
        </button>

        <h1 className="text-2xl font-bold text-errandify-brown mb-3">Referral Program</h1>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Description */}
          <p className="text-sm text-gray-700">
            Invite friends & earn 50 EP when they complete their first errand!
          </p>

          {/* QR Code - Compact */}
          <div className="flex flex-col items-center gap-2">
            <canvas ref={canvasRef} className="border-3 border-errandify-orange rounded" />
            <button
              onClick={handleDownloadQR}
              className="bg-errandify-orange text-white px-4 py-1 rounded text-sm font-bold"
            >
              ⬇️ Download
            </button>
          </div>

          {/* Code & Link - Compact */}
          <div className="space-y-2">
            {/* Code */}
            <div>
              <label className="text-xs font-bold text-gray-600">Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralCode}
                  readOnly
                  className="flex-1 bg-gray-100 rounded px-2 py-1 font-mono text-sm font-bold text-errandify-orange"
                />
                <button
                  onClick={handleCopyCode}
                  className="bg-errandify-orange text-white px-3 py-1 rounded text-sm font-bold"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Link */}
            <div>
              <label className="text-xs font-bold text-gray-600">Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-gray-100 rounded px-2 py-1 text-xs truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-errandify-orange text-white px-3 py-1 rounded text-sm font-bold whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Stats - Compact */}
          <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded p-3">
            <div className="text-center">
              <p className="text-xl font-bold text-errandify-orange">5</p>
              <p className="text-xs text-gray-600">Friends Referred</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-errandify-orange">250 EP</p>
              <p className="text-xs text-gray-600">Earned</p>
            </div>
          </div>

          {/* How It Works - Compact */}
          <div className="text-sm">
            <h3 className="font-bold text-gray-900 mb-2">How It Works</h3>
            <ol className="text-xs text-gray-700 space-y-1">
              <li>1. Share code/link with friends</li>
              <li>2. They sign up using your code</li>
              <li>3. They complete first errand</li>
              <li>4. You both get 50 EP!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
