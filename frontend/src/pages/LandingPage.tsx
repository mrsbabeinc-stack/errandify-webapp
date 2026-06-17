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
          <div className="flex flex-col items-center gap-4 mb-4">
            <img
              src="/images/Errandify Logo.png"
              alt="Errandify Logo"
              className="w-32 h-32 object-contain"
            />
            <h1 className="text-3xl font-bold text-errandify-brown">
              ERRANDIFY
            </h1>
          </div>
          <p className="text-gray-600 text-sm">
            Simplifying lives. Amplifying humanity.
          </p>
        </div>

        {/* Meet Our Friends Section - Family Photo */}
        <div className="w-full mb-8 rounded-3xl overflow-hidden shadow-lg relative">
          {/* Family Photo */}
          <img
            src="/images/family.jpeg"
            alt="Our Community Family"
            className="w-full h-auto object-cover"
          />
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
