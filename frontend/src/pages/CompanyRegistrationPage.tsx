import '../styles/CompanyRegistrationPage.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastNotification } from '../utils/toastNotification';

const CompanyRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [formData, setFormData] = useState({
    name: '',
    uen: '',
    description: '',
    email: '',
    phone: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [uenError, setUenError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Company name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.email.includes('@')) errors.email = 'Please enter a valid email';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    return errors;
  };

  const validateUEN = async (uen: string) => {
    if (!uen.trim()) {
      setUenError('');
      return true;
    }

    setValidating(true);
    setUenError('');
    try {
      // UEN format: NNNNNNNNNA (9 digits + 1 letter)
      // For demo, we'll do basic format validation
      const uenRegex = /^[0-9]{8}[A-Z]{1}$/i;
      if (!uenRegex.test(uen.trim())) {
        setUenError('UEN format should be 8 digits + 1 letter (e.g., 123456789A)');
        return false;
      }
      setUenError('');
      return true;
    } finally {
      setValidating(false);
    }
  };

  const handleUENBlur = async () => {
    await validateUEN(formData.uen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showError('Please fix the errors below', 'Fill in all required fields');
      return;
    }

    // Validate UEN if provided
    if (formData.uen && !await validateUEN(formData.uen)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to create company');
      }

      const data = await response.json();
      setSuccess('Company created successfully!');
      showSuccess('Welcome to Errandify Business! 🎉', 'Your company profile is ready');

      setTimeout(() => {
        navigate(`/company/dashboard-new`);
      }, 1500);
    } catch (err: any) {
      console.error('Company creation error:', err);
      const errorMsg = err.message || 'Failed to create company. Please try again.';
      setError(errorMsg);
      showError('Company Registration Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="company-registration-container">
      <div className="registration-card">
        <div className="header-section">
          <div className="icon">🏢</div>
          <h1>Register Your Company</h1>
          <p className="subtitle">Set up your company profile to post errands and manage teams</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <span>✓</span> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Company Information</h3>

            <div className="form-group">
              <label htmlFor="name">Company Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your company name"
                className={formErrors.name ? 'error' : ''}
                disabled={loading}
              />
              {formErrors.name && <span className="field-error">⚠️ {formErrors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="uen">
                UEN (Business Registration Number)
                <span className="optional"> - Optional</span>
              </label>
              <input
                type="text"
                id="uen"
                name="uen"
                value={formData.uen}
                onChange={handleChange}
                onBlur={handleUENBlur}
                placeholder="e.g., 123456789A"
                className={uenError ? 'error' : ''}
                disabled={loading}
              />
              {uenError && <span className="field-error">⚠️ {uenError}</span>}
              <span className="field-hint">Format: 8 digits + 1 letter</span>
            </div>

            <div className="form-group">
              <label htmlFor="description">Company Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Tell us about your company, services, and specialties"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Contact Details</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@company.sg"
                  className={formErrors.email ? 'error' : ''}
                  disabled={loading}
                />
                {formErrors.email && <span className="field-error">⚠️ {formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+65 6123 4567"
                  className={formErrors.phone ? 'error' : ''}
                  disabled={loading}
                />
                {formErrors.phone && <span className="field-error">⚠️ {formErrors.phone}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Business Street, Singapore 123456"
                className={formErrors.address ? 'error' : ''}
                disabled={loading}
              />
              {formErrors.address && <span className="field-error">⚠️ {formErrors.address}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn primary"
              disabled={loading}
            >
              {loading ? '⏳ Creating Company...' : '✓ Create Company'}
            </button>
            <button
              type="button"
              className="submit-btn secondary"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>

          <p className="support-text">
            * Required fields | Already have a company? <a href="/company/dashboard-new">Go to Dashboard →</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default CompanyRegistrationPage;
