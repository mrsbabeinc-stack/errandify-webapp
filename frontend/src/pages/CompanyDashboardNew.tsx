import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CompanyDashboardNew.css';
import CompanyLeaveCalendar from '../components/CompanyLeaveCalendar';
import CompanyPointsDistribution from '../components/CompanyPointsDistribution';
import CompanyStaffResignation from '../components/CompanyStaffResignation';
import CompanyPaymentHistory from '../components/CompanyPaymentHistory';
import ManagerStaffAllocations from '../components/ManagerStaffAllocations';
import ReviewApprovalPanel from '../components/ReviewApprovalPanel';
import CompanyDisputeCenter from '../components/CompanyDisputeCenter';
import AskerPostErrand from '../components/AskerPostErrand';
import AskerBidsReceived from '../components/AskerBidsReceived';
import AskerReviews from '../components/AskerReviews';
import DoerBrowseErrands from '../components/DoerBrowseErrands';
import DoerAllocateErrands from '../components/DoerAllocateErrands';
import DoerMyOffers from '../components/DoerMyOffers';
import DoerActiveErrands from '../components/DoerActiveErrands';
import DoerCompletedErrands from '../components/DoerCompletedErrands';
import DoerReviews from '../components/DoerReviews';

interface Company {
  id: number;
  name: string;
  uen?: string;
  subscription_tier: 'silver' | 'gold' | 'platinum';
  wallet_balance: number;
  ep_balance: number;
  logo_url?: string;
  industry?: string;
  bio?: string;
  email?: string;
  phone?: string;
  rating?: number;
}

interface DashboardStats {
  tasksDone: number;
  thisMonth: number;
  rating: number;
  partnerTier: string;
  staffCount: number;
  pointsBalance: number;
  activeAds: number;
  revenue: number;
}

interface Errand {
  id: number;
  title: string;
  category: string;
  budget: number;
  area: string;
  description: string;
  status: string;
}

const CompanyDashboardNew: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // State Management
  const [viewMode, setViewMode] = useState<'asker' | 'doer' | 'owner'>('owner');
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    tasksDone: 342,
    thisMonth: 28,
    rating: 4.8,
    partnerTier: 'Gold',
    staffCount: 12,
    pointsBalance: 3450,
    activeAds: 2,
    revenue: 15240,
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [actionItemFilter, setActionItemFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'done'>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('');

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const banners = [
    {
      id: 1,
      title: `Welcome back, ${company?.name}`,
      description: 'Your performance this month is looking great. Keep up the momentum!',
      badge: `${stats.partnerTier} Partner`,
      badgeIcon: '⭐',
      gradient: 'linear-gradient(135deg, #FF6B35, #FF8C5A)',
    },
    {
      id: 2,
      title: 'New Feature Launch',
      description: 'Advanced analytics dashboard now available for all Gold partners and above.',
      badge: 'New',
      badgeIcon: '✨',
      gradient: 'linear-gradient(135deg, #5BA3D0, #7DB8E0)',
    },
    {
      id: 3,
      title: 'Limited Time Offer',
      description: 'Upgrade to Platinum and get 30% off your first three months!',
      badge: 'Promo',
      badgeIcon: '🎉',
      gradient: 'linear-gradient(135deg, #9B59B6, #C39BD3)',
    },
    {
      id: 4,
      title: 'Important Update',
      description: 'We\'ve improved our payment processing speed. Transactions now settle in 2-4 hours.',
      badge: 'Update',
      badgeIcon: '📌',
      gradient: 'linear-gradient(135deg, #27AE60, #52BE80)',
    },
  ];

  const handleBannerNext = () => {
    setBannerIndex((prev) => (prev + 1) % banners.length);
  };

  const handleBannerPrev = () => {
    setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const currentBanner = banners[bannerIndex];

  const fetchCompanyData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/companies/user/my-company`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCompany(data.data);
      } else {
        setCompany({
          id: 1,
          name: 'Rumah Emas Demo Company',
          uen: 'UEN202401001',
          subscription_tier: 'gold',
          wallet_balance: 15240,
          ep_balance: 3450,
          logo_url: '',
          rating: 4.8,
        });
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      setCompany({
        id: 1,
        name: 'Rumah Emas Demo Company',
        uen: 'UEN202401001',
        subscription_tier: 'gold',
        wallet_balance: 15240,
        ep_balance: 3450,
        logo_url: '',
        rating: 4.8,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    window.location.href = '/auth';
  };

  const downloadInvoice = (invoiceId: string, date: string) => {
    const invoiceData = `Invoice ID: ${invoiceId}
Date: ${date}
Gold Partner - Monthly Subscription
Amount: SGD $199.00

This is a sample invoice. For actual invoices, integrate with Stripe PDF API.`;

    const blob = new Blob([invoiceData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="company-dashboard-new"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="company-dashboard-new">
      {/* Header */}
      <div className="company-header-v2">
        <div className="header-left">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          {company?.logo_url ? (
            <img src={company.logo_url} alt="Logo" className="header-logo" />
          ) : (
            <div className="header-logo-placeholder">🏢</div>
          )}
          <div>
            <h1>{company?.name}</h1>
            <p className="uen-text">{company?.uen}</p>
          </div>
        </div>
        <div className="header-center">
          <div className="view-toggle-group">
            <button
              className={`view-btn ${viewMode === 'asker' ? 'active' : ''}`}
              onClick={() => setViewMode('asker')}
              title="Asker - Post Errands"
            >
              📋 Asker
            </button>
            <button
              className={`view-btn ${viewMode === 'doer' ? 'active' : ''}`}
              onClick={() => setViewMode('doer')}
              title="Doer - Browse Tasks"
            >
              🔍 Doer
            </button>
            <button
              className={`view-btn ${viewMode === 'owner' ? 'active' : ''}`}
              onClick={() => setViewMode('owner')}
              title="Owner - Full Control"
            >
              👑 Owner
            </button>
          </div>
        </div>
        <div className="header-right">
          <button className="notification-btn">🔔 <span className="badge">3</span></button>
          <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </div>

      <div className="dashboard-container">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="sidebar">
            <nav className="sidebar-nav">
              {/* TOP LEVEL */}
              <div className="nav-section">
                <h3>TOP LEVEL</h3>
                <a href="#" className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>
                  📊 Dashboard
                </a>
              </div>

              {/* ASKER SECTION - Company posting tasks */}
              <div className="nav-section">
                <h3>ASKER SECTION</h3>
                <a href="#" className={`nav-item ${activeSection === 'errands' ? 'active' : ''}`} onClick={() => setActiveSection('errands')}>
                  📁 My Errands
                </a>
                <a href="#" className={`nav-item ${activeSection === 'asker-post' ? 'active' : ''}`} onClick={() => setActiveSection('asker-post')}>
                  ➕ Post Errand
                </a>
                <a href="#" className={`nav-item ${activeSection === 'asker-bids' ? 'active' : ''}`} onClick={() => setActiveSection('asker-bids')}>
                  📊 Bids Received
                </a>
                <a href="#" className={`nav-item ${activeSection === 'asker-reviews' ? 'active' : ''}`} onClick={() => setActiveSection('asker-reviews')}>
                  ⭐ Reviews (As Asker)
                </a>
              </div>

              {/* DOER SECTION - Company's staff doing tasks */}
              <div className="nav-section">
                <h3>DOER SECTION</h3>
                <a href="#" className={`nav-item ${activeSection === 'doer-browse' ? 'active' : ''}`} onClick={() => setActiveSection('doer-browse')}>
                  🔍 Browse Tasks
                </a>
                <a href="#" className={`nav-item ${activeSection === 'doer-allocate' ? 'active' : ''}`} onClick={() => setActiveSection('doer-allocate')}>
                  📦 Allocate Tasks
                </a>
                <a href="#" className={`nav-item ${activeSection === 'doer-active' ? 'active' : ''}`} onClick={() => setActiveSection('doer-active')}>
                  🚀 Active Tasks
                </a>
                <a href="#" className={`nav-item ${activeSection === 'doer-completed' ? 'active' : ''}`} onClick={() => setActiveSection('doer-completed')}>
                  ✅ Completed
                </a>
                <a href="#" className={`nav-item ${activeSection === 'doer-reviews' ? 'active' : ''}`} onClick={() => setActiveSection('doer-reviews')}>
                  ⭐ Reviews (As Doer)
                </a>
              </div>

              {/* STAFF MANAGEMENT */}
              <div className="nav-section">
                <h3>STAFF MANAGEMENT</h3>
                <a href="#" className={`nav-item ${activeSection === 'staff' ? 'active' : ''}`} onClick={() => setActiveSection('staff')}>
                  👥 My Staff
                </a>
                <a href="#" className={`nav-item ${activeSection === 'errand-allocation' ? 'active' : ''}`} onClick={() => setActiveSection('errand-allocation')}>
                  📦 Staff Tasks
                </a>
                <a href="#" className={`nav-item ${activeSection === 'leave-calendar' ? 'active' : ''}`} onClick={() => setActiveSection('leave-calendar')}>
                  📅 Leave Calendar
                </a>
              </div>

              {/* COMPANY OPS */}
              <div className="nav-section">
                <h3>COMPANY OPS</h3>
                <a href="#" className={`nav-item ${activeSection === 'mybiz' ? 'active' : ''}`} onClick={() => setActiveSection('mybiz')}>
                  🏢 Company Profile
                </a>
                <a href="#" className={`nav-item ${activeSection === 'payment-history' ? 'active' : ''}`} onClick={() => setActiveSection('payment-history')}>
                  💳 Payments
                </a>
                <a href="#" className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`} onClick={() => setActiveSection('analytics')}>
                  📈 Analytics
                </a>
                <a href="#" className={`nav-item ${activeSection === 'disputes' ? 'active' : ''}`} onClick={() => setActiveSection('disputes')}>
                  ⚠️ Disputes
                </a>
                <a href="#" className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => setActiveSection('settings')}>
                  ⚙️ Settings
                </a>
              </div>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="main-content">
          {activeSection === 'dashboard' && (
            <div className="section-dashboard">
              {/* Hero Banner Carousel - Keep at Top */}
              <div className="hero-carousel">
                <div className="hero-banner" style={{ background: currentBanner.gradient }}>
                  <div className="hero-content">
                    <h2>{currentBanner.title}</h2>
                    <p>{currentBanner.description}</p>
                  </div>
                  <div className="hero-badge">
                    <span className="badge-icon">{currentBanner.badgeIcon}</span>
                    <span className="badge-text">{currentBanner.badge}</span>
                  </div>
                </div>

                {/* Carousel Controls */}
                <div className="carousel-controls">
                  <button className="carousel-btn carousel-prev" onClick={handleBannerPrev}>
                    ◀
                  </button>
                  <div className="carousel-dots">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        className={`dot ${idx === bannerIndex ? 'active' : ''}`}
                        onClick={() => setBannerIndex(idx)}
                        aria-label={`Go to banner ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <button className="carousel-btn carousel-next" onClick={handleBannerNext}>
                    ▶
                  </button>
                </div>
              </div>

              {/* Follow-ups & Action Items - Moved Up */}
              <div className="action-items-section">
                <div className="action-items-header">
                  <h2>⚡ Follow-ups & Action Items</h2>
                  <div className="priority-filters">
                    <button
                      className={`filter-btn ${actionItemFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setActionItemFilter('all')}
                    >
                      All <span className="count-badge">5</span>
                    </button>
                    <button
                      className={`filter-btn high ${actionItemFilter === 'high' ? 'active' : ''}`}
                      onClick={() => setActionItemFilter('high')}
                    >
                      High <span className="count-badge">1</span>
                    </button>
                    <button
                      className={`filter-btn medium ${actionItemFilter === 'medium' ? 'active' : ''}`}
                      onClick={() => setActionItemFilter('medium')}
                    >
                      Medium <span className="count-badge">2</span>
                    </button>
                    <button
                      className={`filter-btn low ${actionItemFilter === 'low' ? 'active' : ''}`}
                      onClick={() => setActionItemFilter('low')}
                    >
                      Low <span className="count-badge">1</span>
                    </button>
                    <button
                      className={`filter-btn done ${actionItemFilter === 'done' ? 'active' : ''}`}
                      onClick={() => setActionItemFilter('done')}
                    >
                      Done <span className="count-badge">1</span>
                    </button>
                  </div>
                </div>
                <div className="action-items-list">
                  {(actionItemFilter === 'all' || actionItemFilter === 'high') && (
                    <div className="action-item high-priority">
                      <div className="priority-badge">HIGH</div>
                      <div className="item-content">
                        <h4>Approve Pending Leave Requests</h4>
                        <p>2 staff members waiting for approval</p>
                        <span className="due-date">Due: Today</span>
                      </div>
                      <button className="item-action">→ Review</button>
                    </div>
                  )}

                  {(actionItemFilter === 'all' || actionItemFilter === 'medium') && (
                    <>
                      <div className="action-item medium-priority">
                        <div className="priority-badge">MEDIUM</div>
                        <div className="item-content">
                          <h4>Review Staff Resignation Requests</h4>
                          <p>1 errand resignation pending manager approval</p>
                          <span className="due-date">Due: Tomorrow</span>
                        </div>
                        <button className="item-action">→ Review</button>
                      </div>

                      <div className="action-item medium-priority">
                        <div className="priority-badge">MEDIUM</div>
                        <div className="item-content">
                          <h4>Allocate Points to Staff</h4>
                          <p>Monthly points distribution pending</p>
                          <span className="due-date">Due: Jul 15</span>
                        </div>
                        <button className="item-action">→ Allocate</button>
                      </div>
                    </>
                  )}

                  {(actionItemFilter === 'all' || actionItemFilter === 'low') && (
                    <div className="action-item low-priority">
                      <div className="priority-badge">LOW</div>
                      <div className="item-content">
                        <h4>Check Advertising Performance</h4>
                        <p>2 active campaigns - CTR declined 2%</p>
                        <span className="due-date">Due: Jul 20</span>
                      </div>
                      <button className="item-action">→ Analyze</button>
                    </div>
                  )}

                  {(actionItemFilter === 'all' || actionItemFilter === 'done') && (
                    <div className="action-item completed">
                      <div className="priority-badge">DONE</div>
                      <div className="item-content">
                        <h4>Update Company Bio</h4>
                        <p>✓ Completed on Jul 10</p>
                        <span className="due-date">Completed</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-top">
                    <h3>✅ Tasks Completed</h3>
                  </div>
                  <div className="kpi-bottom">
                    <div className="kpi-value">{stats.tasksDone}</div>
                    <div className="kpi-description">All-time total</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <h3>📅 This Month</h3>
                  </div>
                  <div className="kpi-bottom">
                    <div className="kpi-value">{stats.thisMonth}</div>
                    <div className="kpi-description">Tasks posted</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <h3>⭐ Your Rating</h3>
                  </div>
                  <div className="kpi-bottom">
                    <div className="kpi-value">{stats.rating}/5</div>
                    <div className="kpi-description">5.4k ratings</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <h3>🏅 Partner Tier</h3>
                  </div>
                  <div className="kpi-bottom">
                    <div className="kpi-value">{stats.partnerTier}</div>
                    <div className="kpi-description">Premium status</div>
                  </div>
                </div>
              </div>

              {/* Active Subscription - Brief */}
              <div className="subscription-brief">
                <div className="brief-content">
                  <div className="brief-left">
                    <h3>Active Subscription</h3>
                    <p className="plan-name">{company?.subscription_tier?.toUpperCase() || 'GOLD'} Partner</p>
                    <p className="plan-status">● Active • Renews Aug 10</p>
                  </div>
                  <div className="brief-right">
                    <button className="btn-upgrade-brief">View Details →</button>
                  </div>
                </div>
              </div>

              {/* Advertising Section */}
              <div className="advertising-card">
                <div className="card-header">
                  <h2>Advertising Campaigns</h2>
                  <button className="btn-primary">+ New Campaign</button>
                </div>
                <div className="advertising-content">
                  <div className="ad-stats">
                    <div className="ad-stat">
                      <span className="label">Active Ads</span>
                      <span className="value">{stats.activeAds}</span>
                    </div>
                    <div className="ad-stat">
                      <span className="label">Impressions</span>
                      <span className="value">2,450</span>
                    </div>
                    <div className="ad-stat">
                      <span className="label">Monthly Budget</span>
                      <span className="value">SGD $500</span>
                    </div>
                    <div className="ad-stat">
                      <span className="label">Spent</span>
                      <span className="value">SGD $320</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <button className="action-card">
                    <span className="action-icon">📝</span>
                    <span className="action-name">Post Errand</span>
                    <span className="action-desc">Create new task</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">👥</span>
                    <span className="action-name">Add Staff</span>
                    <span className="action-desc">Invite team member</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">📊</span>
                    <span className="action-name">View Reports</span>
                    <span className="action-desc">Analytics</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">💬</span>
                    <span className="action-name">Messages</span>
                    <span className="action-desc">12 unread</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <footer className="dashboard-footer">
                <div className="footer-content">
                  <div className="footer-section">
                    <h4>About Errandify</h4>
                    <p>Connecting businesses with trusted service providers across Singapore.</p>
                  </div>
                  <div className="footer-section">
                    <h4>Support</h4>
                    <ul>
                      <li><a href="#help">Help Center</a></li>
                      <li><a href="#contact">Contact Us</a></li>
                      <li><a href="#terms">Terms & Conditions</a></li>
                    </ul>
                  </div>
                  <div className="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                      <li><a href="#blog">Blog</a></li>
                      <li><a href="#privacy">Privacy Policy</a></li>
                      <li><a href="#status">System Status</a></li>
                    </ul>
                  </div>
                </div>
                <div className="footer-bottom">
                  <p>&copy; 2026 Errandify. All rights reserved. | v1.0.0</p>
                </div>
              </footer>
            </div>
          )}

          {activeSection === 'mybiz' && (
            <div className="section-content">
              <h2>MyBiz Profile</h2>

              <div className="mybiz-container">
                {/* Company Info Card */}
                <div className="mybiz-card">
                  <h3>Company Information</h3>
                  <div className="mybiz-row">
                    <label>Company Name</label>
                    <input type="text" value={company?.name} readOnly />
                  </div>
                  <div className="mybiz-row">
                    <label>UEN</label>
                    <input type="text" value={company?.uen} readOnly />
                  </div>
                  <div className="mybiz-row">
                    <label>Email</label>
                    <input type="text" value={company?.email || 'contact@company.com'} readOnly />
                  </div>
                  <div className="mybiz-row">
                    <label>Phone</label>
                    <input type="text" value={company?.phone || '+65 6000 0000'} readOnly />
                  </div>
                  <div className="mybiz-row">
                    <label>Industry</label>
                    <input type="text" value={company?.industry || 'Professional Services'} readOnly />
                  </div>
                  <button className="btn-edit">Edit Profile</button>
                </div>

                {/* Logo & Bio */}
                <div className="mybiz-card">
                  <h3>Logo & Description</h3>
                  <div className="logo-preview">
                    {company?.logo_url ? (
                      <img src={company.logo_url} alt="Company Logo" />
                    ) : (
                      <div className="logo-placeholder">🏢</div>
                    )}
                  </div>
                  <div className="mybiz-row">
                    <label>Bio</label>
                    <textarea readOnly value={company?.bio || 'Professional services provider dedicated to excellence.'} onChange={() => {}} />
                  </div>
                  <button className="btn-edit">Update Logo & Bio</button>
                </div>

                {/* Certifications */}
                <div className="mybiz-card">
                  <h3>Certifications & Credentials</h3>
                  <div className="cert-list">
                    <div className="cert-item">
                      <span>ISO 9001:2015 Quality Management</span>
                      <small>Expires: Dec 2027</small>
                    </div>
                    <div className="cert-item">
                      <span>ISO 45001 Occupational Safety</span>
                      <small>Expires: Jun 2028</small>
                    </div>
                  </div>
                  <button className="btn-edit">Manage Certifications</button>
                </div>

                {/* Reviews & Ratings */}
                <div className="mybiz-card">
                  <h3>Company Ratings</h3>
                  <div className="rating-summary">
                    <div className="rating-score">
                      <span className="score">{company?.rating || 4.8}</span>
                      <span className="outof">/5.0</span>
                    </div>
                    <div className="rating-details">
                      <div className="rating-bar">
                        <div className="bar-fill" style={{width: '95%'}}></div>
                      </div>
                      <span className="rating-count">Based on 5.4k ratings</span>
                    </div>
                  </div>
                  <button className="btn-edit">View Reviews</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'errands' && (
            <div className="section-content">
              <h2>My Errands</h2>
              <div className="errands-container">
                <div className="errands-filters">
                  <button className="filter-chip active">All (12)</button>
                  <button className="filter-chip">Active (5)</button>
                  <button className="filter-chip">Completed (7)</button>
                  <button className="filter-chip">Cancelled (0)</button>
                </div>
                <div className="errands-list">
                  <div className="errand-card active">
                    <div className="errand-header">
                      <h4>House Cleaning - Bishan</h4>
                      <span className="status-badge active">Active</span>
                    </div>
                    <p className="errand-desc">Professional house cleaning service for 3-bedroom apartment</p>
                    <div className="errand-meta">
                      <span>📍 Bishan, Singapore</span>
                      <span>💰 SGD $180</span>
                      <span>👤 Jordan Smith (Doer)</span>
                    </div>
                    <div className="errand-progress">
                      <div className="progress-bar" style={{width: '60%'}}></div>
                    </div>
                    <p className="progress-text">In Progress - 60% complete</p>
                  </div>

                  <div className="errand-card active">
                    <div className="errand-header">
                      <h4>Office Renovation - Raffles</h4>
                      <span className="status-badge active">Active</span>
                    </div>
                    <p className="errand-desc">Minor office renovation and painting work</p>
                    <div className="errand-meta">
                      <span>📍 Raffles, Singapore</span>
                      <span>💰 SGD $450</span>
                      <span>👤 Ava Johnson (Doer)</span>
                    </div>
                    <div className="errand-progress">
                      <div className="progress-bar" style={{width: '30%'}}></div>
                    </div>
                    <p className="progress-text">Not Started - 0% complete</p>
                  </div>

                  <div className="errand-card completed">
                    <div className="errand-header">
                      <h4>Website Design - Marina Bay</h4>
                      <span className="status-badge completed">✓ Completed</span>
                    </div>
                    <p className="errand-desc">Completed on July 8, 2026</p>
                    <div className="errand-meta">
                      <span>📍 Marina Bay, Singapore</span>
                      <span>💰 SGD $800</span>
                      <span>⭐ Rating: 4.9/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'staff' && (
            <div className="section-content">
              <h2>My Staff</h2>
              <div className="staff-container">
                <div className="staff-actions">
                  <button className="btn-primary">+ Add Staff Member</button>
                </div>
                <div className="staff-list">
                  <div className="staff-card">
                    <div className="staff-header">
                      <div className="staff-avatar">JS</div>
                      <div className="staff-info">
                        <h4>Jordan Smith</h4>
                        <p className="role">Senior Doer</p>
                      </div>
                      <div className="staff-stats">
                        <span className="stat">✅ 45 tasks</span>
                        <span className="stat">⭐ 4.8</span>
                      </div>
                    </div>
                    <div className="staff-details">
                      <span className="badge">Verified</span>
                      <span className="badge">Active</span>
                      <span className="badge">3.2k EP</span>
                    </div>
                    <div className="staff-actions-small">
                      <button>Edit</button>
                      <button>View Tasks</button>
                    </div>
                  </div>

                  <div className="staff-card">
                    <div className="staff-header">
                      <div className="staff-avatar">AJ</div>
                      <div className="staff-info">
                        <h4>Ava Johnson</h4>
                        <p className="role">Doer</p>
                      </div>
                      <div className="staff-stats">
                        <span className="stat">✅ 28 tasks</span>
                        <span className="stat">⭐ 4.6</span>
                      </div>
                    </div>
                    <div className="staff-details">
                      <span className="badge">Verified</span>
                      <span className="badge">Active</span>
                      <span className="badge">1.8k EP</span>
                    </div>
                    <div className="staff-actions-small">
                      <button>Edit</button>
                      <button>View Tasks</button>
                    </div>
                  </div>

                  <div className="staff-card">
                    <div className="staff-header">
                      <div className="staff-avatar">RW</div>
                      <div className="staff-info">
                        <h4>Rachel Wong</h4>
                        <p className="role">Doer</p>
                      </div>
                      <div className="staff-stats">
                        <span className="stat">✅ 12 tasks</span>
                        <span className="stat">⭐ 4.9</span>
                      </div>
                    </div>
                    <div className="staff-details">
                      <span className="badge">Verified</span>
                      <span className="badge">Active</span>
                      <span className="badge">850 EP</span>
                    </div>
                    <div className="staff-actions-small">
                      <button>Edit</button>
                      <button>View Tasks</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'ads' && (
            <div className="section-content">
              <h2>Advertising</h2>
              <p>Advertising management section coming soon...</p>
            </div>
          )}

          {activeSection === 'errand-allocation' && (
            <div className="section-content">
              <h2>Errand Allocation</h2>
              <ManagerStaffAllocations companyId={company?.id || 1} />
            </div>
          )}

          {activeSection === 'review-approval' && (
            <div className="section-content">
              <h2>Review Approval</h2>
              <ReviewApprovalPanel companyId={company?.id || 1} />
            </div>
          )}

          {activeSection === 'disputes' && (
            <div className="section-content">
              <CompanyDisputeCenter companyId={company?.id || 1} />
            </div>
          )}

          {activeSection === 'subscription' && (
            <div className="section-content">
              <h2>Subscription & Billing</h2>

              <div className="subscription-full-card">
                <div className="card-header">
                  <h3>Current Subscription</h3>
                </div>
                <div className="subscription-details">
                  <div className="detail-row">
                    <span className="label">Plan</span>
                    <span className="value">{company?.subscription_tier?.toUpperCase() || 'GOLD'} Partner</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Monthly Fee</span>
                    <span className="value">SGD $199</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Renewal Date</span>
                    <span className="value">Aug 10, 2026</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status</span>
                    <span className="value status-active">● Active</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Days Remaining</span>
                    <span className="value">30 days</span>
                  </div>
                </div>
              </div>

              <div className="subscription-full-card">
                <div className="card-header">
                  <h3>Plan Benefits</h3>
                </div>
                <div className="benefits-list">
                  <div className="benefit-item">
                    <span className="benefit-check">✓</span>
                    <div>
                      <h4>Up to 50 Active Errands</h4>
                      <p>Post and manage up to 50 concurrent tasks</p>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-check">✓</span>
                    <div>
                      <h4>Unlimited Staff Members</h4>
                      <p>Add and manage unlimited team members</p>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-check">✓</span>
                    <div>
                      <h4>Advanced Analytics</h4>
                      <p>Access detailed performance and revenue reports</p>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-check">✓</span>
                    <div>
                      <h4>Priority Support</h4>
                      <p>24/7 dedicated customer support</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="subscription-full-card">
                <div className="card-header">
                  <h3>Compare All Plans</h3>
                </div>
                <div className="tier-comparison-table">
                  <div className="tier-row header">
                    <div className="tier-col feature">Feature</div>
                    <div className="tier-col silver">🥈 Silver</div>
                    <div className="tier-col gold current">🥇 Gold (Current)</div>
                    <div className="tier-col platinum">💎 Platinum</div>
                  </div>
                  <div className="tier-row">
                    <div className="tier-col feature">Max Active Errands</div>
                    <div className="tier-col silver">25</div>
                    <div className="tier-col gold current">50</div>
                    <div className="tier-col platinum">200</div>
                  </div>
                  <div className="tier-row">
                    <div className="tier-col feature">Staff Members</div>
                    <div className="tier-col silver">5</div>
                    <div className="tier-col gold current">Unlimited</div>
                    <div className="tier-col platinum">Unlimited</div>
                  </div>
                  <div className="tier-row">
                    <div className="tier-col feature">Monthly Fee</div>
                    <div className="tier-col silver">SGD $99</div>
                    <div className="tier-col gold current">SGD $199</div>
                    <div className="tier-col platinum">SGD $399</div>
                  </div>
                  <div className="tier-row">
                    <div className="tier-col feature">Priority Support</div>
                    <div className="tier-col silver">✗ Basic</div>
                    <div className="tier-col gold current">✓ 24/7</div>
                    <div className="tier-col platinum">✓ Dedicated</div>
                  </div>
                  <div className="tier-row">
                    <div className="tier-col feature">Advanced Analytics</div>
                    <div className="tier-col silver">✗</div>
                    <div className="tier-col gold current">✓</div>
                    <div className="tier-col platinum">✓</div>
                  </div>
                  <div className="tier-row">
                    <div className="tier-col feature">API Access</div>
                    <div className="tier-col silver">✗</div>
                    <div className="tier-col gold current">✗</div>
                    <div className="tier-col platinum">✓</div>
                  </div>
                </div>
              </div>

              <div className="subscription-full-card">
                <div className="card-header">
                  <h3>Upgrade Your Plan</h3>
                </div>
                <div className="upgrade-options">
                  <div className="upgrade-option">
                    <h4>Platinum Partner</h4>
                    <p className="price">SGD $399/month</p>
                    <ul>
                      <li>✓ Up to 200 active errands</li>
                      <li>✓ Unlimited staff members</li>
                      <li>✓ Advanced branding</li>
                      <li>✓ API access</li>
                      <li>✓ Dedicated support</li>
                    </ul>
                    <button className="btn-upgrade-full" onClick={() => {
                      alert('Upgrade to Platinum - SGD $399/month - Redirecting to Stripe checkout');
                    }}>Upgrade to Platinum Now</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="section-content">
              <div className="analytics-header">
                <h2>Analytics & Reports</h2>
                <div className="analytics-controls">
                  <select className="filter-select">
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                    <option>This Year</option>
                  </select>
                  <button className="btn-export" onClick={() => {
                    alert('Exporting Analytics Report - PDF download starting');
                  }}>📊 Export Report</button>
                </div>
              </div>

              <div className="analytics-container">
                {/* Key Metrics in One Line - No Scrolling */}
                <div className="metrics-row-flex">
                  <div className="metric-item-compact">
                    <div className="metric-label">Total Revenue</div>
                    <div className="metric-value-large">SGD $15,240</div>
                    <div className="metric-trend up">↑ 12% from last month</div>
                  </div>

                  <div className="metric-item-compact">
                    <div className="metric-label">Completed Errands</div>
                    <div className="metric-value-large">342</div>
                    <div className="metric-trend up">↑ 28 this month</div>
                  </div>

                  <div className="metric-item-compact">
                    <div className="metric-label">Average Rating</div>
                    <div className="metric-value-large">4.8/5</div>
                    <div className="metric-trend neutral">⭐ Excellent</div>
                  </div>

                  <div className="metric-item-compact">
                    <div className="metric-label">Total Staff</div>
                    <div className="metric-value-large">12</div>
                    <div className="metric-trend neutral">👥 3 active today</div>
                  </div>
                </div>

                {/* Categories in One Line */}
                <div className="analytics-section">
                  <div className="section-header">
                    <h3>🎯 Top Categories</h3>
                    <span className="count-badge">4 Categories</span>
                  </div>
                  <div className="breakdown-row">
                    <div className="category-card-compact">
                      <div className="category-name">House Cleaning</div>
                      <div className="category-stat">45</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '24%', background: '#FF6B35'}}></div>
                      </div>
                      <div className="category-percentage">24%</div>
                    </div>

                    <div className="category-card-compact">
                      <div className="category-name">Office Services</div>
                      <div className="category-stat">38</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '20%', background: '#5BA3D0'}}></div>
                      </div>
                      <div className="category-percentage">20%</div>
                    </div>

                    <div className="category-card-compact">
                      <div className="category-name">Delivery</div>
                      <div className="category-stat">32</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '17%', background: '#27AE60'}}></div>
                      </div>
                      <div className="category-percentage">17%</div>
                    </div>

                    <div className="category-card-compact">
                      <div className="category-name">Event Planning</div>
                      <div className="category-stat">28</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '15%', background: '#9B59B6'}}></div>
                      </div>
                      <div className="category-percentage">15%</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="analytics-section">
                  <div className="section-header">
                    <h3>⚡ Quick Actions</h3>
                  </div>
                  <div className="action-buttons-row">
                    <button className={`action-btn ${selectedChart === 'revenue' ? 'active' : ''}`} onClick={() => {
                      setSelectedChart(selectedChart === 'revenue' ? null : 'revenue');
                    }}>📊 Revenue Trend</button>
                    <button className={`action-btn ${selectedChart === 'completion' ? 'active' : ''}`} onClick={() => {
                      setSelectedChart(selectedChart === 'completion' ? null : 'completion');
                    }}>✅ Completion Rate</button>
                    <button className={`action-btn ${selectedChart === 'rating' ? 'active' : ''}`} onClick={() => {
                      setSelectedChart(selectedChart === 'rating' ? null : 'rating');
                    }}>⭐ Ratings</button>
                    <button className={`action-btn ${selectedChart === 'staff' ? 'active' : ''}`} onClick={() => {
                      setSelectedChart(selectedChart === 'staff' ? null : 'staff');
                    }}>👥 Team Stats</button>
                  </div>
                </div>

                {/* Charts Display Based on Selection */}
                {selectedChart && (
                  <div className="analytics-section">
                    <div className="section-header">
                      <h3>
                        {selectedChart === 'revenue' && '📈 Revenue Trend (Last 30 Days)'}
                        {selectedChart === 'completion' && '✅ Task Completion Rate'}
                        {selectedChart === 'rating' && '⭐ Customer Ratings Trend'}
                        {selectedChart === 'staff' && '👥 Team Performance Metrics'}
                      </h3>
                      <span className="period-badge">Last 30 Days</span>
                    </div>
                    <div className="chart-container-enhanced">
                      {selectedChart === 'revenue' && (
                        <svg viewBox="0 0 600 300" className="interactive-chart">
                          {/* Grid Lines */}
                          <line x1="50" y1="40" x2="50" y2="240" stroke="#e0e0e0" strokeWidth="2" />
                          <line x1="50" y1="240" x2="580" y2="240" stroke="#e0e0e0" strokeWidth="2" />
                          {/* Y-axis labels */}
                          <text x="30" y="245" fontSize="11" fill="#999">0</text>
                          <text x="20" y="165" fontSize="11" fill="#999">$7K</text>
                          <text x="10" y="85" fontSize="11" fill="#999">$15K</text>
                          {/* Data Line */}
                          <polyline points="80,180 130,160 180,170 230,120 280,130 330,90 380,100 430,70 480,85 530,40"
                            style={{fill: 'none', stroke: '#FF6B35', strokeWidth: '3', strokeLinejoin: 'round'}} />
                          {/* Area under line */}
                          <polygon points="80,180 130,160 180,170 230,120 280,130 330,90 380,100 430,70 480,85 530,40 530,240 80,240"
                            style={{fill: '#FF6B35', fillOpacity: '0.15'}} />
                          {/* Data points */}
                          <circle cx="80" cy="180" r="4" fill="#FF6B35" />
                          <circle cx="230" cy="120" r="4" fill="#FF6B35" />
                          <circle cx="430" cy="70" r="4" fill="#FF6B35" />
                          <circle cx="530" cy="40" r="4" fill="#FF6B35" />
                          {/* X-axis labels */}
                          <text x="50" y="270" fontSize="11" fill="#999">Day 1</text>
                          <text x="510" y="270" fontSize="11" fill="#999">Day 30</text>
                        </svg>
                      )}
                      {selectedChart === 'completion' && (
                        <svg viewBox="0 0 600 300" className="interactive-chart">
                          {/* Bar Chart */}
                          <rect x="80" y="100" width="40" height="140" fill="#FF6B35" opacity="0.8" />
                          <text x="85" y="260" fontSize="11" fill="#999">Week 1</text>
                          <text x="85" y="280" fontSize="13" fontWeight="700" fill="#FF6B35">78%</text>

                          <rect x="150" y="80" width="40" height="160" fill="#5BA3D0" opacity="0.8" />
                          <text x="155" y="260" fontSize="11" fill="#999">Week 2</text>
                          <text x="155" y="280" fontSize="13" fontWeight="700" fill="#5BA3D0">85%</text>

                          <rect x="220" y="60" width="40" height="180" fill="#27AE60" opacity="0.8" />
                          <text x="225" y="260" fontSize="11" fill="#999">Week 3</text>
                          <text x="225" y="280" fontSize="13" fontWeight="700" fill="#27AE60">92%</text>

                          <rect x="290" y="40" width="40" height="200" fill="#9B59B6" opacity="0.8" />
                          <text x="295" y="260" fontSize="11" fill="#999">Week 4</text>
                          <text x="295" y="280" fontSize="13" fontWeight="700" fill="#9B59B6">96%</text>

                          {/* Grid Line */}
                          <line x1="50" y1="240" x2="380" y2="240" stroke="#e0e0e0" strokeWidth="2" />
                          <line x1="50" y1="40" x2="50" y2="240" stroke="#e0e0e0" strokeWidth="2" />
                        </svg>
                      )}
                      {selectedChart === 'rating' && (
                        <svg viewBox="0 0 600 300" className="interactive-chart">
                          {/* Line Chart */}
                          <polyline points="80,140 150,120 220,100 290,110 360,90 430,85 500,70"
                            style={{fill: 'none', stroke: '#FFD700', strokeWidth: '3', strokeLinejoin: 'round'}} />
                          <polygon points="80,140 150,120 220,100 290,110 360,90 430,85 500,70 500,240 80,240"
                            style={{fill: '#FFD700', fillOpacity: '0.15'}} />
                          {/* Data points */}
                          <circle cx="80" cy="140" r="5" fill="#FFD700" />
                          <circle cx="220" cy="100" r="5" fill="#FFD700" />
                          <circle cx="500" cy="70" r="5" fill="#FFD700" />
                          {/* Labels */}
                          <text x="60" y="265" fontSize="11" fill="#999">4.2★</text>
                          <text x="200" y="265" fontSize="11" fill="#999">4.5★</text>
                          <text x="480" y="265" fontSize="11" fill="#999">4.8★</text>
                          {/* Grid */}
                          <line x1="50" y1="240" x2="530" y2="240" stroke="#e0e0e0" strokeWidth="2" />
                          <line x1="50" y1="40" x2="50" y2="240" stroke="#e0e0e0" strokeWidth="2" />
                        </svg>
                      )}
                      {selectedChart === 'staff' && (
                        <svg viewBox="0 0 600 300" className="interactive-chart">
                          {/* Circular Progress Chart */}
                          <circle cx="150" cy="140" r="70" fill="none" stroke="#e0e0e0" strokeWidth="8" />
                          <circle cx="150" cy="140" r="70" fill="none" stroke="#FF6B35" strokeWidth="8"
                            strokeDasharray="220 330" strokeLinecap="round" transform="rotate(-90 150 140)" />
                          <text x="110" y="150" fontSize="24" fontWeight="700" fill="#FF6B35">67%</text>
                          <text x="95" y="175" fontSize="11" fill="#999">Active</text>

                          <circle cx="400" cy="140" r="70" fill="none" stroke="#e0e0e0" strokeWidth="8" />
                          <circle cx="400" cy="140" r="70" fill="none" stroke="#27AE60" strokeWidth="8"
                            strokeDasharray="297 330" strokeLinecap="round" transform="rotate(-90 400 140)" />
                          <text x="360" y="150" fontSize="24" fontWeight="700" fill="#27AE60">90%</text>
                          <text x="350" y="175" fontSize="11" fill="#999">Productive</text>
                        </svg>
                      )}
                    </div>
                    <p style={{fontSize: '12px', color: '#999', marginTop: '12px', textAlign: 'center'}}>
                      {selectedChart === 'revenue' && 'Revenue shows consistent growth with peak on day 30'}
                      {selectedChart === 'completion' && 'Completion rate improving week over week'}
                      {selectedChart === 'rating' && 'Customer ratings trending positively'}
                      {selectedChart === 'staff' && '8 out of 12 staff members currently active'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="section-content">
              <h2>Settings</h2>
              <div className="settings-container">
                <div className="settings-section">
                  <h3>Notifications & Communication</h3>
                  <div className="settings-toggle">
                    <label>Email Notifications</label>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="settings-toggle">
                    <label>SMS Alerts</label>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="settings-toggle">
                    <label>Push Notifications</label>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="settings-toggle">
                    <label>Weekly Reports</label>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="settings-toggle">
                    <label>Marketing Emails</label>
                    <input type="checkbox" />
                  </div>
                </div>

                <div className="settings-section">
                  <h3>Payment & Billing</h3>

                  <div className="payment-methods">
                    <h4>Payment Methods</h4>
                    <div className="payment-card">
                      <div className="card-info">
                        <span className="card-type">💳 Visa</span>
                        <span className="card-number">**** **** **** 1234</span>
                        <span className="card-holder">Rumah Emas</span>
                      </div>
                      <div className="card-actions">
                        <span className="badge default">Default</span>
                        <button className="btn-remove" onClick={() => {
                          alert('Remove payment method: **** **** **** 1234');
                        }}>Remove</button>
                      </div>
                    </div>
                    <button className="btn-add-payment" onClick={() => {
                      alert('Opening payment method form - Add new Visa, Mastercard, or Bank Account');
                    }}>+ Add Payment Method</button>
                  </div>

                  <div className="billing-info">
                    <h4>Billing Information</h4>
                    <div className="settings-item">
                      <label>Billing Email</label>
                      <input type="email" value="billing@rumaheimas.com" />
                    </div>
                    <div className="settings-item">
                      <label>Billing Address</label>
                      <input type="text" value="123 Business District, Singapore 089999" />
                    </div>
                    <div className="settings-item">
                      <label>Invoice Frequency</label>
                      <select className="settings-select">
                        <option>Monthly</option>
                        <option>Quarterly</option>
                        <option>Annual</option>
                      </select>
                    </div>
                    <button className="btn-save" onClick={() => {
                      alert('Billing information updated successfully!');
                    }}>Update Billing Info</button>
                  </div>

                  <div className="billing-history">
                    <div className="invoice-header">
                      <div>
                        <h4>Recent Invoices</h4>
                        <p className="invoice-subtitle">Latest transactions - Download individual invoices</p>
                      </div>
                      <select className="invoice-filter" value={invoiceFilter} onChange={(e) => {
                        setInvoiceFilter(e.target.value);
                      }}>
                        <option value="">All Months</option>
                        <option value="2026-07">July 2026</option>
                        <option value="2026-06">June 2026</option>
                        <option value="2026-05">May 2026</option>
                        <option value="2026-04">April 2026</option>
                        <option value="2026-03">March 2026</option>
                        <option value="2026-02">February 2026</option>
                        <option value="2026-01">January 2026</option>
                      </select>
                    </div>
                    <div className="invoice-list">
                      {(!invoiceFilter || invoiceFilter === '2026-07') && (
                        <div className="invoice-item">
                          <div className="invoice-left">
                            <span className="invoice-date">🕐 Jul 10, 2026</span>
                            <span className="invoice-desc">Gold Partner - Monthly Subscription</span>
                          </div>
                          <div className="invoice-right">
                            <span className="invoice-amount">SGD $199.00</span>
                            <button className="btn-download" onClick={() => downloadInvoice('INV-2026-07-001', 'Jul 10, 2026')}>📥 Download</button>
                          </div>
                        </div>
                      )}

                      {(!invoiceFilter || invoiceFilter === '2026-06') && (
                        <div className="invoice-item">
                          <div className="invoice-left">
                            <span className="invoice-date">Jun 10, 2026</span>
                            <span className="invoice-desc">Gold Partner - Monthly Subscription</span>
                          </div>
                          <div className="invoice-right">
                            <span className="invoice-amount">SGD $199.00</span>
                            <button className="btn-download" onClick={() => downloadInvoice('INV-2026-06-001', 'Jun 10, 2026')}>📥 Download</button>
                          </div>
                        </div>
                      )}

                      {(!invoiceFilter || invoiceFilter === '2026-05') && (
                        <div className="invoice-item">
                          <div className="invoice-left">
                            <span className="invoice-date">May 10, 2026</span>
                            <span className="invoice-desc">Gold Partner - Monthly Subscription</span>
                          </div>
                          <div className="invoice-right">
                            <span className="invoice-amount">SGD $199.00</span>
                            <button className="btn-download" onClick={() => downloadInvoice('INV-2026-05-001', 'May 10, 2026')}>📥 Download</button>
                          </div>
                        </div>
                      )}

                      {(!invoiceFilter || invoiceFilter === '2026-04') && (
                        <div className="invoice-item">
                          <div className="invoice-left">
                            <span className="invoice-date">Apr 10, 2026</span>
                            <span className="invoice-desc">Gold Partner - Monthly Subscription</span>
                          </div>
                          <div className="invoice-right">
                            <span className="invoice-amount">SGD $199.00</span>
                            <button className="btn-download" onClick={() => downloadInvoice('INV-2026-04-001', 'Apr 10, 2026')}>📥 Download</button>
                          </div>
                        </div>
                      )}

                      {(!invoiceFilter || invoiceFilter === '2026-03') && (
                        <div className="invoice-item">
                          <div className="invoice-left">
                            <span className="invoice-date">Mar 10, 2026</span>
                            <span className="invoice-desc">Gold Partner - Monthly Subscription</span>
                          </div>
                          <div className="invoice-right">
                            <span className="invoice-amount">SGD $199.00</span>
                            <button className="btn-download" onClick={() => downloadInvoice('INV-2026-03-001', 'Mar 10, 2026')}>📥 Download</button>
                          </div>
                        </div>
                      )}

                      {(!invoiceFilter || invoiceFilter === '2026-02') && (
                        <div className="invoice-item">
                          <div className="invoice-left">
                            <span className="invoice-date">Feb 10, 2026</span>
                            <span className="invoice-desc">Gold Partner - Monthly Subscription</span>
                          </div>
                          <div className="invoice-right">
                            <span className="invoice-amount">SGD $199.00</span>
                            <button className="btn-download" onClick={() => downloadInvoice('INV-2026-02-001', 'Feb 10, 2026')}>📥 Download</button>
                          </div>
                        </div>
                      )}

                      {(!invoiceFilter || invoiceFilter === '2026-01') && (
                        <div className="invoice-item">
                          <div className="invoice-left">
                            <span className="invoice-date">Jan 10, 2026</span>
                            <span className="invoice-desc">Gold Partner - Monthly Subscription</span>
                          </div>
                          <div className="invoice-right">
                            <span className="invoice-amount">SGD $199.00</span>
                            <button className="btn-download" onClick={() => downloadInvoice('INV-2026-01-001', 'Jan 10, 2026')}>📥 Download</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h3>Security & Privacy</h3>
                  <button className="btn-secondary" onClick={() => {
                    alert('Opening password change form - Current password required');
                  }}>Change Password</button>
                  <button className="btn-secondary" style={{marginTop: '8px'}} onClick={() => {
                    alert('Enable Two-Factor Authentication - Verify via SMS or Authenticator app');
                  }}>Enable Two-Factor Authentication</button>
                  <button className="btn-secondary" style={{marginTop: '8px'}} onClick={() => {
                    alert('Showing login activity log - All recent logins from different devices');
                  }}>View Login Activity</button>
                </div>

                <div className="settings-section">
                  <h3>API & Integrations</h3>
                  <p className="settings-desc">Manage API keys and third-party integrations</p>
                  <button className="btn-secondary" onClick={() => {
                    alert('Generated new API Key: sk_live_51Hj3LJ... (Copy to clipboard)');
                  }}>Generate API Key</button>
                  <button className="btn-secondary" style={{marginTop: '8px'}} onClick={() => {
                    alert('Connected Apps: Slack, Zapier, Salesforce (Click to manage)');
                  }}>Connected Apps</button>
                </div>

                <div className="settings-section danger">
                  <h3>Danger Zone</h3>
                  <p className="settings-desc">These actions cannot be undone</p>
                  <button className="btn-danger" onClick={() => {
                    const confirmed = window.confirm('⚠️ WARNING: This will permanently delete your account and all associated data. Type "DELETE" to confirm:');
                    if (confirmed) {
                      alert('Account deletion request submitted - Check email for confirmation link');
                    }
                  }}>Delete Account</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'leave-calendar' && (
            <div className="section-content">
              <CompanyLeaveCalendar />
            </div>
          )}

          {activeSection === 'points-distribution' && (
            <div className="section-content">
              <CompanyPointsDistribution />
            </div>
          )}

          {activeSection === 'staff-resignation' && (
            <div className="section-content">
              <CompanyStaffResignation />
            </div>
          )}

          {activeSection === 'payment-history' && (
            <div className="section-content">
              <CompanyPaymentHistory />
            </div>
          )}

          {/* ASKER SECTION - Post Errand */}
          {activeSection === 'asker-post' && (
            <div className="section-content">
              <AskerPostErrand />
            </div>
          )}

          {/* ASKER SECTION - Bids Received */}
          {activeSection === 'asker-bids' && (
            <div className="section-content">
              <AskerBidsReceived />
            </div>
          )}

          {/* ASKER SECTION - Reviews As Asker */}
          {activeSection === 'asker-reviews' && (
            <div className="section-content">
              <AskerReviews />
            </div>
          )}

          {/* DOER SECTION - Browse Errands */}
          {activeSection === 'doer-browse' && (
            <div className="section-content">
              <DoerBrowseErrands userRole="owner" />
            </div>
          )}

          {/* DOER SECTION - Allocate Errands (Modal in Browse, but also standalone) */}
          {activeSection === 'doer-allocate' && (
            <div className="section-content">
              <DoerAllocateErrands />
            </div>
          )}

          {/* DOER SECTION - My Offers */}
          {activeSection === 'doer-offers' && (
            <div className="section-content">
              <DoerMyOffers />
            </div>
          )}

          {/* DOER SECTION - Active Errands */}
          {activeSection === 'doer-active' && (
            <div className="section-content">
              <DoerActiveErrands />
            </div>
          )}

          {/* DOER SECTION - Completed Errands */}
          {activeSection === 'doer-completed' && (
            <div className="section-content">
              <DoerCompletedErrands />
            </div>
          )}

          {/* DOER SECTION - Reviews As Doer */}
          {activeSection === 'doer-reviews' && (
            <div className="section-content">
              <DoerReviews />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CompanyDashboardNew;
