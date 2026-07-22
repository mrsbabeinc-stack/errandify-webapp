import React, { useState, useEffect } from 'react';
import { useToastNotification } from '../utils/toastNotification';
import '../styles/AllocateStaffModal.css';

interface StaffMember {
  staff_id: number;
  name: string;
  rating: number;
  skills: string[];
  available: boolean;
  reason: string;
}

interface AllocateStaffModalProps {
  errandId: number;
  errandTitle: string;
  onClose: () => void;
  onAllocate: () => void;
}

const AllocateStaffModal: React.FC<AllocateStaffModalProps> = ({
  errandId,
  errandTitle,
  onClose,
  onAllocate,
}) => {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [recommendations, setRecommendations] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [errandId]);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/api/recommendations/staff?errand_id=${errandId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);

        // Auto-select top recommendation
        if (data.recommendations && data.recommendations.length > 0) {
          setSelectedStaff(data.recommendations[0].staff_id);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      showError('Failed to load staff recommendations');
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedStaff) {
      showError('Please select a staff member');
      return;
    }

    setAllocating(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/company/errands/${errandId}/allocate-to-staff`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: selectedStaff,
        }),
      });

      if (response.ok) {
        showSuccess('Errand allocated successfully!', `Notifying staff member now...`);
        setTimeout(() => {
          onAllocate();
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        showError('Allocation failed', error.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error allocating errand:', error);
      showError('Allocation failed', 'Please try again');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="allocate-staff-modal-overlay" onClick={onClose}>
      <div className="allocate-staff-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 Allocate to Staff Member</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="errand-info">
            <strong>Errand:</strong>
            <p>{errandTitle}</p>
          </div>

          {loading ? (
            <div className="loading-state">
              <p>⏳ Loading staff recommendations...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="empty-state">
              <p>❌ No available staff members for this errand</p>
              <p className="help-text">Try allocating again later or post to public browse</p>
            </div>
          ) : (
            <div className="staff-list">
              <div className="list-header">
                <p className="help-text">
                  👍 AI recommended based on skills, availability, and rating
                </p>
              </div>

              {recommendations.map((staff, index) => (
                <div
                  key={staff.staff_id}
                  className={`staff-item ${selectedStaff === staff.staff_id ? 'selected' : ''} ${
                    index === 0 ? 'recommended' : ''
                  }`}
                  onClick={() => setSelectedStaff(staff.staff_id)}
                >
                  <div className="staff-selection">
                    <input
                      type="radio"
                      name="staff"
                      value={staff.staff_id}
                      checked={selectedStaff === staff.staff_id}
                      onChange={() => setSelectedStaff(staff.staff_id)}
                      className="radio-input"
                    />
                    {index === 0 && <span className="recommendation-badge">👍 Recommended</span>}
                  </div>

                  <div className="staff-info">
                    <div className="staff-name-section">
                      <h3>{staff.name}</h3>
                      <span className="rating">
                        {'⭐'.repeat(Math.round(staff.rating))} {staff.rating.toFixed(1)}
                      </span>
                    </div>

                    {staff.skills && staff.skills.length > 0 && (
                      <div className="skills">
                        {staff.skills.slice(0, 3).map((skill, i) => (
                          <span key={i} className="skill-tag">
                            {skill}
                          </span>
                        ))}
                        {staff.skills.length > 3 && (
                          <span className="skill-tag more">+{staff.skills.length - 3}</span>
                        )}
                      </div>
                    )}

                    <p className="reason">{staff.reason}</p>
                  </div>

                  <div className="availability">
                    {staff.available ? (
                      <span className="badge available">✓ Available</span>
                    ) : (
                      <span className="badge busy">Busy</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={allocating}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAllocate}
            disabled={!selectedStaff || allocating}
          >
            {allocating ? '⏳ Allocating...' : '✓ Allocate Errand'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllocateStaffModal;
