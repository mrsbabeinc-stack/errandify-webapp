import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdCreditTracker from '../components/AdCreditTracker';

interface AdvertisingDashboardProps {
  companyId?: number;
}

const AdvertisingDashboard: React.FC<AdvertisingDashboardProps> = ({ companyId = 3 }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'performance'>('overview');

  return (
    <div style={{ background: '#F9F9F9', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
          color: 'white',
          padding: '32px 24px',
          marginBottom: '32px'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700' }}>
            🎯 Advertising Dashboard
          </h1>
          <p style={{ margin: '0', fontSize: '14px', opacity: 0.95 }}>
            Manage your campaigns, track credits, and monitor performance
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: '2px solid #E8D5C4'
          }}
        >
          {(['overview', 'campaigns', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                background: activeTab === tab ? '#FF6B35' : 'white',
                color: activeTab === tab ? 'white' : '#333',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                borderRadius: activeTab === tab ? '0' : '0',
                fontWeight: activeTab === tab ? '700' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.3s ease'
              }}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'campaigns' && '🎬 My Campaigns'}
              {tab === 'performance' && '📈 Performance'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Credit Tracker Component */}
            <AdCreditTracker companyId={companyId} />

            {/* Quick Actions */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                marginTop: '24px',
                maxWidth: '1200px'
              }}
            >
              {/* Create Campaign */}
              <div
                onClick={() => navigate('/advertising/create')}
                style={{
                  background: 'white',
                  border: '2px solid #FF6B35',
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,107,53,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎬</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>
                  Create Campaign
                </h3>
                <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                  Launch a new ad campaign using your credits
                </p>
              </div>

              {/* View Campaigns */}
              <div
                onClick={() => setActiveTab('campaigns')}
                style={{
                  background: 'white',
                  border: '2px solid #FF6B35',
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,107,53,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>
                  My Campaigns
                </h3>
                <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                  View and manage all your campaigns
                </p>
              </div>

              {/* Upgrade Plan */}
              <div
                onClick={() => navigate('/subscription')}
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 100%)',
                  border: '2px solid #FFA000',
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 8px rgba(255,152,0,0.2)',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,152,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,152,0,0.2)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>
                  Upgrade Plan
                </h3>
                <p style={{ margin: '0', fontSize: '12px', opacity: 0.95 }}>
                  Get more ad credits with Gold or Platinum
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div
            style={{
              background: 'white',
              border: '1px solid #E8D5C4',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎬</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#333' }}>
              My Campaigns
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#666' }}>
              You don't have any campaigns yet. Create one to get started!
            </p>
            <button
              onClick={() => navigate('/advertising/create')}
              style={{
                background: '#FF6B35',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Create First Campaign
            </button>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div
            style={{
              background: 'white',
              border: '1px solid #E8D5C4',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#333' }}>
              Performance Analytics
            </h2>
            <p style={{ margin: '0', fontSize: '13px', color: '#666' }}>
              Performance data will appear once you have active campaigns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvertisingDashboard;
