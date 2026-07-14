import React, { useState } from 'react';
import { useToast } from './Toast';

interface CaseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  errandId?: number;
  askerId?: number;
  doerId?: number;
}

type CaseType = 'dispute' | 'app_issue' | 'payment_enquiry' | 'task_enquiry' | 'refund_request' | 'safety_concern' | 'quality_issue' | 'cancellation' | 'other';

const CASE_TYPES = {
  dispute: { label: 'Dispute', icon: '⚔️', description: 'Payment conflict with other party' },
  app_issue: { label: 'App Problem', icon: '🐛', description: 'Bug, crash, or feature not working' },
  payment_enquiry: { label: 'Payment Question', icon: '💰', description: 'Where is my payment? When will I get it?' },
  task_enquiry: { label: 'Lost Contact', icon: '📍', description: 'Can\'t reach doer or locate them' },
  refund_request: { label: 'Refund Request', icon: '💵', description: 'Duplicate charge or wrong amount' },
  safety_concern: { label: 'Safety Issue', icon: '🚨', description: 'Harassment, unsafe behavior, threat' },
  quality_issue: { label: 'Quality Issue', icon: '⭐', description: 'Work was incomplete or poor quality' },
  cancellation: { label: 'Cancellation', icon: '❌', description: 'Want to cancel this errand' },
  other: { label: 'Other', icon: '❓', description: 'General enquiry or other issue' },
};

export const CaseReportModal: React.FC<CaseReportModalProps> = ({
  isOpen,
  onClose,
  errandId,
  askerId,
  doerId,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [caseType, setCaseType] = useState<CaseType | ''>('');
  const [formData, setFormData] = useState({
    description: '',
    evidence: '',
    severity: 'medium' as 'critical' | 'high' | 'medium' | 'low',
  });

  const handleTypeSelect = (type: CaseType) => {
    setCaseType(type);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      showToast('Please describe your issue', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_type: caseType,
          errand_id: errandId,
          asker_id: askerId,
          doer_id: doerId,
          subject: formData.description.substring(0, 100),
          description: formData.description,
          evidence: formData.evidence,
          severity: formData.severity,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(`Case ${data.case_id} created! Our team will review it shortly.`, 'success');
        resetForm();
        onClose();
      } else {
        showToast('Failed to create case', 'error');
      }
    } catch (error) {
      console.error('Case creation error:', error);
      showToast('Error creating case. Please try again.', 'error');
    }
  };

  const resetForm = () => {
    setStep('type');
    setCaseType('');
    setFormData({ description: '', evidence: '', severity: 'medium' });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 1000,
      padding: '16px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#333' }}>
            {step === 'type' ? 'Report an Issue' : CASE_TYPES[caseType as CaseType]?.label}
          </h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
            }}
          >
            ×
          </button>
        </div>

        {step === 'type' && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(CASE_TYPES).map(([key, { label, icon, description }]) => (
              <button
                key={key}
                onClick={() => handleTypeSelect(key as CaseType)}
                style={{
                  background: '#f9f9f9',
                  border: '2px solid #eee',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ':hover': { borderColor: '#FF6B35', background: '#FFF5F0' },
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#FF6B35';
                  e.currentTarget.style.background = '#FFF5F0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#eee';
                  e.currentTarget.style.background = '#f9f9f9';
                }}
              >
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontWeight: '600', color: '#333', fontSize: '14px', marginBottom: '2px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {description}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'form' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                What happened? *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please provide as much detail as possible..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {formData.description.length} / 500 characters
              </div>
            </div>

            {/* Evidence */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                Evidence (optional)
              </label>
              <textarea
                value={formData.evidence}
                onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                placeholder="Photos? GPS coordinates? Chat logs? Order numbers? Add any supporting details..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Severity */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                Urgency Level
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['low', 'medium', 'high', 'critical'].map(level => (
                  <button
                    key={level}
                    onClick={() => setFormData({ ...formData, severity: level as any })}
                    style={{
                      padding: '8px',
                      background: formData.severity === level ? '#FF6B35' : '#f5f5f5',
                      color: formData.severity === level ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                    }}
                  >
                    {level === 'low' ? '🟢' : level === 'medium' ? '🟡' : level === 'high' ? '🟠' : '🔴'} {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Back & Submit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setCaseType('');
                  setStep('type');
                }}
                style={{
                  padding: '10px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '10px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                📤 Submit Case
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
