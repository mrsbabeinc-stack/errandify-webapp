import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminThemeWrapper from '../components/AdminThemeWrapper';
import ShareQRCode from '../components/ShareQRCode';
import {
  buildInviteMessage,
  buildWhatsAppShareUrl,
  JOIN_BONUS_EP,
  FIRST_JOB_BONUS_EP,
  MAX_PER_FRIEND_EP,
} from '../utils/referralShare';

interface ReferralData {
  code: string;
  link: string;
  referredCount: number;
  earnedPoints: number;
}

interface ReferredUser {
  id: string;
  alias: string;
  signupDate: string;
  status: 'active' | 'inactive';
  errandsCompleted: number;
  epEarned: number;
}

export default function ReferralPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  /**
   * A referral code is not something that can be faked.
   *
   * This used to fall back to `'ERRAND' + Math.random()...` whenever the API
   * was slow or errored, plus five invented referrals. That code belonged to
   * no account, so anyone who shared it sent friends a link the server could
   * not match to a referrer — the invite worked, the attribution silently did
   * not, and the page cheerfully showed 250 EP earned from five people who do
   * not exist.
   *
   * An error is the honest answer here, because the alternative is handing
   * someone a broken code and letting them post it to their friends.
   */
  const fetchReferralData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/referral`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.data?.code) {
        setReferralData(response.data.data);
        setReferredUsers(response.data.data.referredUsers || []);
      } else {
        setLoadError('We could not load your referral code just now.');
      }
    } catch (err) {
      console.error('Referral data failed to load:', err);
      setLoadError('We could not load your referral code just now.');
    } finally {
      setLoading(false);
    }
  };

  // QR drawing now happens inside <ShareQRCode>, on the device. It used to be
  // fetched from api.qrserver.com, which meant this account's referral code
  // was sent to a third party on every page view — see the note in that
  // component. `canvasRef` is still populated by it so the download button
  // below keeps working unchanged.

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


  return (
    <AdminThemeWrapper
      title="🎁 Refer & Earn!"
      subtitle="Invite friends and earn amazing rewards together"
      showBackButton
      onBack={() => navigate(-1)}
      style={{background: 'linear-gradient(135deg, #FFFBF8 0%, #FFF6F0 50%, #FFE8D6 100%)'}}
    >
      <div className="max-w-2xl mx-auto">
        {loading && (
          <div className="bg-white rounded-lg p-6 text-center border-2 border-orange-200 text-sm text-gray-600">
            Loading your referral code…
          </div>
        )}

        {/* Better an honest failure than a made-up code posted to a group chat. */}
        {!loading && loadError && (
          <div className="bg-white rounded-lg p-6 text-center border-2 border-red-200">
            <p className="text-sm font-bold text-red-700 mb-2">{loadError}</p>
            <p className="text-xs text-gray-600 mb-4">
              Please don't share a code from this screen until it loads — an invite
              sent with the wrong code won't be credited to you.
            </p>
            <button
              onClick={fetchReferralData}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold"
            >
              Try again
            </button>
          </div>
        )}

        {referralData && (
          <>
            {/* Hero Pitch */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-3 mb-2 shadow-lg text-center">
              {/* Both bonuses, stated. The page only ever mentioned one of the
                  two, so it undersold the reward by half. */}
              <p className="text-lg font-black text-white mb-1">🎉 Up to {MAX_PER_FRIEND_EP} EP Per Friend!</p>
              <p className="text-xs font-bold text-orange-100">{JOIN_BONUS_EP} EP when they join · {FIRST_JOB_BONUS_EP} EP on their first errand 💸</p>
              <p className="text-xs text-orange-50 mt-1">Help your friends join, grow together 🤝</p>
            </div>

            {/* QR Code - Compact */}
            <div className="bg-white rounded-lg p-2 mb-2 shadow-md border-2 border-orange-300 text-center">
              <div className="bg-white rounded inline-block mb-2 p-1.5 border border-orange-200">
                <ShareQRCode
                  value={referralData?.link || ''}
                  size={120}
                  canvasRefOut={canvasRef}
                  downloadName={`errandify-referral-${referralData?.code || ''}`}
                />
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 py-2 rounded font-bold text-sm hover:shadow-lg transition"
                >
                  🚀 SHARE & EARN!
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded font-bold text-xs transition"
                >
                  💾 Save QR
                </button>
              </div>
            </div>

            {/* Code & Link - Compact */}
            <div className="space-y-1 mb-2">
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-300">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={referralData?.code || ''}
                    readOnly
                    className="flex-1 bg-white px-2 py-1.5 rounded font-bold text-orange-600 border border-orange-200 text-xs text-center"
                  />
                  <button
                    onClick={handleCopyCode}
                    className={`px-2 py-1.5 rounded font-bold text-xs ${
                      copied === 'code'
                        ? 'bg-green-500 text-white'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {copied === 'code' ? '✅' : '📋'}
                  </button>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-2 border border-orange-300">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={referralData?.link || ''}
                    readOnly
                    className="flex-1 bg-white px-2 py-1.5 rounded text-orange-600 border border-orange-200 text-xs truncate font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-2 py-1.5 rounded font-bold text-xs ${
                      copied === 'link'
                        ? 'bg-green-500 text-white'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {copied === 'link' ? '✅' : '🔗'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="bg-orange-400 rounded-lg p-2 shadow text-center text-white">
                <p className="text-2xl font-black">{referralData?.referredCount}</p>
                <p className="text-xs font-bold">Friends</p>
              </div>
              <div className="bg-orange-500 rounded-lg p-2 shadow text-center text-white">
                <p className="text-2xl font-black">{referralData?.earnedPoints}</p>
                <p className="text-xs font-bold">Points</p>
              </div>
            </div>

            {/* How It Works - Mini */}
            <div className="bg-orange-50 rounded-lg p-2 shadow-sm border border-orange-300 text-center mb-3">
              <p className="text-xs font-bold text-orange-800">💡 Share → they join (+{JOIN_BONUS_EP} EP) → they finish an errand (+{FIRST_JOB_BONUS_EP} EP)</p>
            </div>

            {/* Motivational Message */}
            <div className="bg-yellow-50 rounded-lg p-2 border-2 border-yellow-300 mb-2 text-center">
              <p className="text-xs font-bold text-yellow-800">✨ {referredUsers.filter(u => u.status === 'active').length} friends actively earning EP! Encourage them to complete more errands 🚀</p>
            </div>

            {/* Referral History */}
            <div className="bg-white rounded-lg p-2 border border-orange-300 shadow-sm">
              <p className="text-sm font-bold text-orange-800 mb-2">📋 Your Referrals ({referredUsers.length}) <span className="text-xs text-orange-600">- Earn more when they complete errands!</span></p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {referredUsers.length > 0 ? (
                  referredUsers.map((user) => (
                    <div key={user.id} className={`rounded-lg p-2 border flex items-center justify-between text-xs ${
                      user.status === 'active'
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{user.alias}</p>
                        <p className="text-gray-600 text-xs">{new Date(user.signupDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          user.status === 'active'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-400 text-white'
                        }`}>
                          {user.status === 'active' ? '✓' : '○'}
                        </span>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{user.errandsCompleted}</p>
                          <p className="text-gray-600">errands</p>
                        </div>
                        <div className="text-right border-l border-orange-300 pl-1.5">
                          <p className="font-black text-orange-700">{user.epEarned}</p>
                          <p className="text-gray-600">EP</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-600 py-4">No referrals yet. Share your code to get started!</p>
                )}
              </div>
            </div>

            {/* Share Modal */}
            {showShareModal && referralData && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                  <h2 className="text-2xl font-bold text-errandify-brown mb-2">
                    💌 Invite & Earn Together!
                  </h2>
                  {/* Said "You both earn 50 EP". Only the referrer is credited —
                      awardReferralPoints is called with referrerId for both the
                      join and the first-errand bonus, and never for the person
                      referred. Promising a reward the system does not pay is
                      worse than promising nothing. */}
                  <p className="text-sm text-gray-600 mb-4">
                    Share your referral code. You earn {JOIN_BONUS_EP} EP when they join and another{' '}
                    {FIRST_JOB_BONUS_EP} EP once they complete their first errand! 🎁
                  </p>

                  {/* QR Code */}
                  <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">📱 Scan to Join</p>
                    <ShareQRCode value={referralData.link} size={128} className="mx-auto" />
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
                      value={buildInviteMessage(referralData.code)}
                      className="w-full px-2 py-1.5 bg-white border border-green-200 rounded text-xs resize-none h-28 font-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          buildInviteMessage(referralData.code)
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
                      href={buildWhatsAppShareUrl(buildInviteMessage(referralData.code))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition text-center"
                    >
                      WhatsApp
                    </a>
                    <button
                      onClick={() => {
                        const subject = `Join me on Errandify!`;
                        const body = buildInviteMessage(referralData.code);
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
          </>
        )}
      </div>
    </AdminThemeWrapper>
  );
}
