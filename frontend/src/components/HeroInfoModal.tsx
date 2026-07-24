import { useNavigate } from 'react-router-dom';

export interface HeroInfoContent {
  icon: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
}

/**
 * Generic bottom-sheet for the Home hero's Errandify notices (Get Paid Faster,
 * Refer & Earn, Build Reputation, …). Instead of the CTA jumping straight to a
 * full page, it opens this lightweight sheet on the spot; its primary button
 * then routes to the real destination. Matches EarnPointsModal's look. Text is
 * div/span so the global h2/p !important rules don't distort the scale.
 */
export default function HeroInfoModal({ content, onClose }: { content: HeroInfoContent | null; onClose: () => void }) {
  const navigate = useNavigate();
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-orange-200 p-5 pb-6 animate-[epSheetUp_0.25s_ease-out]">
        <div className="w-10 h-1.5 rounded-full bg-orange-200 mx-auto mb-3 sm:hidden" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 w-8 h-8 rounded-full bg-orange-50 text-errandify-orange-deep font-bold flex items-center justify-center hover:bg-orange-100 transition"
        >
          ✕
        </button>

        <div className="text-center pt-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center text-4xl shadow-sm">
            {content.icon}
          </div>
          <div className="text-lg font-black text-errandify-brown mt-3">{content.title}</div>
          <div className="text-[13px] text-gray-600 mt-1 leading-snug px-2">{content.description}</div>
        </div>

        <button
          onClick={() => {
            onClose();
            navigate(content.ctaUrl);
          }}
          className="w-full bg-gradient-to-r from-errandify-orange to-amber-500 text-white py-3 rounded-xl font-black text-sm shadow-lg mt-5 active:scale-95 transition"
        >
          {content.ctaLabel} →
        </button>
      </div>

      <style>{`@keyframes epSheetUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  );
}
