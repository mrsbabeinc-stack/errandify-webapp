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

        {/* Meet Our Friends Section */}
        <div className="w-full mb-8 bg-gradient-to-b from-yellow-100 via-yellow-50 to-yellow-100 rounded-3xl p-8 shadow-lg flex items-center justify-center min-h-80 relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-5">
            <span className="text-9xl">🌴</span>
          </div>

          {/* Team representation */}
          <div className="text-center relative z-10 w-full">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Meet Our Friends</h2>
            <p className="text-gray-700 font-semibold mb-6">Esha, Lian, Hana & Piers are here to help!</p>

            {/* Character Avatars Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 w-full">
              {/* Esha */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-3 border-errandify-orange overflow-hidden bg-gray-200">
                  <img src="/images/Esha_Sora_4K.png" alt="Esha" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-gray-700 font-semibold mt-2">Esha</p>
              </div>

              {/* Lian */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-3 border-errandify-orange overflow-hidden bg-gray-200">
                  <img src="/images/Lian_4K.png" alt="Lian" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-gray-700 font-semibold mt-2">Lian</p>
              </div>

              {/* Hana */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-3 border-errandify-orange overflow-hidden bg-gray-200">
                  <img src="/images/Hana_Pose_1_4K.png" alt="Hana" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-gray-700 font-semibold mt-2">Hana</p>
              </div>

              {/* Piers */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-3 border-errandify-orange overflow-hidden bg-gray-200">
                  <img src="/images/Piers_4K.png" alt="Piers" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-gray-700 font-semibold mt-2">Piers</p>
              </div>
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
