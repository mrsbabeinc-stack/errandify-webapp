export interface FAQItem {
  id: string;
  category: 'general' | 'asker' | 'doer' | 'payment' | 'safety' | 'conduct';
  question: string;
  answer: string;
  keywords?: string[];
}

export const faqs: FAQItem[] = [
  // General
  {
    id: 'g1',
    category: 'general',
    question: 'What is Errandify?',
    answer: 'Errandify is a Singapore-based AI-powered neighbourhood marketplace where neighbours help each other with daily tasks. Whether you need help or want to earn by helping others, Errandify connects you with trusted community members.',
    keywords: ['errandify', 'what', 'about', 'platform', 'marketplace']
  },
  {
    id: 'g2',
    category: 'general',
    question: 'How much does it cost to use Errandify?',
    answer: 'Errandify is free to join. Doers pay 20% platform fee from earnings. Askers pay Stripe fees (2-3%). Example: $100 bid → Doer earns $80, Asker pays ~$102-103 total.',
    keywords: ['cost', 'price', 'fee', 'free', 'charge', 'money']
  },
  {
    id: 'g3',
    category: 'general',
    question: 'Who can join Errandify?',
    answer: 'Anyone 18+ can join. We verify via SingPass (Singapore citizens/residents) or Veriff (others). Some categories need background checks.',
    keywords: ['age', 'join', 'eligible', 'requirements', 'sign up']
  },
  {
    id: 'g4',
    category: 'general',
    question: 'What is the Kampung Spirit?',
    answer: 'Kampung Spirit refers to traditional Singaporean community values of helping neighbours. Errandify brings this spirit to modern city life through technology.',
    keywords: ['kampung', 'spirit', 'community', 'values']
  },

  // For Askers
  {
    id: 'a1',
    category: 'asker',
    question: 'How do I post an errand?',
    answer: 'Click the plus button (+), select a category, describe what you need, set your budget, and post. Doers will submit bids within hours. You review, compare, and pick the best fit.',
    keywords: ['post', 'errand', 'create', 'how', 'steps', 'button']
  },
  {
    id: 'a2',
    category: 'asker',
    question: 'How much should I budget for an errand?',
    answer: 'It depends on task complexity, time, and location. Browse similar errands or ask doers. Errandify shows average rates per category to guide you.',
    keywords: ['budget', 'how much', 'price', 'cost', 'rate']
  },
  {
    id: 'a3',
    category: 'asker',
    question: 'Can I cancel an errand?',
    answer: 'Yes. Before a doer accepts, cancel free. After acceptance, a small fee applies. If a doer cancels after accepting, you get fully refunded.',
    keywords: ['cancel', 'refund', 'cancellation']
  },
  {
    id: 'a4',
    category: 'asker',
    question: 'What if I am not happy with the work?',
    answer: 'Payment is held until you mark work complete. If issues arise, raise a dispute with evidence. Our team reviews fairly. Doers can also make things right before escalation.',
    keywords: ['unhappy', 'dispute', 'issue', 'problem', 'quality', 'not satisfied']
  },
  {
    id: 'a5',
    category: 'asker',
    question: 'Can I request the same doer again?',
    answer: 'Absolutely! Bookmark doers, message directly, or set up recurring errands for regular tasks (weekly cleaning, tutoring). Recurring errands have special pricing.',
    keywords: ['same', 'again', 'recurring', 'repeat', 'regular']
  },

  // For Doers
  {
    id: 'd1',
    category: 'doer',
    question: 'How do I earn money on Errandify?',
    answer: 'Browse errands, submit your bid at any rate, get accepted, complete work, receive payment. Your ratings build reputation, leading to more opportunities.',
    keywords: ['earn', 'money', 'income', 'how', 'bid', 'payment']
  },
  {
    id: 'd2',
    category: 'doer',
    question: 'How much can I earn?',
    answer: 'You set your own rates. Earnings depend on category, complexity, time, and location. Most doers earn SGD 20-100+ per errand. Top-rated doers get priority.',
    keywords: ['earn', 'much', 'money', 'income', 'rate', 'salary']
  },
  {
    id: 'd3',
    category: 'doer',
    question: 'How are doers rated and verified?',
    answer: 'After each errand, askers rate your work (1-5 stars). Your rating affects visibility and trust. We verify identity via SingPass or Veriff for security.',
    keywords: ['rating', 'verified', 'reputation', 'reviews', 'stars']
  },
  {
    id: 'd4',
    category: 'doer',
    question: 'Can I decline an errand after accepting?',
    answer: 'Declining after acceptance affects your rating and can result in penalties. Plan carefully before accepting. Cancel only if unavoidable.',
    keywords: ['decline', 'cancel', 'after', 'accepting', 'penalty']
  },

  // Payment
  {
    id: 'p1',
    category: 'payment',
    question: 'When do I get paid?',
    answer: 'Payment is held for 48 hours after asker marks work complete, then released to your account within 2-3 business days. This protects both parties.',
    keywords: ['payment', 'when', 'paid', 'receive', 'money', 'time']
  },
  {
    id: 'p2',
    category: 'payment',
    question: 'What payment methods are available?',
    answer: 'Askers pay via Stripe (credit card, debit card). Doers receive payment to bank account. International transfers available.',
    keywords: ['payment', 'method', 'stripe', 'bank', 'card', 'transfer']
  },
  {
    id: 'p3',
    category: 'payment',
    question: 'Is my payment information secure?',
    answer: 'Yes. We use Stripe for secure payments, PCI DSS compliant. Your bank info is never shared. All transactions encrypted.',
    keywords: ['secure', 'safe', 'privacy', 'encryption', 'information']
  },

  // Safety
  {
    id: 's1',
    category: 'safety',
    question: 'How safe is Errandify?',
    answer: 'We verify all users, encrypt data, secure payments via Stripe, and have dispute resolution. Rate your experience after each errand. Report concerns immediately.',
    keywords: ['safe', 'safety', 'secure', 'trust', 'protected']
  },
  {
    id: 's2',
    category: 'safety',
    question: 'What happens if there is a dispute?',
    answer: 'Raise a dispute with evidence within 48 hours. Our team reviews both sides fairly. Doers can resolve before escalation.',
    keywords: ['dispute', 'conflict', 'problem', 'resolve', 'evidence']
  },
];

// Helper function to find relevant FAQs by keywords
export const findRelevantFAQ = (userMessage: string): FAQItem | null => {
  const messageLower = userMessage.toLowerCase();

  // Score each FAQ by keyword match
  const scored = faqs.map(faq => {
    let score = 0;
    const keywords = faq.keywords || [];

    // Check keywords
    for (const keyword of keywords) {
      if (messageLower.includes(keyword)) {
        score += 2;
      }
    }

    // Check question similarity
    const questionLower = faq.question.toLowerCase();
    if (messageLower.includes(questionLower) || questionLower.includes(messageLower)) {
      score += 5;
    }

    // Check answer for relevant terms
    const answerLower = faq.answer.toLowerCase();
    if (messageLower.length > 3 && answerLower.includes(messageLower)) {
      score += 1;
    }

    return { faq, score };
  });

  // Return highest scoring FAQ if score > 0
  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.faq : null;
};
