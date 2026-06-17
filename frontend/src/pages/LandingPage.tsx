export default function LandingPage() {
  return (
    <div className="h-screen bg-gradient-to-b from-errandify-bg to-orange-50 flex flex-col items-center px-3 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 text-orange-100 opacity-20 text-8xl">🌴</div>
      <div className="absolute top-10 right-0 w-32 h-32 text-orange-100 opacity-20 text-8xl">🌴</div>

      {/* Main Container - One Page */}
      <div className="w-full max-w-sm flex flex-col items-center justify-center h-full py-2">
        {/* Family Photo - Responsive Height */}
        <div className="w-full rounded-2xl overflow-hidden shadow-lg relative flex-shrink-0">
          {/* Family Photo - No Button */}
          <img
            src="/images/family_no_button.jpeg"
            alt="Our Community Family"
            className="w-full h-auto max-h-64 object-cover"
          />
        </div>

        {/* Value Proposition - Compact */}
        <div className="w-full my-2 space-y-1 px-2 flex-shrink-0">
          <div className="flex items-start gap-1.5">
            <span className="text-base flex-shrink-0">✨</span>
            <div className="min-w-0">
              <p className="font-semibold text-errandify-brown text-xs leading-tight">Post Errands Easily</p>
              <p className="text-xs text-gray-600 leading-tight">Tell us what you need done</p>
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <span className="text-base flex-shrink-0">👥</span>
            <div className="min-w-0">
              <p className="font-semibold text-errandify-brown text-xs leading-tight">Find Trusted Neighbours</p>
              <p className="text-xs text-gray-600 leading-tight">Get help from your community</p>
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <span className="text-base flex-shrink-0">💰</span>
            <div className="min-w-0">
              <p className="font-semibold text-errandify-brown text-xs leading-tight">Earn While Helping</p>
              <p className="text-xs text-gray-600 leading-tight">Turn your skills into income</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => window.location.href = '/login'}
          className="w-full bg-errandify-orange text-white py-2.5 rounded-full font-bold text-sm hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl my-2 flex-shrink-0"
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
