import React, { useState } from 'react';
import CreateCampaignModal from './CreateCampaignModal';

interface CampaignSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'hero-banner' | 'in-feed-ads') => void;
}

const CampaignSelectionModal: React.FC<CampaignSelectionModalProps> = ({ isOpen, onClose, onSelectType }) => {
  const [selectedType, setSelectedType] = useState<'hero-banner' | 'in-feed-ads' | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!isOpen) return null;

  if (showCreateModal && selectedType) {
    return (
      <CreateCampaignModal
        isOpen={true}
        adType={selectedType}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedType(null);
          onClose();
        }}
        onCreate={(campaign) => {
          onSelectType(selectedType);
        }}
      />
    );
  }

  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
      <div style={{background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '800px', width: '90%'}}>
        <div style={{marginBottom: '32px', textAlign: 'center'}}>
          <h2 style={{margin: '0 0 12px 0', fontSize: '28px', fontWeight: '700'}}>What Ad Would You Like to Create?</h2>
          <p style={{margin: 0, fontSize: '15px', color: '#666'}}>Choose an ad type and we'll help you create a smart campaign</p>
        </div>

        {/* Campaign Type Selection Cards */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px'}}>
          {/* Hero Banner Card */}
          <div
            onClick={() => {
              setSelectedType('hero-banner');
              setShowCreateModal(true);
            }}
            style={{
              border: selectedType === 'hero-banner' ? '3px solid #FF6B35' : '2px solid #ddd',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              background: selectedType === 'hero-banner' ? '#FFF8F5' : 'white',
              transition: 'all 0.2s ease',
              transform: 'hover' ? 'translateY(-4px)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (selectedType !== 'hero-banner') {
                e.currentTarget.style.borderColor = '#FFB399';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedType !== 'hero-banner') {
                e.currentTarget.style.borderColor = '#ddd';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <div style={{fontSize: '32px', marginBottom: '12px'}}>📅</div>
            <h3 style={{margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700'}}>Hero Banner</h3>
            <p style={{margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: '1.5'}}>
              Showcase on your company profile. First thing customers see.
            </p>
            <div style={{background: 'white', borderRadius: '8px', padding: '12px', marginBottom: '12px'}}>
              <div style={{fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px'}}>✨ Smart Features:</div>
              <ul style={{margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#666', lineHeight: '1.6'}}>
                <li>1200×300px full-width impact</li>
                <li>2-week minimum for consistency</li>
                <li>AI rotation optimization</li>
                <li>Profile priority placement</li>
              </ul>
            </div>
            <div style={{fontSize: '13px', fontWeight: '600', color: '#FF6B35'}}>
              💰 From SGD $280/week
            </div>
          </div>

          {/* In-Feed Ads Card */}
          <div
            onClick={() => {
              setSelectedType('in-feed-ads');
              setShowCreateModal(true);
            }}
            style={{
              border: selectedType === 'in-feed-ads' ? '3px solid #FF6B35' : '2px solid #ddd',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              background: selectedType === 'in-feed-ads' ? '#FFF8F5' : 'white',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (selectedType !== 'in-feed-ads') {
                e.currentTarget.style.borderColor = '#FFB399';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedType !== 'in-feed-ads') {
                e.currentTarget.style.borderColor = '#ddd';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <div style={{fontSize: '32px', marginBottom: '12px'}}>📰</div>
            <h3 style={{margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700'}}>In-Feed Ads</h3>
            <p style={{margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: '1.5'}}>
              Between errands in the feed. Feels natural in the community.
            </p>
            <div style={{background: 'white', borderRadius: '8px', padding: '12px', marginBottom: '12px'}}>
              <div style={{fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px'}}>✨ Smart Features:</div>
              <ul style={{margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#666', lineHeight: '1.6'}}>
                <li>500×250px natural placement</li>
                <li>Minimum 1 week duration</li>
                <li>Smart timing optimization</li>
                <li>Intent-matched targeting</li>
              </ul>
            </div>
            <div style={{fontSize: '13px', fontWeight: '600', color: '#FF6B35'}}>
              💰 From SGD $180/week
            </div>
          </div>
        </div>

        {/* Recommendation Section */}
        <div style={{background: '#F0F8FF', border: '1px solid #B0D4FF', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
          <div style={{fontSize: '12px', fontWeight: '600', color: '#0066CC', marginBottom: '6px'}}>💡 Pro Tip</div>
          <div style={{fontSize: '13px', color: '#333', lineHeight: '1.5'}}>
            For best results, combine both Hero Banner + In-Feed Ads. Get <span style={{fontWeight: '600', color: '#FF6B35'}}>15% bundle discount</span> when you create campaigns together!
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{display: 'flex', gap: '12px'}}>
          <button
            onClick={onClose}
            style={{flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
          >
            Cancel
          </button>
          <button
            onClick={() => selectedType && setShowCreateModal(true)}
            disabled={!selectedType}
            style={{
              flex: 1,
              padding: '12px',
              background: selectedType ? '#FF6B35' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: selectedType ? 'pointer' : 'not-allowed',
              fontSize: '14px',
            }}
          >
            {selectedType ? '✨ Create Smart Campaign' : 'Select an ad type'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignSelectionModal;
