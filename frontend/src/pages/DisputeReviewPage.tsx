// Dispute Review Page for L2 Resolution
// Support agents review and make decisions on escalated disputes

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PhotoUploadWidget from '../components/PhotoUploadWidget';
import type { PhotoMetadata } from '../utils/photoUpload';
import './DisputeReviewPage.css';

interface DisputeDetails {
  id: number;
  task_id: number;
  asker_id: number;
  doer_id: number;
  asker_name: string;
  doer_name: string;
  asker_email: string;
  doer_email: string;
  amount: number;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  ai_confidence?: number;
  ai_recommendation?: string;
  ai_reasoning?: string;
}

type Decision = 'refund' | 'split' | 'release' | null;

const DisputeReviewPage: React.FC = () => {
  const { disputeId } = useParams<{ disputeId: string }>();
  const [dispute, setDispute] = useState<DisputeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [reasoning, setReasoning] = useState('');
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDisputeDetails();
  }, [disputeId]);

  const fetchDisputeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/disputes/${disputeId}/l2-details`);
      setDispute(res.data.data);
    } catch (err: any) {
      console.error('Failed to fetch dispute:', err);
      setError(err.response?.data?.error || 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!decision || !reasoning.trim()) {
      setError('Please select a decision and provide reasoning');
      return;
    }

    try {
      setSubmitting(true);

      // Convert photos to data URLs for submission
      const photoDataUrls = photos.map((p) => p.dataUrl);

      await api.post(`/disputes/${disputeId}/resolve-l2`, {
        decision,
        reasoning,
        evidencePhotos: photoDataUrls,
      });

      // Show success and redirect
      alert('Dispute resolved successfully');
      window.location.href = '/support/dashboard';
    } catch (err: any) {
      console.error('Failed to resolve dispute:', err);
      setError(err.response?.data?.error || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="review-loading">Loading dispute details...</div>;
  }

  if (error) {
    return <div className="review-error">{error}</div>;
  }

  if (!dispute) {
    return <div className="review-error">Dispute not found</div>;
  }

  const confidenceColor =
    (dispute.ai_confidence || 0) > 0.8 ? 'high' : (dispute.ai_confidence || 0) > 0.6 ? 'medium' : 'low';

  return (
    <div className="dispute-review">
      <div className="review-header">
        <h1>Review Dispute #{dispute.id}</h1>
        <p className="task-ref">Errand #{dispute.task_id}</p>
      </div>

      <div className="review-content">
        {/* Left Column: Dispute Details */}
        <div className="review-left">
          {/* Parties */}
          <section className="review-section">
            <h2>Parties</h2>
            <div className="party-group">
              <div className="party">
                <h3>Asker</h3>
                <p className="party-name">{dispute.asker_name}</p>
                <p className="party-email">{dispute.asker_email}</p>
              </div>
              <div className="party">
                <h3>Doer</h3>
                <p className="party-name">{dispute.doer_name}</p>
                <p className="party-email">{dispute.doer_email}</p>
              </div>
            </div>
          </section>

          {/* Dispute Details */}
          <section className="review-section">
            <h2>Dispute Details</h2>
            <dl className="details-list">
              <dt>Amount:</dt>
              <dd>${dispute.amount}</dd>

              <dt>Reason:</dt>
              <dd>{dispute.reason}</dd>

              <dt>Description:</dt>
              <dd>{dispute.description || 'No description provided'}</dd>

              <dt>Created:</dt>
              <dd>{new Date(dispute.created_at).toLocaleString()}</dd>

              <dt>Status:</dt>
              <dd>
                <span className={`status-badge ${dispute.status}`}>{dispute.status}</span>
              </dd>
            </dl>
          </section>

          {/* AI Analysis */}
          {dispute.ai_confidence !== undefined && (
            <section className="review-section ai-analysis">
              <h2>AI Analysis</h2>
              <div className="confidence-meter">
                <div className="confidence-label">Confidence Score</div>
                <div className={`confidence-bar ${confidenceColor}`}>
                  <div className="confidence-fill" style={{ width: `${(dispute.ai_confidence || 0) * 100}%` }} />
                </div>
                <div className="confidence-value">{Math.round((dispute.ai_confidence || 0) * 100)}%</div>
              </div>

              <div className="ai-recommendation">
                <h3>AI Recommendation</h3>
                <p className="recommendation">{dispute.ai_recommendation}</p>
              </div>

              <div className="ai-reasoning">
                <h3>AI Reasoning</h3>
                <p>{dispute.ai_reasoning}</p>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Decision Form */}
        <div className="review-right">
          <section className="decision-section">
            <h2>Make Decision</h2>

            {/* Decision Options */}
            <div className="decision-options">
              <label className={`decision-option ${decision === 'refund' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="decision"
                  value="refund"
                  checked={decision === 'refund'}
                  onChange={(e) => setDecision(e.target.value as Decision)}
                />
                <div className="option-content">
                  <h3>Refund</h3>
                  <p>Return full amount to asker. Asker keeps service/product.</p>
                </div>
              </label>

              <label className={`decision-option ${decision === 'split' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="decision"
                  value="split"
                  checked={decision === 'split'}
                  onChange={(e) => setDecision(e.target.value as Decision)}
                />
                <div className="option-content">
                  <h3>Split</h3>
                  <p>Split funds 50/50 between asker and doer. Middle ground.</p>
                </div>
              </label>

              <label className={`decision-option ${decision === 'release' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="decision"
                  value="release"
                  checked={decision === 'release'}
                  onChange={(e) => setDecision(e.target.value as Decision)}
                />
                <div className="option-content">
                  <h3>Release</h3>
                  <p>Release full payment to doer. Dispute resolved in doer's favor.</p>
                </div>
              </label>
            </div>

            {/* Reasoning */}
            <div className="reasoning-group">
              <label htmlFor="reasoning">Reasoning *</label>
              <textarea
                id="reasoning"
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain your decision. Be clear and concise for transparency with both parties."
                rows={6}
                maxLength={500}
              />
              <div className="char-count">{reasoning.length} / 500</div>
            </div>

            {/* Evidence Photos */}
            <PhotoUploadWidget
              onPhotoAdded={() => {}}
              onPhotosChange={setPhotos}
              maxPhotos={3}
              context="dispute_evidence"
            />

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Submit Button */}
            <button
              className="btn-resolve"
              onClick={handleResolve}
              disabled={!decision || !reasoning.trim() || submitting}
            >
              {submitting ? 'Resolving...' : 'Resolve Dispute'}
            </button>

            {/* Info Box */}
            <div className="info-box">
              <p>
                <strong>Note:</strong> This decision is binding. Both parties will be notified immediately. Users may appeal
                within 7 days.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DisputeReviewPage;
