import '../styles/MyCompanyDashboard.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastNotification } from '../utils/toastNotification';
import CompanySubscriptionBilling from './CompanySubscriptionBilling';

interface Company {
  id: number;
  name: string;
  uen?: string;
  subscription_tier: 'silver' | 'gold' | 'platinum';
  wallet_balance: number;
  ep_balance: number;
  company_status: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  bio?: string;
  show_phone?: boolean;
  show_address?: boolean;
  certifications?: any[];
}

interface DashboardStats {
  activeEmployees: number;
  activeErrands: number;
  completedErrands: number;
  pendingOffers: number;
  walletBalance: number;
  epBalance: number;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  rater_name: string;
  created_at: string;
}

const MyCompanyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeEmployees: 0,
    activeErrands: 0,
    completedErrands: 0,
    pendingOffers: 0,
    walletBalance: 0,
    epBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [editingBiz, setEditingBiz] = useState(false);
  const [showBizDetails, setShowBizDetails] = useState(false);
  const [bizForm, setBizForm] = useState({
    industry: company?.industry || '',
    bio: company?.bio || '',
    show_phone: company?.show_phone || false,
    show_address: company?.show_address || false,
  });
  const [savingBiz, setSavingBiz] = useState(false);
  const [availableErrands, setAvailableErrands] = useState<any[]>([]);
  const [showSubscription, setShowSubscription] = useState(false);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Get company data
      const companyRes = await fetch(`${API_URL}/api/companies/user/my-company`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!companyRes.ok) {
        throw new Error('Company not found');
      }

      const companyData = await companyRes.json();
      setCompany(companyData.data);

      // Get employees count
      const employeesRes = await fetch(`${API_URL}/api/companies/${companyData.data.id}/employees?status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const employeesData = employeesRes.ok ? await employeesRes.json() : { data: [] };

      // Get reviews
      const reviewsRes = await fetch(`${API_URL}/api/companies/${companyData.data.id}/reviews`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const reviewsData = reviewsRes.ok ? await reviewsRes.json() : { data: [], average_rating: 0 };

      // Get errands (placeholder for now)
      const errandsData = { data: [] };

      const activeErrands = errandsData.data?.filter((e: any) => e.status === 'in_progress').length || 0;
      const completedErrands = errandsData.data?.filter((e: any) => e.status === 'completed').length || 0;

      setStats({
        activeEmployees: employeesData.data?.length || 0,
        activeErrands,
        completedErrands,
        pendingOffers: 0,
        walletBalance: parseFloat(companyData.data.wallet_balance) || 0,
        epBalance: parseFloat(companyData.data.ep_balance) || 0,
      });

      setReviews(reviewsData.data || []);
      setAvgRating(reviewsData.average_rating || 0);
      setError('');
    } catch (err: any) {
      console.error('Error fetching company data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableErrands = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch errands that are open and not yet bid on by this company
      const res = await fetch(`${API_URL}/api/errands?status=open&limit=6`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Filter to show only recent errands
        const filtered = (data.data || []).slice(0, 6);
        setAvailableErrands(filtered);
      }
    } catch (err: any) {
      console.error('Error fetching available errands:', err);
    }
  };

  useEffect(() => {
    fetchCompanyData();
    fetchAvailableErrands();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchCompanyData();
      fetchAvailableErrands();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveBizProfile = async () => {
    console.log('[MyBizProfile] Save clicked, company:', company, 'bizForm:', bizForm);
    if (!company) {
      showError('Company data not loaded', 'Please refresh and try again');
      return;
    }
    setSavingBiz(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/companies/${company.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry: bizForm.industry,
          bio: bizForm.bio,
          show_phone: bizForm.show_phone,
          show_address: bizForm.show_address,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompany(data.data);
        setEditingBiz(false);
        showSuccess('Profile updated successfully!', 'Your business profile has been saved');
      } else {
        showError('Failed to update profile', 'Please try again');
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      showError('Error saving profile', 'An unexpected error occurred');
    } finally {
      setSavingBiz(false);
    }
  };

  const suggestErrandCategories = async () => {
    console.log('[MyBizProfile] Suggest categories clicked');
    if (!company?.industry && !company?.bio) {
      console.log('[MyBizProfile] No industry or bio set');
      showError('Please fill in Industry or Bio first', 'Add business details to get AI suggestions');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log('[MyBizProfile] Calling suggest-categories API for company:', company.id);
      const res = await fetch(`${API_URL}/api/companies/${company.id}/suggest-categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry: company.industry,
          bio: company.bio,
        }),
      });

      console.log('[MyBizProfile] Suggest-categories response:', res.status, res.statusText);

      if (res.ok) {
        const data = await res.json();
        showSuccess(
          '✨ AI Suggestions Generated',
          `Suggested categories: ${data.suggestions.slice(0, 3).join(', ')}...`
        );
      } else {
        const errorText = await res.text();
        console.error('[MyBizProfile] API error:', errorText);
        showError('Failed to get suggestions', `Status: ${res.status}`);
      }
    } catch (err: any) {
      console.error('[MyBizProfile] Error suggesting categories:', err);
      showError('Error getting suggestions', err.message);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    console.log('[MyBizProfile] Logo upload clicked');
    if (!logoPreview || !company) {
      console.log('[MyBizProfile] Missing logoPreview or company data');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      console.log('[MyBizProfile] Uploading logo for company:', company.id);

      const res = await fetch(`${API_URL}/api/companies/${company.id}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logoUrl: logoPreview }),
      });

      console.log('[MyBizProfile] Logo upload response:', res.status, res.statusText);

      if (res.ok) {
        const data = await res.json();
        setCompany({ ...company, logo_url: data.data.logo_url });
        setLogoPreview('');
        showSuccess('Logo uploaded successfully!', 'Your company logo has been updated');
      } else {
        const errorText = await res.text();
        console.error('[MyBizProfile] Logo upload error:', errorText);
        showError('Failed to upload logo', `Status: ${res.status}`);
      }
    } catch (err: any) {
      console.error('[MyBizProfile] Logo upload failed:', err);
      showError('Error uploading logo', err.message);
    }
  };

  if (loading) {
    return (
      <div className="company-dashboard">
        <div className="loading">Loading company data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-dashboard">
        <div className="alert alert-error">
          <p>{error}</p>
          <button onClick={() => navigate('/company/register')}>Create Company</button>
        </div>
      </div>
    );
  }

  return (
    <div className="company-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-with-logo">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="Company Logo" className="company-logo" />
            ) : (
              <div className="company-logo-placeholder">📦</div>
            )}
            <div>
              <h1>{company?.name} <span className="uen-inline">({company?.uen})</span></h1>
              <span className="tier-badge">{company?.subscription_tier.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Rating Box on Right */}
        <div className="rating-box-right">
          <div className="rating-content">
            <span className="rating-label">Rating</span>
            <div className="rating-stars">{'⭐'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</div>
            <div className="rating-score-line">
              <span className="rating-number">{avgRating.toFixed(1)}</span>
              <span className="rating-count">({reviews.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* MyBiz Section - Collapsible */}
      <div className="mybiz-section">
        <button className="mybiz-toggle-btn" onClick={() => setShowBizDetails(!showBizDetails)}>
          <span className="toggle-icon">{showBizDetails ? '▼' : '▶'}</span>
          <span className="toggle-label">📱 MyBiz Profile</span>
        </button>

        {showBizDetails && (
          <div className="mybiz-content-wrapper">
            <div className="mybiz-actions">
              <label className="logo-upload-btn">
                🖼️ Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
              </label>
              <button className="btn-suggest" onClick={suggestErrandCategories}>
                🤖 Suggest Categories
              </button>
              <button
                className={editingBiz ? "btn-save" : "btn-edit"}
                onClick={() => editingBiz ? handleSaveBizProfile() : setEditingBiz(true)}
                disabled={savingBiz}
              >
                {editingBiz ? '💾 Save Changes' : '✏️ Edit Profile'}
              </button>
              {editingBiz && (
                <button
                  className="btn-cancel-edit"
                  onClick={() => {
                    setEditingBiz(false);
                    setBizForm({
                      industry: company?.industry || '',
                      bio: company?.bio || '',
                      show_phone: company?.show_phone || false,
                      show_address: company?.show_address || false,
                    });
                  }}
                >
                  ✕ Cancel
                </button>
              )}
            </div>

            {logoPreview && (
              <div className="logo-preview-section">
                <img src={logoPreview} alt="Logo Preview" className="logo-preview" />
                <div className="logo-actions">
                  <button className="btn-upload" onClick={handleLogoUpload}>
                    ✓ Save Logo
                  </button>
                  <button className="btn-cancel-edit" onClick={() => { setLogoPreview(''); setLogoFile(null); }}>
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mybiz-content">
              {/* Company Name and UEN Row */}
              <div className="mybiz-row">
                <div className="mybiz-item">
                  <span className="mybiz-label">Company Name</span>
                  <span className="mybiz-value">{company?.name || '-'}</span>
                </div>
                <div className="mybiz-item">
                  <span className="mybiz-label">UEN</span>
                  <span className="mybiz-value">{company?.uen || '-'}</span>
                </div>
              </div>

              {/* Email and Industry Row */}
              <div className="mybiz-row">
                <div className="mybiz-item">
                  <span className="mybiz-label">Email</span>
                  <span className="mybiz-value">{company?.email || '-'}</span>
                </div>
                <div className="mybiz-item">
                  <span className="mybiz-label">Industry</span>
                  {editingBiz ? (
                    <input
                      type="text"
                      value={bizForm.industry}
                      onChange={(e) => setBizForm({ ...bizForm, industry: e.target.value })}
                      placeholder="E.g., Cleaning & Facilities"
                      className="mybiz-input"
                    />
                  ) : (
                    <span className="mybiz-value">{company?.industry || 'Not set'}</span>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              <div className="mybiz-section-item">
                <span className="mybiz-label">Business Bio</span>
                {editingBiz ? (
                  <textarea
                    value={bizForm.bio}
                    onChange={(e) => setBizForm({ ...bizForm, bio: e.target.value })}
                    placeholder="Describe your business..."
                    className="mybiz-textarea"
                    rows={3}
                  />
                ) : (
                  <p className="mybiz-bio">{company?.bio || 'No bio added yet'}</p>
                )}
              </div>

              {/* Visibility Toggle Row */}
              <div className="mybiz-row">
                <div className="mybiz-toggle">
                  <input
                    type="checkbox"
                    id="show-phone"
                    checked={editingBiz ? bizForm.show_phone : (company?.show_phone || false)}
                    onChange={(e) => editingBiz && setBizForm({ ...bizForm, show_phone: e.target.checked })}
                    disabled={!editingBiz}
                  />
                  <label htmlFor="show-phone">Show Phone in Public Profile</label>
                  <span className="phone-preview">{(editingBiz ? bizForm.show_phone : company?.show_phone) ? company?.phone : '📵 Hidden'}</span>
                </div>
                <div className="mybiz-toggle">
                  <input
                    type="checkbox"
                    id="show-address"
                    checked={editingBiz ? bizForm.show_address : (company?.show_address || false)}
                    onChange={(e) => editingBiz && setBizForm({ ...bizForm, show_address: e.target.checked })}
                    disabled={!editingBiz}
                  />
                  <label htmlFor="show-address">Show Address in Public Profile</label>
                  <span className="address-preview">{(editingBiz ? bizForm.show_address : company?.show_address) ? company?.address : '📵 Hidden'}</span>
                </div>
              </div>

              {/* Certifications Section */}
              <div className="mybiz-section-item">
                <span className="mybiz-label">Certifications</span>
                {editingBiz ? (
                  <div className="cert-edit-section">
                    <p className="cert-help-text">Upload certificate files (PDF, JPG, PNG)</p>
                    <label className="cert-upload-btn">
                      📎 Add Certificates
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          // Handle certificate uploads
                          console.log('Certificates selected:', e.target.files);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {company?.certifications && company.certifications.length > 0 && (
                      <div className="certifications-list">
                        {company.certifications.map((cert: any, idx: number) => (
                          <div key={idx} className="cert-edit-item">
                            <span className="cert-badge">✓ {cert.title}</span>
                            <button className="cert-delete" onClick={() => console.log('Delete cert', idx)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="certifications-list">
                    {company?.certifications && company.certifications.length > 0 ? (
                      company.certifications.map((cert: any, idx: number) => (
                        <span key={idx} className="cert-badge">
                          ✓ {cert.title}
                        </span>
                      ))
                    ) : (
                      <p className="no-cert-text">No certifications added</p>
                    )}
                  </div>
                )}
              </div>

              {/* Errand Categories Section */}
              <div className="mybiz-section-item">
                <span className="mybiz-label">Service Categories</span>
                <p className="category-hint">AI-suggested categories based on your industry</p>
                <button className="btn-add-category" onClick={suggestErrandCategories}>
                  + Add Categories
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats - Compact Single Line */}
      <div className="stats-grid-compact">
        <div className="stat-card-compact">
          <div className="stat-icon">👥</div>
          <div className="stat-compact-content">
            <div className="stat-number">{stats.activeEmployees}</div>
            <div className="stat-label">Employees</div>
          </div>
          <button className="stat-action" onClick={() => navigate('/company/staff')}>
            Manage
          </button>
        </div>

        <div className="stat-card-compact">
          <div className="stat-icon">📋</div>
          <div className="stat-compact-content">
            <div className="stat-number">{stats.activeErrands}</div>
            <div className="stat-label">Active</div>
          </div>
          <button className="stat-action" onClick={() => navigate('/company/errands')}>
            View
          </button>
        </div>

        <div className="stat-card-compact">
          <div className="stat-icon">✅</div>
          <div className="stat-compact-content">
            <div className="stat-number">{stats.completedErrands}</div>
            <div className="stat-label">Completed</div>
          </div>
          <button className="stat-action" onClick={() => navigate('/company/errands')}>
            Details
          </button>
        </div>

        <div className="stat-card-compact">
          <div className="stat-icon">💰</div>
          <div className="stat-compact-content">
            <div className="stat-number">SGD ${stats.walletBalance.toFixed(2)}</div>
            <div className="stat-label">Wallet</div>
          </div>
          <button className="stat-action" onClick={() => navigate('/company/wallet')}>
            Details
          </button>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="mybiz-section">
        <button className="mybiz-toggle-btn" onClick={() => setShowSubscription(!showSubscription)}>
          <span className="toggle-icon">{showSubscription ? '▼' : '▶'}</span>
          <span className="toggle-label">💳 Subscription & Billing</span>
        </button>

        {showSubscription && (
          <div className="mybiz-content-wrapper">
            <CompanySubscriptionBilling />
          </div>
        )}
      </div>

      {/* Main Actions */}
      <div className="actions-section">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => navigate('/company/post-errand')}>
            <span className="btn-icon">📋</span>
            <span className="btn-text">Post Errand</span>
            <span className="btn-desc">Create task with Hana AI</span>
          </button>

          <button className="action-btn" onClick={() => navigate('/company/staff')}>
            <span className="btn-icon">👤</span>
            <span className="btn-text">Manage Staff</span>
            <span className="btn-desc">Add or remove team members</span>
          </button>

          <button className="action-btn" onClick={() => navigate('/company/leaves')}>
            <span className="btn-icon">📅</span>
            <span className="btn-text">Leave Requests</span>
            <span className="btn-desc">Approve employee leave</span>
          </button>

          <button className="action-btn" onClick={() => navigate('/company/wallet')}>
            <span className="btn-icon">💳</span>
            <span className="btn-text">Wallet & Payouts</span>
            <span className="btn-desc">Manage company finances</span>
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="activity-section">
        <div className="reviews-header">
          <h2>⭐ Company Reviews</h2>
          <div className="rating-summary">
            <div className="avg-rating">
              <div className="rating-stars">
                {'⭐'.repeat(Math.round(avgRating))}
                {'☆'.repeat(5 - Math.round(avgRating))}
              </div>
              <span className="rating-text">{avgRating.toFixed(1)} / 5.0</span>
              <span className="review-count">({reviews.length} reviews)</span>
            </div>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="reviews-list">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="review-rater">
                    <span className="review-name">{review.rater_name}</span>
                    <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="review-stars">
                    {'⭐'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                <p className="review-comment">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-reviews">
            <p>No reviews yet. Complete more errands to earn reviews!</p>
          </div>
        )}
      </div>

      {/* Available Errands - Company Perspective */}
      <div className="available-errands-section">
        <div className="errands-header">
          <h2>🎯 Available Opportunities</h2>
          <p className="errands-subtitle">Errands you can offer your services for</p>
        </div>

        {availableErrands.length > 0 ? (
          <div className="errands-grid">
            {availableErrands.map((errand: any) => (
              <div key={errand.id} className="errand-card-company">
                <div className="errand-header-company">
                  <span className="errand-category">{errand.category || 'General'}</span>
                  <span className="errand-location">📍 {errand.area || 'Location'}</span>
                </div>
                <h3 className="errand-title">{errand.title || 'Untitled Errand'}</h3>
                <p className="errand-description">{(errand.description || '').substring(0, 80)}...</p>
                <div className="errand-footer">
                  <div className="errand-budget">
                    <span className="budget-label">Budget:</span>
                    <span className="budget-value">SGD ${errand.budget || 'N/A'}</span>
                  </div>
                  <button
                    className="btn-submit-offer"
                    onClick={() => navigate(`/errand/${errand.id}`)}
                  >
                    📋 View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-errands">
            <p>No available errands at the moment. Check back soon!</p>
            <button className="btn-browse-all" onClick={() => navigate('/browse')}>
              📍 Browse All Errands
            </button>
          </div>
        )}
      </div>

      {/* Subscription & Settings */}
      <div className="activity-section">
        <h2>Subscription & Settings</h2>
        <div className="subscription-card">
          <div className="subscription-header">
            <h3>Current Plan: {company?.subscription_tier.toUpperCase()}</h3>
            <span className="status-badge active">Active</span>
          </div>
          <div className="subscription-details">
            <p>Your current subscription tier provides access to essential company management features.</p>
            <button className="secondary-btn" onClick={() => navigate('/company/upgrade')}>
              View Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCompanyDashboard;
