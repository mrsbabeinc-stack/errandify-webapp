-- Create FAQ Table
CREATE TABLE IF NOT EXISTS faqs (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  INDEX idx_category (category),
  INDEX idx_active (is_active)
);

-- Insert FAQ Data
INSERT INTO faqs (id, category, question, answer, keywords, is_active) VALUES
-- General
('g1', 'general', 'What is Errandify?', 'Errandify is a Singapore-based AI-powered neighbourhood marketplace where neighbours help each other with daily tasks. Whether you need help or want to earn by helping others, Errandify connects you with trusted community members.', 'errandify,what,about,platform,marketplace', true),
('g2', 'general', 'How much does it cost to use Errandify?', 'Errandify is free to join. Doers pay 20% platform fee from earnings. Askers pay Stripe fees (2-3%). Example: $100 bid → Doer earns $80, Asker pays ~$102-103 total.', 'cost,price,fee,free,charge,money', true),
('g3', 'general', 'Who can join Errandify?', 'Anyone 18+ can join. We verify via SingPass (Singapore citizens/residents) or Veriff (others). Some categories need background checks.', 'age,join,eligible,requirements,sign up', true),
('g4', 'general', 'What is the Kampung Spirit?', 'Kampung Spirit refers to traditional Singaporean community values of helping neighbours. Errandify brings this spirit to modern city life through technology.', 'kampung,spirit,community,values', true),

-- For Askers
('a1', 'asker', 'How do I post an errand?', 'Click the plus button (+), select a category, describe what you need, set your budget, and post. Doers will submit bids within hours. You review, compare, and pick the best fit.', 'post,errand,create,how,steps,button', true),
('a2', 'asker', 'How much should I budget for an errand?', 'It depends on task complexity, time, and location. Browse similar errands or ask doers. Errandify shows average rates per category to guide you.', 'budget,how much,price,cost,rate', true),
('a3', 'asker', 'Can I cancel an errand?', 'Yes. Before a doer accepts, cancel free. After acceptance, a small fee applies. If a doer cancels after accepting, you get fully refunded.', 'cancel,refund,cancellation', true),
('a4', 'asker', 'What if I am not happy with the work?', 'Payment is held until you mark work complete. If issues arise, raise a dispute with evidence. Our team reviews fairly. Doers can also make things right before escalation.', 'unhappy,dispute,issue,problem,quality,not satisfied', true),
('a5', 'asker', 'Can I request the same doer again?', 'Absolutely! Bookmark doers, message directly, or set up recurring errands for regular tasks (weekly cleaning, tutoring). Recurring errands have special pricing.', 'same,again,recurring,repeat,regular', true),

-- For Doers
('d1', 'doer', 'How do I earn money on Errandify?', 'Browse errands, submit your bid at any rate, get accepted, complete work, receive payment. Your ratings build reputation, leading to more opportunities.', 'earn,money,income,how,bid,payment', true),
('d2', 'doer', 'How much can I earn?', 'You set your own rates. Earnings depend on category, complexity, time, and location. Most doers earn SGD 20-100+ per errand. Top-rated doers get priority.', 'earn,much,money,income,rate,salary', true),
('d3', 'doer', 'How are doers rated and verified?', 'After each errand, askers rate your work (1-5 stars). Your rating affects visibility and trust. We verify identity via SingPass or Veriff for security.', 'rating,verified,reputation,reviews,stars', true),
('d4', 'doer', 'Can I decline an errand after accepting?', 'Declining after acceptance affects your rating and can result in penalties. Plan carefully before accepting. Cancel only if unavoidable.', 'decline,cancel,after,accepting,penalty', true),

-- Payment
('p1', 'payment', 'When do I get paid?', 'Payment is held for 48 hours after asker marks work complete, then released to your account within 2-3 business days. This protects both parties.', 'payment,when,paid,receive,money,time', true),
('p2', 'payment', 'What payment methods are available?', 'Askers pay via Stripe (credit card, debit card). Doers receive payment to bank account. International transfers available.', 'payment,method,stripe,bank,card,transfer', true),
('p3', 'payment', 'Is my payment information secure?', 'Yes. We use Stripe for secure payments, PCI DSS compliant. Your bank info is never shared. All transactions encrypted.', 'secure,safe,privacy,encryption,information', true),

-- Safety
('s1', 'safety', 'How safe is Errandify?', 'We verify all users, encrypt data, secure payments via Stripe, and have dispute resolution. Rate your experience after each errand. Report concerns immediately.', 'safe,safety,secure,trust,protected', true),
('s2', 'safety', 'What happens if there is a dispute?', 'Raise a dispute with evidence within 48 hours. Our team reviews both sides fairly. Doers can resolve before escalation.', 'dispute,conflict,problem,resolve,evidence', true),

-- Conduct
('c1', 'conduct', 'What is the code of conduct?', 'Be respectful, honest, and reliable. Complete work as agreed. Communicate clearly. Don\'t discriminate. Respect privacy. Violations may result in account suspension.', 'conduct,code,rules,behavior,policy', true),
('c2', 'conduct', 'What is considered inappropriate behavior?', 'Discrimination, harassment, fraud, unsafe practices, or breaking agreements. Report violations to support@errandify.ai. We investigate all reports seriously.', 'inappropriate,harassment,fraud,abuse,report', true);
