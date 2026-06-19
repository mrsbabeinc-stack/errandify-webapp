import { useNavigate } from 'react-router-dom';

export default function HowItWorksPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-3xl mx-auto">
        <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
          ‹ Back to Home
        </button>

        <div className="mb-8 text-center">
          <p className="text-xs font-semibold text-errandify-orange italic mb-3">Simplifying Life, Amplifying Humanity</p>
          <h1 className="text-4xl font-bold text-errandify-brown mb-2">How Errandify Works</h1>
          <p className="text-gray-600 mb-3">Simple steps to connect your kampung and get things done together</p>
          <p className="text-sm font-semibold text-errandify-brown">💬 Get Help • 🤝 Give Help • 💰 Get Paid</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ASKERS SECTION */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-4xl">👤</div>
              <h2 className="text-2xl font-bold text-errandify-brown">For Askers</h2>
            </div>

            <div className="space-y-5">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="bg-errandify-orange text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">1</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Post an Errand with Your Budget</h3>
                  <p className="text-sm text-gray-600">Describe what you need done and set your budget. Doers will see what you're willing to pay.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="bg-errandify-orange text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">2</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Review Bids from Doers</h3>
                  <p className="text-sm text-gray-600">Doers submit bids at their own rates (at, above, or below your budget). Compare ratings and prices.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="bg-errandify-orange text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">3</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Review & Approve</h3>
                  <p className="text-sm text-gray-600">Work gets done. You approve when satisfied. Rate your doer fairly.</p>
                </div>
              </div>

              {/* Benefits */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs font-semibold text-errandify-orange mb-2">✓ Benefits</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Get help from trusted, verified neighbours</li>
                  <li>• Compare options before choosing</li>
                  <li>• Secure payment (money held until done)</li>
                  <li>• No platform fees (only Stripe payment fees)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* DOERS SECTION */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-4xl">💪</div>
              <h2 className="text-2xl font-bold text-errandify-brown">For Doers</h2>
            </div>

            <div className="space-y-5">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="bg-errandify-brown text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">1</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Browse Errands with Budgets</h3>
                  <p className="text-sm text-gray-600">See what your neighbourhood needs and how much they're willing to pay. Filter by category and budget.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="bg-errandify-brown text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">2</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Submit Your Bid</h3>
                  <p className="text-sm text-gray-600">Bid any amount (at, below, or above their budget). When asker picks you, you're locked in and can start!</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="bg-errandify-brown text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">3</div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Get Paid</h3>
                  <p className="text-sm text-gray-600">Complete the work. Get paid securely. Build your reputation with ratings.</p>
                </div>
              </div>

              {/* Benefits */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs font-semibold text-errandify-brown mb-2">✓ Benefits</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Set your own rates</li>
                  <li>• Earn 80% (after 20% platform fee)</li>
                  <li>• Work flexible hours</li>
                  <li>• Earn Errandify Points (EP) bonuses</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* KEY PRINCIPLES */}
        <div className="mt-8 bg-gradient-to-r from-errandify-orange to-orange-600 text-white rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-4">🏘️ Kampung Spirit</h3>
          <p className="mb-4 leading-relaxed">
            Errandify is built on trust, communication, and mutual respect. We encourage neighbours to help each other, resolve disputes through understanding, and build a community where everyone thrives.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-bold mb-1">💚 Empathy</p>
              <p className="opacity-90">Care for each other</p>
            </div>
            <div>
              <p className="font-bold mb-1">🤝 Community</p>
              <p className="opacity-90">Stronger together</p>
            </div>
            <div>
              <p className="font-bold mb-1">🛡️ Safety</p>
              <p className="opacity-90">Community standards enforced</p>
            </div>
            <div>
              <p className="font-bold mb-1">💰 Fair</p>
              <p className="opacity-90">Transparent pricing</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-8 text-center">
          <h3 className="text-2xl font-bold text-errandify-brown mb-4">Ready to Join Your Kampung?</h3>
          <p className="text-gray-600 mb-6">Start helping your neighbours or get help from them today!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-errandify-brown text-white rounded-lg font-bold hover:opacity-90 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-3 bg-errandify-orange text-white rounded-lg font-bold hover:opacity-90 transition"
            >
              Join Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
