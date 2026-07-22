import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
  id: string;
  category: 'general' | 'asker' | 'doer' | 'payment' | 'safety' | 'conduct';
  question: string;
  answer: string;
}

export default function FAQPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'asker' | 'doer' | 'payment' | 'safety' | 'conduct'>('all');
  const [selectedFaq, setSelectedFaq] = useState<FAQItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const faqs: FAQItem[] = [
    // General
    {
      id: 'g1',
      category: 'general',
      question: 'What is Errandify?',
      answer: 'Errandify is Singapore-based AI-powered neighbourhood marketplace where neighbours help each other with daily errands. Whether you need help or want to earn by helping others, Errandify connects you with trusted community members.',
    },
    {
      id: 'g2',
      category: 'general',
      question: 'How much does it cost to use Errandify?',
      answer: 'Errandify is free to join and use. Doers pay a 20% platform fee from their earnings. Askers pay Stripe payment processing fees (2-3% depending on payment method). For example: If you offer SGD $100, you earn SGD $80 (after 20% platform fee). Asker pays SGD $100 + Stripe fees (~$2-3).',
    },
    {
      id: 'g3',
      category: 'general',
      question: 'Who can join Errandify?',
      answer: 'Anyone 18+ can join. We verify users via SingPass (for Singapore citizens/residents) or Veriff (for others). Some categories requiring background checks have additional requirements.',
    },
    {
      id: 'g4',
      category: 'general',
      question: 'What is the Kampung Spirit?',
      answer: 'Kampung Spirit refers to the traditional Singaporean community values of looking out for one another, helping neighbours, and building strong local connections. Errandify brings this spirit to modern city life through technology.',
    },

    // For Askers
    {
      id: 'a1',
      category: 'asker',
      question: 'How do I post an errand?',
      answer: 'Click the plus button (+) in the home screen, select a category, describe what you need, set your budget, and post. Doers will submit offers within hours. You review, compare, and pick the best fit.',
    },
    {
      id: 'a2',
      category: 'asker',
      question: 'How much should I budget for an errand?',
      answer: 'It depends on the errand complexity, time required, and location. Browse similar errands or ask doers during offering. Errandify displays average rates per category to guide you.',
    },
    {
      id: 'a3',
      category: 'asker',
      question: 'Can I cancel an errand?',
      answer: 'Yes. Before a doer accepts, you can cancel free. After acceptance, a small cancellation fee applies (details in our cancellation policy). If a doer cancels after accepting, you get refunded fully.',
    },
    {
      id: 'a4',
      category: 'asker',
      question: 'What if I am not happy with the work?',
      answer: 'Payment is held until you mark the work as complete. If there are issues, you can raise a dispute with evidence. Our team reviews and resolves fairly. Doers can also make things right before disputes escalate.',
    },
    {
      id: 'a5',
      category: 'asker',
      question: 'Can I request the same doer again?',
      answer: 'Absolutely! You can bookmark doers, message them directly, or set up recurring errands for regular errands (weekly cleaning, tutoring, etc.). Recurring errands have special pricing.',
    },

    // For Doers
    {
      id: 'd1',
      category: 'doer',
      question: 'How do I earn money on Errandify?',
      answer: 'Browse errands (each shows the asker budget), submit your offer at any rate you choose, get accepted by the asker, complete the work, and receive payment. Your ratings build your reputation, leading to more opportunities.',
    },
    {
      id: 'd2',
      category: 'doer',
      question: 'How much can I earn?',
      answer: 'You set your own rates. Earnings depend on category, complexity, time, and location. Most doers earn SGD 20-100+ per errand. Top-rated doers get priority and can charge premium rates.',
    },
    {
      id: 'd4',
      category: 'doer',
      question: 'How are doers rated and verified?',
      answer: 'Users rate you 1-5 stars after each errand with optional comments. Your overall rating is public, helping askers choose. Background checks apply to sensitive categories (childcare, elderly care, etc.).',
    },
    {
      id: 'd5',
      category: 'doer',
      question: 'Can I work part-time or on my schedule?',
      answer: 'Yes! Errandify is designed for flexible work. Browse errands anytime, offer on what interests you, and set your availability. Work as much or as little as you want.',
    },
    {
      id: 'd6',
      category: 'doer',
      question: 'What if an asker disputes my work?',
      answer: 'We have a fair dispute process. If an asker raises concerns, we review evidence from both sides and resolve fairly. Maintain good ratings by communicating clearly and delivering quality work.',
    },

    // Payment
    {
      id: 'p1',
      category: 'payment',
      question: 'How do payments work?',
      answer: 'Askers pay upfront (held securely in escrow). After you complete work and the asker confirms, payment is released to your wallet. Payouts happen every Friday to your bank account.',
    },
    {
      id: 'p2',
      category: 'payment',
      question: 'What payment methods do you accept?',
      answer: 'We accept credit/debit cards (Visa, Mastercard), PayNow (FastPay), and bank transfers. PayPal and e-wallets coming soon. Payouts are via bank transfer or PayNow.',
    },
    {
      id: 'p3',
      category: 'payment',
      question: 'Are there any fees?',
      answer: 'Yes. Doers pay a 20% platform fee from their earnings. Askers pay Stripe payment processing fees (2-3%). Example: If you (doer) offer SGD $100, you earn SGD $80 (Errandify takes 20%). Asker pays the SGD $100 + Stripe fees (~$2-3).',
    },
    {
      id: 'p4',
      category: 'payment',
      question: 'What are Stripe fees and why do askers pay them?',
      answer: 'Stripe is the secure payment processor we use. They charge 2-3% (varies by payment method: credit card, debit card, PayNow, etc.). Askers pay these fees since they are the ones making the payment. Doers only pay the 20% platform fee from their earnings.',
    },
    {
      id: 'p5',
      category: 'payment',
      question: 'How do I withdraw my earnings?',
      answer: 'Earnings accumulate in your Errandify Pocket (wallet) after the 20% platform fee is deducted. You can request a payout anytime. We process payouts to your registered bank account.',
    },

    // Safety Questions
    {
      id: 's1',
      category: 'safety',
      question: 'Is my personal information safe?',
      answer: 'Yes. We use industry-standard encryption, verify all users via government IDs (SingPass or Veriff), and follow Singapore data protection laws (PDPA). Your data is never shared without consent.',
    },
    {
      id: 's2',
      category: 'safety',
      question: 'How do you prevent fraud?',
      answer: 'We verify identities, monitor suspicious activity, enforce ratings transparency, and have a clear cancellation/dispute process. Payment is held securely until work is confirmed complete.',
    },
    {
      id: 's3',
      category: 'safety',
      question: 'What if I feel unsafe during an errand?',
      answer: 'Your safety is priority. You can cancel anytime, leave early, or contact authorities if needed. Report concerns to our support team immediately at togather@errandify.ai for investigation and action.',
    },
    {
      id: 's4',
      category: 'safety',
      question: 'What if there is a misunderstanding or disagreement?',
      answer: 'We encourage open communication first. Message the other person to clarify expectations and resolve issues respectfully. Most problems happen because of misunderstandings, not bad intentions. Our community believes in helping each other. Only if communication does not work, we have a fair dispute process.',
    },
    {
      id: 's5',
      category: 'safety',
      question: 'Can I block or trust users?',
      answer: 'Yes. In MyKampung, you can mark users as Trusted (priority matching) or Blocked (no future interactions). These are private to you and help customize your experience.',
    },
    {
      id: 's6',
      category: 'safety',
      question: 'What is Errandify policy on inappropriate behaviour?',
      answer: 'Errandify is built on community respect. We do not tolerate harassment, discrimination, abuse, fraud, or conduct that violates community standards. Users who violate these standards may face account suspension and potential legal action. Report concerning behaviour immediately to togather@errandify.ai.',
    },
    {
      id: 's7',
      category: 'safety',
      question: 'How do I report inappropriate behaviour?',
      answer: 'If you experience or witness inappropriate behaviour, report it immediately via email (togather@errandify.ai) or through the app. Include details and any evidence. We take every report seriously, investigate promptly, and take swift action to protect our community.',
    },

    // Community Conduct
    {
      id: 'c1',
      category: 'conduct',
      question: 'What communication standards does Errandify expect?',
      answer: 'Keep messages professional, task-focused, and respectful. We monitor for harassment, discrimination, abuse, and sexual content. Our AI system automatically blocks inappropriate content to keep the community safe and welcoming for everyone.',
    },
    {
      id: 'c2',
      category: 'conduct',
      question: 'What happens if I send inappropriate messages?',
      answer: 'Our system automatically detects and blocks inappropriate content like sexual solicitation, drugs, violence, or harassment. You\'ll get a message explaining why. Repeated violations may result in account warnings or suspension. We believe in giving users a chance to improve.',
    },
    {
      id: 'c3',
      category: 'conduct',
      question: 'Can I share contact information or move off-platform?',
      answer: 'We recommend completing errands through Errandify for safety and dispute protection. Sharing email, phone, or asking to move to WhatsApp/Telegram is discouraged and may result in account restrictions. Our in-app messaging keeps both parties protected.',
    },
    {
      id: 'c4',
      category: 'conduct',
      question: 'What is considered harassment on Errandify?',
      answer: 'Harassment includes: repeated unwanted messages, threats, discrimination based on race/gender/religion, sexual advances, or bullying. We take zero tolerance on harassment. Report immediately via email (togather@errandify.ai) for swift action.',
    },
    {
      id: 'c5',
      category: 'conduct',
      question: 'Can I ask for ratings to be changed?',
      answer: 'Ratings are honest feedback from users. You cannot request removal, but you can respond professionally to feedback to show character. Collecting evidence of quality work helps for future opportunities. Focus on delivering excellent service to build positive ratings.',
    },

    // Task Execution & Work Proof
    {
      id: 't1',
      category: 'asker',
      question: 'How do I confirm work is complete?',
      answer: 'After the doer finishes, they upload photos/videos as proof of completion. You review the evidence and confirm it looks good. Once confirmed, payment is released to the doer. If there are issues, you can raise a dispute before confirming.',
    },
    {
      id: 't2',
      category: 'doer',
      question: 'How do I submit proof of work?',
      answer: 'After completing the errand, upload photos or videos showing the finished work. Clear, well-lit photos help askers confirm quality. Be honest - good evidence builds your reputation and leads to positive ratings, more offers, and higher earnings.',
    },
    {
      id: 't3',
      category: 'conduct',
      question: 'What if proof photos are unclear or suspicious?',
      answer: 'Askers should only confirm if proof clearly shows completed work. If photos look doctored, don\'t match the description, or seem fake, raise a dispute. We investigate all disputes with evidence. Submitting false proof is grounds for account suspension.',
    },

    // Ratings & Reviews
    {
      id: 'r1',
      category: 'general',
      question: 'How does the rating system work?',
      answer: 'Users rate each other 1-5 stars with optional comments after each errand. Your rating is public and influences how often people choose to work with you. Ratings are permanent - focus on consistent quality to build a strong reputation over time.',
    },
    {
      id: 'r2',
      category: 'doer',
      question: 'How can I improve my ratings?',
      answer: 'Deliver quality work every time, communicate clearly, follow instructions, submit good proof of completion, and respond promptly to questions. Read feedback carefully and adjust. Top-rated doers (4.8+) get priority visibility and can command higher rates.',
    },
    {
      id: 'r3',
      category: 'asker',
      question: 'Should I rate doers even if work has issues?',
      answer: 'Yes. Be fair and honest. If work was poor, rate accordingly and explain in comments. Doers can respond to feedback. Rating honestly helps the community - it guides other askers and gives doers clear feedback to improve.',
    },

    // Recurring Tasks
    {
      id: 'rec1',
      category: 'asker',
      question: 'How do recurring errands work?',
      answer: 'For regular errands (weekly cleaning, bi-weekly tutoring), set it up as recurring. The doer gets priority matching for future sessions at a pre-agreed rate. Both parties benefit: askers get reliable service, doers get guaranteed income. Easy to pause or modify anytime.',
    },
    {
      id: 'rec2',
      category: 'doer',
      question: 'What are the benefits of recurring errands?',
      answer: 'Recurring errands provide steady income with less offering competition. You build a relationship with the asker, learn their preferences, and can deliver better service. Many doers prefer recurring work for predictable monthly earnings.',
    },

    // Disputes & Refunds
    {
      id: 'dis1',
      category: 'general',
      question: 'What happens if we disagree about the work quality?',
      answer: 'Payment is held securely until completion is confirmed. If there\'s disagreement, raise a dispute within 48 hours with evidence. We review both sides fairly and resolve based on contract terms and proof. Most disputes settle through communication.',
    },
    {
      id: 'dis2',
      category: 'asker',
      question: 'Can I get a refund if work is not done?',
      answer: 'Yes. If a doer never shows up or doesn\'t complete work, you can request a refund. We investigate with evidence (messages, timestamps) and refund if the doer is at fault. For partial completion, we may refund partially based on what was done.',
    },
    {
      id: 'dis3',
      category: 'doer',
      question: 'What if an asker refuses to confirm completed work?',
      answer: 'If you completed the work and provided proof, but the asker won\'t confirm, raise a dispute. We review your evidence and the asker\'s claims. If work was done properly, we release payment. Don\'t accept unfair disputes without fighting back.',
    },

    // Referrals & Rewards
    {
      id: 'ref1',
      category: 'general',
      question: 'How does the referral program work?',
      answer: 'Share your personal referral link or QR code with friends. When they join and complete their first errand, you both earn Errandify Points (EP). More referrals = more EP. Earn enough EP to redeem for cash, discounts, or donate to charities.',
    },
    {
      id: 'ref2',
      category: 'general',
      question: 'How much can I earn from referrals?',
      answer: 'You earn bonus Errandify Points when referred friends join and complete errands. Points accumulate and can be redeemed for cash. Top referrers can earn significant monthly bonuses. It\'s a great way to earn while growing the community.',
    },

    // Errandify Points
    {
      id: 'ep1',
      category: 'general',
      question: 'What are Errandify Points (EP) and how do I earn them?',
      answer: 'EP is our community rewards currency. Earn EP with every completed errand (points vary by errand value), referrals, and milestone achievements. Redeem EP for cash bonus in your wallet, service discounts, or donate to Singapore charities.',
    },
    {
      id: 'ep2',
      category: 'general',
      question: 'How do I redeem Errandify Points?',
      answer: 'Visit MyRewards to see your EP balance and redemption options: cash bonus to wallet, service discounts, charity donations, or special perks. Redemption is instant. Different tiers unlock better rewards.',
    },

    // MyKampung
    {
      id: 'mk1',
      category: 'general',
      question: 'What is MyKampung?',
      answer: 'MyKampung is our community hub where you explore neighborhood news, training articles, job opportunities, wellness tips, and local discussions. Connect with neighbors, learn new skills, or share advice. It\'s building the modern Kampung spirit.',
    },
    {
      id: 'mk2',
      category: 'general',
      question: 'Can I share my own content in MyKampung?',
      answer: 'Yes! Share articles, questions, achievements, or advice. Content is reviewed for quality and safety before publishing. Being active in MyKampung builds your community reputation and helps neighbors.',
    },

    // Account & Technical
    {
      id: 'acc1',
      category: 'general',
      question: 'How do I change my profile or account settings?',
      answer: 'Go to MyProfile to update your photo, bio, categories, language preferences, and contact info. You can toggle between Asker/Doer roles anytime. Email togather@errandify.ai if you need to update verified info like name or phone.',
    },
    {
      id: 'acc2',
      category: 'general',
      question: 'What should I do if I forget my password?',
      answer: 'On the login screen, click "Forgot Password" and enter your email. We\'ll send a reset link. Click the link and set a new password. Make it strong (mix of letters, numbers, symbols). If you still have issues, email support.',
    },
    {
      id: 'acc3',
      category: 'general',
      question: 'Can I delete my account?',
      answer: 'You can deactivate your account anytime. This hides your profile but keeps your history for disputes/ratings. For permanent deletion (removes all data), contact support at togather@errandify.ai. Note: You cannot delete while errands are active.',
    },

    // Support & Contact
    {
      id: 'sup1',
      category: 'general',
      question: 'How do I contact Errandify support?',
      answer: 'Email togather@errandify.ai with details of your issue. Response time is typically 24-48 hours. For urgent safety concerns, mention "URGENT" in the subject. You can also message through the app or ask in MyKampung community discussions.',
    },
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryLabels = {
    all: 'All Questions',
    general: '💡 General',
    asker: '📝 For Askers',
    doer: '💪 For Doers',
    payment: '💰 Payment & Earnings',
    safety: '🛡️ Safety & Trust',
    conduct: '❤️ Community Conduct',
  };

  return (
    <div className="min-h-screen bg-errandify-bg pb-20">
      {/* HEADER */}
      <div className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-errandify-orange font-semibold text-sm hover:underline"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-errandify-brown">❓ FAQ</h1>
          <div className="w-20"></div>
        </div>

        {/* SEARCH BAR */}
        <div className="border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <input
              type="text"
              placeholder="🔍 Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange text-sm"
            />
          </div>
        </div>

        {/* COMPACT CATEGORY TABS */}
        <div className="border-t border-gray-200 overflow-x-auto">
          <div className="max-w-6xl mx-auto px-4 flex gap-2 py-2">
            {(['all', 'general', 'asker', 'doer', 'payment', 'safety', 'conduct'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full font-semibold text-xs whitespace-nowrap transition ${
                  activeCategory === cat
                    ? 'bg-errandify-orange text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT - COMPACT GRID */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Results Info */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-600">
            Found <span className="font-bold text-errandify-orange">{filteredFAQs.length}</span> result{filteredFAQs.length !== 1 ? 's' : ''} for "<span className="font-semibold">{searchQuery}</span>"
          </div>
        )}

        {/* No Results */}
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">😕 No FAQs found</p>
            <p className="text-sm text-gray-500 mb-6">Try a different search term or browse by category</p>
            <button
              onClick={() => setSearchQuery('')}
              className="bg-errandify-orange text-white px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFAQs.map(faq => (
            <button
              key={faq.id}
              onClick={() => setSelectedFaq(faq)}
              className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition text-left"
            >
              {/* Question */}
              <h3 className="font-bold text-errandify-brown text-sm mb-2 leading-tight">
                {faq.question}
              </h3>

              {/* Answer - Always visible, compact */}
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
                {faq.answer}
              </p>

              {/* View More Link */}
              <div className="mt-2 text-errandify-orange text-xs font-semibold hover:underline">
                View full answer →
              </div>
            </button>
          ))}
          </div>
        )}

        {/* DETAIL PAGE - FULL SCREEN */}
        {selectedFaq && (
          <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-errandify-brown flex-1 pr-4">{selectedFaq.question}</h2>
              <button
                onClick={() => setSelectedFaq(null)}
                className="text-3xl text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto p-6">
              {/* Answer */}
              <div className="mb-8">
                <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedFaq.answer}
                </p>
              </div>

              {/* Category & Navigation */}
              <div className="border-t border-gray-200 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-600">Category:</span>
                  <span className="inline-block px-3 py-1 bg-errandify-orange text-white rounded-full text-xs font-bold capitalize">
                    {selectedFaq.category}
                  </span>
                </div>

                {/* Related Questions - Same Category */}
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-3">Related Questions:</p>
                  <div className="space-y-2">
                    {faqs
                      .filter(f => f.category === selectedFaq.category && f.id !== selectedFaq.id)
                      .slice(0, 3)
                      .map(relatedFaq => (
                        <button
                          key={relatedFaq.id}
                          onClick={() => setSelectedFaq(relatedFaq)}
                          className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                        >
                          <p className="text-sm font-semibold text-errandify-brown">{relatedFaq.question}</p>
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {/* Support Section */}
              <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                <h3 className="font-bold text-gray-800 mb-2">Still have questions?</h3>
                <p className="text-sm text-gray-600 mb-4">Contact our support team</p>
                <a
                  href="mailto:togather@errandify.ai"
                  className="inline-block bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  📧 Email Support
                </a>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedFaq(null)}
                className="w-full mt-8 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-base"
              >
                Back to FAQ
              </button>
            </div>
          </div>
        )}

        {/* STILL NEED HELP - COMPACT */}
        <div className="mt-8 bg-gradient-to-r from-errandify-orange to-orange-400 rounded-lg p-6 text-white text-center">
          <h2 className="font-bold mb-2">Need More Help?</h2>
          <p className="text-sm mb-4">
            📧{' '}
            <a href="mailto:togather@errandify.ai" className="underline hover:no-underline">
              togather@errandify.ai
            </a>
            {' '} • 💬 Message us in app
          </p>
        </div>
      </div>
    </div>
  );
}
