import React, { useState } from 'react';
import { useToast } from './Toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CaseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  errandId?: number;
  askerId?: number;
  doerId?: number;
  /**
   * Company staff cannot file a dispute themselves — the dispute belongs to the
   * business, which is the counterparty and the party that gets paid. Passing a
   * companyId routes the report to the owner/manager approval queue instead of
   * straight to Errandify, and tells the staff member that up front.
   */
  companyId?: number | null;
  /** Shown so people know which errand they are reporting on */
  errandTitle?: string;
  onSubmitted?: () => void;
}

/** Our case vocabulary mapped onto the dispute types the company queue accepts. */
const CASE_TO_DISPUTE_TYPE: Record<string, string> = {
  dispute: 'payment_not_released',
  quality_issue: 'low_quality',
  refund_request: 'payment_not_released',
  safety_concern: 'safety_concern',
  payment_enquiry: 'payment_not_released',
  task_enquiry: 'work_not_completed',
  app_issue: 'other',
  other: 'other',
};

const MAX_DESCRIPTION = 500;
const MIN_DESCRIPTION = 20;

type CaseType = 'dispute' | 'quality_issue' | 'refund_request' | 'app_issue' | 'payment_enquiry' | 'task_enquiry' | 'safety_concern' | 'other';

/**
 * One form, three destinations.
 *
 * Cases and disputes are split by MONEY, but the person reporting should not
 * have to know that. They describe the problem here and we route it:
 *
 *   money involved        → POST /api/disputes        (payment held, Hana proposes, admin decides)
 *   company staff         → POST .../dispute-requests (owner or manager approves first)
 *   everything else       → POST /api/cases           (support ticket)
 *
 * Hiding the money types would just make people hunt for a dispute form that
 * has no entry point anywhere in the app.
 */
const CASE_TYPES = {
  dispute: { label: 'Payment Dispute', icon: '⚔️', description: 'Disagreement about payment for an errand' },
  quality_issue: { label: 'Quality Issue', icon: '⭐', description: 'Work was incomplete or poorly done' },
  refund_request: { label: 'Refund Request', icon: '💵', description: 'Wrong amount or duplicate charge' },
  app_issue: { label: 'App Problem', icon: '🐛', description: 'Bug, crash, or feature not working' },
  payment_enquiry: { label: 'Payment Question', icon: '💰', description: 'Where is my payment? When will I get it?' },
  task_enquiry: { label: 'Lost Contact', icon: '📍', description: "Can't reach the other person" },
  safety_concern: { label: 'Safety Issue', icon: '🚨', description: 'Harassment, unsafe behaviour, threat' },
  other: { label: 'Other', icon: '❓', description: 'General enquiry or other issue' },
};

/** These go to the dispute system, which holds the payment while it is settled. */
const MONEY_TYPES = new Set(['dispute', 'quality_issue', 'refund_request']);

export const CaseReportModal: React.FC<CaseReportModalProps> = ({
  isOpen,
  onClose,
  errandId,
  askerId,
  doerId,
  companyId,
  errandTitle,
  onSubmitted,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [submitting, setSubmitting] = useState(false);
  const viaCompany = !!companyId;
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
    const description = formData.description.trim();

    if (description.length < MIN_DESCRIPTION) {
      showToast(
        `Please add a bit more detail — at least ${MIN_DESCRIPTION} characters helps us sort this out properly.`,
        'warning'
      );
      return;
    }
    if (MONEY_TYPES.has(caseType) && !errandId && !viaCompany) {
      showToast(
        'Open this from the errand itself so we know which payment to hold.',
        'warning'
      );
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      // Route by who is reporting and whether money is involved
      const isMoney = MONEY_TYPES.has(caseType);
      const url = viaCompany
        ? `${API_URL}/api/companies/${companyId}/dispute-requests`
        : isMoney
        ? `${API_URL}/api/disputes`
        : `${API_URL}/api/cases`;

      const body = viaCompany || isMoney
        ? {
            errandId,
            type: CASE_TO_DISPUTE_TYPE[caseType] || 'other',
            description,
            evidence: formData.evidence || null,
          }
        : {
            case_type: caseType,
            errand_id: errandId,
            asker_id: askerId,
            doer_id: doerId,
            subject: description.substring(0, 100),
            description,
            evidence: formData.evidence,
            severity: formData.severity,
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Surface what the server actually said rather than a generic failure
        showToast(data.error || 'We could not send that just now. Please try again.', 'error');
        return;
      }

      showToast(
        viaCompany
          ? "Sent to your owner or manager. Nothing has been raised with the customer yet — you'll hear back once they've looked at it."
          : isMoney
          ? "Dispute raised. The payment is held safely while we sort this out, and we'll be in touch shortly."
          : `Case ${data.case_id || ''} created. Our team will take a look shortly.`.replace('  ', ' '),
        'success'
      );
      onSubmitted?.();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Case creation error:', error);
      showToast('Something went wrong on our side. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('type');
    setCaseType('');
    setFormData({ description: '', evidence: '', severity: 'medium' });
    setSubmitting(false);
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

        {errandTitle && (
          <p style={{ margin: '-8px 0 14px', fontSize: '12px', color: '#666' }}>
            About "{errandTitle}"
          </p>
        )}

        {!viaCompany && step === 'form' && MONEY_TYPES.has(caseType as string) && (
          <div style={{
            background: '#FFF8E6', border: '1px solid #F5D98B', borderRadius: '10px',
            padding: '10px 12px', marginBottom: '14px',
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#8A6100', lineHeight: 1.5 }}>
              Because this is about payment, we'll raise it as a dispute — the money
              stays held while both sides have their say.
            </p>
          </div>
        )}

        {viaCompany && (
          <div style={{
            background: '#FFF8E6', border: '1px solid #F5D98B', borderRadius: '10px',
            padding: '10px 12px', marginBottom: '14px',
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#8A6100', lineHeight: 1.5 }}>
              This goes to your owner or manager first. If they approve it, the company
              raises it formally. Until then the customer isn't told anything.
            </p>
          </div>
        )}

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
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value.slice(0, MAX_DESCRIPTION) })
                }
                placeholder="When it happened, what you saw, what you tried. The more detail, the easier it is to sort out."
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
              <div style={{
                fontSize: '11px', marginTop: '4px',
                color: formData.description.trim().length < MIN_DESCRIPTION ? '#C1442E' : '#999',
              }}>
                {formData.description.trim().length < MIN_DESCRIPTION
                  ? `${MIN_DESCRIPTION - formData.description.trim().length} more characters needed`
                  : `${formData.description.length} / ${MAX_DESCRIPTION} characters`}
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
                disabled={submitting}
                style={{
                  padding: '10px',
                  opacity: submitting ? 0.6 : 1,
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                {submitting ? 'Sending…' : viaCompany ? '📤 Send to manager' : '📤 Submit Case'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
