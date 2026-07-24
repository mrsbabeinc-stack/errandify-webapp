import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface CompanyClient {
  id: string;
  name: string;
  uen?: string;
  industry: string;
  location: string;
  subscriptionTier: 'silver' | 'gold' | 'platinum';
  accountAgeMonths: number;
  teamSize: number;
  monthlyOrders: number;
  avgOrderValue: number;
  completionRate: number;
  rating: number;
  monthlySpend: number;
  monthlyRevenue: number;
  advertisingSpend: number;
  advertisingROI: number;
  supportTickets: number;
  lastActivity: string;
  walletBalance: number;
  epBalance: number;
}

interface CompanyInsight {
  growthScore: number;
  churnRisk: number;
  churnRiskLevel: 'low' | 'medium' | 'high';
  recommendedTier: string;
  tierROI: number;
  advRecommendedBudget: number;
  advCurrentROI: number;
  industryAvgOrders: number;
  industryAvgCompletion: number;
  industryAvgRating: number;
  marketPosition: string;
  topOpportunities: string[];
  satisfactionScore: number;
  painPoints: string[];
  retentionActions: string[];
  engagementChannels: string[];
  nextAction: string;
  recommendedUpgradeMonth: number;
}

const CompanyClientIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'portfolio' | 'detail' | 'insights'>('portfolio');
  const [companies, setCompanies] = useState<CompanyClient[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyClient | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<CompanyInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'growth' | 'risk' | 'revenue'>('growth');

  // Demo data
  useEffect(() => {
    const demoCompanies: CompanyClient[] = [
      {
        id: 'comp_1',
        name: 'Logistics Pro Inc',
        uen: 'UEN123456A',
        industry: 'Logistics & Courier',
        location: 'CBD Singapore',
        subscriptionTier: 'silver',
        accountAgeMonths: 18,
        teamSize: 24,
        monthlyOrders: 450,
        avgOrderValue: 45,
        completionRate: 98,
        rating: 4.6,
        monthlySpend: 2450,
        monthlyRevenue: 20250,
        advertisingSpend: 500,
        advertisingROI: 3.2,
        supportTickets: 12,
        lastActivity: '2 hours ago',
        walletBalance: 5000,
        epBalance: 15000,
      },
      {
        id: 'comp_2',
        name: 'FastDelivery Co',
        uen: 'UEN789012B',
        industry: 'E-commerce Fulfillment',
        location: 'East Singapore',
        subscriptionTier: 'gold',
        accountAgeMonths: 24,
        teamSize: 45,
        monthlyOrders: 800,
        avgOrderValue: 52,
        completionRate: 95,
        rating: 4.4,
        monthlySpend: 4200,
        monthlyRevenue: 41600,
        advertisingSpend: 1200,
        advertisingROI: 2.8,
        supportTickets: 8,
        lastActivity: '30 mins ago',
        walletBalance: 12000,
        epBalance: 45000,
      },
      {
        id: 'comp_3',
        name: 'ServiceNow Ltd',
        uen: 'UEN345678C',
        industry: 'Maintenance & Repair',
        location: 'West Singapore',
        subscriptionTier: 'silver',
        accountAgeMonths: 6,
        teamSize: 12,
        monthlyOrders: 180,
        avgOrderValue: 38,
        completionRate: 92,
        rating: 4.3,
        monthlySpend: 1100,
        monthlyRevenue: 6840,
        advertisingSpend: 200,
        advertisingROI: 2.1,
        supportTickets: 18,
        lastActivity: '4 hours ago',
        walletBalance: 2000,
        epBalance: 5000,
      },
      {
        id: 'comp_4',
        name: 'EventPros Singapore',
        uen: 'UEN456789D',
        industry: 'Event Management',
        location: 'Marina Bay',
        subscriptionTier: 'gold',
        accountAgeMonths: 12,
        teamSize: 18,
        monthlyOrders: 320,
        avgOrderValue: 65,
        completionRate: 99,
        rating: 4.8,
        monthlySpend: 2080,
        monthlyRevenue: 20800,
        advertisingSpend: 800,
        advertisingROI: 3.5,
        supportTickets: 4,
        lastActivity: '15 mins ago',
        walletBalance: 8000,
        epBalance: 28000,
      },
    ];

    setCompanies(demoCompanies);
  }, []);

  const generateInsights = async (company: CompanyClient): Promise<CompanyInsight> => {
    try {
      const industryBenchmarks: Record<string, { orders: number; completion: number; rating: number }> = {
        'Logistics & Courier': { orders: 380, completion: 92, rating: 4.2 },
        'E-commerce Fulfillment': { orders: 700, completion: 93, rating: 4.3 },
        'Maintenance & Repair': { orders: 150, completion: 88, rating: 4.1 },
        'Event Management': { orders: 250, completion: 95, rating: 4.5 },
      };

      const benchmark = industryBenchmarks[company.industry] || { orders: 400, completion: 90, rating: 4.2 };

      // Calculate growth score (0-100)
      const volumeScore = (company.monthlyOrders / benchmark.orders) * 25;
      const completionScore = (company.completionRate / benchmark.completion) * 25;
      const ratingScore = (company.rating / benchmark.rating) * 25;
      const accountScore = Math.min((company.accountAgeMonths / 24) * 25, 25);
      const growthScore = Math.round(Math.min(volumeScore + completionScore + ratingScore + accountScore, 100));

      // Calculate churn risk (0-100)
      const supportTicketRisk = Math.min(company.supportTickets * 3, 30);
      const accountAgeRisk = company.accountAgeMonths < 6 ? 25 : 0;
      const tierUnderuse = company.subscriptionTier === 'silver' && company.monthlyOrders > 300 ? 20 : 0;
      const churnRisk = Math.min(supportTicketRisk + accountAgeRisk + tierUnderuse, 100);

      // Tier recommendation
      let recommendedTier = company.subscriptionTier;
      let tierROI = 1.5;
      if (company.subscriptionTier === 'silver' && company.monthlyOrders > 400) {
        recommendedTier = 'gold';
        tierROI = 2.0;
      } else if (company.subscriptionTier === 'gold' && company.monthlyOrders > 600) {
        recommendedTier = 'platinum';
        tierROI = 2.5;
      }

      // Advertising optimization
      const recommendedBudget = Math.round(company.monthlyRevenue * 0.08);
      const budgetDifference = recommendedBudget - company.advertisingSpend;

      // Opportunities
      const opportunities: string[] = [];
      if (company.completionRate > 95) opportunities.push('Premium service tier (high quality)');
      if (company.monthlyOrders > benchmark.orders * 1.3) opportunities.push('Expand geographic coverage');
      if (company.supportTickets > 15) opportunities.push('Dedicated account manager');
      if (company.rating > 4.6) opportunities.push('Industry referral partnerships');
      if (company.monthlyOrders < benchmark.orders * 0.8) opportunities.push('Marketing campaign partnership');

      // Pain points from support tickets
      const painPoints: string[] = [];
      if (company.supportTickets > 10) painPoints.push('High support ticket volume');
      if (company.completionRate < 94) painPoints.push('Completion rate concerns');
      if (churnRisk > 50) painPoints.push('Account engagement declining');

      // Retention actions
      const retentionActions: string[] = [];
      if (churnRisk > 50) retentionActions.push('Personal executive check-in');
      if (company.supportTickets > 15) retentionActions.push('Dedicated support team assignment');
      retentionActions.push('Quarterly business review');
      if (recommendedTier !== company.subscriptionTier) retentionActions.push(`Upgrade to ${recommendedTier} tier`);

      // Engagement channels
      const engagementChannels = ['Email (65% open rate)', 'Dashboard (3x/week visits)', 'Phone call (weekly check-in)'];

      // Market position
      const percentile = Math.round((growthScore / 100) * 100);
      const marketPosition = `Top ${Math.max(100 - percentile, 5)}% in ${company.industry}`;

      // Recommended upgrade month
      const monthsUntilUpgrade = recommendedTier !== company.subscriptionTier ? 2 : 12;

      return {
        growthScore,
        churnRisk,
        churnRiskLevel: churnRisk < 30 ? 'low' : churnRisk < 60 ? 'medium' : 'high',
        recommendedTier,
        tierROI,
        advRecommendedBudget: recommendedBudget,
        advCurrentROI: company.advertisingROI,
        industryAvgOrders: benchmark.orders,
        industryAvgCompletion: benchmark.completion,
        industryAvgRating: benchmark.rating,
        marketPosition,
        topOpportunities: opportunities.slice(0, 3),
        satisfactionScore: Math.round(company.rating * 20),
        painPoints: painPoints.slice(0, 2),
        retentionActions,
        engagementChannels,
        nextAction: churnRisk > 60 ? '⚠️ Call today' : churnRisk > 30 ? 'Email check-in this week' : '💡 Schedule QBR next month',
        recommendedUpgradeMonth: monthsUntilUpgrade,
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  };

  const handleSelectCompany = async (company: CompanyClient) => {
    setSelectedCompany(company);
    setLoading(true);
    try {
      const insight = await generateInsights(company);
      setSelectedInsight(insight);
      setActiveTab('detail');
    } catch (error) {
      showToast('Failed to generate insights', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.industry.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'growth') {
        const insightA = selectedInsight;
        const insightB = selectedInsight;
        return (insightB?.growthScore || 0) - (insightA?.growthScore || 0);
      } else if (sortBy === 'risk') {
        return (b.supportTickets - a.supportTickets);
      } else {
        return (b.monthlyRevenue - a.monthlyRevenue);
      }
    });

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              🎯 Company Client Intelligence
            </h1>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#FF6B35',
                fontWeight: '700',
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
            Know your company clients deeply. Predict their needs. Grow their value.
          </p>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['portfolio', 'detail', 'insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={tab !== 'portfolio' && !selectedCompany}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : (tab !== 'portfolio' && !selectedCompany) ? '#ccc' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: (tab !== 'portfolio' && !selectedCompany) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'portfolio' ? '📊 Portfolio' : tab === 'detail' ? '🔍 Client Details' : '💡 Smart Insights'}
            </button>
          ))}
        </div>

        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <div style={{ minHeight: '100vh' }}>
            {/* Search & Sort */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'growth' | 'risk' | 'revenue')}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="growth">Sort: Growth Score</option>
                <option value="risk">Sort: Churn Risk</option>
                <option value="revenue">Sort: Revenue</option>
              </select>
            </div>

            {/* Companies Grid */}
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {filteredCompanies.map(company => (
                <div
                  key={company.id}
                  onClick={() => handleSelectCompany(company)}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#FF6B35';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#FFD9B3';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {company.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {company.industry} • {company.teamSize} staff
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: company.subscriptionTier === 'silver' ? '#FFF3E4' : company.subscriptionTier === 'gold' ? '#FFF9C4' : '#FCEDE9',
                      color: company.subscriptionTier === 'silver' ? '#D98C0C' : company.subscriptionTier === 'gold' ? '#F57F17' : '#6A1B9A',
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '3px',
                    }}>
                      {company.subscriptionTier.toUpperCase()}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                    <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>Orders/mo</div>
                      <div style={{ fontWeight: '600', color: '#FF6B35' }}>{company.monthlyOrders}</div>
                    </div>
                    <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>Completion</div>
                      <div style={{ fontWeight: '600', color: '#4CAF50' }}>{company.completionRate}%</div>
                    </div>
                    <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>Rating</div>
                      <div style={{ fontWeight: '600', color: '#FF6B35' }}>{company.rating}⭐</div>
                    </div>
                    <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>Revenue/mo</div>
                      <div style={{ fontWeight: '600', color: '#333' }}>${(company.monthlyRevenue / 1000).toFixed(1)}k</div>
                    </div>
                  </div>

                  <button
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    View AI Insights
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DETAIL TAB */}
        {activeTab === 'detail' && selectedCompany && selectedInsight && (
          <div style={{ display: 'grid', gap: '20px', minHeight: '100vh' }}>
            {/* Company Header */}
            <div style={{ padding: '20px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'start' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
                    {selectedCompany.name}
                  </h2>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    {selectedCompany.industry} • {selectedCompany.teamSize} staff • {selectedCompany.accountAgeMonths} months with us
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{
                      padding: '8px 12px',
                      background: 'white',
                      border: '1px solid #FFD9B3',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#333',
                    }}>
                      📊 Growth: {selectedInsight.growthScore}/100
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      background: 'white',
                      border: '1px solid #FFD9B3',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: selectedInsight.churnRiskLevel === 'high' ? '#F44336' : selectedInsight.churnRiskLevel === 'medium' ? '#FF9800' : '#4CAF50',
                    }}>
                      ⚠️ Risk: {selectedInsight.churnRisk}/100 ({selectedInsight.churnRiskLevel.toUpperCase()})
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      background: 'white',
                      border: '1px solid #FFD9B3',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#333',
                    }}>
                      ⭐ Satisfaction: {selectedInsight.satisfactionScore}/100
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#FF6B35' }}>
                    ${(selectedCompany.monthlyRevenue / 1000).toFixed(1)}k/mo
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Monthly Revenue</div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Monthly Orders', value: selectedCompany.monthlyOrders, vs: `Industry avg: ${selectedInsight.industryAvgOrders}` },
                { label: 'Completion Rate', value: `${selectedCompany.completionRate}%`, vs: `Industry avg: ${selectedInsight.industryAvgCompletion}%` },
                { label: 'Customer Rating', value: `${selectedCompany.rating}⭐`, vs: `Industry avg: ${selectedInsight.industryAvgRating}⭐` },
                { label: 'Advertising ROI', value: `${selectedCompany.advertisingROI}x`, vs: `Spend: $${selectedCompany.advertisingSpend}/mo` },
              ].map(metric => (
                <div key={metric.label} style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '1px solid #FFD9B3' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{metric.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35', marginBottom: '4px' }}>
                    {metric.value}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{metric.vs}</div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {/* Upgrade Recommendation */}
              {selectedInsight.recommendedTier !== selectedCompany.subscriptionTier && (
                <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #81C784' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    🎯 Upgrade to {selectedInsight.recommendedTier.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.5', marginBottom: '8px' }}>
                    They're using {selectedCompany.subscriptionTier} at {Math.round((selectedCompany.monthlyOrders / 500) * 100)}% capacity.
                    {selectedInsight.recommendedTier === 'gold' && ' Gold tier gives API access, priority support & advanced analytics.'}
                    {selectedInsight.recommendedTier === 'platinum' && ' Platinum tier gives dedicated account manager & custom integrations.'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '16px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: '#999', marginBottom: '2px' }}>They save:</div>
                      <div style={{ fontWeight: '600', color: '#4CAF50' }}>$400/month</div>
                    </div>
                    <div>
                      <div style={{ color: '#999', marginBottom: '2px' }}>ROI:</div>
                      <div style={{ fontWeight: '600', color: '#4CAF50' }}>{selectedInsight.tierROI}x</div>
                    </div>
                  </div>
                  <button style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}>
                    Send Upgrade Pitch
                  </button>
                </div>
              )}

              {/* Advertising Optimization */}
              <div style={{ padding: '16px', background: '#FFF3E4', borderRadius: '8px', border: '2px solid #F5C542' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  💰 Advertising Optimization
                </div>
                <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.5', marginBottom: '8px' }}>
                  Current: ${selectedCompany.advertisingSpend}/mo (ROI: {selectedCompany.advertisingROI}x)
                  <br />
                  Recommended: ${selectedInsight.advRecommendedBudget}/mo
                  <br />
                  Expected uplift: ${(selectedInsight.advRecommendedBudget * selectedCompany.advertisingROI - selectedCompany.advertisingSpend * selectedCompany.advertisingROI).toFixed(0)}/month revenue
                </div>
                <button style={{
                  width: '100%',
                  padding: '10px',
                  background: '#F0A81E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}>
                  Optimize Budget
                </button>
              </div>

              {/* Top Opportunities */}
              <div style={{ padding: '16px', background: '#FFF3E0', borderRadius: '8px', border: '2px solid #FFB74D' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                  🎓 Growth Opportunities
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {selectedInsight.topOpportunities.map((opp, idx) => (
                    <div key={idx} style={{ fontSize: '13px', color: '#555', paddingLeft: '16px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>•</span>
                      {opp}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Retention & Engagement */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* Retention Actions */}
              <div style={{ padding: '16px', background: '#FCE4EC', borderRadius: '8px', border: '1px solid #F48FB1' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                  📋 Retention Actions
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {selectedInsight.retentionActions.map((action, idx) => (
                    <div key={idx} style={{
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#555',
                      border: '1px solid #F48FB1',
                    }}>
                      ✓ {action}
                    </div>
                  ))}
                </div>
              </div>

              {/* Engagement Channels */}
              <div style={{ padding: '16px', background: '#E0F2F1', borderRadius: '8px', border: '1px solid #F5C542' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                  📱 Engagement Channels
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {selectedInsight.engagementChannels.map((channel, idx) => (
                    <div key={idx} style={{
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#555',
                      border: '1px solid #F5C542',
                    }}>
                      📞 {channel}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Next Action */}
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                🎯 Next Action
              </div>
              <div style={{ fontSize: '16px', color: '#FF6B35', fontWeight: '600' }}>
                {selectedInsight.nextAction}
              </div>
            </div>
          </div>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && selectedCompany && selectedInsight && (
          <div style={{ display: 'grid', gap: '20px', minHeight: '100vh' }}>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#FF6B35', marginBottom: '8px' }}>
                {selectedCompany.name}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {selectedInsight.marketPosition}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#4CAF50' }}>{selectedInsight.growthScore}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Growth Score</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: selectedInsight.churnRiskLevel === 'high' ? '#F44336' : '#4CAF50' }}>
                    {selectedInsight.churnRisk}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Churn Risk</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#FF6B35' }}>{selectedInsight.satisfactionScore}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Satisfaction</div>
                </div>
              </div>
            </div>

            {/* Pain Points & Quick Wins */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '16px', background: '#FFEBEE', borderRadius: '8px', border: '1px solid #EF9A9A' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#C62828', marginBottom: '12px' }}>
                  ⚠️ Pain Points
                </div>
                {selectedInsight.painPoints.length > 0 ? (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {selectedInsight.painPoints.map((point, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: '#555' }}>• {point}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#999' }}>No major pain points identified</div>
                )}
              </div>

              <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '1px solid #81C784' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1B5E20', marginBottom: '12px' }}>
                  💡 Quick Wins (1-2 weeks)
                </div>
                <div style={{ display: 'grid', gap: '8px', fontSize: '12px', color: '#555' }}>
                  <div>✓ Personal check-in call</div>
                  <div>✓ Share industry benchmarks</div>
                  <div>✓ Review advertising ROI optimization</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default CompanyClientIntelligence;
