import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface JobOpening {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  benefits: string[];
  salary: string;
  type: string;
  icon: string;
}

const JoinUsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const jobOpenings: JobOpening[] = [
    {
      id: 'JOB-001',
      title: 'Software Engineer',
      department: 'Engineering',
      description: 'Help us build the platform that simplifies life and amplifies humanity. You\'ll work on our core backend systems, APIs, and mobile features.',
      requirements: [
        '3+ years of software development experience',
        'Proficiency in TypeScript, React, or Node.js',
        'Understanding of database design and optimization',
        'Passion for solving real-world problems',
      ],
      benefits: [
        '🌟 Competitive salary & performance bonuses',
        '💰 Errandify Points (use our platform!)',
        '🏠 Flexible work-from-home options',
        '📚 Professional development fund',
        '🏥 Comprehensive health insurance',
        '✈️ Annual team retreats & events',
      ],
      salary: '$4,500 - $7,500/month',
      type: 'Full-time',
      icon: '💻',
    },
    {
      id: 'JOB-002',
      title: 'Product Manager',
      department: 'Product',
      description: 'Shape the future of Errandify by leading product strategy, roadmap, and execution. Work directly with users to understand their needs and drive product innovation.',
      requirements: [
        '4+ years of product management experience',
        'Strong data-driven decision making skills',
        'Experience with B2C or marketplace platforms',
        'Excellent communication and leadership abilities',
      ],
      benefits: [
        '🌟 Competitive salary & performance bonuses',
        '💰 Errandify Points (use our platform!)',
        '🏠 Flexible work-from-home options',
        '📚 Professional development fund',
        '🏥 Comprehensive health insurance',
        '✈️ Annual team retreats & events',
      ],
      salary: '$5,000 - $8,000/month',
      type: 'Full-time',
      icon: '📊',
    },
    {
      id: 'JOB-003',
      title: 'Community Manager',
      department: 'Community & Engagement',
      description: 'Be the heart of our community! You\'ll nurture relationships with our Errandify family, organize events, and create stories that inspire others to help and grow.',
      requirements: [
        '2+ years of community management experience',
        'Excellent communication and empathy skills',
        'Social media and event planning experience',
        'Passion for building inclusive communities',
      ],
      benefits: [
        '🌟 Competitive salary & performance bonuses',
        '💰 Errandify Points (use our platform!)',
        '🏠 Flexible work-from-home options',
        '📚 Professional development fund',
        '🏥 Comprehensive health insurance',
        '✈️ Annual team retreats & events',
      ],
      salary: '$3,500 - $5,500/month',
      type: 'Full-time',
      icon: '👥',
    },
    {
      id: 'JOB-004',
      title: 'Design Lead',
      department: 'Design',
      description: 'Lead our design team in creating intuitive, beautiful experiences that make helping others feel natural and rewarding. Your designs will touch millions of lives.',
      requirements: [
        '5+ years of UI/UX design experience',
        'Proficiency in design tools (Figma, Adobe XD)',
        'Strong portfolio demonstrating design thinking',
        'Leadership and mentoring experience',
      ],
      benefits: [
        '🌟 Competitive salary & performance bonuses',
        '💰 Errandify Points (use our platform!)',
        '🏠 Flexible work-from-home options',
        '📚 Professional development fund',
        '🏥 Comprehensive health insurance',
        '✈️ Annual team retreats & events',
      ],
      salary: '$4,500 - $7,000/month',
      type: 'Full-time',
      icon: '🎨',
    },
    {
      id: 'JOB-005',
      title: 'Customer Success Manager',
      department: 'Customer Success',
      description: 'Ensure our users get maximum value from Errandify. You\'ll be their trusted advisor, solving problems and celebrating their successes with them.',
      requirements: [
        '3+ years of customer success/support experience',
        'Strong problem-solving and interpersonal skills',
        'Experience with SaaS or marketplace platforms',
        'Bilingual skills (English & Mandarin/Malay preferred)',
      ],
      benefits: [
        '🌟 Competitive salary & performance bonuses',
        '💰 Errandify Points (use our platform!)',
        '🏠 Flexible work-from-home options',
        '📚 Professional development fund',
        '🏥 Comprehensive health insurance',
        '✈️ Annual team retreats & events',
      ],
      salary: '$3,500 - $5,500/month',
      type: 'Full-time',
      icon: '🎯',
    },
  ];

  const cultureValues = [
    {
      icon: '❤️',
      title: 'People First',
      description: 'We celebrate our team\'s growth, support each other\'s dreams, and believe in the power of collective impact.',
    },
    {
      icon: '🤝',
      title: 'Amplify Humanity',
      description: 'Every product decision is guided by how it helps people help each other and simplifies their lives.',
    },
    {
      icon: '🚀',
      title: 'Innovation & Ownership',
      description: 'We empower every team member to own their work, experiment boldly, and drive meaningful change.',
    },
    {
      icon: '🌍',
      title: 'Diversity & Inclusion',
      description: 'Our strength comes from diverse backgrounds, perspectives, and experiences from across Southeast Asia.',
    },
  ];

  const ourMission = [
    {
      icon: '🤖',
      title: 'AI Powers Help',
      description: 'We use advanced AI to match people who need help with those who can help. Hana, our AI assistant, learns from every interaction to make helping smarter and faster.',
    },
    {
      icon: '🌍',
      title: 'Building Real Communities',
      description: 'Beyond transactions, we\'re building kampungs (communities) where neighbors know each other, trust grows, and helping is the norm—not the exception.',
    },
    {
      icon: '⚡',
      title: 'Amplifying Human Kindness',
      description: 'Technology should make good humans better. We automate the logistics so you can focus on what matters: genuine human connection and kindness.',
    },
    {
      icon: '🎯',
      title: 'Simplifying Life',
      description: 'Life is busy. We make it easier to get help when you need it, and simpler to help others. One small errand, one big impact.',
    },
  ];

  return (
    <div style={{ background: '#fff' }}>
        {/* HERO SECTION */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 50%, #FF5722 100%)',
          color: 'white',
          padding: '40px 20px',
          textAlign: 'center',
          borderRadius: '12px 12px 0 0',
          marginBottom: '24px',
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            margin: '0 0 16px 0',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Help Us Build the Future of Helping ✨
          </h1>
          <p style={{
            fontSize: '16px',
            margin: '0 0 12px 0',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            opacity: 0.95,
            lineHeight: 1.6,
          }}>
            Every day, people want to help—but don't know how. Others need help—but find it hard to ask. We're using AI and community to bridge that gap.
          </p>
          <p style={{
            fontSize: '14px',
            margin: '0 0 20px 0',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            opacity: 0.9,
            lineHeight: 1.6,
          }}>
            Be part of a team that believes in kindness, powered by technology, building real communities across Southeast Asia.
          </p>
          <button
            onClick={() => document.querySelector('#jobs')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '12px 32px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Explore Positions ↓
          </button>
        </div>

        {/* OUR STORY */}
        <div style={{ padding: '60px 20px', background: '#f9f9f9' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              textAlign: 'center',
              marginBottom: '40px',
            }}>
              Our Mission: AI-Powered Communities 🚀
            </h2>

            <p style={{
              fontSize: '16px',
              lineHeight: 1.8,
              color: '#666',
              marginBottom: '40px',
              textAlign: 'center',
              maxWidth: '700px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              We're building kampungs across Southeast Asia where people help each other, AI makes it smarter, and communities become stronger. Our vision: a world where helping is natural, technology enables kindness, and no one feels alone.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
            }}>
              {ourMission.map((item, idx) => (
                <div key={idx} style={{
                  padding: '28px',
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #f0f4ff 100%)',
                  borderRadius: '12px',
                  border: '2px solid #e8ecf1',
                  textAlign: 'left',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>{item.icon}</div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#333', margin: '0 0 12px 0' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CULTURE VALUES */}
        <div style={{ padding: '60px 20px', background: 'white' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              textAlign: 'center',
              marginBottom: '40px',
            }}>
              Our Culture & Values 🌟
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
            }}>
              {cultureValues.map((value, idx) => (
                <div key={idx} style={{
                  padding: '28px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  border: '2px solid transparent',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>{value.icon}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', margin: '0 0 12px 0' }}>
                    {value.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: 1.6 }}>
                    {value.description}
                  </p>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '40px',
              padding: '24px',
              background: 'linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)',
              borderRadius: '12px',
              borderLeft: '4px solid #FF6B35',
            }}>
              <p style={{
                fontSize: '14px',
                color: '#2E7D32',
                margin: 0,
                lineHeight: 1.8,
              }}>
                <strong>❤️ Why We're Different:</strong> We're not just building a platform—we're building a movement. A place where technology serves humanity, where helping is celebrated, and where every team member knows their work touches real lives every single day.
              </p>
            </div>
          </div>
        </div>

        {/* OPEN POSITIONS */}
        <div id="jobs" style={{ padding: '60px 20px', background: '#f9f9f9' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              Join the Kampung Team 🤝
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#666',
              textAlign: 'center',
              marginBottom: '40px',
              maxWidth: '700px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.7,
            }}>
              We're looking for people who believe in kindness, think deeply about impact, and want to build something meaningful. If you're passionate about helping others and love solving problems—let's talk.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}>
              {jobOpenings.map((job) => (
                <div
                  key={job.id}
                  onMouseEnter={() => setHoveredCard(job.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    padding: '28px',
                    background: 'white',
                    borderRadius: '12px',
                    border: '2px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: hoveredCard === job.id ? 'translateY(-8px)' : 'translateY(0)',
                    boxShadow: hoveredCard === job.id ? '0 12px 24px rgba(0,0,0,0.1)' : '0 4px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>{job.icon}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>
                    {job.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#667eea', fontWeight: '600', margin: '0 0 12px 0' }}>
                    {job.department} • {job.type}
                  </p>
                  <p style={{ fontSize: '14px', color: '#666', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                    {job.description.substring(0, 100)}...
                  </p>
                  <div style={{
                    padding: '12px',
                    background: '#FFF3E0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#E65100',
                    textAlign: 'center',
                    marginBottom: '12px',
                  }}>
                    {job.salary}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/apply/${job.id}`);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Apply Now →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* JOB DETAIL MODAL */}
        {selectedJob && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>{selectedJob.icon}</div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
                    {selectedJob.title}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#667eea', fontWeight: '600', margin: 0 }}>
                    {selectedJob.department} • {selectedJob.type}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#999',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#667eea', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                  Salary
                </h3>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#333', margin: 0 }}>
                  {selectedJob.salary}
                </p>
              </div>

              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 12px 0' }}>
                  About This Role
                </h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, margin: 0 }}>
                  {selectedJob.description}
                </p>
              </div>

              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 12px 0' }}>
                  What We're Looking For
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {selectedJob.requirements.map((req, idx) => (
                    <li key={idx} style={{ fontSize: '13px', color: '#666', marginBottom: '8px', lineHeight: 1.5 }}>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 12px 0' }}>
                  What We Offer
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {selectedJob.benefits.map((benefit, idx) => (
                    <li key={idx} style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setSelectedJob(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigate(`/apply/${selectedJob.id}`);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Apply Now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CTA SECTION */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          color: 'white',
          padding: '60px 20px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 16px 0',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Ready to Join Our Kampung? 🚀
          </h2>
          <p style={{
            fontSize: '16px',
            margin: '0 0 24px 0',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            opacity: 0.95,
            lineHeight: 1.7,
          }}>
            Don't see your dream role above? No problem! If you're passionate about our mission and believe you can help us amplify humanity, we want to hear from you. Every skill matters when you're building a movement. Reach out to careers@errandify.ai.
          </p>
          <button
            onClick={() => document.querySelector('#jobs')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '12px 32px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Browse All Positions
          </button>
        </div>

        {/* FAQ SECTION */}
        <div style={{ padding: '60px 20px', background: '#f9f9f9' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              textAlign: 'center',
              marginBottom: '40px',
            }}>
              Frequently Asked Questions ❓
            </h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              {[
                {
                  q: 'What\'s the application process like?',
                  a: 'After you apply, we review your CV and background. Promising candidates go through phone screening, technical/role-specific interviews, and a final chat with our leadership team. The entire process takes about 2-3 weeks.',
                },
                {
                  q: 'Do you hire remote workers?',
                  a: 'Yes! We\'re a distributed team across Singapore, Malaysia, and Indonesia. We offer flexible work-from-home options for all roles.',
                },
                {
                  q: 'What\'s the company culture like?',
                  a: 'We\'re a small, mission-driven team that genuinely cares about our product and each other. We celebrate wins together, support each other through challenges, and believe in work-life balance.',
                },
                {
                  q: 'Do you offer benefits like health insurance?',
                  a: 'Absolutely! We offer comprehensive health insurance, professional development funds, Errandify Points (to use our platform!), and annual team retreats.',
                },
                {
                  q: 'I don\'t see my ideal role listed. Can I still apply?',
                  a: 'Yes! If you\'re passionate about our mission and think you can contribute, send your CV to careers@errandify.ai. We\'re always looking for talented people.',
                },
              ].map((faq, idx) => (
                <div key={idx} style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>
                    Q: {faq.q}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0, lineHeight: 1.6 }}>
                    A: {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER CTA */}
        <div style={{
          padding: '40px 20px',
          background: 'white',
          borderTop: '1px solid #e0e0e0',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 16px 0' }}>
            Have questions? Get in touch! ✉️
          </p>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
            careers@errandify.ai | +65 6XXX XXXX
          </p>
        </div>
      </div>
  );
};

export default JoinUsPage;
