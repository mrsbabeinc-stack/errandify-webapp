interface SplashScreenProps {
  onSignup: () => void;
  onLogin: () => void;
}

export default function SplashScreen({ onSignup, onLogin }: SplashScreenProps) {
  return (
    <div className="min-h-screen bg-errandify-bg flex flex-col items-center justify-between p-4">
      {/* Top Section - Logo */}
      <div className="pt-8 text-center">
        <div className="inline-flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-full bg-errandify-orange flex items-center justify-center text-white font-bold text-xl">
            E
          </div>
          <h1 className="text-4xl font-bold text-errandify-brown">ERRANDIFY</h1>
        </div>
        <p className="text-gray-600 text-sm">Simplifying lives. Amplifying humanity.</p>
      </div>

      {/* Middle Section - Mascots Group Image */}
      <div className="flex-1 flex items-center justify-center w-full max-w-md">
        <div className="bg-gradient-to-b from-amber-50 to-orange-100 rounded-3xl p-4 w-full shadow-lg">
          {/* Mascots Container */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-50 flex flex-col items-center justify-center min-h-80">
            {/* Group Image */}
            <img
              src="/images/mascots-group.png"
              alt="Errandify Mascots"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />

            {/* Fallback text if image not found */}
            <div className="absolute text-center space-y-2 px-4">
              <p className="text-errandify-brown font-bold text-lg">
                Meet Our Friends
              </p>
              <p className="text-gray-600 text-sm max-w-xs">
                Esha, Lian, Hana & Piers are here to help!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - CTA Button */}
      <div className="w-full max-w-md space-y-4 pb-8">
        {/* Get Started Button */}
        <button
          onClick={onSignup}
          className="w-full bg-errandify-orange hover:bg-opacity-90 text-white font-bold py-5 px-6 rounded-xl transition-all shadow-lg text-lg"
        >
          Get Started
        </button>

        {/* Already have account */}
        <div className="text-center">
          <p className="text-errandify-brown text-sm">
            Already have an account?{' '}
            <button
              onClick={onLogin}
              className="text-errandify-orange font-bold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* SingPass Badge */}
        <div className="text-center pt-2 border-t border-gray-300">
          <span className="inline-block text-gray-600 text-xs">
            Powered by SingPass
          </span>
        </div>
      </div>
    </div>
  );
}
