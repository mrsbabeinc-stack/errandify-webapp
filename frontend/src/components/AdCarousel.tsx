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
    bgColor: 'bg-gradient-to-r from-amber-400 to-orange-400',
    cta: { label: 'Learn More', url: '/errandify-points' }
  },
  {
    id: 2,
    title: '💰 Get Paid Faster',
    description: 'Set up your payout method and start earning today',
    image: '💳',
    bgColor: 'bg-gradient-to-r from-blue-400 to-cyan-400',
    cta: { label: 'Setup Payout', url: '/payout-settings' }
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
    title: '⭐ Build Your Reputation',
    description: 'Complete tasks and get 5-star reviews',
    image: '✨',
    bgColor: 'bg-gradient-to-r from-purple-400 to-indigo-400',
    cta: { label: 'Browse Errands', url: '/errands' }
  },
];

export default function AdCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

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
        className={`${currentAd.bgColor} rounded-lg shadow p-5 text-white relative overflow-hidden transition-all duration-500`}
        onMouseEnter={() => setIsAutoPlay(false)}
        onMouseLeave={() => setIsAutoPlay(true)}
      >
        {/* CONTENT */}
        <div className="flex items-center justify-between gap-4">
          {/* LEFT: Icon */}
          <div className="text-5xl flex-shrink-0">{currentAd.image}</div>

          {/* CENTER: Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold mb-1">{currentAd.title}</h3>
            <p className="text-white text-opacity-90 text-sm">{currentAd.description}</p>
          </div>

          {/* RIGHT: CTA Button */}
          {currentAd.cta && (
            <div className="flex-shrink-0">
              <a
                href={currentAd.cta.url}
                className="bg-white text-gray-800 px-4 py-2 rounded font-bold text-sm hover:bg-opacity-90 transition whitespace-nowrap"
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
