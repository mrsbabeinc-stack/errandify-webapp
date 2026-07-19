import React, { useState } from 'react';
import CampaignWizard from './CampaignWizard';

interface Advertisement {
  id: number;
  type: 'banner-ads' | 'in-feed-ads';
  title: string;
  imageUrl?: string;
  url: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'submitted' | 'approved' | 'active' | 'paused' | 'stopped' | 'ended';
  ctr: number; // Click-through rate
  isPaid?: boolean; // Whether payment has been processed
}

const CompanyAdvertisingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'banner-ads' | 'in-feed-ads'>('all');
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([
    {
      id: 1,
      type: 'banner-ads',
      title: 'Premium Partner Showcase',
      imageUrl: 'https://via.placeholder.com/1200x400/FF6B35/ffffff?text=Premium+Partner+Showcase',
      url: 'https://errandify.com/company/rumah-emas',
      budget: 500,
      spent: 320,
      impressions: 2450,
      clicks: 145,
      startDate: '2026-06-15',
      endDate: '2026-07-15',
      status: 'active',
      ctr: 5.9,
      isPaid: true,
    },
    {
      id: 2,
      type: 'in-feed-ads',
      title: 'Summer Cleaning Special',
      imageUrl: 'https://via.placeholder.com/500x300/FF8C5A/ffffff?text=Summer+Cleaning',
      url: 'https://errandify.com/cleaning-offer',
      budget: 300,
      spent: 180,
      impressions: 4520,
      clicks: 312,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'active',
      ctr: 6.9,
      isPaid: true,
    },
  ]);

  const [showNewAdModal, setShowNewAdModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRefundWarning, setShowRefundWarning] = useState(false);
  const [showStopWarning, setShowStopWarning] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [stopWarningAd, setStopWarningAd] = useState<Advertisement | null>(null);
  const [newAdType, setNewAdType] = useState<'profile-banner' | 'in-feed-ads'>('profile-banner');

  const filteredAds = activeTab === 'all' ? advertisements : advertisements.filter(ad => ad.type === activeTab);
  const totalBudget = filteredAds.reduce((sum, ad) => sum + ad.budget, 0);
  const totalSpent = filteredAds.reduce((sum, ad) => sum + ad.spent, 0);
  const totalImpressions = filteredAds.reduce((sum, ad) => sum + ad.impressions, 0);

  // Get ad type specific metrics
  const getAdTypeMetrics = (type: 'all' | 'banner-ads' | 'in-feed-ads') => {
    const typeAds = type === 'all' ? advertisements : advertisements.filter(ad => ad.type === type);
    return {
      count: typeAds.length,
      budget: typeAds.reduce((sum, ad) => sum + ad.budget, 0),
      impressions: typeAds.reduce((sum, ad) => sum + ad.impressions, 0),
      ctr: typeAds.length > 0 ? (typeAds.reduce((sum, ad) => sum + ad.ctr, 0) / typeAds.length).toFixed(1) : 0,
    };
  };

  const handlePauseAd = (id: number) => {
    setAdvertisements(advertisements.map(ad =>
      ad.id === id ? { ...ad, status: ad.status === 'active' ? 'paused' : 'active' } : ad
    ));
  };

  const handleStopAd = (ad: Advertisement) => {
    setStopWarningAd(ad);
    setShowStopWarning(true);
  };

  const confirmStopAd = () => {
    if (stopWarningAd) {
      setAdvertisements(advertisements.map(ad =>
        ad.id === stopWarningAd.id ? { ...ad, status: 'stopped' } : ad
      ));
      setShowStopWarning(false);
      setStopWarningAd(null);
    }
  };

  const handleEditAd = (ad: Advertisement) => {
    if (ad.status === 'draft' || ad.status === 'rejected') {
      setEditingAd(ad);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (editingAd) {
      try {
        const response = await fetch(`/api/advertising/campaigns/${editingAd.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editingAd.title,
            image_url: editingAd.imageUrl,
            budget: editingAd.budget,
            starts_at: editingAd.startDate,
            ends_at: editingAd.endDate,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Error: ${error.error || 'Failed to update campaign'}`);
          return;
        }

        const data = await response.json();

        // Update local state
        setAdvertisements(advertisements.map(ad =>
          ad.id === editingAd.id ? editingAd : ad
        ));
        setShowEditModal(false);
        setEditingAd(null);

        // Show success notification
        alert('Campaign updated successfully!');
      } catch (error) {
        console.error('Failed to update campaign:', error);
        alert('Failed to update campaign. Please try again.');
      }
    }
  };

  const handleCampaignSubmit = async (campaignData: any) => {
    try {
      // Get company ID from localStorage or context
      const companyId = localStorage.getItem('selectedCompanyId') || 1;

      // Create campaigns via API
      for (const campaign of campaignData) {
        const response = await fetch('/api/advertising/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: parseInt(companyId),
            title: campaign.title,
            description: campaign.description,
            image_url: campaign.imageUrl,
            budget: campaign.budget,
            starts_at: campaign.startDate,
            ends_at: campaign.endDate,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Error: ${error.error || 'Failed to create campaign'}`);
          return;
        }

        const data = await response.json();

        // Add to local state
        const newAd: Advertisement = {
          id: data.campaign.id,
          type: campaign.type === 'hero-banner' ? 'profile-banner' : 'in-feed-ads',
          title: data.campaign.title,
          imageUrl: data.campaign.image_url,
          url: campaign.url,
          budget: data.campaign.budget,
          spent: 0,
          impressions: 0,
          clicks: 0,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          status: 'scheduled' as const,
          ctr: 0,
        };

        setAdvertisements(prev => [...prev, newAd]);
      }

      setShowNewAdModal(false);
      alert('Campaign(s) created successfully!');
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign. Please try again.');
    }
  };

  return (
    <div className="advertising-management">
      {/* Hero Section */}
      <div style={{background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)', borderRadius: '16px', padding: '40px', marginBottom: '20px', color: 'white', boxShadow: '0 8px 24px rgba(255,107,53,0.2)'}}>
        <div style={{maxWidth: '600px'}}>
          <div style={{fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9, marginBottom: '12px'}}>🚀 Grow Your Business</div>
          <h1 style={{margin: '0 0 12px 0', fontSize: '36px', fontWeight: '800', lineHeight: '1.2'}}>
            Boost Your Visibility
          </h1>
          <p style={{margin: '0 0 20px 0', fontSize: '16px', opacity: 0.95, lineHeight: '1.6'}}>
            Reach active users and grow your business. Our AI optimizes every aspect of your campaign for maximum impact.
          </p>
          <button onClick={() => setShowNewAdModal(true)} style={{padding: '14px 28px', background: 'white', color: '#FF6B35', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.3s ease'}}>
            ✨ Start Your First Campaign
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="ads-header" style={{marginBottom: '24px'}}>
        <div>
          <h2 style={{margin: '0 0 4px 0', fontSize: '28px', fontWeight: '800'}}>Active Advertising Campaigns</h2>
          <p className="subtitle" style={{margin: 0, fontSize: '14px', color: '#666'}}>Manage and optimize your active advertising</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewAdModal(true)} style={{padding: '12px 24px', background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(255,107,53,0.2)'}}>
          + New Campaign
        </button>
      </div>

      {/* Advertising Opportunities */}
      <div className="advertising-opportunities" style={{marginBottom: '20px'}}>
        <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700'}}>🎯 Start Advertising</h3>
        <div className="opportunities-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px'}}>
          <div className="opportunity-card" style={{padding: '16px', background: 'white', border: '2px solid #FFE5D9', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative'}}>
            <div className="opp-icon" style={{fontSize: '24px', marginBottom: '8px'}}>🎯</div>
            <div className="opp-title" style={{fontSize: '14px', fontWeight: '700', marginBottom: '8px'}}>Featured Ads</div>
            <div style={{fontSize: '12px', color: '#666', marginBottom: '4px', lineHeight: '1.5'}}>Get featured prominently across the app. AI places your ad where active users are most likely to see and engage.</div>
            <div style={{fontSize: '11px', color: '#999', marginBottom: '12px', fontStyle: 'italic'}}>📍 Appears on browse pages & search results</div>
            <div className="opp-price" style={{fontSize: '13px', fontWeight: '700', color: '#FF6B35'}}>SGD $280/week</div>
          </div>
          <div className="opportunity-card" style={{padding: '16px', background: 'white', border: '2px solid #FFE5D9', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative'}}>
            <div className="opp-icon" style={{fontSize: '24px', marginBottom: '8px'}}>📰</div>
            <div className="opp-title" style={{fontSize: '14px', fontWeight: '700', marginBottom: '8px'}}>In-Feed Ads</div>
            <div style={{fontSize: '12px', color: '#666', marginBottom: '12px', lineHeight: '1.5'}}>Subtle banner between tasks. AI picks the best time & position to show your ad. Learns from engagement patterns to reach active users.</div>
            <div className="opp-price" style={{fontSize: '13px', fontWeight: '700', color: '#FF6B35'}}>SGD $180/week</div>
          </div>
        </div>

        {/* Coming Soon - Full Cards */}
        <div style={{background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '10px', padding: '16px'}}>
          <div style={{fontSize: '12px', fontWeight: '700', color: '#666', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
            <span>🔮</span> Coming Soon
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px'}}>
            <div style={{padding: '12px', background: 'white', borderRadius: '8px', opacity: 0.7}}>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '4px'}}>📍 Browse Hero</div>
              <div style={{fontSize: '12px', color: '#999', lineHeight: '1.4'}}>AI prioritizes your ad among competitors. Rotates best-performing creatives.</div>
            </div>
            <div style={{padding: '12px', background: 'white', borderRadius: '8px', opacity: 0.7}}>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '4px'}}>📧 Email Newsletter</div>
              <div style={{fontSize: '12px', color: '#999', lineHeight: '1.4'}}>AI crafts personalized subject lines & send times. Generates compelling copy automatically.</div>
            </div>
            <div style={{padding: '12px', background: 'white', borderRadius: '8px', opacity: 0.7}}>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '4px'}}>🎯 Smart Matching</div>
              <div style={{fontSize: '12px', color: '#999', lineHeight: '1.4'}}>AI shows your ad to intent-matched users. Predicts high-intent searchers automatically.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ads-tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📊 All Ads
        </button>
        <button
          className={`tab ${activeTab === 'banner-ads' ? 'active' : ''}`}
          onClick={() => setActiveTab('banner-ads')}
        >
          📅 Banner Ads
        </button>
        <button
          className={`tab ${activeTab === 'in-feed-ads' ? 'active' : ''}`}
          onClick={() => setActiveTab('in-feed-ads')}
        >
          📰 In-Feed Ads
        </button>
      </div>


      {/* Empty State - No campaigns yet */}
      {filteredAds.length === 0 && (
        <div style={{background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE5D9 100%)', borderRadius: '16px', padding: '48px', textAlign: 'center', marginBottom: '20px'}}>
          <div style={{fontSize: '64px', marginBottom: '16px'}}>📢</div>
          <h2 style={{margin: '0 0 12px 0', fontSize: '28px', fontWeight: '800', color: '#333'}}>No campaigns yet</h2>
          <p style={{margin: '0 0 24px 0', fontSize: '16px', color: '#666', lineHeight: '1.6', maxWidth: '450px', marginLeft: 'auto', marginRight: 'auto'}}>
            Start advertising today and reach thousands of active users looking for services like yours.
          </p>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto'}}>
            <div style={{background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center'}}>
              <div style={{fontSize: '28px', marginBottom: '8px'}}>⚡</div>
              <div style={{fontSize: '12px', fontWeight: '700', color: '#333'}}>Quick Setup</div>
              <div style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>3 mins to launch</div>
            </div>
            <div style={{background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center'}}>
              <div style={{fontSize: '28px', marginBottom: '8px'}}>🤖</div>
              <div style={{fontSize: '12px', fontWeight: '700', color: '#333'}}>AI Optimized</div>
              <div style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>Auto-improve</div>
            </div>
            <div style={{background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center'}}>
              <div style={{fontSize: '28px', marginBottom: '8px'}}>📊</div>
              <div style={{fontSize: '12px', fontWeight: '700', color: '#333'}}>Real Results</div>
              <div style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>50K+ reach</div>
            </div>
          </div>
          <button onClick={() => setShowNewAdModal(true)} style={{padding: '16px 32px', background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(255,107,53,0.3)', transition: 'all 0.3s ease'}}>
            🚀 Create Your First Campaign
          </button>
        </div>
      )}

      {/* AI Effectiveness Insights - Dynamic based on activeTab */}
      {filteredAds.length > 0 && (
        <div style={{background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE5D9 100%)', border: '1px solid #FFD5C0', borderRadius: '12px', padding: '20px', marginBottom: '24px'}}>
          <div style={{display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '16px'}}>
            <div style={{fontSize: '24px'}}>🤖</div>
            <div>
              <h3 style={{margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700'}}>AI Performance Insights</h3>
              <p style={{margin: 0, fontSize: '13px', color: '#666'}}>
                Based on your {filteredAds.length}
                {activeTab === 'all' ? ' active campaign(s)' : activeTab === 'banner-ads' ? ' banner campaign(s)' : ' in-feed campaign(s)'}
              </p>
            </div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            <div style={{background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #FFE5D9'}}>
              <div style={{fontSize: '12px', color: '#666', marginBottom: '4px'}}>AI Recommendation</div>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#FF6B35'}}>
                {activeTab === 'banner-ads'
                  ? 'Increase rotation frequency by 25%'
                  : activeTab === 'in-feed-ads'
                  ? 'Optimize placement timing'
                  : 'Diversify across all ad types'}
              </div>
              <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>
                {activeTab === 'banner-ads'
                  ? 'Banner CTR is performing well'
                  : activeTab === 'in-feed-ads'
                  ? 'In-feed engagement trending up'
                  : 'Mixed portfolio performing strong'}
              </div>
            </div>
            <div style={{background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #FFE5D9'}}>
              <div style={{fontSize: '12px', color: '#666', marginBottom: '4px'}}>Next Best Action</div>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#FF6B35'}}>
                {activeTab === 'banner-ads'
                  ? 'Test seasonal variations'
                  : activeTab === 'in-feed-ads'
                  ? 'A/B test copy variations'
                  : 'Launch bundle campaign'}
              </div>
              <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>High ROI potential</div>
            </div>
            <div style={{background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #FFE5D9'}}>
              <div style={{fontSize: '12px', color: '#666', marginBottom: '4px'}}>Estimated Monthly ROI</div>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#27AE60'}}>
                +SGD ${filteredAds.length > 0 ? (filteredAds.length * 2100).toLocaleString() : '0'}
              </div>
              <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>Based on current performance</div>
            </div>
            <div style={{background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #FFE5D9'}}>
              <div style={{fontSize: '12px', color: '#666', marginBottom: '4px'}}>Avg CTR</div>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#5BA3D0'}}>
                {(filteredAds.reduce((sum, ad) => sum + ad.ctr, 0) / (filteredAds.length || 1)).toFixed(1)}%
              </div>
              <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>
                {activeTab === 'banner-ads' ? '20% above average' : 'Optimized engagement'}
              </div>
            </div>
          </div>
          <button style={{width: '100%', marginTop: '12px', padding: '10px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer'}}>
            💡 View Full AI Analysis & Recommendations
          </button>
        </div>
      )}

      {/* Performance Summary - Only show if they have campaigns */}
      {filteredAds.length > 0 && (
        <div style={{marginBottom: '20px'}}>
          <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#333'}}>📊 Performance Overview</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))', gap: '12px'}}>
            <div style={{padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
              <div style={{fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px'}}>Total Invested</div>
              <div style={{fontSize: '20px', fontWeight: '800', color: '#FF6B35', marginBottom: '6px', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                SGD {totalBudget}
              </div>
              <div style={{fontSize: '11px', color: '#999'}}>all campaigns</div>
            </div>
            <div style={{padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
              <div style={{fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px'}}>Total Spent</div>
              <div style={{fontSize: '20px', fontWeight: '800', color: '#27AE60', marginBottom: '6px', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                SGD {totalSpent}
              </div>
              <div style={{fontSize: '11px', color: '#999'}}>{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% used</div>
            </div>
            <div style={{padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
              <div style={{fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px'}}>Total Reach</div>
              <div style={{fontSize: '20px', fontWeight: '800', color: '#667EEA', marginBottom: '6px', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {totalImpressions.toLocaleString()}
              </div>
              <div style={{fontSize: '11px', color: '#999'}}>impressions</div>
            </div>
            <div style={{padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
              <div style={{fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px'}}>Avg CTR</div>
              <div style={{fontSize: '20px', fontWeight: '800', color: '#FF9800', marginBottom: '6px', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {(filteredAds.reduce((sum, ad) => sum + ad.ctr, 0) / (filteredAds.length || 1)).toFixed(1)}%
              </div>
              <div style={{fontSize: '11px', color: '#999'}}>engagement</div>
            </div>
          </div>
        </div>
      )}

      {/* Ad List */}
      <div className="ads-list">
        {filteredAds.map(ad => (
          <div key={ad.id} className={`ad-card ${ad.status}`}>
            <div className="ad-header">
              <div className="ad-title">
                <h3>{ad.title}</h3>
                <span className={`status-badge ${ad.status}`}>
                  {ad.status === 'active' && '● Active'}
                  {ad.status === 'scheduled' && '○ Scheduled'}
                  {ad.status === 'ended' && '✓ Ended'}
                </span>
              </div>
              <button className="btn-menu">⋮</button>
            </div>

            {activeTab === 'profile-banner' ? (
              <div className="ad-hero-preview" style={{width: '100%', height: '300px', background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '16px', overflow: 'hidden'}}>
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt={ad.title} onError={(e) => {e.target.style.display = 'none'}} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <span style={{position: 'absolute', textAlign: 'center'}}>Your Banner Ad (1200×300px)</span>
              </div>
            ) : (
              <div className="ad-content">
                {ad.imageUrl && (
                  <div className="ad-preview-small" style={{width: '100%', height: '250px', background: 'linear-gradient(135deg, #FF8C5A 0%, #FFAA7A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', borderRadius: '8px', marginBottom: '12px', overflow: 'hidden'}}>
                    <img src={ad.imageUrl} alt={ad.title} onError={(e) => {e.target.style.display = 'none'}} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{position: 'absolute', textAlign: 'center'}}>Your Ad (500×250px)</span>
                  </div>
                )}
                <div className="ad-details">
                  <div className="detail-row">
                    <span className="label">Campaign URL</span>
                    <span className="value url">{ad.url}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Duration</span>
                    <span className="value">{ad.startDate} to {ad.endDate}</span>
                  </div>
                  <div className="ad-metrics">
                    <div className="metric">
                      <span className="metric-label">Budget</span>
                      <span className="metric-value">SGD ${ad.budget}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Spent</span>
                      <span className="metric-value">SGD ${ad.spent}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Impressions</span>
                      <span className="metric-value">{ad.impressions.toLocaleString()}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Clicks</span>
                      <span className="metric-value">{ad.clicks}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">CTR</span>
                      <span className="metric-value">{ad.ctr}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="ad-progress">
              <span className="progress-label">Budget Used</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min((ad.spent / ad.budget) * 100, 100)}%` }}></div>
              </div>
              <span className="progress-value">{Math.round((ad.spent / ad.budget) * 100)}%</span>
            </div>

            <div className="ad-actions">
              {/* Pause/Resume Button - Only for active/paused */}
              {(ad.status === 'active' || ad.status === 'paused') && (
                <button
                  className="btn-action"
                  onClick={() => handlePauseAd(ad.id)}
                  title={ad.status === 'active' ? 'Pause campaign (no refund, can resume later)' : 'Resume campaign'}
                >
                  {ad.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                </button>
              )}

              {/* Stop Button - Only for paid campaigns */}
              {ad.isPaid && (ad.status === 'active' || ad.status === 'paused') && (
                <button
                  className="btn-action btn-stop"
                  onClick={() => handleStopAd(ad)}
                  title="Stop campaign permanently (cannot be reversed)"
                >
                  ⏹ Stop
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Campaign Wizard - Intuitive multi-step flow */}
      <CampaignWizard
        isOpen={showNewAdModal}
        onClose={() => setShowNewAdModal(false)}
        onCampaignSubmit={handleCampaignSubmit}
      />

      {/* STOP CAMPAIGN WARNING MODAL */}
      {showStopWarning && stopWarningAd && (
        <div className="modal-overlay" onClick={() => setShowStopWarning(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Stop Campaign</h3>
              <button className="close-btn" onClick={() => setShowStopWarning(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', color: '#333', marginBottom: '16px', lineHeight: '1.6' }}>
                You are about to <strong>permanently stop</strong> the campaign:
              </p>
              <div style={{
                background: '#FFF5F0',
                padding: '12px 16px',
                borderRadius: '8px',
                borderLeft: '4px solid #FF6B35',
                marginBottom: '20px'
              }}>
                <strong>{stopWarningAd.title}</strong>
              </div>

              <div style={{ background: '#FFF9F5', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #FFE5D9' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#FF6B35' }}>⚠️ Important:</p>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#555', lineHeight: '1.8' }}>
                  <li><strong>This action cannot be reversed</strong></li>
                  <li>Campaign will stop immediately</li>
                  <li>No refund for remaining budget</li>
                  <li>Cannot restart this campaign</li>
                </ul>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-confirm"
                  onClick={confirmStopAd}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: '#E74C3C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Yes, Stop Campaign
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => setShowStopWarning(false)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginLeft: '12px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Old Modal - Hidden for now */}
      {false && showNewAdModal && (
        <div className="modal-overlay" onClick={() => setShowNewAdModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Campaign</h3>
              <button className="close-btn" onClick={() => setShowNewAdModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Campaign Type</label>
                <div className="type-selector">
                  <button
                    className={`type-card ${newAdType === 'profile-banner' ? 'active' : ''}`}
                    onClick={() => setNewAdType('profile-banner')}
                  >
                    <span className="icon">📅</span>
                    <span className="name">Profile Banner</span>
                    <span className="price">SGD $50/day</span>
                  </button>
                  <button
                    className={`type-card ${newAdType === 'in-feed-ads' ? 'active' : ''}`}
                    onClick={() => setNewAdType('in-feed-ads')}
                  >
                    <span className="icon">📰</span>
                    <span className="name">In-Feed Ads</span>
                    <span className="price">SGD $30/day</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Campaign Title</label>
                <input type="text" placeholder="E.g., Summer Cleaning Special" />
              </div>

              <div className="form-group">
                <label>Campaign URL</label>
                <input type="url" placeholder="https://..." />
              </div>

              <div className="form-group">
                <label>Image Upload</label>
                <div className="upload-box">
                  <span className="upload-icon">📸</span>
                  <p>Click to upload or drag and drop</p>
                  <span className="file-hint">PNG, JPG (Max 5MB)</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" />
                </div>
              </div>

              <div className="form-group">
                <label>Daily Budget</label>
                <input type="number" placeholder="SGD $" />
              </div>

              <div className="booking-notice">
                <span className="icon">ℹ️</span>
                <p>Ads can only be booked from T+2 days onwards. Submit content at least 24h before go-live.</p>
              </div>

              <div className="modal-actions">
                <button className="btn-primary">Create Campaign</button>
                <button className="btn-secondary" onClick={() => setShowNewAdModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ad Modal */}
      {showEditModal && editingAd && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Campaign: {editingAd.title}</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Campaign Title</label>
                <input
                  type="text"
                  value={editingAd.title}
                  onChange={(e) => setEditingAd({...editingAd, title: e.target.value})}
                  placeholder="E.g., Summer Cleaning Special"
                />
              </div>

              <div className="form-group">
                <label>Campaign URL</label>
                <input
                  type="url"
                  value={editingAd.url}
                  onChange={(e) => setEditingAd({...editingAd, url: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={editingAd.startDate}
                    onChange={(e) => setEditingAd({...editingAd, startDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={editingAd.endDate}
                    onChange={(e) => setEditingAd({...editingAd, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Daily Budget (SGD)</label>
                <input
                  type="number"
                  value={editingAd.budget}
                  onChange={(e) => setEditingAd({...editingAd, budget: parseInt(e.target.value)})}
                  placeholder="SGD $"
                />
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={handleSaveEdit}>Save Changes</button>
                <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .advertising-management {
          background: linear-gradient(135deg, #fff 0%, #fff9f5 100%);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.08);
        }

        .ads-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          gap: 16px;
        }

        .ads-header h2 {
          margin: 0 0 4px 0;
          font-size: 28px;
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }

        .subtitle {
          margin: 0;
          font-size: 14px;
          color: #FF8C5A;
          font-weight: 500;
        }

        .btn-primary {
          padding: 12px 24px;
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
          transition: all 0.3s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
        }

        .ads-tabs {
          display: flex;
          gap: 24px;
          margin-bottom: 32px;
          border-bottom: 2px solid rgba(255, 107, 53, 0.1);
          padding-bottom: 12px;
        }

        .tab {
          padding: 8px 0;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: 700;
          color: #999;
          font-size: 15px;
          transition: all 0.3s;
          position: relative;
        }

        .tab:hover {
          color: #FF8C5A;
        }

        .tab.active {
          color: #FF6B35;
          border-bottom-color: #FF6B35;
        }

        .ads-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-box {
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          border: none;
          padding: 24px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.3s;
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.25);
          color: white;
          position: relative;
          overflow: hidden;
        }

        .stat-box::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 70%);
          pointer-events: none;
        }

        .stat-box:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 28px rgba(255, 107, 53, 0.35);
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: relative;
          z-index: 1;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 900;
          color: white;
          position: relative;
          z-index: 1;
        }

        .stat-percent {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 700;
          position: relative;
          z-index: 1;
        }

        .ads-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .ad-card {
          border: 2px solid #FFE5D9;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
          background: linear-gradient(135deg, #fff9f5, #fffaf7);
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.1);
        }

        .ad-card.active {
          border: 2px solid #FF6B35;
          border-left: 4px solid #FF6B35;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.2);
        }

        .ad-card:hover {
          border-color: #FF8C5A;
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.15);
          transform: translateY(-2px);
        }

        .ad-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 2px solid #FFE5D9;
          gap: 12px;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.02), rgba(255, 140, 90, 0.02));
        }

        .ad-title {
          flex: 1;
        }

        .ad-title h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 700;
          color: #333;
        }

        .status-badge {
          display: inline-block;
          font-size: 12px;
          padding: 6px 12px;
          background: #FFE5D9;
          border-radius: 6px;
          font-weight: 700;
          color: #FF6B35;
        }

        .status-badge.active {
          background: #E8F5E9;
          color: #27AE60;
        }

        .btn-menu {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
        }

        .ad-content {
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
        }

        .ad-preview-hero {
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          border-radius: 10px;
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
        }

        .ad-preview-small {
          background: linear-gradient(135deg, #FF8C5A, #FFB399);
          border-radius: 10px;
          min-height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
        }

        .ad-preview-hero img,
        .ad-preview-small img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .detail-row .label {
          color: #999;
          font-weight: 600;
        }

        .detail-row .value {
          color: #333;
          font-weight: 500;
        }

        .detail-row .url {
          color: #FF6B35;
          text-decoration: underline;
          cursor: pointer;
        }

        .ad-metrics {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-top: 16px;
        }

        .metric {
          text-align: center;
          padding: 12px;
          background: linear-gradient(135deg, #fff5f0, #fff9f5);
          border: 1.5px solid #FFE5D9;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .metric:hover {
          border-color: #FF8C5A;
          background: linear-gradient(135deg, #fff0e6, #fffbf7);
        }

        .metric-label {
          display: block;
          font-size: 11px;
          color: #FF8C5A;
          margin-bottom: 6px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .metric-value {
          display: block;
          font-size: 16px;
          font-weight: 800;
          color: #FF6B35;
        }

        .ad-progress {
          padding: 20px;
          border-top: 2px solid #FFE5D9;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.02), rgba(255, 140, 90, 0.02));
        }

        .progress-label {
          display: block;
          font-size: 13px;
          color: #FF6B35;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .progress-bar {
          height: 10px;
          background: #FFE5D9;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 8px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF6B35, #FF8C5A);
          transition: width 0.3s;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }

        .progress-value {
          display: block;
          font-size: 12px;
          color: #FF6B35;
          font-weight: 700;
        }

        .ad-actions {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.02), rgba(255, 140, 90, 0.02));
          border-top: 2px solid #FFE5D9;
        }

        .btn-action {
          flex: 1;
          padding: 12px 16px;
          border: none;
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          color: white;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          transition: all 0.3s;
          white-space: nowrap;
          text-align: center;
        }

        .btn-action:hover:not(:disabled) {
          background: linear-gradient(135deg, #FF5525, #FF7C4A);
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
          transform: translateY(-2px);
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #ccc;
        }

        .btn-action.btn-stop {
          background: linear-gradient(135deg, #E74C3C, #E8653A);
        }

        .btn-action.btn-stop:hover:not(:disabled) {
          background: linear-gradient(135deg, #D43C2A, #D85526);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }

        .btn-action.btn-delete {
          background: linear-gradient(135deg, #E74C3C, #E8653A);
        }

        .btn-action.btn-delete:hover:not(:disabled) {
          background: linear-gradient(135deg, #D43C2A, #D85526);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 13px;
        }

        .type-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .type-card {
          padding: 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .type-card.active {
          border-color: #FF6B35;
          background: #FFF3E0;
        }

        .type-card .icon {
          font-size: 32px;
        }

        .type-card .name {
          font-weight: 600;
          font-size: 13px;
        }

        .type-card .price {
          font-size: 11px;
          color: #FF6B35;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .upload-box {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-box:hover {
          border-color: #FF6B35;
          background: #FFF3E0;
        }

        .upload-icon {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }

        .upload-box p {
          margin: 0 0 4px 0;
          color: #333;
          font-size: 13px;
        }

        .file-hint {
          display: block;
          font-size: 11px;
          color: #999;
        }

        .booking-notice {
          background: #FFF3E0;
          border-left: 4px solid #FF6B35;
          padding: 12px;
          border-radius: 6px;
          margin: 16px 0;
          display: flex;
          gap: 12px;
        }

        .booking-notice .icon {
          font-size: 16px;
        }

        .booking-notice p {
          margin: 0;
          font-size: 12px;
          color: #E55A24;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .btn-secondary {
          padding: 10px 16px;
          background: #e0e0e0;
          color: #333;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .placement-guide {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(255, 140, 90, 0.05));
          border: 2px solid #FFE5D9;
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .placement-guide h3 {
          margin: 0 0 8px 0;
          color: #FF6B35;
          font-size: 18px;
        }

        .placement-guide p {
          margin: 0 0 16px 0;
          color: #666;
          font-size: 14px;
        }

        .preview-hero-placement {
          background: #FFF9F5;
          border-radius: 10px;
          padding: 20px;
          overflow-x: auto;
        }

        .hero-banner-full {
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          width: 100%;
          height: 300px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.2);
          flex-shrink: 0;
          min-width: 1200px;
        }

        .hero-content {
          text-align: center;
        }

        .hero-content span {
          display: block;
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .preview-infeed-placement {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .errand-card {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .in-feed-ad-preview {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          max-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
        }

        .in-feed-ad-preview img {
          width: 100%;
          height: auto;
          display: block;
        }

        .ad-hero-preview {
          width: 100%;
          height: 200px;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          margin-bottom: 16px;
        }

        .ad-hero-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .advertising-opportunities {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.08), rgba(255, 140, 90, 0.08));
          border: 2px solid #FFE5D9;
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .advertising-opportunities h3 {
          margin: 0 0 16px 0;
          color: #FF6B35;
          font-size: 18px;
        }

        .opportunities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .opportunity-card {
          background: white;
          border: 2px solid #FFE5D9;
          border-radius: 10px;
          padding: 16px;
          transition: all 0.3s;
        }

        .opportunity-card:hover {
          border-color: #FF8C5A;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
        }

        .opp-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .opp-title {
          font-weight: 700;
          color: #FF6B35;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .opp-desc {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
          margin-bottom: 8px;
          flex-grow: 1;
        }

        .opp-price {
          font-size: 12px;
          font-weight: 700;
          color: #FF6B35;
          padding-top: 8px;
          border-top: 1px solid #FFE5D9;
        }
      `}</style>
    </div>
  );
};

export default CompanyAdvertisingManagement;
