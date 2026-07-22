import React, { useState } from 'react';
import { useToastNotification } from '../utils/toastNotification';
import '../styles/LeaveRequestForm.css';

interface LeaveRequestFormProps {
  companyId: number;
  onSuccess?: () => void;
}

const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({ companyId, onSuccess }) => {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    leave_type: 'full_day',
    reason: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date || !formData.end_date) {
      showError('Please select dates');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      // /api/leave-requests has never existed. The router is mounted at
      // /api/leave and the route is /request, so every leave request submitted
      // from this form 404'd and the staff member was told to wait for a
      // manager who was never going to see it.
      const response = await fetch(`${API_URL}/api/leave/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          ...formData,
        }),
      });

      if (response.ok) {
        showSuccess('Leave request submitted', 'Your manager will review it shortly');
        setFormData({
          start_date: '',
          end_date: '',
          leave_type: 'full_day',
          reason: '',
          notes: '',
        });
        onSuccess?.();
      } else {
        const error = await response.json();
        showError('Submission failed', error.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showError('Submission failed', 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="leave-request-form" onSubmit={handleSubmit}>
      <h3>📋 Request Leave</h3>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="start_date">Start Date *</label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="end_date">End Date *</label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="leave_type">Leave Type *</label>
        <select id="leave_type" name="leave_type" value={formData.leave_type} onChange={handleChange}>
          <option value="full_day">Full Day</option>
          <option value="half_day">Half Day (AM)</option>
          <option value="half_day_pm">Half Day (PM)</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="reason">Reason for Leave *</label>
        <select id="reason" name="reason" value={formData.reason} onChange={handleChange} required>
          <option value="">Select a reason...</option>
          <option value="annual">Annual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="emergency">Emergency Leave</option>
          <option value="personal">Personal Leave</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="notes">Additional Notes</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any additional details for your manager..."
          rows={3}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? '⏳ Submitting...' : '✓ Submit Request'}
      </button>
    </form>
  );
};

export default LeaveRequestForm;
