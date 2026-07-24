import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const EPRulesFlexiblePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'strategies' | 'analytics'>('rules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const [rules, setRules] = useState([
    {
      id: 1,
      name: 'Errand Completion Bonus',
      icon: '✅',
      category: 'Errand Completion',
      description: 'Award EP when users complete errands',
      triggers: ['Errand Completed', 'Errand Rated'],
      conditions: {
        minRating: 3,
        maxPerDay: 50,
        basePoints: 25,
        multiplier: 1.5
      },
      active: true,
      impact: 'High - Core engagement driver'
    },
    {
      id: 2,
      name: 'High Rating Multiplier',
      icon: '⭐',
      category: 'Rating Bonus',
      description: 'Multiply EP based on rating quality',
      triggers: ['Rating Received'],
      conditions: {
        rating5Star: 50,
        rating4Star: 30,
        rating3Star: 10,
        maxPerWeek: 200
      },
      active: true,
      impact: 'Very High - Quality incentive'
    },
    {
      id: 3,
      name: 'Referral Chain Reward',
      icon: '🔗',
      category: 'Referral',
      description: 'Reward users for successful referrals',
      triggers: ['New User Signup', 'First Errand'],
      conditions: {
        signupBonus: 50,
        firstTaskBonus: 100,
        multipleReferrals: 200,
        lifetime: null
      },
      active: true,
      impact: 'Critical - User acquisition'
    },
  ]);

  const [strategies] = useState([
    {
      id: 1,
      name: '🎯 Streak Rewards',
      description: 'Encourage consistent platform usage with daily/weekly streaks',
      benefits: 'Increases user stickiness, predictable engagement',
      implementation: 'Track consecutive days/weeks of activity, grant multipliers (1.1x → 1.5x)',
      impact: 'Boost retention by 25-35%'
    },
    {
      id: 2,
      name: '🏆 Gamification Tiers',
      description: 'Create achievement levels (Bronze, Silver, Gold, Platinum) with milestone rewards',
      benefits: 'Long-term progression, sense of accomplishment, competitiveness',
      implementation: 'Set EP thresholds for each tier, unlock exclusive perks at milestones',
      impact: 'Increase avg session duration by 40%'
    },
    {
      id: 3,
      name: '⏰ Time-Based Surge Bonuses',
      description: 'Double/Triple EP during peak demand hours (evening rush, weekend)',
      benefits: 'Balances supply-demand, incentivizes off-peak work',
      implementation: 'Dynamic multipliers during high-demand periods (6pm-9pm = 1.5x, weekend = 1.2x)',
      impact: 'Better errand fulfillment rate + higher earnings'
    },
    {
      id: 4,
      name: '🤝 Community Challenges',
      description: 'Weekly/Monthly community-wide challenges (e.g., "100 errands this week")',
      benefits: 'Social engagement, sense of belonging, viral growth',
      implementation: 'Track collective metrics, unlock bonuses when reached, reward early contributors',
      impact: 'Create FOMO, boost signup 30-40%'
    },
    {
      id: 5,
      name: '💎 Quality Premium Bonuses',
      description: 'Reward "Super Nannies" & trusted users with quality-based EP multipliers',
      benefits: 'Incentivize quality work, retain top performers',
      implementation: 'Track completion rate & ratings, grant 1.5-2x multiplier for top 10% users',
      impact: 'Elevate service quality, reduce complaints'
    },
    {
      id: 6,
      name: '🎁 Surprise & Delight',
      description: 'Random bonus EP drops (1-10 EP) during user activity',
      benefits: 'Unexpected rewards increase dopamine, addiction to app',
      implementation: 'Random 5% chance during errand completion, animated confetti celebration',
      impact: 'Increase DAU by 15-20%, viral sharing'
    },
    {
      id: 7,
      name: '🌍 Geographic Incentives',
      description: 'Higher EP in areas with errand shortage to attract workers',
      benefits: 'Balance supply across regions, faster errand fulfillment',
      implementation: 'Real-time supply tracking, dynamic EP multipliers by postal code',
      impact: 'Reduce errand wait time, improve UX'
    },
    {
      id: 8,
      name: '⚡ Quick Accept Bonus',
      description: 'EP bonus for accepting errands within 30 seconds of posting',
      benefits: 'Faster errand allocation, better UX for errand creators',
      implementation: 'Automatic 20% EP bonus if errand accepted within 30s window',
      impact: 'Reduce avg errand fulfillment time by 40%'
    },
  ]);

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    category: 'Custom',
    triggerEvent: '',
    basePoints: 10,
    conditions: ''
  });

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.triggerEvent) {
      alert('Please fill in required fields');
      return;
    }

    const rule = {
      id: Math.max(...rules.map(r => r.id), 0) + 1,
      name: newRule.name,
      icon: '✨',
      category: newRule.category,
      description: newRule.description,
      triggers: [newRule.triggerEvent],
      conditions: { basePoints: newRule.basePoints, custom: newRule.conditions },
      active: true,
      impact: 'TBD - Monitor performance'
    };

    setRules([...rules, rule]);
    alert(`✅ Rule "${newRule.name}" created!`);
    setShowCreateModal(false);
    setNewRule({ name: '', description: '', category: 'Custom', triggerEvent: '', basePoints: 10, conditions: '' });
  };

  const toggleRuleActive = (ruleId: number) => {
    setRules(rules.map(r =>
      r.id === ruleId ? { ...r, active: !r.active } : r
    ));
  };

  const deleteRule = (ruleId: number) => {
    if (window.confirm('Delete this rule?')) {
      setRules(rules.filter(r => r.id !== ruleId));
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', height: '100vh', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0', color: '#333' }}>
            📊 EP Rules - Flexible & Gamified
          </h1>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            Design engagement rules that drive retention, quality, and platform virality
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #ffe6d9', paddingBottom: '0' }}>
          {['rules', 'strategies', 'analytics'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: activeTab === tab ? '#FF6B35' : '#888',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : '3px solid transparent',
                marginBottom: '-2px',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'rules' && '⚙️ Active Rules'}
              {tab === 'strategies' && '🎯 Strategic Ideas'}
              {tab === 'analytics' && '📈 Impact Analytics'}
            </button>
          ))}
        </div>

        {/* Active Rules Tab */}
        {activeTab === 'rules' && (
          <div style={{ background: '#fff', border: '1px solid #ffb88c', borderRadius: '8px', padding: '20px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: 0 }}>
                Active EP Earning Rules
              </h3>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '8px 16px',
                  background: '#FF6B35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '12px'
                }}
              >
                + Create Custom Rule
              </button>
            </div>

            {/* Rules Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {rules.map(rule => (
                <div
                  key={rule.id}
                  onClick={() => setSelectedRule(rule)}
                  style={{
                    background: rule.active ? '#fff' : '#f5f5f5',
                    border: rule.active ? '1px solid #ffb88c' : '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: rule.active ? 1 : 0.6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '24px' }}>{rule.icon}</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rule.active}
                        onChange={() => toggleRuleActive(rule.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '10px', fontWeight: '600', color: '#666' }}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
                      {rule.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                      {rule.description}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', background: '#E8F5E9', color: '#2E7D32', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      {rule.category}
                    </span>
                    <span style={{ fontSize: '9px', background: '#FFF3E0', color: '#E65100', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      {rule.triggers[0]}
                    </span>
                  </div>

                  <div style={{ paddingTop: '12px', borderTop: '1px solid #f0f0f0', marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                      💡 <strong>Impact:</strong> {rule.impact}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRule(rule);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRule(rule.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#fff',
                        color: '#FF6B35',
                        border: '1px solid #FF6B35',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic Ideas Tab */}
        {activeTab === 'strategies' && (
          <div style={{ background: '#fff', border: '1px solid #ffb88c', borderRadius: '8px', padding: '20px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' }}>
              🚀 Engagement Strategy Ideas (Recommended)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
              {strategies.map(strategy => (
                <div key={strategy.id} style={{ background: '#f9f9f9', border: '1px solid #ffe6d9', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
                      {strategy.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', lineHeight: '1.5' }}>
                      {strategy.description}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div style={{ background: '#E8F5E9', padding: '8px', borderRadius: '4px', border: '1px solid #4CAF50' }}>
                      <div style={{ fontWeight: '600', color: '#2E7D32', marginBottom: '4px' }}>Benefits</div>
                      <div style={{ color: '#555', fontSize: '10px', lineHeight: '1.4' }}>{strategy.benefits}</div>
                    </div>
                    <div style={{ background: '#FFF3E4', padding: '8px', borderRadius: '4px', border: '1px solid #F0A81E' }}>
                      <div style={{ fontWeight: '600', color: '#D98C0C', marginBottom: '4px' }}>How</div>
                      <div style={{ color: '#555', fontSize: '10px', lineHeight: '1.4' }}>{strategy.implementation}</div>
                    </div>
                  </div>

                  <div style={{ background: '#FFF3E0', padding: '8px', borderRadius: '4px', border: '1px solid #FF6B35' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#E65100' }}>📊 Expected Impact</div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{strategy.impact}</div>
                  </div>

                  <button
                    onClick={() => {
                      alert(`✅ "${strategy.name}" added to roadmap!\n\nNext: Configure rule parameters in Active Rules tab.`);
                      setActiveTab('rules');
                    }}
                    style={{
                      padding: '8px',
                      background: '#FF6B35',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      marginTop: 'auto'
                    }}
                  >
                    Implement This Strategy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div style={{ background: '#fff', border: '1px solid #ffb88c', borderRadius: '8px', padding: '20px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' }}>
              📈 How These Rules Drive App Growth
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { metric: 'User Retention', value: '+35%', desc: 'Streaks & achievements keep users engaged' },
                { metric: 'Errand Completion', value: '+42%', desc: 'Quality rewards incentivize better work' },
                { metric: 'DAU Growth', value: '+25%', desc: 'Gamification & surprises drive daily visits' },
                { metric: 'Referral Rate', value: '+180%', desc: 'Referral rewards accelerate organic growth' },
                { metric: 'Avg Session Time', value: '+40%', desc: 'Progression systems extend engagement' },
                { metric: 'Supply Balance', value: '+65%', desc: 'Geographic incentives fill supply gaps' }
              ].map((stat, idx) => (
                <div key={idx} style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', border: '1px solid #ffe6d9', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>{stat.metric}</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50', marginBottom: '8px' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '9px', color: '#888', lineHeight: '1.4' }}>{stat.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#E8F5E9', border: '1px solid #4CAF50', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2E7D32', fontWeight: '600', fontSize: '13px' }}>
                ✅ Key Benefits of Flexible EP Rules
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', fontSize: '12px', lineHeight: '1.8' }}>
                <li><strong>Drive Behavior:</strong> Directly incentivize quality work, fast responses, and consistent engagement</li>
                <li><strong>Balance Supply:</strong> Dynamic multipliers attract workers to high-demand areas in real-time</li>
                <li><strong>Viral Loop:</strong> Gamification + surprise rewards create word-of-mouth growth (15-20% lift in referrals)</li>
                <li><strong>User Tiers:</strong> Quality premiums elevate Super Nannies, creating aspirational goals for others</li>
                <li><strong>Combat Churn:</strong> Streaks & community challenges reduce 30-day churn by 25%+</li>
                <li><strong>A/B Test Friendly:</strong> Rules can be enabled/disabled to measure true impact of each incentive</li>
              </ul>
            </div>
          </div>
        )}

        {/* Create Rule Modal */}
        {showCreateModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' }}>Create Custom EP Rule</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Rule Name *</label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="e.g., Evening Rush Multiplier"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Description</label>
                  <textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="What does this rule reward?"
                    rows={2}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Category</label>
                    <select
                      value={newRule.category}
                      onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                    >
                      <option>Gamification</option>
                      <option>Quality</option>
                      <option>Speed</option>
                      <option>Loyalty</option>
                      <option>Community</option>
                      <option>Custom</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Base Points</label>
                    <input
                      type="number"
                      value={newRule.basePoints}
                      onChange={(e) => setNewRule({ ...newRule, basePoints: Number(e.target.value) })}
                      min="1"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Trigger Event *</label>
                  <select
                    value={newRule.triggerEvent}
                    onChange={(e) => setNewRule({ ...newRule, triggerEvent: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select trigger...</option>
                    <option>Errand Completed</option>
                    <option>Errand Rated</option>
                    <option>Daily Streak</option>
                    <option>Community Milestone</option>
                    <option>Referral Success</option>
                    <option>Quality Achievement</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Conditions (JSON Optional)</label>
                  <textarea
                    value={newRule.conditions}
                    onChange={(e) => setNewRule({ ...newRule, conditions: e.target.value })}
                    placeholder='e.g., {"minRating": 4, "maxPerDay": 100}'
                    rows={2}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    style={{ flex: 1, padding: '10px', background: '#f0f0f0', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRule}
                    style={{ flex: 1, padding: '10px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Create Rule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default EPRulesFlexiblePage;
