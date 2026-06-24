export default function LandingPage() {
  return (
    <div className="h-screen bg-gradient-to-b from-errandify-bg to-orange-50 flex flex-col items-center overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 text-orange-100 opacity-20 text-8xl">🌴</div>
      <div className="absolute top-10 right-0 w-32 h-32 text-orange-100 opacity-20 text-8xl">🌴</div>

      {/* Main Container - Maximize Photo + Text */}
      <div className="w-full flex flex-col items-center justify-between h-full">
        {/* Family Photo - Narrower & Proportionate */}
        <div className="max-w-xs w-full flex-1 rounded-b-3xl shadow-lg mx-auto overflow-hidden flex items-center justify-center bg-gray-100">
          {/* Family Photo - No Button - Contain to preserve logo */}
          <img
            src="/images/family_no_button.jpeg"
            alt="Our Community Family"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Bottom Section - Text & Button */}
        <div className="w-full bg-gradient-to-b from-orange-50 to-orange-100 px-4 py-4 flex flex-col justify-end items-center flex-shrink-0">
          {/* Logo */}
          <div className="max-w-xs w-full text-center mb-3">
            <img
              src="/images/Errandify Logo.png"
              alt="Errandify"
              className="h-12 w-auto mx-auto mb-2"
            />
            <p className="text-xs font-semibold text-errandify-orange italic mb-2">
              Simplifying Life. Amplifying Humanity.
            </p>
            <p className="text-sm font-bold text-errandify-brown">
              Get Help. Give Help. Get Paid
            </p>
          </div>

          {/* Value Proposition - Compact */}
          <div className="max-w-xs w-full space-y-1 mb-3">
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
            className="w-full max-w-xs bg-errandify-orange text-white py-3 rounded-full font-bold text-sm hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl mb-3"
          >
            Get Started
          </button>

          {/* Sign In Link */}
          <p className="text-sm text-gray-700 text-center mb-4">
            Already have an account?{' '}
            <a href="/login" className="text-errandify-orange font-bold hover:underline">
              Sign in
            </a>
          </p>

          {/* Divider */}
          <div className="w-full max-w-xs border-t border-gray-300 mb-3"></div>

          {/* Learn More Links */}
          <div className="flex gap-2 justify-center mb-3">
            <a
              href="/how-it-works"
              className="text-xs text-errandify-orange hover:underline font-semibold"
            >
              How It Works
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="/about"
              className="text-xs text-errandify-orange hover:underline font-semibold"
            >
              About Us
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="/faq"
              className="text-xs text-errandify-orange hover:underline font-semibold"
            >
              FAQ
            </a>
          </div>

          {/* SingPass Footer */}
          <p className="text-xs text-gray-600 text-center">
            Powered by SingPass
          </p>
        </div>
      </div>
    </div>
  );
}
