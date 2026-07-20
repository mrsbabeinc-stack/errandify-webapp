import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CampaignWizard from '../components/CampaignWizard';

const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const [isWizardOpen] = useState(true);

  const handleCampaignSubmit = async (campaignData: any) => {
    try {
      const companyId = localStorage.getItem('selectedCompanyId') || 3;

      // Create campaigns via API
      for (const campaign of campaignData) {
        const response = await fetch('/api/advertising/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            company_id: companyId,
            title: campaign.title,
            description: campaign.bio,
            budget: campaign.budget,
            type: campaign.type,
            starts_at: new Date(campaign.startDate).toISOString(),
            ends_at: new Date(campaign.endDate).toISOString(),
            url: campaign.url,
            image_url: campaign.imageUrl
          })
        });

        if (response.ok) {
          // Navigate back to previous page with success state
          const referrer = document.referrer;
          if (referrer && referrer.includes('/advertising')) {
            navigate('/advertising', { state: { success: true } });
          } else {
            navigate(-1);
          }
        } else {
          console.error('Failed to create campaign');
        }
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleWizardClose = () => {
    // Go back to previous page
    navigate(-1);
  };

  return (
    <CampaignWizard
      isOpen={isWizardOpen}
      onClose={handleWizardClose}
      onCampaignSubmit={handleCampaignSubmit}
    />
  );
};

export default CreateCampaignPage;
