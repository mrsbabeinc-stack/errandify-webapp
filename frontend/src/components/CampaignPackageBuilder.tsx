import React, { useState } from 'react';
import CreateCampaignModal from './CreateCampaignModal';

interface Campaign {
  id: string;
  type: 'hero-banner' | 'in-feed-ads';
  title: string;
  budget: number;
  duration: number;
  startDate: string;
  endDate: string;
  image?: string;
}

interface CampaignPackageBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

const CampaignPackageBuilder: React.FC<CampaignPackageBuilderProps> = ({ isOpen, onClose }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdType, setSelectedAdType] = useState<'hero-banner' | 'in-feed-ads'>('hero-banner');
  const [bundleDiscount, setBundleDiscount] = useState(0);

  // Calculate bundle discount based on number of campaigns
  const calculateDiscount = (count: number) => {
    if (count === 0) return 0;
    if (count === 1) return 0;
    if (count === 2) return 15;
    return 20;
  };

  // Update discount when campaigns change
  React.useEffect(() => {
    setBundleDiscount(calculateDiscount(campaigns.length));
  }, [campaigns]);

  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const discountAmount = (totalBudget * bundleDiscount) / 100;
  const finalPrice = totalBudget - discountAmount;

  const handleAddCampaign = (type: 'hero-banner' | 'in-feed-ads') => {
    setSelectedAdType(type);
    setShowCreateModal(true);
  };

  const handleCreateCampaign = (campaignData: any) => {
    const newCampaign: Campaign = {
      id: `campaign-${Date.now()}`,
      type: selectedAdType,
      title: campaignData.title,
      budget: campaignData.budget,
      duration: campaignData.duration,
      startDate: campaignData.startDate,
      endDate: campaignData.endDate,
      image: campaignData.imageUrl,
    };

    setCampaigns([...campaigns, newCampaign]);
    setShowCreateModal(false);
  };

  const removeCampaign = (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto'}}>
      <div style={{background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '900px', width: '95%', margin: '20px auto', maxHeight: '95vh', overflowY: 'auto'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <div>
            <h2 style={{margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700'}}>Campaign Package Builder</h2>
            <p style={{margin: 0, fontSize: '13px', color: '#666'}}>Mix & match Hero Banners + In-Feed Ads • Save up to 20% with bundle</p>
          </div>
          <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>✕</button>
        </div>

        {/* Add Campaign Type Selection */}
        <div style={{marginBottom: '32px'}}>
          <div style={{fontWeight: '600', marginBottom: '16px'}}>Add Campaigns to Your Package</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
            {/* Hero Banner Option */}
            <div
              onClick={() => handleAddCampaign('hero-banner')}
              style={{
                border: '2px dashed #FFB399',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                background: '#FFF8F5',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF6B35';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#FFB399';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{fontSize: '28px', marginBottom: '8px'}}>🌟</div>
              <h3 style={{margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700'}}>+ Hero Banner</h3>
              <p style={{margin: 0, fontSize: '12px', color: '#666'}}>1200×300px profile showcase</p>
            </div>

            {/* In-Feed Ads Option */}
            <div
              onClick={() => handleAddCampaign('in-feed-ads')}
              style={{
                border: '2px dashed #FFB399',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                background: '#FFF8F5',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF6B35';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#FFB399';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{fontSize: '28px', marginBottom: '8px'}}>📰</div>
              <h3 style={{margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700'}}>+ In-Feed Ads</h3>
              <p style={{margin: 0, fontSize: '12px', color: '#666'}}>1080×120px subtle banner</p>
            </div>
          </div>
        </div>

        {/* Campaigns in Package */}
        {campaigns.length > 0 && (
          <div style={{marginBottom: '32px'}}>
            <div style={{fontWeight: '600', marginBottom: '16px', fontSize: '16px'}}>
              Your Package ({campaigns.length} campaign{campaigns.length > 1 ? 's' : ''})
            </div>

            {/* Bundle Discount Banner */}
            {campaigns.length > 1 && (
              <div style={{background: '#E8F5E9', border: '2px solid #81C784', borderRadius: '8px', padding: '16px', marginBottom: '16px'}}>
                <div style={{fontWeight: '700', fontSize: '16px', color: '#27AE60', marginBottom: '4px'}}>
                  🎁 Bundle Discount: Save {bundleDiscount}%!
                </div>
                <div style={{fontSize: '13px', color: '#666'}}>
                  You're saving SGD ${discountAmount.toFixed(0)} by bundling {campaigns.length} campaigns together
                </div>
              </div>
            )}

            {/* Campaign Cards */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '12px'}}>
              {campaigns.map((campaign, index) => (
                <div key={campaign.id} style={{background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', display: 'grid', gridTemplateColumns: '60px 1fr 150px auto', gap: '16px', alignItems: 'center'}}>
                  {/* Icon & Type */}
                  <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: '28px', marginBottom: '4px'}}>
                      {campaign.type === 'hero-banner' ? '🌟' : '📰'}
                    </div>
                    <div style={{fontSize: '11px', fontWeight: '600', color: '#FF6B35'}}>
                      {campaign.type === 'hero-banner' ? 'Hero' : 'In-Feed'}
                    </div>
                  </div>

                  {/* Campaign Details */}
                  <div>
                    <div style={{fontWeight: '600', fontSize: '14px', marginBottom: '4px'}}>{campaign.title}</div>
                    <div style={{fontSize: '12px', color: '#666', marginBottom: '4px'}}>
                      📅 {campaign.startDate} → {campaign.endDate}
                    </div>
                    <div style={{fontSize: '12px', color: '#999'}}>
                      Duration: {campaign.duration} week{campaign.duration > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Budget */}
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontWeight: '700', fontSize: '16px', color: '#FF6B35', marginBottom: '4px'}}>
                      SGD ${campaign.budget}
                    </div>
                    <div style={{fontSize: '11px', color: '#999'}}>
                      ${(campaign.budget / campaign.duration).toFixed(0)}/week
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeCampaign(campaign.id)}
                    style={{
                      background: '#FFE5D9',
                      border: '1px solid #FFB399',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      color: '#E74C3C',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {campaigns.length === 0 && (
          <div style={{background: '#f9f9f9', border: '2px dashed #ddd', borderRadius: '8px', padding: '40px', textAlign: 'center', marginBottom: '32px'}}>
            <div style={{fontSize: '32px', marginBottom: '12px'}}>📦</div>
            <div style={{fontWeight: '600', marginBottom: '4px'}}>Your package is empty</div>
            <div style={{fontSize: '13px', color: '#666'}}>Click the cards above to add Hero Banners and In-Feed Ads</div>
          </div>
        )}

        {/* Pricing Summary */}
        {campaigns.length > 0 && (
          <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '20px', marginBottom: '24px'}}>
            <div style={{fontWeight: '600', marginBottom: '16px', fontSize: '16px'}}>Pricing Summary</div>

            {/* Breakdown */}
            <div style={{marginBottom: '12px'}}>
              {campaigns.map((c) => (
                <div key={c.id} style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#666'}}>
                  <span>{c.type === 'hero-banner' ? '🌟 Hero Banner' : '📰 In-Feed Ads'} - {c.title}</span>
                  <span>SGD ${c.budget}</span>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: '12px', borderBottom: '1px solid #FFD5C0', marginBottom: '12px'}}>
              <span>Subtotal ({campaigns.length} campaign{campaigns.length > 1 ? 's' : ''})</span>
              <span>SGD ${totalBudget}</span>
            </div>

            {/* Discount */}
            {bundleDiscount > 0 && (
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#27AE60', fontWeight: '600', marginBottom: '12px'}}>
                <span>Bundle Discount ({bundleDiscount}%)</span>
                <span>-SGD ${discountAmount.toFixed(0)}</span>
              </div>
            )}

            {/* Final Price */}
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', color: '#FF6B35'}}>
              <span>Total (held by Stripe until approval)</span>
              <span>SGD ${finalPrice.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div style={{background: '#E8F5E9', border: '1px solid #81C784', borderRadius: '8px', padding: '16px', marginBottom: '24px', fontSize: '12px', color: '#333'}}>
          <div style={{fontWeight: '600', marginBottom: '8px'}}>✅ How It Works</div>
          <ul style={{margin: 0, paddingLeft: '16px', lineHeight: '1.8'}}>
            <li><strong>Build Package:</strong> Add multiple Hero Banners and In-Feed Ads</li>
            <li><strong>Different Dates:</strong> Each campaign has its own start/end date</li>
            <li><strong>One Payment:</strong> Pay for all campaigns together</li>
            <li><strong>Admin Review:</strong> All campaigns reviewed together for approval</li>
            <li><strong>Go Live:</strong> Each campaign goes live on its scheduled start date</li>
            <li><strong>Bundle Savings:</strong> 2+ campaigns = 15-20% discount on total</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{display: 'flex', gap: '12px'}}>
          <button
            onClick={onClose}
            style={{flex: 1, padding: '14px', background: '#f5f5f5', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (campaigns.length === 0) {
                alert('Please add at least one campaign');
                return;
              }
              // Go to Stripe checkout
              const campaignIds = campaigns.map(c => c.id).join(',');
              window.location.href = `/stripe-checkout?campaigns=${campaignIds}&total=${finalPrice}&discount=${bundleDiscount}`;
            }}
            disabled={campaigns.length === 0}
            style={{
              flex: 1,
              padding: '14px',
              background: campaigns.length > 0 ? '#FF6B35' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: campaigns.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
            }}
          >
            💳 Checkout ({campaigns.length} campaign{campaigns.length > 1 ? 's' : ''})
          </button>
        </div>

        {/* Create Campaign Modal */}
        <CreateCampaignModal
          isOpen={showCreateModal}
          adType={selectedAdType}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCampaign}
        />
      </div>
    </div>
  );
};

export default CampaignPackageBuilder;
