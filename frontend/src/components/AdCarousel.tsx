import { useState, useEffect } from 'react';

/**
 * The hero carousel — now fed by the server rather than by this file.
 *
 * Every slide used to come from the DEFAULT_ADS constant below: four
 * hardcoded cards that could only be changed by editing source and deploying.
 * Meanwhile companies could buy, be approved for and be charged for
 * `hero-banner` campaigns that nothing ever rendered, and admin could author
 * Hero Banners in Marcom that only appeared in a separate strip underneath.
 * Three systems, one surface, none of them connected.
 *
 * /api/banners returns the merged sequence: paid ads first, ordered by
 * share-of-voice deficit so spend buys proportional exposure without starving
 * small advertisers, then Errandify's own notices. DEFAULT_ADS survives only
 * as the fallback for when nothing at all is live.
 */

interface Ad {
  id: number;
  title: string;
  description: string;
  image: string;
  bgColor: string;
  cta?: { label: string; url: string };
  /** Present on server-supplied slides; absent on the built-in fallbacks. */
  kind?: 'ad' | 'errandify';
  imageUrl?: string | null;
  sponsoredBy?: string | null;
}

const DEFAULT_ADS: Ad[] = [
  {
    id: 1,
    title: '🎁 Earn Errandify Points',
    description: 'Complete errands and earn EP to redeem for rewards!',
    image: '🏆',
    bgColor: 'bg-[linear-gradient(135deg,#FF8A57_0%,#FF6B35_100%)]',
    cta: { label: 'Learn More', url: '/errandify-points' }
  },
  {
    id: 2,
    title: '💰 Get Paid Faster',
    description: 'Set up your payout method and start earning today',
    image: '💳',
    bgColor: 'bg-[linear-gradient(135deg,#3FBBA4_0%,#2FA48F_100%)]',
    cta: { label: 'Setup Payout', url: '/my-pocket?tab=payout' }
  },
  {
    id: 3,
    title: '👥 Refer & Earn',
    description: 'Share your code and earn bonuses when friends join!',
    image: '🎉',
    bgColor: 'bg-[linear-gradient(135deg,#E2736B_0%,#C95A52_100%)]',
    cta: { label: 'Referral Program', url: '/referral' }
  },
  {
    id: 4,
    title: '⭐ Build Reputation',
    description: 'Complete errands and get 5-star reviews',
    image: '✨',
    bgColor: 'bg-[linear-gradient(135deg,#F0A81E_0%,#D98C0C_100%)]',
    cta: { label: 'Browse Errands', url: '/browse' }
  },
];

/** Rotating background palette, so server slides are not all one colour. */
const SLIDE_COLOURS = [
  'bg-[linear-gradient(135deg,#FF8A57_0%,#FF6B35_100%)]',   // brand orange
  'bg-[linear-gradient(135deg,#3FBBA4_0%,#2FA48F_100%)]',   // kampung jade
  'bg-[linear-gradient(135deg,#F0A81E_0%,#D98C0C_100%)]',   // kampung sun
  'bg-[linear-gradient(135deg,#E2736B_0%,#C95A52_100%)]',   // kampung rose
];

export default function AdCarousel({ location = 'home' }: { location?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [slides, setSlides] = useState<Ad[]>(DEFAULT_ADS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/banners?location=${encodeURIComponent(location)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const rows = json.data || [];
        if (cancelled || rows.length === 0) return;
        setSlides(rows.map((r: any, i: number) => ({
          id: r.id,
          title: r.title,
          description: r.subtitle || '',
          image: r.image || '📣',
          imageUrl: r.imageUrl,
          bgColor: SLIDE_COLOURS[i % SLIDE_COLOURS.length],
          cta: r.ctaLink ? { label: r.ctaText || 'Learn More', url: r.ctaLink } : undefined,
          kind: r.kind,
          sponsoredBy: r.sponsoredBy,
        })));
        setCurrentIndex(0);
      } catch {
        // Keep the built-in slides; the hero is decoration, not a blocker.
      }
    })();
    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000); // Auto-scroll every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlay, slides.length]);

  const currentAd = slides[currentIndex] || slides[0];

  const api = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Count a delivery whenever a paid slide is actually shown. The rotation
  // upstream orders by impressions, so this is what makes fairness real
  // rather than a tie-break on approval date.
  useEffect(() => {
    if (currentAd?.kind !== 'ad') return;
    fetch(`${api}/api/banners/${currentAd.id}/impression`, { method: 'POST' }).catch(() => {});
  }, [currentAd?.id, currentAd?.kind]);

  const handleAdClick = () => {
    if (currentAd?.kind !== 'ad') return;
    fetch(`${api}/api/banners/${currentAd.id}/click`, { method: 'POST' }).catch(() => {});
  };

  const handlePrevious = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlay(false);
    setCurrentIndex(index);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-0.5 sm:py-2">
      {/* AD CAROUSEL */}
      <div
        className={`${currentAd.bgColor} rounded-2xl shadow-lg p-2.5 sm:p-4 text-white relative overflow-hidden transition-all duration-500 min-h-[48px] sm:min-h-[90px]`}
        onMouseEnter={() => setIsAutoPlay(false)}
        onMouseLeave={() => setIsAutoPlay(true)}
      >
        {/* CONTENT */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* LEFT: Icon */}
          {currentAd.imageUrl ? (
            <img
              src={currentAd.imageUrl}
              alt=""
              className="w-8 h-8 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="hidden sm:block text-5xl flex-shrink-0">{currentAd.image}</div>
          )}

          {/* CENTER: Text */}
          <div className="flex-1 min-w-0">
            {/* A paid slot has to be identifiable as one. */}
            {currentAd.kind === 'ad' && (
              <span className="inline-block bg-white bg-opacity-25 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mb-0.5">
                Sponsored{currentAd.sponsoredBy ? ` · ${currentAd.sponsoredBy}` : ''}
              </span>
            )}
            {/* Clamped rather than left to wrap. Unbounded, this copy took the
                block to 133px and pushed the category grid off the screen;
                clamped to a single line it truncated the title to three words.
                Two lines each is the balance: it fits the full title and
                description of every current slide, and measured at 360x600 the
                category grid still clears the bottom nav by ~90px. */}
            <h3 className="text-[13px] sm:text-lg font-bold mb-0.5 leading-tight line-clamp-2">
              {currentAd.title}
            </h3>
            <p className="text-white text-opacity-90 text-[11px] sm:text-xs leading-snug line-clamp-2">
              {currentAd.description}
            </p>
          </div>

          {/* RIGHT: CTA Button */}
          {currentAd.cta && (
            <div className="flex-shrink-0">
              <a
                href={currentAd.cta.url}
                onClick={handleAdClick}
                {...(currentAd.kind === 'ad'
                  ? { target: '_blank', rel: 'noopener noreferrer sponsored' }
                  : {})}
                className="bg-white text-gray-900 px-2.5 py-1 text-[11px] sm:px-6 sm:py-2.5 sm:text-sm rounded-xl font-bold hover:bg-gray-100 transition whitespace-nowrap shadow-lg hover:shadow-xl active:scale-95"
              >
                {currentAd.cta.label} →
              </a>
            </div>
          )}
        </div>

        {/* NAVIGATION BUTTONS */}
        <button
          onClick={handlePrevious}
          className="hidden sm:block absolute left-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white p-2 rounded-full transition"
        >
          ←
        </button>
        <button
          onClick={handleNext}
          className="hidden sm:block absolute right-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white p-2 rounded-full transition"
        >
          →
        </button>
      </div>

      {/* INDICATORS */}
      <div className="flex justify-center gap-1.5 mt-1 sm:mt-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-2 h-2 rounded-full transition ${
              index === currentIndex ? 'bg-errandify-orange w-5' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to ad ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
