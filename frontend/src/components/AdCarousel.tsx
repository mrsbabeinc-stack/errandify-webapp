import { useState, useEffect } from 'react';

interface Ad {
  id: number;
  title: string;
  description: string;
  image: string;
  bgColor: string;
  cta?: { label: string; url: string };
}

const DEFAULT_ADS: Ad[] = [
  {
    id: 1,
    title: '🎁 Earn Errandify Points',
    description: 'Complete errands and earn EP to redeem for rewards!',
    image: '🏆',
    bgColor: 'bg-gradient-to-r from-blue-400 to-blue-500',
    cta: { label: 'Learn More', url: '/errandify-points' }
  },
  {
    id: 2,
    title: '💰 Get Paid Faster',
    description: 'Set up your payout method and start earning today',
    image: '💳',
    bgColor: 'bg-gradient-to-r from-blue-400 to-cyan-400',
    cta: { label: 'Setup Payout', url: '/my-pocket?tab=payout' }
  },
  {
    id: 3,
    title: '👥 Refer & Earn',
    description: 'Share your code and earn bonuses when friends join!',
    image: '🎉',
    bgColor: 'bg-gradient-to-r from-pink-400 to-rose-400',
    cta: { label: 'Referral Program', url: '/referral' }
  },
  {
    id: 4,
    title: '⭐ Build Reputation',
    description: 'Complete errands and get 5-star reviews',
    image: '✨',
    bgColor: 'bg-gradient-to-r from-purple-400 to-indigo-400',
    cta: { label: 'Browse Errands', url: '/browse' }
  },
];

export default function AdCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DEFAULT_ADS.length);
    }, 5000); // Auto-scroll every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const currentAd = DEFAULT_ADS[currentIndex];

  const handlePrevious = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev - 1 + DEFAULT_ADS.length) % DEFAULT_ADS.length);
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev + 1) % DEFAULT_ADS.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlay(false);
    setCurrentIndex(index);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-2">
      {/* AD CAROUSEL */}
      <div
        className={`${currentAd.bgColor} rounded-2xl shadow-lg p-3 sm:p-4 text-white relative overflow-hidden transition-all duration-500 min-h-[64px] sm:min-h-[90px]`}
        onMouseEnter={() => setIsAutoPlay(false)}
        onMouseLeave={() => setIsAutoPlay(true)}
      >
        {/* CONTENT */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* LEFT: Icon */}
          <div className="text-3xl sm:text-5xl flex-shrink-0">{currentAd.image}</div>

          {/* CENTER: Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-lg font-bold mb-0.5 leading-tight">{currentAd.title}</h3>
            <p className="text-white text-opacity-90 text-xs leading-snug">{currentAd.description}</p>
          </div>

          {/* RIGHT: CTA Button */}
          {currentAd.cta && (
            <div className="flex-shrink-0">
              <a
                href={currentAd.cta.url}
                className="bg-white text-gray-900 px-3 py-1.5 text-xs sm:px-6 sm:py-2.5 sm:text-sm rounded-xl font-bold hover:bg-gray-100 transition whitespace-nowrap shadow-lg hover:shadow-xl active:scale-95"
              >
                {currentAd.cta.label} →
              </a>
            </div>
          )}
        </div>

        {/* NAVIGATION BUTTONS */}
        <button
          onClick={handlePrevious}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white p-2 rounded-full transition"
        >
          ←
        </button>
        <button
          onClick={handleNext}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white p-2 rounded-full transition"
        >
          →
        </button>
      </div>

      {/* INDICATORS */}
      <div className="flex justify-center gap-1.5 mt-1.5">
        {DEFAULT_ADS.map((_, index) => (
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
