import { useNavigate } from 'react-router-dom';

export default function AboutErrandifyPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
          ‹ Back
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">🏘️ About Errandify</h1>
          <p className="text-gray-600">Simplifying lives. Amplifying humanity.</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Company Info */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h3 className="font-bold text-errandify-brown mb-3">Company Overview</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Founded:</strong> 2025</p>
              <p><strong>Headquarters:</strong> Singapore</p>
              <p><strong>Founders:</strong> Celestia Faith Chong & Yvonne Lim</p>
              <p><strong>Industry:</strong> Smart Technology / Lifestyle / Community Platform</p>
              <p><strong>Focus Markets:</strong> Singapore, Hong Kong, Japan, South Korea</p>
            </div>
          </div>

          {/* Mission */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-3">🎯 Our Mission</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              To simplify lives through intelligent AI technology that reconnects communities, supports mental well-being, and reignites the Kampung Spirit — empowering people to live purposefully, help meaningfully, and thrive together.
            </p>
            <p className="text-sm text-gray-600 italic">
              Errandify unites generations: retirees find purpose, professionals reclaim time, and communities rediscover empathy — all powered by AI-driven convenience with a human heart.
            </p>
            <p className="text-sm text-errandify-orange font-semibold mt-3">
              ✨ We are all from the community. We encourage communication, respect, and help each other avoid disputes through understanding and kindness.
            </p>
          </div>

          {/* Vision */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-3">🌈 Our Vision</h2>
            <p className="text-gray-700 leading-relaxed">
              To become Asia's most trusted AI-powered platform that enhances quality of life, strengthens communities, and nurtures mental wellness — one errand, one connection, one heart at a time.
            </p>
          </div>

          {/* Core Values */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-4">💎 Core Values</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">💚</span>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Empathy</h3>
                  <p className="text-sm text-gray-600">Every act of help is an act of care. We design with heart.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">🤖</span>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Innovation</h3>
                  <p className="text-sm text-gray-600">AI that connects, not replaces, people. Technology serves humanity.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">🌱</span>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Mental Well-being</h3>
                  <p className="text-sm text-gray-600">Wellness through purpose and connection, not just convenience.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">⭐</span>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Empowerment</h3>
                  <p className="text-sm text-gray-600">Every user can earn, assist, and belong. Opportunity for all.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">🏘️</span>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Community</h3>
                  <p className="text-sm text-gray-600">Reviving the Kampung Spirit in a digital age. We are stronger together.</p>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-4">How Errandify Works</h2>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="bg-errandify-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold text-gray-800">Need Help? Post an Errand</p>
                  <p className="text-sm text-gray-600">Tell us what you need done – cleaning, moving, tutoring, repairs, or anything else.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-errandify-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-semibold text-gray-800">Doers Submit Bids</p>
                  <p className="text-sm text-gray-600">Skilled neighbours review your errand and submit bids with their rates and availability.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-errandify-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-semibold text-gray-800">You Choose Your Helper</p>
                  <p className="text-sm text-gray-600">Review profiles, ratings, and bids. Pick the best fit for your needs.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-errandify-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <p className="font-semibold text-gray-800">Work Gets Done</p>
                  <p className="text-sm text-gray-600">Your doer completes the work. Payment is held securely until you're happy.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-errandify-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</div>
                <div>
                  <p className="font-semibold text-gray-800">Rate & Build Trust</p>
                  <p className="text-sm text-gray-600">Rate each other fairly. Help build a community of trusted, skilled neighbours.</p>
                </div>
              </div>
            </div>
          </div>

          {/* For Doers */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h3 className="font-bold text-gray-800 mb-3">💪 For Doers: Earn by Helping</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span>✓</span>
                <span>Browse errands in your neighbourhood – find work that suits you</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Submit bids at your own rates – you set the price</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Earn 80% of your bid (after 20% platform fee) – fair compensation for your work</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Build reputation through open communication and mutual respect</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Earn Errandify Points (EP) – bonus rewards for community contribution</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Work flexibly – help neighbours when it suits you</span>
              </li>
            </ul>
          </div>

          {/* For Askers */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-bold text-gray-800 mb-3">📝 For Askers: Get Help You Can Trust</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span>✓</span>
                <span>Post errands easily – describe what you need in any detail</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Receive bids from verified, rated neighbours</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Compare options before choosing – you pick the best fit</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Secure payment via Stripe – pay errand cost + Stripe payment fees (2-3%)</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Money held safely until work is done to your satisfaction</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Rate fairly – help build a community of trust</span>
              </li>
            </ul>
          </div>

          {/* Safety & Community Trust */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-4">🛡️ Trust, Respect & Safety</h2>
            <p className="text-gray-700 mb-3">We build trust through communication, transparency, and our shared community values. <strong>Errandify is a safe environment where we do not tolerate inappropriate behaviour.</strong></p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="text-errandify-orange font-bold">•</span>
                <span><strong>Identity Verification:</strong> Users verify via SingPass (citizens) or Veriff (foreigners) – know who you're working with</span>
              </li>
              <li className="flex gap-2">
                <span className="text-errandify-orange font-bold">•</span>
                <span><strong>Open Communication:</strong> Message before, during, and after work. Clear expectations prevent misunderstandings</span>
              </li>
              <li className="flex gap-2">
                <span className="text-errandify-orange font-bold">•</span>
                <span><strong>Ratings & Reviews:</strong> Build reputation through fair feedback. See what the community says about each person</span>
              </li>
              <li className="flex gap-2">
                <span className="text-errandify-orange font-bold">•</span>
                <span><strong>Secure Payments:</strong> Money held in escrow until work is complete – protects both asker and doer</span>
              </li>
              <li className="flex gap-2">
                <span className="text-errandify-orange font-bold">•</span>
                <span><strong>Zero Tolerance:</strong> Inappropriate behaviour (harassment, discrimination, abuse, fraud) will result in immediate account suspension and potential legal action</span>
              </li>
              <li className="flex gap-2">
                <span className="text-errandify-orange font-bold">•</span>
                <span><strong>Report & Action:</strong> Report inappropriate behaviour immediately. We take every report seriously and act swiftly</span>
              </li>
              <li className="flex gap-2">
                <span className="text-errandify-orange font-bold">•</span>
                <span><strong>Dispute Prevention:</strong> We encourage communication and respect to resolve issues before they escalate. Fair mediation if needed</span>
              </li>
              <li className="flex gap-2">
                <span className="text-errandify-orange font-bold">•</span>
                <span><strong>Block & Trust Lists:</strong> Support people you love, avoid people who don't align with community values</span>
              </li>
            </ul>
          </div>

          {/* H.E.L.P.S. */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-4">💗 H.E.L.P.S. — Helping Everyone Live Purposefully & Soulfully</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Five faces represent the heart of Errandify. Each brings their own story, need, and strength to our community:
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">🌸</span>
                <div>
                  <p className="font-bold text-gray-800">Hana — Heart</p>
                  <p className="text-sm text-gray-600">The steady heart who learns that asking for help isn't failure — it's care. "When life gets busy, help brings balance."</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">🌼</span>
                <div>
                  <p className="font-bold text-gray-800">Esha — Energy</p>
                  <p className="text-sm text-gray-600">The bright spark who discovers that compassion is action. "Even small hands can make a big difference."</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">🔗</span>
                <div>
                  <p className="font-bold text-gray-800">Lian — Link</p>
                  <p className="text-sm text-gray-600">The connector who rediscovers belonging and purpose. "Connection is care."</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">🪨</span>
                <div>
                  <p className="font-bold text-gray-800">Piers — Purpose</p>
                  <p className="text-sm text-gray-600">The foundation who turns good intentions into real support. "When we stand together, we rise together."</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">☁️</span>
                <div>
                  <p className="font-bold text-gray-800">Sora — Spirit</p>
                  <p className="text-sm text-gray-600">The spirit of community who shelters everyone. "The sky that shelters every act of help."</p>
                </div>
              </div>
            </div>
          </div>

          {/* Get Started */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-600 text-white rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Ready to Join Your Kampung?</h3>
            <p className="mb-4 text-sm opacity-90">Start earning or get help from trusted neighbours today</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 bg-white text-errandify-orange py-2 rounded-lg font-bold hover:bg-opacity-90 transition text-sm"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="flex-1 bg-white text-errandify-orange py-2 rounded-lg font-bold hover:bg-opacity-90 transition text-sm"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
