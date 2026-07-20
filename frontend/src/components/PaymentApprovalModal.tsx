import React from 'react';
import CampaignPaymentApproval from './CampaignPaymentApproval';

interface PaymentApprovalModalProps {
  isOpen: boolean;
  campaignId: number;
  campaignTitle: string;
  campaignBudgetSgd: number;
  companyId: number;
  onApproved: (result: any) => void;
  onCancelled: () => void;
}

const PaymentApprovalModal: React.FC<PaymentApprovalModalProps> = ({
  isOpen,
  campaignId,
  campaignTitle,
  campaignBudgetSgd,
  companyId,
  onApproved,
  onCancelled
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxHeight: '90vh',
        overflowY: 'auto',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #E0E0E0',
          position: 'sticky',
          top: 0,
          background: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#333' }}>
            Payment Approval
          </h2>
          <button
            onClick={onCancelled}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
              padding: 0,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 24px' }}>
          <CampaignPaymentApproval
            campaignId={campaignId}
            campaignTitle={campaignTitle}
            campaignBudgetSgd={campaignBudgetSgd}
            companyId={companyId}
            onApproved={onApproved}
            onCancelled={onCancelled}
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentApprovalModal;
