import React, { useState } from 'react';

interface Advertisement {
  id: number;
  type: 'profile-banner' | 'in-feed-ads';
  title: string;
  imageUrl?: string;
  url: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'ended';
  ctr: number; // Click-through rate
}

const CompanyAdvertisingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile-banner' | 'in-feed-ads'>('profile-banner');
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([
    {
      id: 1,
      type: 'profile-banner',
      title: 'Premium Partner Showcase',
      imageUrl: 'banner1.jpg',
      url: 'https://errandify.com/company/rumah-emas',
      budget: 500,
      spent: 320,
      impressions: 2450,
      clicks: 145,
      startDate: '2026-06-15',
      endDate: '2026-07-15',
      status: 'active',
      ctr: 5.9,
    },
    {
      id: 2,
      type: 'in-feed-ads',
      title: 'Summer Cleaning Special',
      url: 'https://errandify.com/cleaning-offer',
      budget: 300,
      spent: 180,
      impressions: 4520,
      clicks: 312,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'active',
      ctr: 6.9,
    },
  ]);

  const [showNewAdModal, setShowNewAdModal] = useState(false);
  const [newAdType, setNewAdType] = useState<'profile-banner' | 'in-feed-ads'>('profile-banner');

  const filteredAds = advertisements.filter(ad => ad.type === activeTab);
  const totalBudget = filteredAds.reduce((sum, ad) => sum + ad.budget, 0);
  const totalSpent = filteredAds.reduce((sum, ad) => sum + ad.spent, 0);
  const totalImpressions = filteredAds.reduce((sum, ad) => sum + ad.impressions, 0);

  return (
    <div className="advertising-management">
      {/* Header */}
      <div className="ads-header">
        <div>
          <h2>Advertising Management</h2>
          <p className="subtitle">Track and manage your advertising campaigns</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewAdModal(true)}>
          + New Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="ads-tabs">
        <button
          className={`tab ${activeTab === 'profile-banner' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile-banner')}
        >
          📅 Profile Banner Ads
        </button>
        <button
          className={`tab ${activeTab === 'in-feed-ads' ? 'active' : ''}`}
          onClick={() => setActiveTab('in-feed-ads')}
        >
          📰 In-Feed Ads
        </button>
      </div>

      {/* Stats */}
      <div className="ads-stats">
        <div className="stat-box">
          <span className="stat-label">Total Budget</span>
          <span className="stat-value">SGD ${totalBudget}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Spent</span>
          <span className="stat-value">SGD ${totalSpent}</span>
          <span className="stat-percent">{Math.round((totalSpent / totalBudget) * 100)}%</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Impressions</span>
          <span className="stat-value">{totalImpressions.toLocaleString()}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Avg CTR</span>
          <span className="stat-value">{(filteredAds.reduce((sum, ad) => sum + ad.ctr, 0) / (filteredAds.length || 1)).toFixed(1)}%</span>
        </div>
      </div>

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

            <div className="ad-content">
              {ad.imageUrl && activeTab === 'profile-banner' && (
                <div className="ad-preview">
                  <div className="preview-placeholder">📷 Banner Preview</div>
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

            <div className="ad-progress">
              <span className="progress-label">Budget Used</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min((ad.spent / ad.budget) * 100, 100)}%` }}></div>
              </div>
              <span className="progress-value">{Math.round((ad.spent / ad.budget) * 100)}%</span>
            </div>

            <div className="ad-actions">
              <button className="btn-edit">Edit</button>
              <button className="btn-pause">Pause</button>
              <button className="btn-delete">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* New Ad Modal */}
      {showNewAdModal && (
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

      <style>{`
        .advertising-management {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .ads-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          gap: 16px;
        }

        .ads-header h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
        }

        .subtitle {
          margin: 0;
          font-size: 13px;
          color: #999;
        }

        .btn-primary {
          padding: 10px 16px;
          background: #FF6B35;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
        }

        .ads-tabs {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab {
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: 600;
          color: #999;
          transition: all 0.2s;
        }

        .tab.active {
          color: #FF6B35;
          border-bottom-color: #FF6B35;
        }

        .ads-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-box {
          background: linear-gradient(135deg, #f5f5f5, #efefef);
          padding: 16px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #333;
        }

        .stat-percent {
          font-size: 12px;
          color: #FF6B35;
        }

        .ads-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ad-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .ad-card.active {
          border-left: 4px solid #FF6B35;
        }

        .ad-card:hover {
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        .ad-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
          gap: 12px;
        }

        .ad-title {
          flex: 1;
        }

        .ad-title h3 {
          margin: 0 0 8px 0;
          font-size: 15px;
          font-weight: 600;
        }

        .status-badge {
          display: inline-block;
          font-size: 11px;
          padding: 4px 8px;
          background: #e0e0e0;
          border-radius: 4px;
          font-weight: 600;
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
          padding: 16px;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 16px;
        }

        .ad-preview {
          background: #f5f5f5;
          border-radius: 6px;
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-placeholder {
          color: #999;
          font-size: 14px;
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
          margin-top: 12px;
        }

        .metric {
          text-align: center;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 6px;
        }

        .metric-label {
          display: block;
          font-size: 11px;
          color: #999;
          margin-bottom: 4px;
        }

        .metric-value {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #333;
        }

        .ad-progress {
          padding: 16px;
          border-top: 1px solid #f0f0f0;
        }

        .progress-label {
          display: block;
          font-size: 12px;
          color: #999;
          margin-bottom: 8px;
        }

        .progress-bar {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF6B35, #FF8C5A);
          transition: width 0.3s;
        }

        .progress-value {
          display: block;
          font-size: 11px;
          color: #FF6B35;
          font-weight: 600;
        }

        .ad-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          background: #fafafa;
          border-top: 1px solid #f0f0f0;
        }

        .btn-edit,
        .btn-pause,
        .btn-delete {
          flex: 1;
          padding: 8px;
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: #333;
          transition: all 0.2s;
        }

        .btn-edit:hover {
          background: #f0f0f0;
        }

        .btn-delete:hover {
          color: #E74C3C;
          border-color: #E74C3C;
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
          color: #E65100;
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
      `}</style>
    </div>
  );
};

export default CompanyAdvertisingManagement;
