import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CampaignWizard from '../components/CampaignWizard';
import PaymentApprovalModal from '../components/PaymentApprovalModal';

interface PendingCampaign { id: number; title: string; budget: number; }

const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const [isWizardOpen, setWizardOpen] = useState(true);
  const companyId = Number(localStorage.getItem('selectedCompanyId')) || 3;

  // Campaigns created as drafts, waiting to be paid for one after another.
  const [queue, setQueue] = useState<PendingCampaign[]>([]);
  const current = queue[0];

  const handleCampaignSubmit = async (campaignData: any) => {
    const created: PendingCampaign[] = [];
    try {
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
          const data = await response.json();
          if (data?.campaign?.id) {
            created.push({ id: data.campaign.id, title: data.campaign.title || campaign.title, budget: Number(data.campaign.budget ?? campaign.budget) });
          }
        } else {
          console.error('Failed to create campaign');
        }
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }

    if (created.length > 0) {
      // Hand the drafts to the payment step (credits and/or Stripe card).
      setWizardOpen(false);
      setQueue(created);
    } else {
      navigate(-1);
    }
  };

  const advanceQueue = () => {
    setQueue((q) => {
      const next = q.slice(1);
      if (next.length === 0) navigate('/company/dashboard', { state: { success: true } });
      return next;
    });
  };

  const handleWizardClose = () => navigate(-1);

  return (
    <>
      <CampaignWizard
        isOpen={isWizardOpen}
        onClose={handleWizardClose}
        onCampaignSubmit={handleCampaignSubmit}
      />
      {current && (
        <PaymentApprovalModal
          isOpen={true}
          campaignId={current.id}
          campaignTitle={current.title}
          campaignBudgetSgd={current.budget}
          companyId={companyId}
          onApproved={advanceQueue}
          onCancelled={advanceQueue}
        />
      )}
    </>
  );
};

export default CreateCampaignPage;
