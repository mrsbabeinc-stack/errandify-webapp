export default function LandingPage() {
  return (
    <div className="h-screen bg-gradient-to-b from-errandify-bg to-orange-50 flex flex-col items-center px-3 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 text-orange-100 opacity-20 text-8xl">🌴</div>
      <div className="absolute top-10 right-0 w-32 h-32 text-orange-100 opacity-20 text-8xl">🌴</div>

      {/* Main Container - One Page */}
      <div className="w-full max-w-sm flex flex-col items-center justify-between h-full py-3">
        {/* Family Photo - Main Focus */}
        <div className="w-full rounded-2xl overflow-hidden shadow-lg relative flex-shrink-0">
          {/* Family Photo - No Button */}
          <img
            src="/images/family_no_button.jpeg"
            alt="Our Community Family"
            className="w-full h-auto max-h-72 object-cover"
          />
        </div>

        {/* Value Proposition - Compact */}
        <div className="w-full my-3 space-y-1.5 px-2 flex-shrink-0">
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">✨</span>
            <div className="min-w-0">
              <p className="font-semibold text-errandify-brown text-xs">Post Errands Easily</p>
              <p className="text-xs text-gray-600">Tell us what you need done</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">👥</span>
            <div className="min-w-0">
              <p className="font-semibold text-errandify-brown text-xs">Find Trusted Neighbours</p>
              <p className="text-xs text-gray-600">Get help from your community</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">💰</span>
            <div className="min-w-0">
              <p className="font-semibold text-errandify-brown text-xs">Earn While Helping</p>
              <p className="text-xs text-gray-600">Turn your skills into income</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => window.location.href = '/login'}
          className="w-full bg-errandify-orange text-white py-3 rounded-full font-bold text-sm hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl mb-2 flex-shrink-0"
        >
          Get Started
        </button>

        {/* Footer Text */}
        <p className="text-xs text-gray-500 text-center flex-shrink-0">
          Singapore AI Powered Community Platform
        </p>
      </div>
    </div>
  );
}
