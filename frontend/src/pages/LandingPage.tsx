export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-errandify-bg to-orange-50 flex flex-col items-center justify-center px-4">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 text-orange-100 opacity-20 text-8xl">🌴</div>
      <div className="absolute top-10 right-0 w-32 h-32 text-orange-100 opacity-20 text-8xl">🌴</div>

      {/* Main Container */}
      <div className="w-full max-w-sm flex flex-col items-center justify-center">
        {/* Logo Section */}
        <div className="mb-12 text-center">
          <div className="text-6xl font-bold text-errandify-orange mb-2">
            🏘️
          </div>
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">
            ERRANDIFY
          </h1>
          <p className="text-gray-600 text-sm">
            Your Community of Helpful Neighbours
          </p>
        </div>

        {/* Family Photo Section */}
        <div className="w-full mb-8 bg-gradient-to-b from-orange-300 via-orange-200 to-orange-100 rounded-3xl p-8 shadow-lg flex items-center justify-center h-96 relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-9xl">🌴</span>
          </div>

          {/* Community representation */}
          <div className="text-center relative z-10">
            <div className="space-y-4">
              <p className="text-6xl">👨‍👩‍👧‍👦</p>
              <p className="font-bold text-gray-700 text-lg">Your Community Awaits</p>
              <p className="text-sm text-gray-600">
                Real neighbours helping real neighbours
              </p>
              <p className="text-xs text-gray-500 mt-3">
                ✨ Trusted | 👥 Local | 💪 Reliable
              </p>
            </div>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="w-full mb-8 space-y-4 px-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <p className="font-semibold text-errandify-brown text-sm">Post Errands Easily</p>
              <p className="text-xs text-gray-600">Tell us what you need done</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-semibold text-errandify-brown text-sm">Find Trusted Neighbours</p>
              <p className="text-xs text-gray-600">Get help from your community</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-semibold text-errandify-brown text-sm">Earn While Helping</p>
              <p className="text-xs text-gray-600">Turn your skills into income</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => window.location.href = '/login'}
          className="w-full bg-errandify-orange text-white py-4 rounded-full font-bold text-base hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl mb-4"
        >
          Get Started
        </button>

        {/* Footer Text */}
        <p className="text-xs text-gray-500 text-center">
          Singapore's community errand platform
        </p>
      </div>
    </div>
  );
}
