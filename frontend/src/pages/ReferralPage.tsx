import { useNavigate, useEffect, useRef } from 'react-router-dom';

export default function ReferralPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const referralCode = 'FRIEND123';
  const referralLink = `https://errandify.ai/join?ref=${referralCode}`;

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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-lg text-gray-600 font-bold"
        >
          ‹ Back
        </button>

        <h1 className="text-3xl font-bold text-errandify-brown mb-6">Referral Program</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <p className="text-gray-700 mb-6">
            Invite friends and earn 50 EP when they complete their first errand!
          </p>

          {/* QR Code */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3">QR Code</h3>
            <div className="flex flex-col items-center gap-4 bg-gray-50 p-6 rounded-lg">
              <canvas ref={canvasRef} className="border-4 border-errandify-orange rounded" />
              <button
                onClick={handleDownloadQR}
                className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-bold"
              >
                Download QR
              </button>
            </div>
          </div>

          {/* Code */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-2">Referral Code</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralCode}
                readOnly
                className="flex-1 bg-gray-100 rounded px-3 py-2 font-mono font-bold text-errandify-orange"
              />
              <button
                onClick={handleCopyCode}
                className="bg-errandify-orange text-white px-4 py-2 rounded font-bold"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Link */}
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Referral Link</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-gray-100 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="bg-errandify-orange text-white px-4 py-2 rounded font-bold whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
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
      </div>
    </div>
  );
}
