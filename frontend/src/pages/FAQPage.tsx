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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleBack = () => {
    navigate(-1);
  };

  const faqs: FAQItem[] = [
    // General
    {
      id: 'g1',
      category: 'general',
      question: 'What is Errandify?',
      answer: 'Errandify is Singapore-based AI-powered neighbourhood marketplace where neighbours help each other with daily tasks. Whether you need help or want to earn by helping others, Errandify connects you with trusted community members.',
    },
    {
      id: 'g2',
      category: 'general',
      question: 'How much does it cost to use Errandify?',
      answer: 'Errandify is free to join and use. Doers pay a 20% platform fee from their earnings. Askers pay Stripe payment processing fees (2-3% depending on payment method). For example: If you bid SGD $100, you earn SGD $80 (after 20% platform fee). Asker pays SGD $100 + Stripe fees (~$2-3).',
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
      answer: 'Click the plus button (+) in the home screen, select a category, describe what you need, set your budget, and post. Doers will submit bids within hours. You review, compare, and pick the best fit.',
    },
    {
      id: 'a2',
      category: 'asker',
      question: 'How much should I budget for an errand?',
      answer: 'It depends on the task complexity, time required, and location. Browse similar errands or ask doers during bidding. Errandify displays average rates per category to guide you.',
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
      answer: 'Absolutely! You can bookmark doers, message them directly, or set up recurring errands for regular tasks (weekly cleaning, tutoring, etc.). Recurring errands have special pricing.',
    },

    // For Doers
    {
      id: 'd1',
      category: 'doer',
      question: 'How do I earn money on Errandify?',
      answer: 'Browse available errands, submit bids at your own rates, get accepted, complete the work, and receive payment. The asker rates you, and ratings build your profile reputation — leading to more opportunities.',
    },
    {
      id: 'd2',
      category: 'doer',
      question: 'How much can I earn?',
      answer: 'You set your own rates. Earnings depend on category, complexity, time, and location. Most doers earn SGD 20-100+ per errand. Top-rated doers get priority and can charge premium rates.',
    },
    {
      id: 'd3',
      category: 'doer',
      question: 'What is Errandify Points (EP)?',
      answer: 'EP is our rewards currency. You earn EP with every completed errand. Accumulate EP to redeem for cash, discounts on services, or donated to charities. Referrals also earn bonus EP.',
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
      answer: 'Yes! Errandify is designed for flexible work. Browse errands anytime, bid on what interests you, and set your availability. Work as much or as little as you want.',
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
      answer: 'Yes. Doers pay a 20% platform fee from their earnings. Askers pay Stripe payment processing fees (2-3%). Example: If you (doer) bid SGD $100, you earn SGD $80 (Errandify takes 20%). Asker pays the SGD $100 + Stripe fees (~$2-3).',
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
      answer: 'Errandify is a safe environment where we have zero tolerance for inappropriate behaviour. This includes: harassment, discrimination, abuse, fraud, or any conduct that violates community standards. Any such behaviour will result in immediate account suspension and potential legal action. Report any incidents immediately to togather@errandify.ai.',
    },
    {
      id: 's7',
      category: 'safety',
      question: 'How do I report inappropriate behaviour?',
      answer: 'If you experience or witness inappropriate behaviour, report it immediately via email (togather@errandify.ai) or through the app. Include details and any evidence. We take every report seriously, investigate promptly, and take swift action to protect our community.',
    },
  ];

  const filteredFAQs = activeCategory === 'all'
    ? faqs
    : faqs.filter(f => f.category === activeCategory);

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
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
          ‹ Back
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">❓ Frequently Asked Questions</h1>
          <p className="text-gray-600">Find answers to common questions about Errandify</p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 bg-white rounded-lg p-1 border border-gray-200">
          <div className="flex flex-wrap gap-1">
            {(['all', 'general', 'asker', 'doer', 'payment', 'safety', 'conduct'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setExpandedId(null);
                }}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg font-semibold text-xs transition ${
                  activeCategory === cat
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {filteredFAQs.map(faq => (
            <button
              key={faq.id}
              onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
              className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-errandify-orange transition"
            >
              {/* Question */}
              <div className="p-4 flex items-start gap-3 text-left hover:bg-gray-50 transition">
                <span className="text-errandify-orange font-bold text-xl flex-shrink-0">
                  {expandedId === faq.id ? '−' : '+'}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{faq.question}</p>
                </div>
              </div>

              {/* Answer */}
              {expandedId === faq.id && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <p className="text-sm text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Still Need Help */}
        <div className="mt-8 bg-orange-50 rounded-lg p-6 border border-orange-200 text-center">
          <h2 className="font-bold text-gray-800 mb-2">Didn't find your answer?</h2>
          <p className="text-sm text-gray-600 mb-4">Our support team is here to help!</p>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <strong>📧 Email:</strong>{' '}
              <a href="mailto:togather@errandify.ai" className="text-errandify-orange hover:underline">
                togather@errandify.ai
              </a>
            </p>
            <p className="text-gray-700">
              <strong>💬 Chat:</strong> Message us through the app
            </p>
            <p className="text-gray-700">
              <strong>🏘️ Community:</strong> Ask in MyKampung discussions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
