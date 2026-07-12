import React, { useState, useMemo } from 'react';

interface TierRequirement {
  minTasks: number;
  minRating: number;
  minAccountAgeMonths: number;
  maxDisputeRate: number;
  subscriptionRequired?: string;
}

interface Tier {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirements: TierRequirement;
  benefits: string[];
  currentCompanies: number;
  color: string;
}

const tierData: Tier[] = [
  {
    id: 'tier-silver',
    name: 'Silver',
    emoji: '💳',
    description: 'Reliable foundation, essential start',
    requirements: {
      minTasks: 50,
      minRating: 4.0,
      minAccountAgeMonths: 3,
      maxDisputeRate: 5,
    },
    benefits: [
      'Silver Partner badge',
      'Listed on /partners page',
      'Basic company analytics',
    ],
    currentCompanies: 45,
    color: '#c0c0c0',
  },
  {
    id: 'tier-gold',
    name: 'Gold',
    emoji: '⭐',
    description: 'Established, growing strength',
    requirements: {
      minTasks: 200,
      minRating: 4.5,
      minAccountAgeMonths: 6,
      maxDisputeRate: 3,
      subscriptionRequired: 'Starter+',
    },
    benefits: [
      'Gold Partner badge',
      'Featured on /partners page',
      'Advanced analytics + AI insights',
      '2 free ad slots/month',
    ],
    currentCompanies: 28,
    color: '#ffd700',
  },
  {
    id: 'tier-platinum',
    name: 'Platinum',
    emoji: '👑',
    description: 'Premium excellence, top tier',
    requirements: {
      minTasks: 500,
      minRating: 4.7,
      minAccountAgeMonths: 12,
      maxDisputeRate: 2,
      subscriptionRequired: 'Growth+',
    },
    benefits: [
      'Platinum Partner badge',
      'Top featured position',
      'Premium analytics + AI insights',
      '5 free ad slots/month',
      'Dedicated support email',
      'Custom partner page',
    ],
    currentCompanies: 12,
    color: '#e5e4e2',
  },
  {
    id: 'tier-star',
    name: 'Star',
    emoji: '⭐✨',
    description: 'Exclusive elite, exceptional status',
    requirements: {
      minTasks: 1000,
      minRating: 4.8,
      minAccountAgeMonths: 24,
      maxDisputeRate: 1,
      subscriptionRequired: 'Enterprise',
    },
    benefits: [
      'Star Partner badge (platinum)',
      'Exclusive top placement',
      'Concierge support (phone + chat)',
      '10+ free ad slots/month',
      'Custom partner page branding',
      'Dedicated account manager',
      'Quarterly strategy calls',
      'Co-marketing opportunities',
    ],
    currentCompanies: 3,
    color: '#9370db',
  },
];

interface CompanyTierStatus {
  companyId: string;
  companyName: string;
  currentTier: string;
  progress: {
    tasksCompleted: number;
    minTasksRequired: number;
    rating: number;
    minRatingRequired: number;
    accountAgeMonths: number;
    minAccountAgeRequired: number;
    disputeRate: number;
    maxDisputeRateAllowed: number;
  };
  qualifiedAt: string;
  nextTierName?: string;
}

const mockCompanyTiers: CompanyTierStatus[] = [
  {
    companyId: 'comp-001',
    companyName: 'ProClean Services',
    currentTier: 'Gold',
    progress: {
      tasksCompleted: 342,
      minTasksRequired: 500,
      rating: 4.8,
      minRatingRequired: 4.7,
      accountAgeMonths: 16,
      minAccountAgeRequired: 12,
      disputeRate: 1.2,
      maxDisputeRateAllowed: 2,
    },
    qualifiedAt: '2026-05-10',
    nextTierName: 'Platinum',
  },
  {
    companyId: 'comp-002',
    companyName: 'FastGo Delivery',
    currentTier: 'Silver',
    progress: {
      tasksCompleted: 156,
      minTasksRequired: 200,
      rating: 4.3,
      minRatingRequired: 4.5,
      accountAgeMonths: 8,
      minAccountAgeRequired: 6,
      disputeRate: 2.1,
      maxDisputeRateAllowed: 3,
    },
    qualifiedAt: '2026-06-15',
    nextTierName: 'Gold',
  },
];

export const PartnerTiers: React.FC = () => {
  const [tiers] = useState<Tier[]>(tierData);
  const [companyTiers] = useState<CompanyTierStatus[]>(mockCompanyTiers);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(tierData[0]);
  const [showTierDetails, setShowTierDetails] = useState(false);
  const [selectedCompanyStatus, setSelectedCompanyStatus] = useState<CompanyTierStatus | null>(null);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);

  const getTierProgress = (tier: Tier) => {
    const qualified = companyTiers.filter((c) => c.currentTier === tier.name);
    return {
      count: qualified.length,
      percentage: (qualified.length / companyTiers.length) * 100,
    };
  };

  const getQualificationPercentage = (progress: CompanyTierStatus['progress'], requirement: TierRequirement) => {
    const scores = [
      (progress.tasksCompleted / requirement.minTasks) * 25,
      (progress.rating / requirement.minRating) * 25,
      (progress.accountAgeMonths / requirement.minAccountAgeMonths) * 25,
      (1 - progress.disputeRate / requirement.maxDisputeRate) * 25,
    ];
    return Math.min(Math.max(...scores.map(s => s > 100 ? 100 : s), 0), 100);
  };

  return (
    <div className="partner-tiers-page">
      <div className="page-header">
        <h1>👑 Partner Tiers</h1>
        <p>Manage tier qualifications and view company progress</p>
      </div>

      <div className="happy-box">
        <span>😊</span>
        <p>
          <strong>{companyTiers.length}</strong> companies tracked.
          <strong> {tiers.reduce((sum, t) => sum + t.currentCompanies, 0)}</strong> qualified partners.
        </p>
      </div>

      <div className="tiers-grid">
        {tiers.map((tier) => {
          const progress = getTierProgress(tier);
          return (
            <div
              key={tier.id}
              className="tier-card"
              onClick={() => {
                setSelectedTier(tier);
                setShowTierDetails(true);
              }}
              style={{ borderTopColor: tier.color }}
            >
              <div className="tier-header">
                <span className="tier-emoji">{tier.emoji}</span>
                <h3>{tier.name}</h3>
              </div>

              <p className="tier-description">{tier.description}</p>

              <div className="tier-stats">
                <div className="stat">
                  <span className="label">Companies:</span>
                  <span className="value">{tier.currentCompanies}</span>
                </div>
              </div>

              <div className="tier-requirements">
                <h4>Key Requirements</h4>
                <ul>
                  <li>Min {tier.requirements.minTasks} tasks</li>
                  <li>Min {tier.requirements.minRating} rating</li>
                  <li>Min {tier.requirements.minAccountAgeMonths} mo account age</li>
                  <li>Max {tier.requirements.maxDisputeRate}% disputes</li>
                  {tier.requirements.subscriptionRequired && (
                    <li>Subscription: {tier.requirements.subscriptionRequired}</li>
                  )}
                </ul>
              </div>

              <button className="btn-view" onClick={(e) => {
                e.stopPropagation();
                setSelectedTier(tier);
                setShowTierDetails(true);
              }}>
                View Details →
              </button>
            </div>
          );
        })}
      </div>

      <div className="companies-section">
        <h2>Company Tier Status</h2>
        <div className="companies-list">
          {companyTiers.map((company) => {
            const currentTier = tiers.find((t) => t.name === company.currentTier);
            const nextTier = company.nextTierName ? tiers.find((t) => t.name === company.nextTierName) : null;
            const progress = getQualificationPercentage(
              company.progress,
              nextTier?.requirements || currentTier?.requirements!
            );

            return (
              <div
                key={company.companyId}
                className="company-status-card"
                onClick={() => {
                  setSelectedCompanyStatus(company);
                  setShowCompanyDetails(true);
                }}
              >
                <div className="company-header">
                  <div>
                    <h3>{company.companyName}</h3>
                    <p className="current-tier">
                      {currentTier?.emoji} {company.currentTier} Partner
                    </p>
                  </div>
                  {company.nextTierName && (
                    <div className="next-tier">
                      <span>Next: {company.nextTierName}</span>
                    </div>
                  )}
                </div>

                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  <span className="progress-text">{Math.round(progress)}%</span>
                </div>

                <div className="company-details">
                  <div className="detail-item">
                    <span className="label">Tasks:</span>
                    <span className="value">
                      {company.progress.tasksCompleted} / {company.progress.minTasksRequired}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Rating:</span>
                    <span className="value">
                      {company.progress.rating.toFixed(1)} / {company.progress.minRatingRequired}⭐
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Disputes:</span>
                    <span className="value">
                      {company.progress.disputeRate.toFixed(1)}% / {company.progress.maxDisputeRateAllowed}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Account Age:</span>
                    <span className="value">
                      {company.progress.accountAgeMonths}mo / {company.progress.minAccountAgeRequired}mo
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier Details Modal */}
      {showTierDetails && selectedTier && (
        <div className="modal-overlay" onClick={() => setShowTierDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTier.emoji} {selectedTier.name} Partner</h2>
              <button className="close-btn" onClick={() => setShowTierDetails(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Requirements</h3>
                <div className="requirements-grid">
                  <div className="requirement-item">
                    <span className="label">Min Tasks Completed</span>
                    <span className="value">{selectedTier.requirements.minTasks}</span>
                  </div>
                  <div className="requirement-item">
                    <span className="label">Min Rating</span>
                    <span className="value">{selectedTier.requirements.minRating}⭐</span>
                  </div>
                  <div className="requirement-item">
                    <span className="label">Min Account Age</span>
                    <span className="value">{selectedTier.requirements.minAccountAgeMonths} months</span>
                  </div>
                  <div className="requirement-item">
                    <span className="label">Max Dispute Rate</span>
                    <span className="value">{selectedTier.requirements.maxDisputeRate}%</span>
                  </div>
                  {selectedTier.requirements.subscriptionRequired && (
                    <div className="requirement-item">
                      <span className="label">Subscription</span>
                      <span className="value">{selectedTier.requirements.subscriptionRequired}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3>Benefits</h3>
                <ul className="benefits-list">
                  {selectedTier.benefits.map((benefit, idx) => (
                    <li key={idx}>✓ {benefit}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h3>Current Status</h3>
                <p>
                  <strong>{selectedTier.currentCompanies}</strong> companies are {selectedTier.name} partners
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowTierDetails(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Details Modal */}
      {showCompanyDetails && selectedCompanyStatus && (
        <div className="modal-overlay" onClick={() => setShowCompanyDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCompanyStatus.companyName}</h2>
              <button className="close-btn" onClick={() => setShowCompanyDetails(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Current Status</h3>
                <div className="status-item">
                  <span className="label">Current Tier:</span>
                  <span className="value">{selectedCompanyStatus.currentTier}</span>
                </div>
                <div className="status-item">
                  <span className="label">Qualified Since:</span>
                  <span className="value">{new Date(selectedCompanyStatus.qualifiedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Progress Towards {selectedCompanyStatus.nextTierName}</h3>
                <div className="requirement-item">
                  <span className="label">Tasks Completed</span>
                  <div className="sub-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min((selectedCompanyStatus.progress.tasksCompleted / selectedCompanyStatus.progress.minTasksRequired) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {selectedCompanyStatus.progress.tasksCompleted} / {selectedCompanyStatus.progress.minTasksRequired}
                    </span>
                  </div>
                </div>

                <div className="requirement-item">
                  <span className="label">Rating</span>
                  <div className="sub-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min((selectedCompanyStatus.progress.rating / selectedCompanyStatus.progress.minRatingRequired) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {selectedCompanyStatus.progress.rating.toFixed(1)} / {selectedCompanyStatus.progress.minRatingRequired}
                    </span>
                  </div>
                </div>

                <div className="requirement-item">
                  <span className="label">Account Age</span>
                  <div className="sub-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min((selectedCompanyStatus.progress.accountAgeMonths / selectedCompanyStatus.progress.minAccountAgeRequired) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {selectedCompanyStatus.progress.accountAgeMonths} / {selectedCompanyStatus.progress.minAccountAgeRequired} months
                    </span>
                  </div>
                </div>

                <div className="requirement-item">
                  <span className="label">Dispute Rate</span>
                  <div className="sub-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.max(0, 100 - (selectedCompanyStatus.progress.disputeRate / selectedCompanyStatus.progress.maxDisputeRateAllowed) * 100)}%`,
                          backgroundColor: selectedCompanyStatus.progress.disputeRate > selectedCompanyStatus.progress.maxDisputeRateAllowed ? '#f44336' : '#4caf50',
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {selectedCompanyStatus.progress.disputeRate.toFixed(1)}% / {selectedCompanyStatus.progress.maxDisputeRateAllowed}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCompanyDetails(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .partner-tiers-page {
          padding: 30px;
          background: #fafafa;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 32px;
          color: #333;
          margin: 0 0 8px 0;
        }

        .page-header p {
          color: #666;
          margin: 0;
        }

        .happy-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #fff5f0 0%, #fffbf7 100%);
          border: 2px solid #ffb88c;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 30px;
          font-size: 14px;
          color: #666;
        }

        .happy-box span {
          font-size: 24px;
          flex-shrink: 0;
        }

        .tiers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .tier-card {
          background: white;
          border: 2px solid #f0f0f0;
          border-top: 4px solid;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .tier-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          transform: translateY(-4px);
        }

        .tier-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .tier-emoji {
          font-size: 32px;
        }

        .tier-header h3 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }

        .tier-description {
          margin: 0 0 16px 0;
          font-size: 13px;
          color: #666;
          font-style: italic;
        }

        .tier-stats {
          margin-bottom: 16px;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .stat .label {
          color: #666;
        }

        .stat .value {
          font-weight: 700;
          color: #333;
        }

        .tier-requirements {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .tier-requirements h4 {
          margin: 0 0 8px 0;
          font-size: 12px;
          font-weight: 700;
          color: #ff6b35;
          text-transform: uppercase;
        }

        .tier-requirements ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #666;
          line-height: 1.6;
        }

        .tier-requirements li {
          margin: 4px 0;
        }

        .btn-view {
          width: 100%;
          padding: 10px;
          background: #f0f0f0;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #333;
        }

        .btn-view:hover {
          background: #e0e0e0;
        }

        .companies-section {
          margin-top: 40px;
        }

        .companies-section h2 {
          margin: 0 0 20px 0;
          font-size: 24px;
          color: #333;
        }

        .companies-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .company-status-card {
          background: white;
          border: 2px solid #f0f0f0;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .company-status-card:hover {
          border-color: #ff6b35;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.1);
        }

        .company-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .company-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: #333;
        }

        .current-tier {
          margin: 0;
          font-size: 13px;
          color: #ff6b35;
          font-weight: 600;
        }

        .next-tier {
          background: #fff5f0;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #ff6b35;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff6b35, #ff8c42);
          border-radius: 4px;
          transition: width 0.3s;
        }

        .progress-text {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          font-weight: 700;
          color: #333;
          background: white;
          padding: 0 4px;
        }

        .company-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          font-size: 13px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item .label {
          color: #999;
          font-weight: 500;
        }

        .detail-item .value {
          color: #333;
          font-weight: 600;
        }

        .sub-progress {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sub-progress .progress-bar {
          flex: 1;
          margin-bottom: 0;
        }

        .sub-progress .progress-text {
          position: static;
          background: none;
          padding: 0;
          font-size: 12px;
          white-space: nowrap;
          transform: none;
        }

        /* Modal Styles */
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
          background: white;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 2px solid #f5f5f5;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
        }

        .modal-body {
          padding: 20px;
        }

        .detail-section {
          margin-bottom: 24px;
        }

        .detail-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 700;
          color: #ff6b35;
          text-transform: uppercase;
        }

        .requirements-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .requirement-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 6px;
        }

        .requirement-item .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
        }

        .requirement-item .value {
          font-size: 16px;
          font-weight: 700;
          color: #333;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f5f5f5;
        }

        .status-item .label {
          font-weight: 600;
          color: #666;
        }

        .status-item .value {
          font-weight: 600;
          color: #333;
        }

        .benefits-list {
          margin: 0;
          padding-left: 20px;
          font-size: 14px;
          color: #333;
          line-height: 1.8;
        }

        .benefits-list li {
          margin: 8px 0;
        }

        .modal-footer {
          padding: 20px;
          border-top: 2px solid #f5f5f5;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-footer button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }
      `}</style>
    </div>
  );
};

export default PartnerTiers;
