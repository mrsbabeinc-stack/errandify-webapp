import { useNavigate } from 'react-router-dom';
import { useErrandifyPoints } from '../hooks/useErrandifyPoints';

/**
 * Lightweight "Earn Errandify Points" summary as a bottom-sheet modal.
 *
 * The Home hero's "Learn More" used to navigate to a whole /errandify-points
 * page (and that page was off-theme — green/blue/purple cards). For a short
 * balance + ways-to-earn + one CTA, a sheet that keeps the user on Home reads
 * lighter and more app-like. The real redemption flow still opens its own page
 * from the CTA. Text uses div/span so the global h2/p !important rules don't
 * distort the scale.
 */
export default function EarnPointsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { points, loading } = useErrandifyPoints();

  if (!open) return null;

  const earningMethods = [
    { icon: '✅', label: 'Complete errand', points: '+10 EP' },
    { icon: '👥', label: 'Refer friend', points: '+50 EP' },
    { icon: '⭐', label: 'Complete review', points: '+5 EP' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-orange-200 p-4 pb-6 animate-[epSheetUp_0.25s_ease-out]">
        {/* Grabber (mobile) + close */}
        <div className="w-10 h-1.5 rounded-full bg-orange-200 mx-auto mb-3 sm:hidden" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 w-8 h-8 rounded-full bg-orange-50 text-errandify-orange-deep font-bold flex items-center justify-center hover:bg-orange-100 transition"
        >
          ✕
        </button>

        {/* Balance */}
        <div className="bg-gradient-to-br from-errandify-orange to-orange-600 rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10" />
          <div className="text-xs opacity-90 relative z-10">Your Balance</div>
          <div className="text-4xl font-black relative z-10 leading-tight">{loading ? '…' : `${points} EP`}</div>
          <div className="text-xs opacity-90 relative z-10">Ready to redeem 🎉</div>
        </div>

        {/* Ways to earn */}
        <div className="mt-4">
          <div className="text-sm font-black text-errandify-brown mb-2">Ways to Earn</div>
          <div className="grid grid-cols-3 gap-2">
            {earningMethods.map((m, i) => (
              <div key={i} className="bg-orange-50 border border-orange-100 rounded-xl p-2 text-center">
                <span className="text-2xl block">{m.icon}</span>
                <div className="text-[11px] font-semibold text-errandify-brown mt-1 leading-tight">{m.label}</div>
                <div className="text-xs font-black text-errandify-orange-deep mt-0.5">{m.points}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Unlock rewards */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 flex gap-2 items-center">
          <div className="text-2xl shrink-0">🎁</div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-errandify-brown">Unlock Rewards</div>
            <div className="text-xs text-gray-500">Discounts, vouchers &amp; perks!</div>
          </div>
        </div>

        {/* CTA — opens the full redemption flow */}
        <button
          onClick={() => {
            onClose();
            navigate('/my-account?tab=rewards');
          }}
          className="w-full bg-gradient-to-r from-errandify-orange to-amber-500 text-white py-3 rounded-xl font-black text-sm shadow-lg mt-4 active:scale-95 transition"
        >
          Redeem Points 🚀
        </button>
      </div>

      <style>{`@keyframes epSheetUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  );
}
