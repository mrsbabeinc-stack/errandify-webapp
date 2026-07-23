// Appeal Dashboard for L3 Resolution
// Senior support staff review and make final decisions on appeals

import React, { useEffect, useState } from 'react';
import api from '../services/api';
import PhotoUploadWidget from '../components/PhotoUploadWidget';
import type { PhotoMetadata } from '../utils/photoUpload';
import './AppealDashboardPage.css';

interface Appeal {
  appeal_id: number;
  dispute_id: number;
  appeal_reason: string;
  new_evidence_url: string | null;
  appealed_by_user_id: number;
  appealer_name: string;
  appealed_at: string;
  status: string;
  task_id: number;
  asker_name: string;
  doer_name: string;
  amount: number;
}

type Decision = 'refund' | 'split' | 'release' | 'upheld' | null;

const AppealDashboardPage: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [reasoning, setReasoning] = useState('');
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/disputes/my-assignments/l3');
      setAppeals(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedAppeal(res.data.data[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch appeals:', err);
      setError(err.response?.data?.error || 'Failed to load appeals');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedAppeal || !decision || !reasoning.trim()) {
      setError('Please select a decision and provide reasoning');
      return;
    }

    try {
      setSubmitting(true);

      // Convert photos to data URLs for submission
      const photoDataUrls = photos.map((p) => p.dataUrl);

      await api.post(`/disputes/${selectedAppeal.dispute_id}/resolve-appeal`, {
        appealId: selectedAppeal.appeal_id,
        decision,
        reasoning,
        evidencePhotos: photoDataUrls,
      });

      // Update appeals list
      setAppeals(appeals.filter((a) => a.appeal_id !== selectedAppeal.appeal_id));
      setSelectedAppeal(appeals.find((a) => a.appeal_id !== selectedAppeal.appeal_id) || null);
      setDecision(null);
      setReasoning('');
      setPhotos([]);
      alert('Appeal resolved successfully');
    } catch (err: any) {
      console.error('Failed to resolve appeal:', err);
      setError(err.response?.data?.error || 'Failed to resolve appeal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="appeals-loading">Loading appeals...</div>;
  }

  return (
    <div className="appeal-dashboard">
      <h1>Appeal Resolution Dashboard (L3)</h1>

      <div className="appeals-content">
        {/* Left: Appeals List */}
        <div className="appeals-list-section">
          <h2>Pending Appeals ({appeals.length})</h2>
          {appeals.length === 0 ? (
            <p className="empty-state">No pending appeals</p>
          ) : (
            <div className="appeals-list">
              {appeals.map((appeal) => (
                <div
                  key={appeal.appeal_id}
                  className={`appeal-item ${selectedAppeal?.appeal_id === appeal.appeal_id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedAppeal(appeal);
                    setDecision(null);
                    setReasoning('');
                  }}
                >
                  <div className="appeal-header">
                    <h3>Appeal #{appeal.appeal_id}</h3>
                    <span className="appeal-status">{appeal.status}</span>
                  </div>
                  <p className="appeal-info">Dispute #{appeal.dispute_id}</p>
                  <p className="appeal-reason">{appeal.appeal_reason.substring(0, 100)}...</p>
                  <p className="appeal-date">{new Date(appeal.appealed_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Appeal Details & Decision */}
        {selectedAppeal && (
          <div className="appeal-detail-section">
            <h2>Appeal Details</h2>

            {/* Dispute Info */}
            <section className="detail-section">
              <h3>Dispute Information</h3>
              <dl className="detail-list">
                <dt>Dispute ID:</dt>
                <dd>#{selectedAppeal.dispute_id}</dd>

                <dt>Errand ID:</dt>
                <dd>#{selectedAppeal.task_id}</dd>

                <dt>Amount:</dt>
                <dd>${selectedAppeal.amount}</dd>

                <dt>Asker:</dt>
                <dd>{selectedAppeal.asker_name}</dd>

                <dt>Doer:</dt>
                <dd>{selectedAppeal.doer_name}</dd>
              </dl>
            </section>

            {/* Appeal Reason */}
            <section className="detail-section">
              <h3>Appeal Reason</h3>
              <p className="appeal-text">{selectedAppeal.appeal_reason}</p>

              {selectedAppeal.new_evidence_url && (
                <div className="evidence-section">
                  <h4>New Evidence</h4>
                  <a href={selectedAppeal.new_evidence_url} target="_blank" rel="noopener noreferrer" className="evidence-link">
                    View Evidence
                  </a>
                </div>
              )}
            </section>

            {/* Decision Form */}
            <section className="detail-section decision-form">
              <h3>Make Final Decision</h3>

              <div className="decision-options">
                <label className={`decision-option ${decision === 'refund' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="decision"
                    value="refund"
                    checked={decision === 'refund'}
                    onChange={(e) => setDecision(e.target.value as Decision)}
                  />
                  <div className="option-label">Refund</div>
                </label>

                <label className={`decision-option ${decision === 'split' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="decision"
                    value="split"
                    checked={decision === 'split'}
                    onChange={(e) => setDecision(e.target.value as Decision)}
                  />
                  <div className="option-label">Split</div>
                </label>

                <label className={`decision-option ${decision === 'release' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="decision"
                    value="release"
                    checked={decision === 'release'}
                    onChange={(e) => setDecision(e.target.value as Decision)}
                  />
                  <div className="option-label">Release</div>
                </label>

                <label className={`decision-option ${decision === 'upheld' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="decision"
                    value="upheld"
                    checked={decision === 'upheld'}
                    onChange={(e) => setDecision(e.target.value as Decision)}
                  />
                  <div className="option-label">Upheld (Original L2 Decision)</div>
                </label>
              </div>

              {/* Reasoning */}
              <div className="reasoning-group">
                <label htmlFor="reasoning">Final Reasoning *</label>
                <textarea
                  id="reasoning"
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Provide detailed reasoning for your final decision. This is binding."
                  rows={4}
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

              {error && <div className="error-message">{error}</div>}

              <button
                className="btn-finalize"
                onClick={handleResolve}
                disabled={!decision || !reasoning.trim() || submitting}
              >
                {submitting ? 'Finalizing...' : 'Finalize Decision'}
              </button>

              <div className="info-box">
                <p>
                  <strong>Final Decision:</strong> This decision is binding and final. No further appeals are allowed.
                </p>
              </div>
            </section>
          </div>
        )}

        {!selectedAppeal && appeals.length === 0 && (
          <div className="no-selection">
            <p>No appeals to review</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppealDashboardPage;
