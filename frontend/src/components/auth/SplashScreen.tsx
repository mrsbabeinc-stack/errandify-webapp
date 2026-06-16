interface SplashScreenProps {
  onSignup: () => void;
  onLogin: () => void;
}

export default function SplashScreen({ onSignup, onLogin }: SplashScreenProps) {
  return (
    <div className="min-h-screen bg-errandify-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & Tagline */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-errandify-orange mb-3">
            Errandify
          </h1>
          <p className="text-lg text-errandify-brown">
            Simplifying lives. Amplifying humanity.
          </p>
        </div>

        {/* Character Illustrations */}
        <div className="flex justify-around items-end gap-2">
          {/* Hana */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-pink-200 flex items-center justify-center text-3xl">
              🌸
            </div>
            <span className="text-xs text-errandify-brown font-medium">Hana</span>
          </div>

          {/* Esha */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-yellow-200 flex items-center justify-center text-3xl">
              🌼
            </div>
            <span className="text-xs text-errandify-brown font-medium">Esha</span>
          </div>

          {/* Lian */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-3xl">
              🌿
            </div>
            <span className="text-xs text-errandify-brown font-medium">Lian</span>
          </div>

          {/* Piers */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-3xl">
              🪨
            </div>
            <span className="text-xs text-errandify-brown font-medium">Piers</span>
          </div>
        </div>

        {/* Hana's Speech Bubble */}
        <div className="bg-white rounded-2xl p-4 border-2 border-pink-300 shadow-sm">
          <p className="text-center text-errandify-brown">
            Hello neighbour! Join the kampung — it takes less than a minute. 🌸
          </p>
          <div className="text-pink-300 text-2xl absolute -bottom-3 left-8">▼</div>
        </div>

        {/* Sign Up Button */}
        <button
          onClick={onSignup}
          className="w-full bg-errandify-orange hover:bg-opacity-90 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-md"
        >
          Sign Up with SingPass
        </button>

        {/* SingPass Badge */}
        <div className="text-center">
          <span className="inline-block bg-gray-300 text-gray-600 text-xs px-3 py-1 rounded-full">
            Powered by SingPass — coming soon
          </span>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-errandify-brown">
            Already have an account?{' '}
            <button
              onClick={onLogin}
              className="text-errandify-orange font-semibold hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
