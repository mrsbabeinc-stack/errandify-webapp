import '../styles/CompanyDashboardNew.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ErrandsPage from './ErrandsPage';
import DoerBrowsePage from './DoerBrowsePage';
import DoerAllocateErrands from '../components/DoerAllocateErrands';
import DoerMyOffers from '../components/DoerMyOffers';
import DoerActiveErrands from '../components/DoerActiveErrands';
import DoerCompletedErrands from '../components/DoerCompletedErrands';
import DoerReviews from '../components/DoerReviews';
import ReviewQueuePanel from '../components/ReviewQueuePanel';
import GiftingModal from '../components/GiftingModal';
import AddPaymentMethodModal from '../components/AddPaymentMethodModal';
import PaymentHoldsStatus from '../components/PaymentHoldsStatus';
import WalletBreakdown from '../components/WalletBreakdown';
import CompanyAdvertisingManagement from '../components/CompanyAdvertisingManagement';
import CompanyOperatingHours from '../components/CompanyOperatingHours';
import StaffLeaveApplication from '../components/StaffLeaveApplication';
import ManagerLeaveApproval from '../components/ManagerLeaveApproval';
import AdCreditTracker from '../components/AdCreditTracker';
import AdCreditReminder from '../components/AdCreditReminder';

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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChurnPreventionModal, setShowChurnPreventionModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<{tier: string, billingType: string} | null>(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState<{tier: string, billingType: string} | null>(null);
  const [upgradeConfirmationStep, setUpgradeConfirmationStep] = useState(false);
  const [downgradeConfirmationStep, setDowngradeConfirmationStep] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Security & Privacy state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showLoginActivityModal, setShowLoginActivityModal] = useState(false);
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const [showConnectedAppsModal, setShowConnectedAppsModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletionBlockers, setDeletionBlockers] = useState<Array<{ type: string; count: number; message: string; details?: string }>>([]);
  const [canDeleteAccount, setCanDeleteAccount] = useState(false);
  const [deletionCheckLoading, setDeletionCheckLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [twoFAMethod, setTwoFAMethod] = useState<'sms' | 'authenticator'>('authenticator');
  const [generatedAPIKey, setGeneratedAPIKey] = useState<string | null>(null);
  // Settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsAlerts: true,
    pushNotifications: true,
    weeklyReports: true,
    marketingEmails: false,
  });
  const [billingData, setBillingData] = useState({
    email: 'billing@rumaheimas.com',
    address: '123 Business District, Singapore 089999',
    frequency: 'Monthly',
  });
  const [rewardsTab, setRewardsTab] = useState<'overview' | 'gift' | 'redeemed' | 'history' | 'buy-ep'>('overview');
  const [selectedEPPackage, setSelectedEPPackage] = useState<{id: number, ep_amount: number, price_sgd: number, discount_percent: number} | null>(null);
  const [customEPAmount, setCustomEPAmount] = useState<number | ''>('');
  const [epPurchaseStep, setEpPurchaseStep] = useState(0); // 0: select, 1: confirm, 2: processing
  const [isCustomEPPurchase, setIsCustomEPPurchase] = useState(false);
  const [giftSearch, setGiftSearch] = useState('');
  const [giftCategoryFilter, setGiftCategoryFilter] = useState<'all' | 'discount' | 'partner'>('all');
  const [confirmRedeemData, setConfirmRedeemData] = useState<{ points: number; code: string; amount: number; name: string } | null>(null);
  const [redeemedFilter, setRedeemedFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'redeemed' | 'gifted' | 'received'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [showGiftingModal, setShowGiftingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pricingBillingCycle, setPricingBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    asker: false,
    doer: false,
    staff: false,
    company: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Calculate Stripe fee (2.9% + $0.30 SGD)
  const calculateStripeFee = (amountInSgd: number): { stripeFee: number, totalSgd: number } => {
    const stripeFee = (amountInSgd * 0.029 + 0.30);
    return {
      stripeFee: parseFloat(stripeFee.toFixed(2)),
      totalSgd: parseFloat((amountInSgd + stripeFee).toFixed(2))
    };
  };

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
          id: 3,
          name: 'Rumah Emas Demo Company',
          uen: 'UEN202401001',
          subscription_tier: 'gold',
          wallet_balance: 15240,
          ep_balance: 3450,
          logo_url: '',
          rating: 4.8,
          billing_type: 'annual',
          renewal_date: '2027-08-01',
        });
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      setCompany({
        id: 3,
        name: 'Rumah Emas Demo Company',
        uen: 'UEN202401001',
        subscription_tier: 'gold',
        wallet_balance: 15240,
        ep_balance: 3450,
        logo_url: '',
        billing_type: 'annual',
        renewal_date: '2027-08-01',
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
            <span className="owner-badge">👑 Owner</span>
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
              <div className="nav-section">
                <a href="#" className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>
                  📊 Dashboard
                </a>
              </div>

              {/* ASKER SECTION - Company posting errands */}
              <div className="nav-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => toggleSection('asker')}>
                  <h3 style={{margin: 0}}>ASKER SECTION</h3>
                  <span style={{fontSize: '18px', userSelect: 'none', flexShrink: 0, marginLeft: '12px', padding: '4px 8px', width: '24px', textAlign: 'center'}}>{collapsedSections.asker ? '▼' : '▲'}</span>
                </div>
                {!collapsedSections.asker && (
                  <>
                    <a href="#" className={`nav-item ${activeSection === 'errands' ? 'active' : ''}`} onClick={() => setActiveSection('errands')}>
                      📁 MyBizErrands
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'asker-post' ? 'active' : ''}`} onClick={() => setActiveSection('asker-post')}>
                      ➕ Post Errand
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'asker-bids' ? 'active' : ''}`} onClick={() => setActiveSection('asker-bids')}>
                      📊 Offers Received
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'asker-reviews' ? 'active' : ''}`} onClick={() => setActiveSection('asker-reviews')}>
                      ⭐ Reviews (As Asker)
                    </a>
                  </>
                )}
              </div>

              {/* DOER SECTION - Company's staff doing errands */}
              <div className="nav-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => toggleSection('doer')}>
                  <h3 style={{margin: 0}}>DOER SECTION</h3>
                  <span style={{fontSize: '18px', userSelect: 'none', flexShrink: 0, marginLeft: '12px', padding: '4px 8px', width: '24px', textAlign: 'center'}}>{collapsedSections.doer ? '▲' : '▼'}</span>
                </div>
                {!collapsedSections.doer && (
                  <>
                    <a href="#" className={`nav-item ${activeSection === 'doer-browse' ? 'active' : ''}`} onClick={() => setActiveSection('doer-browse')}>
                      🔍 Browse Errands
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'doer-allocate' ? 'active' : ''}`} onClick={() => setActiveSection('doer-allocate')}>
                      📦 Allocate Errands
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'active-tasks' ? 'active' : ''}`} onClick={() => setActiveSection('active-tasks')}>
                      🚀 Staff Active Tasks
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'doer-completed' ? 'active' : ''}`} onClick={() => setActiveSection('doer-completed')}>
                      ✅ Completed
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'work-reviews' ? 'active' : ''}`} onClick={() => setActiveSection('work-reviews')}>
                      📋 Work Reviews & Approvals
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'apply-leave' ? 'active' : ''}`} onClick={() => setActiveSection('apply-leave')}>
                      📅 Apply for Unavailability
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'doer-reviews' ? 'active' : ''}`} onClick={() => setActiveSection('doer-reviews')}>
                      ⭐ Staff Reviews
                    </a>
                  </>
                )}
              </div>

              {/* STAFF MANAGEMENT */}
              <div className="nav-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => toggleSection('staff')}>
                  <h3 style={{margin: 0}}>STAFF MANAGEMENT</h3>
                  <span style={{fontSize: '18px', userSelect: 'none', flexShrink: 0, marginLeft: '12px', padding: '4px 8px', width: '24px', textAlign: 'center'}}>{collapsedSections.staff ? '▲' : '▼'}</span>
                </div>
                {!collapsedSections.staff && (
                  <>
                    <a href="#" className={`nav-item ${activeSection === 'staff' ? 'active' : ''}`} onClick={() => setActiveSection('staff')}>
                      👥 My Staff
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'leave-calendar' ? 'active' : ''}`} onClick={() => setActiveSection('leave-calendar')}>
                      📅 Leave Calendar
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'operating-hours' ? 'active' : ''}`} onClick={() => setActiveSection('operating-hours')}>
                      ⏰ Operating Hours
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'leave-approvals' ? 'active' : ''}`} onClick={() => setActiveSection('leave-approvals')}>
                      📋 Leave Approvals
                    </a>
                  </>
                )}
              </div>

              {/* COMPANY OPS */}
              <div className="nav-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => toggleSection('company')}>
                  <h3 style={{margin: 0}}>COMPANY OPS</h3>
                  <span style={{fontSize: '18px', userSelect: 'none', flexShrink: 0, marginLeft: '12px', padding: '4px 8px', width: '24px', textAlign: 'center'}}>{collapsedSections.company ? '▲' : '▼'}</span>
                </div>
                {!collapsedSections.company && (
                  <>
                    <a href="#" className={`nav-item ${activeSection === 'mybiz' ? 'active' : ''}`} onClick={() => setActiveSection('mybiz')}>
                      🏢 Company Profile
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'points' ? 'active' : ''}`} onClick={() => setActiveSection('points')}>
                      💰 MyRewards & EP
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'subscription' ? 'active' : ''}`} onClick={() => setActiveSection('subscription')}>
                      📦 Subscription Plan
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'ads' ? 'active' : ''}`} onClick={() => setActiveSection('ads')}>
                      📢 Advertising
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
                  </>
                )}
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

              {/* Ad Credit Reminder - Top Priority */}
              <div style={{ marginBottom: '24px' }}>
                <AdCreditReminder companyId={company?.id || 3} compact={false} />
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
                        <p style={{color: '#333'}}>2 staff members waiting for approval</p>
                        <span className="due-date" style={{color: '#333'}}>Due: Today</span>
                      </div>
                      <button className="item-action" onClick={() => setActiveSection('leave-calendar')}>→ Review</button>
                    </div>
                  )}

                  {(actionItemFilter === 'all' || actionItemFilter === 'medium') && (
                    <>
                      <div className="action-item medium-priority">
                        <div className="priority-badge">MEDIUM</div>
                        <div className="item-content">
                          <h4>Review Staff Reassignment Requests</h4>
                          <p style={{color: '#333'}}>1 errand reassignment pending manager approval</p>
                          <span className="due-date" style={{color: '#333'}}>Due: Tomorrow</span>
                        </div>
                        <button className="item-action" onClick={() => setActiveSection('staff-reassignment')}>→ Review</button>
                      </div>

                      <div className="action-item medium-priority">
                        <div className="priority-badge">MEDIUM</div>
                        <div className="item-content">
                          <h4>Allocate Points to Staff</h4>
                          <p>Monthly points distribution pending</p>
                          <span className="due-date">Due: Jul 15</span>
                        </div>
                        <button className="item-action" onClick={() => setActiveSection('points-distribution')}>→ Allocate</button>
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
                      <button className="item-action" onClick={() => setActiveSection('ads')}>→ Analyze</button>
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
                    <h3>✅ Errands Completed</h3>
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
                    <div className="kpi-description">Errands posted</div>
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
                  <button className="action-card" onClick={() => setActiveSection('asker-post')}>
                    <span className="action-icon">📝</span>
                    <span className="action-name">Post Errand</span>
                    <span className="action-desc">Create new errand</span>
                  </button>
                  <button className="action-card" onClick={() => setActiveSection('staff')}>
                    <span className="action-icon">👥</span>
                    <span className="action-name">Add Staff</span>
                    <span className="action-desc">Invite team member</span>
                  </button>
                  <button className="action-card" onClick={() => setActiveSection('reports')}>
                    <span className="action-icon">📊</span>
                    <span className="action-name">View Reports</span>
                    <span className="action-desc">Analytics</span>
                  </button>
                  <button className="action-card" onClick={() => setActiveSection('messages')}>
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
              <ErrandsPage userRole="asker" />
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
                      <button>View Errands</button>
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
                      <button>View Errands</button>
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
                      <button>View Errands</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'ads' && (
            <div className="section-content">
              {/* Ad Credit Tracker */}
              <div style={{ marginBottom: '40px' }}>
                <AdCreditTracker companyId={company?.id || 3} />
              </div>

              {/* Advertising Management */}
              <div style={{ marginTop: '40px' }}>
                <h2 style={{ marginBottom: '20px' }}>📢 Campaign Management</h2>
                <CompanyAdvertisingManagement />
              </div>
            </div>
          )}

          {activeSection === 'active-tasks' && (
            <div className="section-content">
              <h2>🚀 Staff Active Tasks</h2>
              <p style={{fontSize: '14px', color: '#666', marginBottom: '20px'}}>View all allocated tasks assigned to your staff members</p>
              <ManagerStaffAllocations companyId={company?.id || 3} defaultFilter="all" />
            </div>
          )}

          {activeSection === 'review-approval' && (
            <div className="section-content">
              <h2>Review Approval</h2>
              <ReviewApprovalPanel companyId={company?.id || 3} />
            </div>
          )}

          {activeSection === 'disputes' && (
            <div className="section-content">
              <CompanyDisputeCenter companyId={company?.id || 3} />
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
                            style={{fill: 'none', stroke: '#FF6B35', strokeWidth: '3', strokeLinejoin: 'round'}} />
                          <polygon points="80,140 150,120 220,100 290,110 360,90 430,85 500,70 500,240 80,240"
                            style={{fill: '#FF6B35', fillOpacity: '0.15'}} />
                          {/* Data points */}
                          <circle cx="80" cy="140" r="5" fill="#FF6B35" />
                          <circle cx="220" cy="100" r="5" fill="#FF6B35" />
                          <circle cx="500" cy="70" r="5" fill="#FF6B35" />
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
                    <input type="checkbox" checked={notificationSettings.emailNotifications} onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))} />
                  </div>
                  <div className="settings-toggle">
                    <label>SMS Alerts</label>
                    <input type="checkbox" checked={notificationSettings.smsAlerts} onChange={(e) => setNotificationSettings(prev => ({ ...prev, smsAlerts: e.target.checked }))} />
                  </div>
                  <div className="settings-toggle">
                    <label>Push Notifications</label>
                    <input type="checkbox" checked={notificationSettings.pushNotifications} onChange={(e) => setNotificationSettings(prev => ({ ...prev, pushNotifications: e.target.checked }))} />
                  </div>
                  <div className="settings-toggle">
                    <label>Weekly Reports</label>
                    <input type="checkbox" checked={notificationSettings.weeklyReports} onChange={(e) => setNotificationSettings(prev => ({ ...prev, weeklyReports: e.target.checked }))} />
                  </div>
                  <div className="settings-toggle">
                    <label>Marketing Emails</label>
                    <input type="checkbox" checked={notificationSettings.marketingEmails} onChange={(e) => setNotificationSettings(prev => ({ ...prev, marketingEmails: e.target.checked }))} />
                  </div>
                </div>

                <div className="settings-section">
                  <h3>Payment & Billing</h3>

                  {/* Wallet Breakdown */}
                  <div style={{ marginBottom: '24px' }}>
                    <WalletBreakdown data={{
                      total: stats.pointsBalance,
                      available: Math.floor(stats.pointsBalance * 0.5),
                      onHold: Math.floor(stats.pointsBalance * 0.3),
                      pending: Math.floor(stats.pointsBalance * 0.18),
                      subscription: 199,
                    }} />
                  </div>

                  {/* Payment Holds Status */}
                  <div style={{ marginBottom: '24px' }}>
                    <PaymentHoldsStatus companyId={company?.id} />
                  </div>

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
                          if (confirm('Are you sure you want to remove this payment method?')) {
                            alert('✅ Payment method removed successfully!');
                          }
                        }}>Remove</button>
                      </div>
                    </div>
                    <button className="btn-add-payment" onClick={() => setShowPaymentModal(true)}>+ Add Payment Method</button>
                  </div>

                  <div className="billing-info">
                    <h4>Billing Information</h4>
                    <div className="settings-item">
                      <label>Billing Email</label>
                      <input type="email" value={billingData.email} onChange={(e) => setBillingData(prev => ({ ...prev, email: e.target.value }))} />
                    </div>
                    <div className="settings-item">
                      <label>Billing Address</label>
                      <input type="text" value={billingData.address} onChange={(e) => setBillingData(prev => ({ ...prev, address: e.target.value }))} />
                    </div>
                    <div className="settings-item">
                      <label>Invoice Frequency</label>
                      <select className="settings-select" value={billingData.frequency} onChange={(e) => setBillingData(prev => ({ ...prev, frequency: e.target.value }))}>
                        <option>Monthly</option>
                        <option>Quarterly</option>
                        <option>Annual</option>
                      </select>
                    </div>
                    <button className="btn-save" onClick={() => {
                      alert(`✅ Billing information updated!\n\nEmail: ${billingData.email}\nAddress: ${billingData.address}\nFrequency: ${billingData.frequency}`);
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
                            <span className="invoice-number">INV-2026-07-001</span>
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
                            <span className="invoice-number">INV-2026-06-001</span>
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
                            <span className="invoice-number">INV-2026-05-001</span>
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
                            <span className="invoice-number">INV-2026-04-001</span>
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
                            <span className="invoice-number">INV-2026-03-001</span>
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
                            <span className="invoice-number">INV-2026-02-001</span>
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
                            <span className="invoice-number">INV-2026-01-001</span>
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
                  <button className="btn-secondary" onClick={() => setShowPasswordModal(true)}>Change Password</button>
                  <button className="btn-secondary" style={{marginTop: '8px'}} onClick={() => setShow2FAModal(true)}>Enable Two-Factor Authentication</button>
                  <button className="btn-secondary" style={{marginTop: '8px'}} onClick={() => setShowLoginActivityModal(true)}>View Login Activity</button>
                </div>

                <div className="settings-section">
                  <h3>API & Integrations</h3>
                  <p className="settings-desc">Manage API keys and third-party integrations</p>
                  <button className="btn-secondary" onClick={() => setShowAPIKeyModal(true)}>Generate API Key</button>
                  <button className="btn-secondary" style={{marginTop: '8px'}} onClick={() => setShowConnectedAppsModal(true)}>Connected Apps</button>
                </div>

                <div className="settings-section danger">
                  <h3>Danger Zone</h3>
                  <p className="settings-desc">These actions cannot be undone</p>
                  <button className="btn-danger" onClick={async () => {
                    setDeletionCheckLoading(true);
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`${API_URL}/api/users/deletion-eligibility`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                        },
                      });
                      const data = await response.json();
                      setDeletionBlockers(data.blockers || []);
                      setCanDeleteAccount(data.canDelete || false);
                      setShowDeleteAccountModal(true);
                    } catch (error) {
                      console.error('Error checking deletion eligibility:', error);
                      alert('❌ Error checking account status. Please try again.');
                    } finally {
                      setDeletionCheckLoading(false);
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

          {activeSection === 'apply-leave' && (
            <div className="section-content">
              <StaffLeaveApplication />
            </div>
          )}

          {activeSection === 'operating-hours' && (
            <div className="section-content">
              <CompanyOperatingHours />
            </div>
          )}

          {activeSection === 'leave-approvals' && (
            <div className="section-content">
              <ManagerLeaveApproval />
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
              <AskerPostErrand
                onClose={() => setActiveSection('errands')}
                onPostComplete={() => setActiveSection('errands')}
              />
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
              <DoerBrowsePage userRole="doer" />
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

          {/* DOER SECTION - Active Errands (Individual Doer only - hidden for company) */}
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

          {/* DOER SECTION - Work Reviews & Approvals */}
          {activeSection === 'work-reviews' && (
            <div className="section-content">
              <ReviewQueuePanel />
            </div>
          )}

          {/* DOER SECTION - Reviews As Doer */}
          {activeSection === 'doer-reviews' && (
            <div className="section-content">
              <DoerReviews />
            </div>
          )}


          {/* SUBSCRIPTION PLAN SECTION */}
          {activeSection === 'subscription' && (
            <div className="section-content">
              {/* CURRENT PLAN DETAILS - TOP SECTION */}
              <div style={{background: 'linear-gradient(135deg, #FFF8F5 0%, #FFEEE4 100%)', border: '2px solid #FF6B35', borderRadius: '16px', padding: '40px', marginBottom: '48px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '32px'}}>
                  <div>
                    <h2 style={{margin: '0 0 8px 0', fontSize: '32px', fontWeight: '800', color: '#333'}}>🏆 Your Current Plan</h2>
                    <p style={{margin: 0, fontSize: '16px', color: '#666', fontWeight: '500'}}>Gold Partner - Best for growing teams</p>
                  </div>
                  <div style={{background: '#FF6B35', color: 'white', padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', textAlign: 'center'}}>
                    ✓ ACTIVE
                  </div>
                </div>

                {/* Plan Details Grid */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px', paddingBottom: '32px', borderBottom: '2px solid #FFD9B3'}}>
                  <div>
                    <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>Plan Name</p>
                    <p style={{margin: 0, fontSize: '18px', fontWeight: '700', color: '#333'}}>Gold Partner</p>
                  </div>
                  <div>
                    <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>Started</p>
                    <p style={{margin: 0, fontSize: '18px', fontWeight: '700', color: '#333'}}>Jul 1, 2026</p>
                  </div>
                  <div>
                    <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>Renews</p>
                    <p style={{margin: 0, fontSize: '18px', fontWeight: '700', color: '#333'}}>Aug 1, 2027</p>
                  </div>
                  <div>
                    <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>Annual Cost</p>
                    <p style={{margin: 0, fontSize: '18px', fontWeight: '700', color: '#FF6B35'}}>SGD $1,990</p>
                  </div>
                </div>

                {/* Current Benefits */}
                <div>
                  <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#333'}}>✨ Your Current Benefits</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
                    {company?.subscription_tier === 'silver' && (
                      <>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Commission: 18% (save 2%)</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Ad Credit: SGD 50/month</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>EP Multiplier: 2x</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Team: Up to 5 people</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Monthly Ad Credit: SGD 50</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Milestone Bonus: SGD 20 Ad Credits (one-time at 50 errands)</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Features: Team coordination, AI dashboard</span>
                        </div>
                      </>
                    )}
                    {company?.subscription_tier === 'gold' && (
                      <>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Commission: 17% (save 3%)</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Monthly Ad Credit: SGD 200</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>EP Multiplier: 3x</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Team: Up to 15 people</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Milestone Bonuses: SGD 50 Ad Credits at 50 errands, SGD 100 Ad Credits at 100 errands (one-time)</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Features: All Silver + events, top newsletter</span>
                        </div>
                      </>
                    )}
                    {company?.subscription_tier === 'platinum' && (
                      <>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Commission: 16% (save 4%)</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Ad Credit: SGD 500/month</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>EP Multiplier: 5x</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Team: Unlimited</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Milestones: SGD 100 at 50, SGD 200 at 100, SGD 500 at 200</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #FFD9B3'}}>
                          <span style={{fontSize: '18px'}}>✓</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>Features: All Gold + blog, quarterly newsletter, priority events</span>
                        </div>
                      </>
                    )}
                    {(!company?.subscription_tier || company?.subscription_tier === 'free') && (
                      <>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd'}}>
                          <span style={{fontSize: '18px'}}>✕</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#999'}}>Free tier - 20% commission, 1x EP, 1 person only</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd'}}>
                          <span style={{fontSize: '18px'}}>✕</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#999'}}>No ad credits or milestone rewards</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Shortcuts to tracking dashboards */}
                  <div style={{marginTop: '32px', paddingTop: '32px', borderTop: '2px solid #FFD9B3', display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                    <button
                      onClick={() => {
                        const trackingSection = document.querySelector('[data-benefits-tracking]');
                        trackingSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      style={{flex: '1', minWidth: '200px', padding: '12px 24px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'}}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.4)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)')}
                    >
                      📊 View Benefits & Tracking
                    </button>
                    <button
                      onClick={() => {
                        const pricingSection = document.getElementById('pricing-section');
                        pricingSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      style={{flex: '1', minWidth: '200px', padding: '12px 24px', background: 'white', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF8F5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      💰 Compare Plans
                    </button>
                    <button
                      onClick={() => setShowChurnPreventionModal(true)}
                      style={{flex: '1', minWidth: '200px', padding: '12px 24px', background: '#fee2e2', color: '#991b1b', border: '2px solid #fca5a5', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fecaca')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fee2e2')}
                    >
                      ❌ Cancel Subscription
                    </button>
                  </div>
                </div>
              </div>

              {/* BILLING HISTORY SECTION */}
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px', marginBottom: '48px'}}>
                <h3 style={{margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#333'}}>📋 Billing History</h3>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{background: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                        <th style={{padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#666'}}>Date</th>
                        <th style={{padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#666'}}>Description</th>
                        <th style={{padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '700', color: '#666'}}>Amount</th>
                        <th style={{padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#666'}}>Status</th>
                        <th style={{padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#666'}}>Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{borderBottom: '1px solid #e5e7eb', background: 'white'}}>
                        <td style={{padding: '12px', fontSize: '14px', color: '#333'}}>Aug 1, 2026</td>
                        <td style={{padding: '12px', fontSize: '14px', color: '#333'}}>Gold Partner - Annual Subscription</td>
                        <td style={{padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#FF6B35'}}>SGD $748</td>
                        <td style={{padding: '12px', textAlign: 'center'}}><span style={{background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'}}>Paid</span></td>
                        <td style={{padding: '12px', textAlign: 'center'}}><button onClick={() => setErrorMessage('📥 Invoice download functionality will be available when integrated with Stripe webhooks.')} style={{background: 'none', border: 'none', color: '#FF6B35', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer'}}>Download</button></td>
                      </tr>
                      <tr style={{borderBottom: '1px solid #e5e7eb', background: '#fafafa'}}>
                        <td style={{padding: '12px', fontSize: '14px', color: '#333'}}>Jul 15, 2026</td>
                        <td style={{padding: '12px', fontSize: '14px', color: '#333'}}>Upgrade from Silver to Gold (Prorated)</td>
                        <td style={{padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#FF6B35'}}>SGD $37.40</td>
                        <td style={{padding: '12px', textAlign: 'center'}}><span style={{background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'}}>Paid</span></td>
                        <td style={{padding: '12px', textAlign: 'center'}}><button onClick={() => setErrorMessage('📥 Invoice download functionality will be available when integrated with Stripe webhooks.')} style={{background: 'none', border: 'none', color: '#FF6B35', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer'}}>Download</button></td>
                      </tr>
                      <tr style={{borderBottom: '1px solid #e5e7eb', background: 'white'}}>
                        <td style={{padding: '12px', fontSize: '14px', color: '#333'}}>Jul 1, 2026</td>
                        <td style={{padding: '12px', fontSize: '14px', color: '#333'}}>Silver Partner - Annual Subscription</td>
                        <td style={{padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#FF6B35'}}>SGD $268</td>
                        <td style={{padding: '12px', textAlign: 'center'}}><span style={{background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'}}>Paid</span></td>
                        <td style={{padding: '12px', textAlign: 'center'}}><button onClick={() => setErrorMessage('📥 Invoice download functionality will be available when integrated with Stripe webhooks.')} style={{background: 'none', border: 'none', color: '#FF6B35', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer'}}>Download</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REMOVE THIS SECTION - USE AdCreditTracker INSTEAD */}

              {/* UPGRADE/DOWNGRADE SECTION - BOTTOM */}
              <div style={{marginBottom: '40px'}} id="pricing-section">
                <h2 style={{margin: '0 0 12px 0', fontSize: '32px', fontWeight: '700', color: '#333'}}>Choose Your Plan</h2>
                <p style={{margin: '0 0 24px 0', fontSize: '16px', color: '#666', fontWeight: '500'}}>Upgrade or downgrade your subscription anytime. Changes take effect on next renewal date.</p>

                {/* Toggle Buttons */}
                <div style={{display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '32px'}}>
                  <button
                    onClick={() => setPricingBillingCycle('monthly')}
                    style={{padding: '10px 24px', background: pricingBillingCycle === 'monthly' ? '#FF6B35' : '#f5f5f5', border: pricingBillingCycle === 'monthly' ? 'none' : '1px solid #ddd', borderRadius: '8px', fontSize: '15px', fontWeight: pricingBillingCycle === 'monthly' ? '700' : '600', color: pricingBillingCycle === 'monthly' ? 'white' : '#333', cursor: 'pointer', transition: 'all 0.2s', boxShadow: pricingBillingCycle === 'monthly' ? '0 4px 12px rgba(255, 107, 53, 0.3)' : 'none', opacity: pricingBillingCycle === 'monthly' ? 1 : 0.6}}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setPricingBillingCycle('annual')}
                    style={{padding: '10px 24px', background: pricingBillingCycle === 'annual' ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : '#f5f5f5', border: pricingBillingCycle === 'annual' ? '2px solid #FF6B35' : '1px solid #ddd', borderRadius: '8px', fontSize: '15px', fontWeight: pricingBillingCycle === 'annual' ? '800' : '600', color: pricingBillingCycle === 'annual' ? 'white' : '#333', cursor: 'pointer', transition: 'all 0.2s', boxShadow: pricingBillingCycle === 'annual' ? '0 6px 16px rgba(255, 107, 53, 0.4)' : 'none', position: 'relative', letterSpacing: pricingBillingCycle === 'annual' ? '0.5px' : '0'}}
                  >
                    ⭐ Annual
                    {pricingBillingCycle === 'annual' && (
                      <span style={{marginLeft: '8px', fontSize: '12px', fontWeight: '700', background: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: '12px'}}>Save 17%</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Pricing Cards Grid */}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', marginBottom: '40px'}}>
                {/* This creates exactly 3 columns */}
                {/* Silver Plan */}
                {console.log('[DEBUG] Rendering pricing cards - company tier:', company?.subscription_tier)}
                <div style={{border: pricingBillingCycle === 'annual' ? '2px solid #FFD9B3' : '1px solid #e0e0e0', borderRadius: '16px', padding: '32px', textAlign: 'center', background: pricingBillingCycle === 'annual' ? 'linear-gradient(135deg, #FFF9F5 0%, #FFF3E0 100%)' : 'white', transition: 'all 0.3s ease', cursor: 'pointer', transform: pricingBillingCycle === 'annual' ? 'scale(1.02)' : 'scale(1)'}} onMouseEnter={(e) => {e.currentTarget.style.transform = pricingBillingCycle === 'annual' ? 'scale(1.05) translateY(-8px)' : 'translateY(-8px)'; e.currentTarget.style.boxShadow = pricingBillingCycle === 'annual' ? '0 16px 40px rgba(255, 107, 53, 0.2)' : '0 12px 32px rgba(0,0,0,0.12)'}} onMouseLeave={(e) => {e.currentTarget.style.transform = pricingBillingCycle === 'annual' ? 'scale(1.02)' : 'translateY(0)'; e.currentTarget.style.boxShadow = pricingBillingCycle === 'annual' ? '0 8px 20px rgba(255, 107, 53, 0.1)' : 'none'}}>
                  <div style={{marginBottom: '24px'}}>
                    <p style={{margin: '0 0 12px 0', fontSize: '28px'}}>🥈</p>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: pricingBillingCycle === 'annual' ? '#FF6B35' : '#333'}}>Silver</h3>
                    <p style={{margin: '0 0 6px 0', fontSize: '14px', color: '#666', fontWeight: '500'}}>Perfect for startups</p>
                    <p style={{margin: 0, fontSize: '13px', color: '#999', fontWeight: '600'}}>👥 Up to 5 staff</p>
                  </div>

                  <div style={{background: pricingBillingCycle === 'annual' ? 'white' : '#FFF9F5', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: pricingBillingCycle === 'annual' ? '1px solid #FFE4C4' : 'none'}}>
                    <p style={{margin: '0 0 6px 0', fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>PRICE</p>
                    <p style={{margin: '0 0 2px 0', fontSize: '36px', fontWeight: '700', color: '#FF6B35'}}>
                      SGD {pricingBillingCycle === 'annual' ? '276' : '28'}
                    </p>
                    <p style={{margin: 0, fontSize: '13px', color: '#666', fontWeight: '500'}}>per {pricingBillingCycle === 'annual' ? 'year' : 'month'}</p>
                    {pricingBillingCycle === 'annual' && (
                      <p style={{margin: '8px 0 0 0', fontSize: '12px', color: '#999', fontWeight: '600'}}>SGD 0.76/day</p>
                    )}
                  </div>

                  {pricingBillingCycle === 'annual' && (
                    <div style={{background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8f6 100%)', borderRadius: '8px', padding: '14px', marginBottom: '24px', border: '1px solid #c8e6c9'}}>
                      <p style={{margin: 0, fontSize: '13px', color: '#2e7d32', fontWeight: '700'}}>✨ Save 18%<br/><span style={{fontSize: '12px', fontWeight: '600'}}>SGD 60/year</span></p>
                    </div>
                  )}

                  <div style={{textAlign: 'left', marginBottom: '24px', paddingBottom: '24px', borderBottom: pricingBillingCycle === 'annual' ? '1px solid #FFE4C4' : '1px solid #e0e0e0'}}>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Commission: 18% (save 2%)</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Monthly Ad Credit: SGD 50</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ EP Multiplier: 2x</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Team: Up to 5 people</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Milestone Bonus: SGD 20 Ad Credits (one-time at 50 errands)</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Features: Team coordination, AI dashboard</div>
                  </div>

                  {company?.subscription_tier === 'gold' || company?.subscription_tier === 'platinum' ? (
                    <button
                      onClick={() => setShowDowngradeModal({tier: 'silver', billingType: pricingBillingCycle})}
                      style={{width: '100%', padding: '12px 16px', background: '#fee2e2', border: '2px solid #fca5a5', borderRadius: '8px', fontWeight: '700', fontSize: '14px', color: '#991b1b', cursor: 'pointer', transition: 'all 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'} onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}>
                        ⬇️ Downgrade to Silver
                      </button>
                  ) : (
                    <button
                      onClick={() => setShowUpgradeModal({tier: 'silver', billingType: pricingBillingCycle})}
                      style={{width: '100%', padding: '12px 16px', background: pricingBillingCycle === 'annual' ? '#FF6B35' : '#f5f5f5', border: pricingBillingCycle === 'annual' ? 'none' : '1px solid #ddd', borderRadius: '8px', fontWeight: '700', fontSize: '14px', color: pricingBillingCycle === 'annual' ? 'white' : '#333', cursor: 'pointer', transition: 'all 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = pricingBillingCycle === 'annual' ? '#FF8C5A' : '#e8e8e8'} onMouseLeave={(e) => e.currentTarget.style.background = pricingBillingCycle === 'annual' ? '#FF6B35' : '#f5f5f5'}>
                        Upgrade to Silver
                      </button>
                  )}
                </div>

                {/* Gold Plan (Current) */}
                <div style={{border: '3px solid #FF6B35', borderRadius: '16px', padding: '32px', textAlign: 'center', background: 'linear-gradient(135deg, #FFF8F5 0%, #FFEEE4 100%)', position: 'relative', transition: 'all 0.3s ease', cursor: 'pointer', boxShadow: '0 8px 24px rgba(255, 107, 53, 0.15)'}} onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 107, 53, 0.25)'}} onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 53, 0.15)'}}>
                  <div style={{position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: '#FF6B35', color: 'white', padding: '6px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px'}}>CURRENT PLAN</div>

                  <div style={{marginBottom: '24px'}}>
                    <p style={{margin: '0 0 12px 0', fontSize: '28px'}}>🏆</p>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#FF6B35'}}>Gold</h3>
                    <p style={{margin: '0 0 6px 0', fontSize: '14px', color: '#666', fontWeight: '500'}}>Best for growing teams</p>
                    <p style={{margin: 0, fontSize: '13px', color: '#999', fontWeight: '600'}}>👥 Up to 15 staff</p>
                  </div>

                  <div style={{background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px'}}>
                    <p style={{margin: '0 0 6px 0', fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>PRICE</p>
                    <p style={{margin: '0 0 2px 0', fontSize: '36px', fontWeight: '700', color: '#FF6B35'}}>
                      SGD {pricingBillingCycle === 'annual' ? '768' : '78'}
                    </p>
                    <p style={{margin: 0, fontSize: '13px', color: '#666', fontWeight: '500'}}>per {pricingBillingCycle === 'annual' ? 'year' : 'month'}</p>
                    {pricingBillingCycle === 'annual' && (
                      <p style={{margin: '8px 0 0 0', fontSize: '12px', color: '#999', fontWeight: '600'}}>SGD 2.10/day</p>
                    )}
                  </div>

                  {pricingBillingCycle === 'annual' && (
                    <div style={{background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', borderRadius: '8px', padding: '14px', marginBottom: '24px', border: '1px solid #ffd699'}}>
                      <p style={{margin: 0, fontSize: '13px', color: '#f57c00', fontWeight: '700'}}>✨ Save 18%<br/><span style={{fontSize: '12px', fontWeight: '600'}}>SGD 168/year</span></p>
                    </div>
                  )}

                  <div style={{textAlign: 'left', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #FFD9B3'}}>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Commission: 17% (save 3%)</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Monthly Ad Credit: SGD 200</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ EP Multiplier: 3x</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Team: Up to 15 people</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Milestone Bonuses: SGD 50 Ad Credits at 50 errands, SGD 100 Ad Credits at 100 errands (one-time)</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Features: All Silver + events, top newsletter</div>
                  </div>

                  {company?.subscription_tier === 'gold' ? (
                    <button
                      disabled
                      style={{width: '100%', padding: '12px 16px', background: '#FF6B35', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', color: 'white', cursor: 'not-allowed', transition: 'all 0.2s'}}>
                        ✓ Current Plan
                      </button>
                  ) : company?.subscription_tier === 'platinum' ? (
                    <button
                      onClick={() => setShowDowngradeModal({tier: 'gold', billingType: pricingBillingCycle})}
                      style={{width: '100%', padding: '12px 16px', background: '#fee2e2', border: '2px solid #fca5a5', borderRadius: '8px', fontWeight: '700', fontSize: '14px', color: '#991b1b', cursor: 'pointer', transition: 'all 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'} onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}>
                        ⬇️ Downgrade to Gold
                      </button>
                  ) : (
                    <button
                      onClick={() => setShowUpgradeModal({tier: 'gold', billingType: pricingBillingCycle})}
                      style={{width: '100%', padding: '12px 16px', background: '#FF6B35', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', color: 'white', cursor: 'pointer', transition: 'all 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#ff8c5a'} onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}>
                        Upgrade to Gold
                      </button>
                  )}
                </div>

                {/* Platinum Plan */}
                <div style={{border: pricingBillingCycle === 'annual' ? '2px solid #6366f1' : '2px solid #6366f1', borderRadius: '16px', padding: '32px', textAlign: 'center', background: pricingBillingCycle === 'annual' ? 'linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%)' : 'linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%)', transition: 'all 0.3s ease', cursor: 'pointer', transform: pricingBillingCycle === 'annual' ? 'scale(1.02)' : 'scale(1)'}} onMouseEnter={(e) => {e.currentTarget.style.transform = pricingBillingCycle === 'annual' ? 'scale(1.05) translateY(-8px)' : 'translateY(-8px)'; e.currentTarget.style.boxShadow = pricingBillingCycle === 'annual' ? '0 16px 40px rgba(99, 102, 241, 0.25)' : '0 12px 32px rgba(99, 102, 241, 0.2)'}} onMouseLeave={(e) => {e.currentTarget.style.transform = pricingBillingCycle === 'annual' ? 'scale(1.02)' : 'translateY(0)'; e.currentTarget.style.boxShadow = pricingBillingCycle === 'annual' ? '0 8px 20px rgba(99, 102, 241, 0.15)' : 'none'}}>
                  <div style={{marginBottom: '24px'}}>
                    <p style={{margin: '0 0 12px 0', fontSize: '28px'}}>💎</p>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#6366f1'}}>Platinum</h3>
                    <p style={{margin: '0 0 6px 0', fontSize: '14px', color: '#666', fontWeight: '500'}}>For enterprise scale</p>
                    <p style={{margin: 0, fontSize: '13px', color: '#999', fontWeight: '600'}}>👥 Unlimited staff</p>
                  </div>

                  <div style={{background: pricingBillingCycle === 'annual' ? '#f8f9ff' : 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: pricingBillingCycle === 'annual' ? '1px solid #ddd9ff' : 'none'}}>
                    <p style={{margin: '0 0 6px 0', fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>PRICE</p>
                    <p style={{margin: '0 0 2px 0', fontSize: '36px', fontWeight: '700', color: '#6366f1'}}>
                      SGD {pricingBillingCycle === 'annual' ? '1,456' : '148'}
                    </p>
                    <p style={{margin: 0, fontSize: '13px', color: '#666', fontWeight: '500'}}>per {pricingBillingCycle === 'annual' ? 'year' : 'month'}</p>
                    {pricingBillingCycle === 'annual' && (
                      <p style={{margin: '8px 0 0 0', fontSize: '12px', color: '#999', fontWeight: '600'}}>SGD 3.99/day</p>
                    )}
                  </div>

                  {pricingBillingCycle === 'annual' && (
                    <div style={{background: 'linear-gradient(135deg, #e8ebff 0%, #dfe2ff 100%)', borderRadius: '8px', padding: '14px', marginBottom: '24px', border: '1px solid #c7cffe'}}>
                      <p style={{margin: 0, fontSize: '13px', color: '#4f46e5', fontWeight: '700'}}>✨ Save 18%<br/><span style={{fontSize: '12px', fontWeight: '600'}}>SGD 320/year</span></p>
                    </div>
                  )}

                  <div style={{textAlign: 'left', marginBottom: '24px', paddingBottom: '24px', borderBottom: pricingBillingCycle === 'annual' ? '1px solid #ddd9ff' : '1px solid #d0d9f7'}}>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Commission: 16% (save 4%)</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Monthly Ad Credit: SGD 500</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ EP Multiplier: 5x</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Team: Unlimited</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Milestone Bonuses: SGD 100 Ad Credits at 50 errands, SGD 200 Ad Credits at 100 errands, SGD 500 Ad Credits at 200 errands (one-time)</div>
                    <div style={{margin: '12px 0', fontSize: '14px', color: '#333', fontWeight: '500'}}>✓ Features: All Gold + blog, quarterly newsletter, priority events</div>
                  </div>

                  {company?.subscription_tier === 'platinum' ? (
                    <button
                      disabled
                      style={{width: '100%', padding: '12px 16px', background: '#ccc', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', color: '#999', cursor: 'not-allowed', transition: 'all 0.2s'}}>
                        ✓ Current Plan
                      </button>
                  ) : (
                    <button
                      onClick={() => setShowUpgradeModal({tier: 'platinum', billingType: pricingBillingCycle})}
                      style={{width: '100%', padding: '12px 16px', background: pricingBillingCycle === 'annual' ? '#6366f1' : 'white', border: pricingBillingCycle === 'annual' ? 'none' : '2px solid #6366f1', borderRadius: '8px', fontWeight: '700', fontSize: '14px', color: pricingBillingCycle === 'annual' ? 'white' : '#6366f1', cursor: 'pointer', transition: 'all 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = pricingBillingCycle === 'annual' ? '#818cf8' : '#f0f4ff'} onMouseLeave={(e) => e.currentTarget.style.background = pricingBillingCycle === 'annual' ? '#6366f1' : 'white'}>
                        Upgrade to Platinum
                      </button>
                  )}
                </div>
              </div>

              {/* WHAT HAPPENS WHEN YOU UPGRADE/DOWNGRADE */}
              <div style={{marginTop: '48px'}}>
                <h2 style={{margin: '0 0 24px 0', fontSize: '28px', fontWeight: '700', color: '#333'}}>What Happens When You Upgrade or Downgrade?</h2>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px'}}>
                  {/* UPGRADE SCENARIO */}
                  <div style={{border: '3px solid #27AE60', borderRadius: '16px', padding: '32px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #d1fae5'}}>
                      <span style={{fontSize: '32px'}}>⬆️</span>
                      <div>
                        <h3 style={{margin: 0, fontSize: '20px', fontWeight: '700', color: '#27AE60'}}>When You Upgrade</h3>
                        <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#059669', fontWeight: '700'}}>✅ ACTIVE IMMEDIATELY - No Waiting!</p>
                      </div>
                    </div>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                      <div style={{background: 'linear-gradient(to right, #ecfdf5, #d1fae5)', padding: '16px', borderRadius: '10px', border: '2px solid #6ee7b7'}}>
                        <p style={{margin: 0, fontSize: '13px', fontWeight: '700', color: '#059669'}}>🎯 UPGRADE HAPPENS RIGHT NOW</p>
                        <p style={{margin: '6px 0 0 0', fontSize: '12px', color: '#047857'}}>New plan features activate IMMEDIATELY when you click upgrade</p>
                      </div>

                      <div style={{background: 'white', padding: '14px', borderRadius: '10px', border: '2px solid #d1fae5'}}>
                        <p style={{margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#27AE60', textTransform: 'uppercase'}}>⚡ Get Features Today</p>
                        <p style={{margin: 0, fontSize: '14px', color: '#333', fontWeight: '600'}}>All premium features available immediately</p>
                        <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666'}}>No delays • No waiting until next month</p>
                      </div>

                      <div style={{background: 'white', padding: '14px', borderRadius: '10px', border: '2px solid #d1fae5'}}>
                        <p style={{margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#27AE60', textTransform: 'uppercase'}}>💰 Pay Pro-Rated Amount TODAY</p>
                        <p style={{margin: 0, fontSize: '14px', color: '#333', fontWeight: '600'}}>Charged immediately for remaining days</p>
                        <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666'}}>Example: Upgrade to Platinum today = ~SGD $1,995 charged now</p>
                      </div>

                      <div style={{background: 'white', padding: '14px', borderRadius: '10px', border: '2px solid #d1fae5'}}>
                        <p style={{margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#27AE60', textTransform: 'uppercase'}}>📅 Future Renewal: Aug 1, 2027</p>
                        <p style={{margin: 0, fontSize: '14px', color: '#333', fontWeight: '600'}}>At renewal, you'll pay full new plan price</p>
                        <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666'}}>Full year at new rate from Aug 1, 2027</p>
                      </div>
                    </div>
                  </div>

                  {/* DOWNGRADE SCENARIO */}
                  <div style={{border: '3px solid #F39C12', borderRadius: '16px', padding: '32px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #fde68a'}}>
                      <span style={{fontSize: '32px'}}>⬇️</span>
                      <div>
                        <h3 style={{margin: 0, fontSize: '20px', fontWeight: '700', color: '#F39C12'}}>When You Downgrade</h3>
                        <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#D97706', fontWeight: '600'}}>⏳ Takes Effect at Next Renewal (Aug 1, 2027)</p>
                      </div>
                    </div>

                    {/* DISCOURAGEMENT BOX - WARN AGAINST DOWNGRADE */}
                    <div style={{background: 'linear-gradient(135deg, #FECACA 0%, #FEA5A5 100%)', border: '3px solid #DC2626', borderRadius: '12px', padding: '18px', marginBottom: '24px'}}>
                      <p style={{margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#7F1D1D', textTransform: 'uppercase'}}>⚠️ Think Twice Before Downgrading!</p>
                      <p style={{margin: 0, fontSize: '13px', color: '#991B1B', fontWeight: '600', lineHeight: '1.5'}}>
                        You're currently saving <strong>SGD {company?.subscription_tier === 'platinum' ? '7,372' : company?.subscription_tier === 'gold' ? '2,626' : '228'}/year</strong> with your plan. Downgrading means losing valuable benefits like:
                      </p>
                      <ul style={{margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#7F1D1D', fontWeight: '600', lineHeight: '1.4'}}>
                        <li>{company?.subscription_tier === 'platinum' ? '5x EP Multiplier (down to 3x)' : company?.subscription_tier === 'gold' ? '3x EP Multiplier (down to 2x)' : '2x EP Multiplier (down to 1x)'}</li>
                        <li>{company?.subscription_tier === 'platinum' ? 'SGD 500/month ad credits' : company?.subscription_tier === 'gold' ? 'SGD 200/month ad credits' : 'SGD 50/month ad credits'}</li>
                        <li>Team coordination and advanced features</li>
                      </ul>
                      <p style={{margin: '10px 0 0 0', fontSize: '12px', color: '#7F1D1D', fontWeight: '700'}}>💡 Contact support@errandify.com for better pricing options!</p>
                    </div>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                      <div style={{background: '#fffbeb', padding: '14px', borderRadius: '10px', border: '2px solid #fcd34d'}}>
                        <p style={{margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#F39C12', textTransform: 'uppercase'}}>⏰ 7 Months to Transition</p>
                        <p style={{margin: 0, fontSize: '14px', color: '#333', fontWeight: '600'}}>Keep full current plan benefits until Aug 1, 2027</p>
                        <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666'}}>Plenty of time to adjust before feature limits apply</p>
                      </div>

                      <div style={{background: '#FEE2E2', padding: '14px', borderRadius: '10px', border: '2px solid #DC2626'}}>
                        <p style={{margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase'}}>❌ Revenue Loss at Renewal</p>
                        <p style={{margin: 0, fontSize: '14px', color: '#7F1D1D', fontWeight: '600'}}>You LOSE earning potential, not just pay less</p>
                        <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#991B1B', fontWeight: '600'}}>Example: Gold to Silver = Lose SGD 2,400/year in benefits + commission savings</p>
                      </div>

                      <div style={{background: '#FEE2E2', padding: '14px', borderRadius: '10px', border: '2px solid #DC2626'}}>
                        <p style={{margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase'}}>❌ Severe Feature Restrictions</p>
                        <p style={{margin: 0, fontSize: '14px', color: '#7F1D1D', fontWeight: '600'}}>Your business capabilities will be LIMITED</p>
                        <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#991B1B', fontWeight: '600'}}>Smaller team, fewer features, less earning potential</p>
                      </div>

                      <div style={{background: '#FEE2E2', padding: '14px', borderRadius: '10px', border: '2px solid #DC2626'}}>
                        <p style={{margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase'}}>⚠️ Lost Growth Opportunity</p>
                        <p style={{margin: 0, fontSize: '14px', color: '#7F1D1D', fontWeight: '600'}}>Your data stays, but your earning power doesn't</p>
                        <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#991B1B', fontWeight: '600'}}>You can't grow as fast with lower multipliers and ad credits</p>
                      </div>

                      <div style={{background: '#fef3c7', padding: '14px', borderRadius: '10px', border: '2px solid #fbbf24'}}>
                        <p style={{margin: 0, fontSize: '12px', fontWeight: '700', color: '#D97706'}}>ℹ️ If you have more staff than limit, you can adjust before renewal</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRACKING & BENEFITS DASHBOARDS */}
                <div style={{marginTop: '48px'}} data-benefits-tracking>
                  <h2 style={{margin: '0 0 32px 0', fontSize: '28px', fontWeight: '700', color: '#333'}}>📊 Your Subscription Benefits & Tracking</h2>

                  {/* Three Column Grid for Tracking Cards */}
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'}}>
                    {/* Card 1: Ad Credit Usage - Uses AdCreditTracker Component */}
                    <div style={{background: 'linear-gradient(135deg, #FFF8F5 0%, #FFEEE4 100%)', border: '2px solid #FF6B35', borderRadius: '16px', padding: '24px'}}>
                      <h3 style={{margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#333'}}>💳 Ad Credit Usage</h3>
                      {company && <AdCreditTracker companyId={company.id} compact={true} />}
                    </div>

                    {/* Card 2: Milestone Progress */}
                    <div style={{background: 'linear-gradient(135deg, #FFF9F7 0%, #FFF5F0 100%)', border: '2px solid #FF6B35', borderRadius: '16px', padding: '24px'}}>
                      <h3 style={{margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#333'}}>🎯 Milestone Progress</h3>
                      <div style={{background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #FFD9B3'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                          <p style={{margin: 0, fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>50 Errands Completed</p>
                          <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#FF6B35'}}>38 / 50</p>
                        </div>
                        <div style={{background: '#f0f0f0', borderRadius: '8px', height: '8px', overflow: 'hidden', marginBottom: '12px'}}>
                          <div style={{background: '#FF6B35', height: '100%', width: '76%', borderRadius: '8px'}}></div>
                        </div>
                        {company?.subscription_tier === 'gold' || company?.subscription_tier === 'platinum' ? (
                          <>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                              <p style={{margin: 0, fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>100 Errands Completed</p>
                              <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#999'}}>38 / 100</p>
                            </div>
                            <div style={{background: '#f0f0f0', borderRadius: '8px', height: '8px', overflow: 'hidden'}}>
                              <div style={{background: '#ccc', height: '100%', width: '38%', borderRadius: '8px'}}></div>
                            </div>
                          </>
                        ) : null}
                        {company?.subscription_tier === 'platinum' ? (
                          <div style={{marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <p style={{margin: 0, fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>200 Errands Completed</p>
                            <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#999'}}>38 / 200</p>
                          </div>
                        ) : null}
                      </div>
                      <div style={{background: '#dbeafe', borderRadius: '8px', padding: '12px', border: '1px solid #93c5fd', fontSize: '13px', color: '#1e40af'}}>
                        <strong>🎁 Next Reward:</strong> Complete 12 more errands to earn <strong>SGD {company?.subscription_tier === 'gold' ? '50' : company?.subscription_tier === 'platinum' ? '100' : '20'} in Ad Credits</strong>! Automatically added to your account.
                      </div>
                    </div>

                    {/* Card 3: Commission Savings & ROI */}
                    <div style={{background: 'linear-gradient(135deg, #FFEEE4 0%, #FFE4C4 100%)', border: '2px solid #FF6B35', borderRadius: '16px', padding: '24px'}}>
                      <h3 style={{margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#333'}}>💰 Savings & ROI</h3>
                      <div style={{background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #FFD9B3'}}>
                        <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>Monthly Commission Saved</p>
                        <p style={{margin: '0 0 12px 0', fontSize: '28px', fontWeight: '800', color: '#FF6B35'}}>
                          SGD {company?.subscription_tier === 'gold' ? '38' : company?.subscription_tier === 'platinum' ? '76' : '19'}
                        </p>
                        <p style={{margin: 0, fontSize: '12px', color: '#666', fontWeight: '600'}}>
                          vs Free tier at 20% commission on SGD 950 tasks
                        </p>
                      </div>
                      <div style={{background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #FFD9B3'}}>
                        <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#8B4513', fontWeight: '700', textTransform: 'uppercase'}}>Annual ROI</p>
                        <p style={{margin: '0 0 4px 0', fontSize: '26px', fontWeight: '800', color: '#4ade80'}}>
                          {company?.subscription_tier === 'gold' ? '381%' : company?.subscription_tier === 'platinum' ? '621%' : '507%'}
                        </p>
                        <p style={{margin: 0, fontSize: '12px', color: '#666', fontWeight: '600'}}>
                          {company?.subscription_tier === 'gold' ? 'SGD 2,626 saved annually' : company?.subscription_tier === 'platinum' ? 'SGD 7,372 saved annually' : 'SGD 2,688 saved annually'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* EP Multiplier Impact */}
                  <div style={{marginTop: '32px', background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)', border: '2px solid #0ea5e9', borderRadius: '16px', padding: '24px'}}>
                    <h3 style={{margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#333'}}>⚡ EP Multiplier Impact</h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'}}>
                      <div style={{background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #bae6fd'}}>
                        <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#0c4a6e', fontWeight: '700', textTransform: 'uppercase'}}>Your Multiplier</p>
                        <p style={{margin: 0, fontSize: '28px', fontWeight: '800', color: '#0ea5e9'}}>
                          {company?.subscription_tier === 'gold' ? '3x' : company?.subscription_tier === 'platinum' ? '5x' : company?.subscription_tier === 'silver' ? '2x' : '1x'}
                        </p>
                      </div>
                      <div style={{background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #bae6fd'}}>
                        <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#0c4a6e', fontWeight: '700', textTransform: 'uppercase'}}>EP Earned This Month</p>
                        <p style={{margin: 0, fontSize: '28px', fontWeight: '800', color: '#0ea5e9'}}>
                          {company?.subscription_tier === 'gold' ? '450' : company?.subscription_tier === 'platinum' ? '750' : '300'} EP
                        </p>
                      </div>
                      <div style={{background: '#e0f2fe', borderRadius: '12px', padding: '16px', border: '1px solid #bae6fd', gridColumn: '1 / -1'}}>
                        <p style={{margin: 0, fontSize: '13px', color: '#0c4a6e', fontWeight: '600'}}>
                          <strong>Comparison:</strong> Without your plan (1x multiplier), you&apos;d earn {company?.subscription_tier === 'gold' ? '150' : company?.subscription_tier === 'platinum' ? '150' : '150'} EP. You&apos;re earning <strong>{company?.subscription_tier === 'gold' ? '3x' : company?.subscription_tier === 'platinum' ? '5x' : '2x'} more!</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                <div style={{marginTop: '40px', background: '#FFF9F5', borderRadius: '12px', padding: '24px', border: '1px solid #e0e0e0'}}>
                  <h3 style={{margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#333'}}>❓ Frequently Asked Questions</h3>

                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px'}}>
                    <div>
                      <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>Can I change my plan anytime?</p>
                      <p style={{margin: 0, fontSize: '13px', color: '#666'}}>Yes! You can upgrade or downgrade anytime. Downgrades take effect at your next renewal date.</p>
                    </div>
                    <div>
                      <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>What if I exceed staff limits?</p>
                      <p style={{margin: 0, fontSize: '13px', color: '#666'}}>Your existing staff won't be removed. New invites are blocked until you upgrade or remove staff.</p>
                    </div>
                    <div>
                      <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>Do you offer discounts?</p>
                      <p style={{margin: 0, fontSize: '13px', color: '#666'}}>Annual plans save 17% compared to monthly. Enterprise pricing available for large teams.</p>
                    </div>
                    <div>
                      <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>Need help choosing?</p>
                      <p style={{margin: 0, fontSize: '13px', color: '#666'}}>Contact support at support@errandify.com or chat with our sales team for guidance.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* POINTS SECTION - MyRewards & EP Combined */}
          {activeSection === 'points' && (
            <div className="section-content">
              {/* Professional Header */}
              <div style={{background: 'linear-gradient(135deg, #FFF5F0 0%, #FFF9F7 100%)', borderRadius: '16px', padding: '32px', marginBottom: '32px', border: '2px solid #FFE4C4'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                  <div>
                    <h2 style={{margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#8B4513'}}>💰 MyRewards & EP</h2>
                    <p style={{margin: 0, fontSize: '15px', color: '#666', fontWeight: '500'}}>Manage your points, recognize your team, and track rewards</p>
                  </div>
                  <div style={{background: 'white', borderRadius: '12px', padding: '16px 24px', textAlign: 'center', border: '2px solid #FFB84D', minWidth: '150px'}}>
                    <p style={{margin: '0 0 4px 0', fontSize: '12px', color: '#999', fontWeight: '600'}}>Available Balance</p>
                    <p style={{margin: 0, fontSize: '28px', fontWeight: '700', color: '#FF6B35'}}>{stats.pointsBalance}</p>
                    <p style={{margin: '4px 0 0 0', fontSize: '11px', color: '#999'}}>Errandify Points</p>
                  </div>
                </div>
              </div>

              {/* Tab Navigation - Warm & Professional */}
              <div style={{display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '2px solid #F0E6DC', paddingBottom: '0', overflowX: 'auto'}}>
                <button
                  onClick={() => setRewardsTab('overview')}
                  style={{
                    padding: '14px 28px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: rewardsTab === 'overview' ? '700' : '500',
                    fontSize: '15px',
                    color: rewardsTab === 'overview' ? '#FF6B35' : '#999',
                    borderBottom: rewardsTab === 'overview' ? '3px solid #FF6B35' : 'none',
                    marginBottom: '-2px',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                    position: 'relative'
                  }}
                >
                  💰 Overview
                </button>
                <button
                  onClick={() => setRewardsTab('gift')}
                  style={{
                    padding: '14px 28px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: rewardsTab === 'gift' ? '700' : '500',
                    fontSize: '15px',
                    color: rewardsTab === 'gift' ? '#FF6B35' : '#999',
                    borderBottom: rewardsTab === 'gift' ? '3px solid #FF6B35' : 'none',
                    marginBottom: '-2px',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  💝 Gift
                </button>
                <button
                  onClick={() => setRewardsTab('redeemed')}
                  style={{
                    padding: '14px 28px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: rewardsTab === 'redeemed' ? '700' : '500',
                    fontSize: '15px',
                    color: rewardsTab === 'redeemed' ? '#FF6B35' : '#999',
                    borderBottom: rewardsTab === 'redeemed' ? '3px solid #FF6B35' : 'none',
                    marginBottom: '-2px',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ✅ My Vouchers
                </button>
                <button
                  onClick={() => setRewardsTab('history')}
                  style={{
                    padding: '14px 28px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: rewardsTab === 'history' ? '700' : '500',
                    fontSize: '15px',
                    color: rewardsTab === 'history' ? '#FF6B35' : '#999',
                    borderBottom: rewardsTab === 'history' ? '3px solid #FF6B35' : 'none',
                    marginBottom: '-2px',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  📋 All Transactions
                </button>
                <button
                  onClick={() => setRewardsTab('buy-ep')}
                  style={{
                    padding: '14px 28px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: rewardsTab === 'buy-ep' ? '700' : '500',
                    fontSize: '15px',
                    color: rewardsTab === 'buy-ep' ? '#FF6B35' : '#999',
                    borderBottom: rewardsTab === 'buy-ep' ? '3px solid #FF6B35' : 'none',
                    marginBottom: '-2px',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  💳 Buy EP
                </button>
              </div>

              {/* BUY EP TAB - Warm & Engaging */}
              {rewardsTab === 'buy-ep' && (
                <div>
                  {/* Header with warm greeting */}
                  <div style={{marginBottom: '32px', paddingBottom: '20px', borderBottom: '2px solid #FFF0E6'}}>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#8B4513'}}>💳 Boost Your Team's EP</h3>
                    <p style={{margin: 0, fontSize: '14px', color: '#999', fontWeight: '500'}}>Get more Errandify Points to recognize and reward your team members instantly</p>
                  </div>

                  {/* EP Packages Grid - 4 Packages */}
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px'}}>
                    {[
                      { id: 1, ep_amount: 1000, price_sgd: 10.00, discount_percent: 0, emoji: '🚀' },
                      { id: 2, ep_amount: 5000, price_sgd: 45.00, discount_percent: 10, emoji: '⭐', popular: true },
                      { id: 3, ep_amount: 10000, price_sgd: 80.00, discount_percent: 20, emoji: '🎯' },
                      { id: 4, ep_amount: 25000, price_sgd: 180.00, discount_percent: 28, emoji: '💎' },
                    ].map((pkg) => {
                      const fees = calculateStripeFee(pkg.price_sgd);
                      return (
                        <div key={pkg.id} style={{
                          position: 'relative',
                          background: pkg.popular ? 'linear-gradient(135deg, #FFE4C4 0%, #FFDAB9 100%)' : 'white',
                          borderRadius: '16px',
                          border: pkg.popular ? '3px solid #FF6B35' : '2px solid #FFE4C4',
                          padding: '28px',
                          boxShadow: pkg.popular ? '0 8px 24px rgba(255, 107, 53, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          transform: 'scale(1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = pkg.popular ? '0 12px 32px rgba(255, 107, 53, 0.25)' : '0 8px 24px rgba(0, 0, 0, 0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = pkg.popular ? '0 8px 24px rgba(255, 107, 53, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.08)';
                        }}>
                          {pkg.popular && (
                            <div style={{
                              position: 'absolute',
                              top: '-12px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: '#FF6B35',
                              color: 'white',
                              padding: '6px 16px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '700',
                              whiteSpace: 'nowrap'
                            }}>
                              ⭐ Most Popular
                            </div>
                          )}

                          <div style={{textAlign: 'center', marginBottom: '20px'}}>
                            <div style={{fontSize: '40px', marginBottom: '12px'}}>{pkg.emoji}</div>
                            <div style={{fontSize: '28px', fontWeight: '800', color: '#FF6B35', marginBottom: '8px'}}>
                              {pkg.ep_amount.toLocaleString()}
                            </div>
                            <div style={{fontSize: '14px', color: '#999', marginBottom: '16px'}}>Errandify Points</div>

                            <div style={{fontSize: '16px', fontWeight: '700', color: '#999', marginBottom: '4px'}}>
                              Base: SGD ${pkg.price_sgd.toFixed(2)}
                            </div>
                            <div style={{fontSize: '12px', color: '#999', marginBottom: '8px'}}>
                              + ${fees.stripeFee.toFixed(2)} Stripe fee
                            </div>
                            <div style={{fontSize: '24px', fontWeight: '700', color: '#FF6B35', marginBottom: '4px'}}>
                              Total: SGD ${fees.totalSgd.toFixed(2)}
                            </div>
                            {pkg.discount_percent > 0 && (
                              <div style={{fontSize: '12px', color: '#22c55e', fontWeight: '700', marginTop: '12px'}}>
                                💚 Save {pkg.discount_percent}%
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setSelectedEPPackage(pkg);
                              setIsCustomEPPurchase(false);
                              setEpPurchaseStep(0);
                              setCustomEPAmount('');
                            }}
                            style={{
                              width: '100%',
                              padding: '14px 20px',
                              background: '#FF6B35',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#ff8c5a')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
                          >
                            🛒 Buy Now
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom EP Amount Section */}
                  <div style={{background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE4C4 100%)', border: '2px solid #FFB84D', borderRadius: '16px', padding: '28px', marginBottom: '40px', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.1)'}}>
                    <h4 style={{margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', color: '#8B4513'}}>⚡ Or Customize Your Amount</h4>
                    <p style={{margin: '0 0 16px 0', fontSize: '13px', color: '#666', fontWeight: '500'}}>Buy in multiples of 1,000 EP (SGD $0.01 per EP + Stripe fees)</p>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end'}}>
                      <div>
                        <label style={{display: 'block', fontSize: '12px', fontWeight: '700', color: '#8B4513', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>EP Amount</label>
                        <input
                          type="number"
                          min="1000"
                          step="1000"
                          value={customEPAmount}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                            setCustomEPAmount(val);
                          }}
                          placeholder="e.g., 1000, 2000, 5000..."
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: '14px',
                            border: '2px solid #FFB84D',
                            borderRadius: '8px',
                            fontWeight: '600',
                            color: '#333',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {customEPAmount && typeof customEPAmount === 'number' && customEPAmount >= 1000 && customEPAmount % 1000 === 0 ? (
                        (() => {
                          const basePriceSgd = customEPAmount / 100; // SGD $0.01 per EP
                          const fees = calculateStripeFee(basePriceSgd);
                          return (
                            <div style={{background: 'white', borderRadius: '8px', padding: '12px 14px', border: '2px solid #FF6B35'}}>
                              <div style={{fontSize: '12px', fontWeight: '700', color: '#FF6B35', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total with Fee</div>
                              <div style={{fontSize: '18px', fontWeight: '800', color: '#FF6B35'}}>SGD ${fees.totalSgd.toFixed(2)}</div>
                              <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>Base ${basePriceSgd.toFixed(2)} + Fee ${fees.stripeFee.toFixed(2)}</div>
                            </div>
                          );
                        })()
                      ) : null}
                    </div>

                    {customEPAmount && (typeof customEPAmount !== 'number' || customEPAmount < 1000 || customEPAmount % 1000 !== 0) && (
                      <div style={{marginTop: '12px', padding: '12px', background: '#FFF0F0', borderRadius: '8px', border: '1px solid #FFB3B3', fontSize: '12px', color: '#D32F2F', fontWeight: '500'}}>
                        ⚠️ EP amount must be at least 1,000 and in multiples of 1,000
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (customEPAmount && typeof customEPAmount === 'number' && customEPAmount >= 1000 && customEPAmount % 1000 === 0) {
                          const basePriceSgd = customEPAmount / 100;
                          setSelectedEPPackage({
                            id: 0,
                            ep_amount: customEPAmount,
                            price_sgd: basePriceSgd,
                            discount_percent: 0
                          });
                          setIsCustomEPPurchase(true);
                          setEpPurchaseStep(0);
                        }
                      }}
                      disabled={!customEPAmount || typeof customEPAmount !== 'number' || customEPAmount < 1000 || customEPAmount % 1000 !== 0}
                      style={{
                        width: '100%',
                        marginTop: '16px',
                        padding: '14px 20px',
                        background: (customEPAmount && typeof customEPAmount === 'number' && customEPAmount >= 1000 && customEPAmount % 1000 === 0) ? '#FF6B35' : '#CCC',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: (customEPAmount && typeof customEPAmount === 'number' && customEPAmount >= 1000 && customEPAmount % 1000 === 0) ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        if ((customEPAmount && typeof customEPAmount === 'number' && customEPAmount >= 1000 && customEPAmount % 1000 === 0)) {
                          e.currentTarget.style.background = '#ff8c5a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if ((customEPAmount && typeof customEPAmount === 'number' && customEPAmount >= 1000 && customEPAmount % 1000 === 0)) {
                          e.currentTarget.style.background = '#FF6B35';
                        }
                      }}
                    >
                      🛒 Proceed with Custom Amount
                    </button>
                  </div>

                </div>
              )}

              {/* OVERVIEW TAB */}
              {rewardsTab === 'overview' && (
                <div>
                  {/* Overview Section Header */}
                  <div style={{marginBottom: '32px', paddingBottom: '20px', borderBottom: '2px solid #FFF0E6'}}>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#8B4513'}}>Your Rewards at a Glance</h3>
                    <p style={{margin: 0, fontSize: '14px', color: '#999', fontWeight: '500'}}>Manage points, view vouchers, and unlock amazing rewards</p>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px'}}>
                    {/* Quick Stats */}
                  <div style={{background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE4C4 100%)', borderRadius: '16px', padding: '28px', border: '2px solid #FFB84D', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.08)'}}>
                    <p style={{margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#FF6B35', textTransform: 'uppercase', letterSpacing: '0.5px'}}>💰 Available Balance</p>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '36px', fontWeight: '700', color: '#FF6B35'}}>{stats.pointsBalance.toLocaleString()}</h3>
                    <p style={{margin: '0 0 20px 0', fontSize: '13px', color: '#666'}}>Errandify Points ready to use</p>
                    <button
                      onClick={() => setRewardsTab('history')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: '#FF6B35',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#E55A24'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}
                    >
                      📈 View History
                    </button>
                  </div>

                  {/* Recent Vouchers */}
                  <div style={{background: 'white', borderRadius: '16px', padding: '28px', border: '2px solid #E8D5C4', boxShadow: '0 2px 12px rgba(0,0,0,0.06)'}}>
                    <p style={{margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#8B4513', textTransform: 'uppercase', letterSpacing: '0.5px'}}>🎟️ Recent Vouchers</p>
                    <h3 style={{margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: '#333'}}>3 Active Vouchers</h3>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      <div style={{padding: '12px', background: '#F5EFEA', borderRadius: '8px', borderLeft: '4px solid #FF6B35'}}>
                        <p style={{margin: '0 0 2px 0', fontSize: '13px', fontWeight: '600', color: '#333'}}>💳 $10 Discount</p>
                        <p style={{margin: 0, fontSize: '11px', color: '#999'}}>Expires Aug 12, 2026</p>
                      </div>
                      <div style={{padding: '12px', background: '#F5EFEA', borderRadius: '8px', borderLeft: '4px solid #5BA3D0'}}>
                        <p style={{margin: '0 0 2px 0', fontSize: '13px', fontWeight: '600', color: '#333'}}>☕ Starbucks $10</p>
                        <p style={{margin: 0, fontSize: '11px', color: '#999'}}>Expires Sep 30, 2026</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setRewardsTab('redeemed')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: '#8B4513',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginTop: '16px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#6B3410'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#8B4513'}
                    >
                      View All Vouchers
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div style={{background: 'white', borderRadius: '16px', padding: '28px', border: '2px solid #E8D5C4', boxShadow: '0 2px 12px rgba(0,0,0,0.06)'}}>
                    <p style={{margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#8B4513', textTransform: 'uppercase', letterSpacing: '0.5px'}}>⚡ Quick Actions</p>
                    <h3 style={{margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: '#333'}}>Take Action</h3>
                    <button
                      onClick={() => setRewardsTab('buy-ep')}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginBottom: '12px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      💳 Buy EP Now
                    </button>
                    <button
                      onClick={() => setRewardsTab('gift')}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, #FF6B9D, #E74C3C)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginBottom: '12px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      💝 Send a Gift
                    </button>
                    <button
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: '#F5EFEA',
                        color: '#8B4513',
                        border: '2px solid #FFB84D',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FFE4C4'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#F5EFEA'}
                    >
                      🛍️ Redeem Points
                    </button>
                  </div>

                  {/* Available Vouchers - Errandify Discounts */}
                  <div style={{gridColumn: '1 / -1', background: 'linear-gradient(135deg, #FFFBF8 0%, #FFF5F0 100%)', borderRadius: '16px', padding: '32px', border: '2px solid #FFE4C4', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.08)'}}>
                    <div style={{marginBottom: '28px'}}>
                      <p style={{margin: '0 0 12px 0', fontSize: '12px', fontWeight: '700', color: '#FF6B35', textTransform: 'uppercase', letterSpacing: '0.5px'}}>🎁 Available Vouchers - Redeem or Gift</p>
                      <h3 style={{margin: 0, fontSize: '24px', fontWeight: '700', color: '#333'}}>Unlock Amazing Rewards 🎉</h3>
                    </div>

                    {/* Errandify Discounts */}
                    <div style={{marginBottom: '28px'}}>
                      <h4 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#8B4513', paddingBottom: '12px', borderBottom: '2px solid #FFB84D'}}>💳 Errandify Discounts</h4>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px'}}>
                        {[
                          { emoji: '💳', name: '$5 Discount', price: '50 EP', value: 'SGD $5' },
                          { emoji: '💳', name: '$10 Discount', price: '100 EP', value: 'SGD $10' },
                          { emoji: '💎', name: '$20 Discount', price: '200 EP', value: 'SGD $20' }
                        ].map((voucher, idx) => (
                          <div key={idx} style={{background: 'white', borderRadius: '12px', padding: '16px', border: '2px solid #FFD5C0', textAlign: 'center', transition: 'all 0.2s ease', cursor: 'pointer'}} onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(255, 107, 53, 0.15)'}} onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'}}>
                            <p style={{margin: '0 0 8px 0', fontSize: '28px'}}>{voucher.emoji}</p>
                            <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>{voucher.name}</p>
                            <p style={{margin: '0 0 12px 0', fontSize: '12px', color: '#666'}}>Worth {voucher.value}</p>
                            <p style={{margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: '#FF6B35'}}>{voucher.price}</p>
                            <div style={{display: 'flex', gap: '8px'}}>
                              <button style={{flex: 1, padding: '8px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease'}} onMouseEnter={(e) => e.currentTarget.style.background = '#E55A24'} onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}>🎁 Redeem</button>
                              <button style={{flex: 1, padding: '8px', background: '#F5EFEA', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease'}} onMouseEnter={(e) => e.currentTarget.style.background = '#FFE4C4'} onMouseLeave={(e) => e.currentTarget.style.background = '#F5EFEA'}>💝 Gift</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* External Partner Vouchers */}
                    <div>
                      <h4 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#8B4513', paddingBottom: '12px', borderBottom: '2px solid #FFB84D'}}>✨ External Partner Rewards</h4>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px'}}>
                        {[
                          { emoji: '☕', name: 'Starbucks $10', price: '500 EP', value: 'SGD $10' },
                          { emoji: '🍗', name: 'KFC Voucher', price: '450 EP', value: 'SGD $20' },
                          { emoji: '🎬', name: 'Cineplex Ticket', price: '350 EP', value: 'SGD $25' },
                          { emoji: '✈️', name: 'Changi Lounge', price: '1000 EP', value: 'SGD $100' }
                        ].map((voucher, idx) => (
                          <div key={idx} style={{background: 'white', borderRadius: '12px', padding: '16px', border: '2px solid #FFD5C0', textAlign: 'center', transition: 'all 0.2s ease', cursor: 'pointer'}} onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(255, 107, 53, 0.15)'}} onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'}}>
                            <p style={{margin: '0 0 8px 0', fontSize: '28px'}}>{voucher.emoji}</p>
                            <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>{voucher.name}</p>
                            <p style={{margin: '0 0 12px 0', fontSize: '12px', color: '#666'}}>Worth {voucher.value}</p>
                            <p style={{margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: '#FF6B35'}}>{voucher.price}</p>
                            <div style={{display: 'flex', gap: '8px'}}>
                              <button style={{flex: 1, padding: '8px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease'}} onMouseEnter={(e) => e.currentTarget.style.background = '#E55A24'} onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}>🎁 Redeem</button>
                              <button style={{flex: 1, padding: '8px', background: '#F5EFEA', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease'}} onMouseEnter={(e) => e.currentTarget.style.background = '#FFE4C4'} onMouseLeave={(e) => e.currentTarget.style.background = '#F5EFEA'}>💝 Gift</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {/* GIFT TAB - Open GiftingModal */}
              {rewardsTab === 'gift' && (
                <div style={{textAlign: 'center', padding: '40px 20px'}}>
                  <div style={{fontSize: '60px', marginBottom: '20px'}}>💝</div>
                  <h3 style={{fontSize: '22px', fontWeight: '700', color: '#333', marginBottom: '12px'}}>Send Rewards & Recognition</h3>
                  <p style={{fontSize: '14px', color: '#666', marginBottom: '30px', maxWidth: '400px', margin: '0 auto 30px'}}>
                    Gift Errandify Points to your staff, clients, contractors, and partner companies. Create and manage groups for easy gifting to frequently used recipients.
                  </p>

                  <div style={{display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '30px'}}>
                    <button
                      onClick={() => setShowGiftingModal(true)}
                      style={{
                        padding: '14px 32px',
                        background: 'linear-gradient(to right, #FF6B9D, #E74C3C)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
                    >
                      💝 Open Gifting Center
                    </button>
                    <button
                      onClick={() => setRewardsTab('history')}
                      style={{
                        padding: '14px 32px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      📋 View Gift History
                    </button>
                  </div>

                  {/* Features Highlight */}
                  <div style={{background: '#FFF9F5', borderRadius: '12px', padding: '24px', maxWidth: '500px', margin: '0 auto', border: '1px solid #e0e0e0'}}>
                    <h4 style={{fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#333'}}>✨ Gifting Features</h4>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                        <span style={{fontSize: '18px'}}>👥</span>
                        <div style={{textAlign: 'left'}}>
                          <p style={{fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '2px'}}>Multi-Recipient Gifting</p>
                          <p style={{fontSize: '12px', color: '#666'}}>Send rewards to multiple staff at once</p>
                        </div>
                      </div>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                        <span style={{fontSize: '18px'}}>📁</span>
                        <div style={{textAlign: 'left'}}>
                          <p style={{fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '2px'}}>Group Management</p>
                          <p style={{fontSize: '12px', color: '#666'}}>Create and reuse recipient groups</p>
                        </div>
                      </div>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                        <span style={{fontSize: '18px'}}>💬</span>
                        <div style={{textAlign: 'left'}}>
                          <p style={{fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '2px'}}>Custom Messages</p>
                          <p style={{fontSize: '12px', color: '#666'}}>Personalized gifting messages & templates</p>
                        </div>
                      </div>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                        <span style={{fontSize: '18px'}}>📅</span>
                        <div style={{textAlign: 'left'}}>
                          <p style={{fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '2px'}}>Schedule Gifts</p>
                          <p style={{fontSize: '12px', color: '#666'}}>Send gifts now or schedule for later</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div style={{marginTop: '24px', padding: '16px', background: 'linear-gradient(135deg, #FFF3E0, #FFE4C4)', borderRadius: '8px', border: '2px solid #FFB84D'}}>
                    <p style={{fontSize: '12px', color: '#666', marginBottom: '4px'}}>💰 Available Balance</p>
                    <p style={{fontSize: '28px', fontWeight: '700', color: '#FF6B35'}}>{stats.pointsBalance} EP</p>
                  </div>
                </div>
              )}

              {/* MY VOUCHERS TAB */}
              {rewardsTab === 'redeemed' && (
                <div>
                  <div style={{marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                    {[
                      { label: '✅ All', value: 'all' },
                      { label: '🟢 Active', value: 'active' },
                      { label: '🟠 Expiring Soon', value: 'expiring' },
                      { label: '❌ Expired', value: 'expired' }
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setRedeemedFilter(filter.value as any)}
                        style={{
                          padding: '8px 16px',
                          background: redeemedFilter === filter.value ? '#FF6B35' : '#f5f5f5',
                          color: redeemedFilter === filter.value ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px'}}>
                    {[
                      { code: 'ERRAND10', name: '💳 $10 Discount', redeemedDate: '2026-07-10', expiryDate: '2026-08-12', status: 'active', daysLeft: 30 },
                      { code: 'STARBUCKS10', name: '☕ Starbucks $10', redeemedDate: '2026-07-05', expiryDate: '2026-09-30', status: 'active', daysLeft: 80 },
                      { code: 'ERRAND20', name: '💎 $20 Discount', redeemedDate: '2026-06-20', expiryDate: '2026-07-20', status: 'expiring', daysLeft: 7 },
                      { code: 'KFC50', name: '🍗 KFC $20', redeemedDate: '2026-05-20', expiryDate: '2026-06-30', status: 'expired', daysLeft: 0 }
                    ]
                      .filter(voucher => {
                        if (redeemedFilter === 'all') return true;
                        return voucher.status === redeemedFilter;
                      })
                      .map((voucher) => {
                        const statusColor = voucher.status === 'active' ? '#27AE60' : voucher.status === 'expiring' ? '#FF9800' : '#999';
                        const statusBg = voucher.status === 'active' ? '#E8F5E9' : voucher.status === 'expiring' ? '#FFF3E0' : '#f5f5f5';
                        return (
                          <div key={voucher.code} style={{background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '16px', opacity: voucher.status === 'expired' ? 0.6 : 1}}>
                            <div style={{fontSize: '32px', marginBottom: '12px'}}>{voucher.name.split(' ')[0]}</div>
                            <div style={{fontWeight: '700', fontSize: '15px', color: '#333', marginBottom: '4px'}}>{voucher.name}</div>
                            <div style={{fontSize: '12px', color: '#999', marginBottom: '8px'}}>Redeemed: {voucher.redeemedDate}</div>
                            <div style={{fontSize: '12px', color: '#999', marginBottom: '12px'}}>Code: <span style={{fontWeight: '600', fontFamily: 'monospace'}}>{voucher.code}</span></div>

                            <div style={{background: statusBg, border: `1px solid ${statusColor}`, borderRadius: '6px', padding: '8px', marginBottom: '12px', textAlign: 'center'}}>
                              <div style={{fontSize: '12px', fontWeight: '600', color: statusColor}}>
                                {voucher.status === 'active' && `✅ Active - ${voucher.daysLeft}d left`}
                                {voucher.status === 'expiring' && `🟠 Expiring in ${voucher.daysLeft}d`}
                                {voucher.status === 'expired' && `❌ Expired ${Math.abs(voucher.daysLeft)}d ago`}
                              </div>
                              <div style={{fontSize: '11px', color: statusColor, marginTop: '2px'}}>Expires: {voucher.expiryDate}</div>
                            </div>

                            <button
                              disabled={voucher.status === 'expired'}
                              onClick={() => alert(`Using ${voucher.name} with code ${voucher.code}`)}
                              style={{
                                width: '100%',
                                padding: '10px',
                                background: voucher.status === 'expired' ? '#ccc' : '#FF6B35',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: voucher.status === 'expired' ? 'not-allowed' : 'pointer',
                                opacity: voucher.status === 'expired' ? 0.5 : 1,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {voucher.status === 'expired' ? 'Expired' : 'Use Now'}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ALL TRANSACTIONS TAB */}
              {rewardsTab === 'history' && (
                <div>
                  <div style={{marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px'}}>
                    <input
                      type="text"
                      placeholder="🔍 Search transactions..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value.toLowerCase())}
                      style={{padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit'}}
                    />
                    <select
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value as any)}
                      style={{padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', cursor: 'pointer'}}
                    >
                      <option value="all">📋 All Transactions</option>
                      <option value="ep-purchase">💳 EP Purchases</option>
                      <option value="redeemed">🎟️ Voucher Redeemed</option>
                      <option value="gifted">🎁 Voucher Gifted</option>
                      <option value="received">📬 Bonus Received</option>
                    </select>
                  </div>

                  <div style={{background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden'}}>
                    <div style={{overflowX: 'auto'}}>
                      <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                          <tr style={{background: '#FFF9F5', borderBottom: '2px solid #e0e0e0'}}>
                            <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#333'}}>Type</th>
                            <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#333'}}>Description</th>
                            <th style={{padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '13px', color: '#333'}}>Amount (EP)</th>
                            <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#333'}}>Price/Note</th>
                            <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#333'}}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { type: 'ep-purchase', emoji: '💳', description: '8,000 EP Purchase', amount: 8000, price: 'SGD $80.23', date: '2026-07-19', amountColor: '#FF6B35', status: '✅ Paid' },
                            { type: 'ep-purchase', emoji: '💳', description: '5,000 EP Purchase', amount: 5000, price: 'SGD $46.45', date: '2026-07-15', amountColor: '#FF6B35', status: '✅ Paid' },
                            { type: 'redeemed', emoji: '🎟️', description: '$20 Discount Voucher', amount: -200, price: '200 EP Used', date: '2026-07-13', amountColor: '#999', status: '✅ Redeemed' },
                            { type: 'gifted', emoji: '🎁', description: 'Sent 50 EP to 3 staff members', amount: -150, price: 'Sent', date: '2026-07-12', amountColor: '#E91E63', status: '✅ Gifted' },
                            { type: 'ep-purchase', emoji: '💳', description: '10,000 EP Purchase', amount: 10000, price: 'SGD $82.90', date: '2026-07-08', amountColor: '#FF6B35', status: '✅ Paid' },
                            { type: 'received', emoji: '📬', description: 'Received from admin bonus', amount: 500, price: 'Bonus', date: '2026-07-08', amountColor: '#27AE60', status: '✅ Received' },
                            { type: 'redeemed', emoji: '🎟️', description: 'Starbucks $10 Gift', amount: -120, price: '120 EP Used', date: '2026-07-10', amountColor: '#999', status: '✅ Redeemed' },
                            { type: 'redeemed', emoji: '🎟️', description: '$10 Discount Voucher', amount: -100, price: '100 EP Used', date: '2026-07-05', amountColor: '#999', status: '✅ Redeemed' },
                            { type: 'ep-purchase', emoji: '💳', description: '3,000 EP Purchase', amount: 3000, price: 'SGD $30.87', date: '2026-06-25', amountColor: '#FF6B35', status: '✅ Paid' }
                          ]
                            .filter(tx =>
                              (historyFilter === 'all' || tx.type === historyFilter) &&
                              (historySearch === '' || tx.description.toLowerCase().includes(historySearch))
                            )
                            .map((tx, idx) => (
                              <tr key={idx} style={{borderBottom: '1px solid #e0e0e0'}}>
                                <td style={{padding: '16px', fontSize: '20px'}}>{tx.emoji}</td>
                                <td style={{padding: '16px', fontSize: '13px', color: '#333'}}>{tx.description}</td>
                                <td style={{padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '13px', color: tx.amountColor}}>{tx.amount > 0 ? '+' : ''}{tx.amount} EP</td>
                                <td style={{padding: '16px', textAlign: 'left', fontSize: '13px', color: '#666'}}>{tx.price}</td>
                                <td style={{padding: '16px', fontSize: '13px', color: '#999'}}>{tx.date}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{marginTop: '16px', textAlign: 'right'}}>
                    <button
                      onClick={() => alert('📥 Exporting transaction history as CSV...')}
                      style={{
                        padding: '10px 20px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      📥 Export CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Gifting Modal */}
      <GiftingModal
        isOpen={showGiftingModal}
        onClose={() => setShowGiftingModal(false)}
        onSendGift={async (giftData) => {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/wallet/send-gift`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                points: giftData.giftType === 'ep' ? parseInt(giftData.amount) : null,
                recipientIds: giftData.recipientIds,
                message: giftData.message,
                giftType: giftData.giftType,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              alert(`✅ ${result.message}\n\nSent ${giftData.recipientIds.length} gift(s) successfully!`);
              setShowGiftingModal(false);
              // Refresh stats to update EP balance
              fetchCompanyData();
            } else {
              const error = await response.json();
              alert(`❌ Failed to send gift: ${error.error}`);
            }
          } catch (error) {
            console.error('Error sending gift:', error);
            alert('❌ Error sending gift. Please try again.');
          }
        }}
        userBalance={stats.pointsBalance}
      />

      {/* Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          fetchCompanyData();
        }}
        userBalance={stats.pointsBalance}
      />

      {/* SECURITY & PRIVACY MODALS */}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>🔐 Change Password</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <input
                type="password"
                placeholder="Current Password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
              <input
                type="password"
                placeholder="New Password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={async () => {
                  if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
                    alert('❌ All fields are required');
                    return;
                  }
                  if (passwordForm.new !== passwordForm.confirm) {
                    alert('❌ Passwords do not match');
                    return;
                  }
                  if (passwordForm.new.length < 8) {
                    alert('❌ Password must be at least 8 characters');
                    return;
                  }
                  if (passwordForm.new === passwordForm.current) {
                    alert('❌ New password must be different from current password');
                    return;
                  }

                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_URL}/api/users/change-password`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        currentPassword: passwordForm.current,
                        newPassword: passwordForm.new,
                        confirmPassword: passwordForm.confirm,
                      }),
                    });

                    if (response.ok) {
                      alert('✅ Password changed successfully!\n\nYour new password is now active.');
                      setPasswordForm({ current: '', new: '', confirm: '' });
                      setShowPasswordModal(false);
                    } else {
                      const error = await response.json();
                      alert(`❌ ${error.error || 'Failed to change password'}`);
                    }
                  } catch (error: any) {
                    alert(`❌ Error: ${error.message || 'Failed to change password'}`);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Update Password
              </button>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enable 2FA Modal */}
      {show2FAModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>🔐 Enable Two-Factor Authentication</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>Choose your verification method:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: twoFAMethod === 'authenticator' ? '2px solid #FF6B35' : '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                background: twoFAMethod === 'authenticator' ? '#FFF3E0' : 'white',
              }}>
                <input
                  type="radio"
                  checked={twoFAMethod === 'authenticator'}
                  onChange={() => setTwoFAMethod('authenticator')}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>Authenticator App</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Google Authenticator, Microsoft Authenticator, etc.</div>
                </div>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: twoFAMethod === 'sms' ? '2px solid #FF6B35' : '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                background: twoFAMethod === 'sms' ? '#FFF3E0' : 'white',
              }}>
                <input
                  type="radio"
                  checked={twoFAMethod === 'sms'}
                  onChange={() => setTwoFAMethod('sms')}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>SMS Verification</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Receive codes via text message</div>
                </div>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  alert(`✅ 2FA Enabled!\n\nMethod: ${twoFAMethod === 'authenticator' ? 'Authenticator App' : 'SMS'}\n\nYour account is now more secure.`);
                  setShow2FAModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Enable {twoFAMethod === 'authenticator' ? 'Authenticator' : 'SMS'}
              </button>
              <button
                onClick={() => setShow2FAModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Activity Modal */}
      {showLoginActivityModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '70vh',
            overflow: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>📋 Login Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { time: 'Today, 2:45 PM', device: 'MacBook Pro', location: 'Singapore', ip: '203.0.113.42', status: '✅ Current' },
                { time: 'Yesterday, 11:20 AM', device: 'iPhone 14 Pro', location: 'Singapore', ip: '203.0.113.43', status: '✅' },
                { time: '2 days ago, 3:15 PM', device: 'Windows PC', location: 'Singapore', ip: '203.0.113.44', status: '✅' },
                { time: '5 days ago, 9:30 AM', device: 'iPad Air', location: 'Johor', ip: '203.0.113.45', status: '✅' },
              ].map((activity, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  border: '1px solid #eee',
                  borderRadius: '6px',
                  background: '#f9f9f9',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{activity.device}</div>
                    <div style={{ fontSize: '12px', color: '#2D7A34' }}>{activity.status}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    📍 {activity.location} • 🌐 {activity.ip} • ⏰ {activity.time}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowLoginActivityModal(false)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                background: '#f0f0f0',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Generate API Key Modal */}
      {showAPIKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>🔑 Generate API Key</h3>
            {!generatedAPIKey ? (
              <>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                  API keys allow third-party services to access your Errandify account. Keep them secure!
                </p>
                <button
                  onClick={() => {
                    const key = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
                    setGeneratedAPIKey(key);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Generate New Key
                </button>
              </>
            ) : (
              <>
                <div style={{
                  padding: '12px',
                  background: '#FFF3E0',
                  border: '1px solid #FFB74D',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <code style={{ fontSize: '12px', fontFamily: 'monospace', flex: 1 }}>{generatedAPIKey}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedAPIKey);
                      alert('✅ API key copied to clipboard!');
                    }}
                    style={{
                      marginLeft: '8px',
                      padding: '6px 12px',
                      background: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Copy
                  </button>
                </div>
                <button
                  onClick={() => {
                    setGeneratedAPIKey(null);
                    setShowAPIKeyModal(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connected Apps Modal */}
      {showConnectedAppsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '70vh',
            overflow: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>🔗 Connected Apps</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {[
                { name: '💬 Slack', status: 'Connected', connected: true },
                { name: '⚡ Zapier', status: 'Connected', connected: true },
                { name: '📊 Salesforce', status: 'Connected', connected: true },
                { name: '📧 Gmail', status: 'Not Connected', connected: false },
                { name: '📅 Google Calendar', status: 'Not Connected', connected: false },
              ].map((app, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  border: '1px solid #eee',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{app.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{app.status}</div>
                  </div>
                  <button
                    onClick={() => {
                      alert(`${app.connected ? 'Disconnected' : 'Connected'}: ${app.name}`);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: app.connected ? '#f44336' : '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {app.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowConnectedAppsModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#f0f0f0',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Downgrade Warning Modal */}
      {showDowngradeModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001}}>
          <div style={{background: 'linear-gradient(135deg, #FEE2E2 0%, #FEA5A5 100%)', borderRadius: '16px', padding: '40px', maxWidth: '650px', width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', border: '3px solid #DC2626'}}>
            <h2 style={{margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800', color: '#7F1D1D'}}>⚠️ Are You Sure?</h2>
            <p style={{margin: '0 0 24px 0', fontSize: '16px', color: '#991B1B', fontWeight: '600'}}>Downgrading to {showDowngradeModal.tier.charAt(0).toUpperCase() + showDowngradeModal.tier.slice(1)} means losing valuable benefits</p>

            {/* What You're Losing */}
            <div style={{background: 'rgba(255,255,255,0.8)', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '2px solid #DC2626'}}>
              <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#7F1D1D'}}>💔 You'll Lose:</h3>

              {company?.subscription_tier === 'platinum' && showDowngradeModal.tier !== 'platinum' && (
                <>
                  <div style={{margin: '10px 0', padding: '10px', background: '#FEE2E2', borderRadius: '8px', borderLeft: '4px solid #DC2626'}}>
                    <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#7F1D1D'}}>⚡ EP Multiplier: 5x → {showDowngradeModal.tier === 'gold' ? '3x' : '2x'}</p>
                  </div>
                  <div style={{margin: '10px 0', padding: '10px', background: '#FEE2E2', borderRadius: '8px', borderLeft: '4px solid #DC2626'}}>
                    <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#7F1D1D'}}>💳 Monthly Ad Credits: SGD 500 → SGD {showDowngradeModal.tier === 'gold' ? '200' : '50'}</p>
                  </div>
                  <div style={{margin: '10px 0', padding: '10px', background: '#FEE2E2', borderRadius: '8px', borderLeft: '4px solid #DC2626'}}>
                    <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#7F1D1D'}}>👥 Team: Unlimited → {showDowngradeModal.tier === 'gold' ? '15 people' : '5 people'}</p>
                  </div>
                  <div style={{margin: '10px 0', padding: '10px', background: '#FEE2E2', borderRadius: '8px', borderLeft: '4px solid #DC2626'}}>
                    <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#7F1D1D'}}>💰 Annual Savings: SGD 7,372 → SGD {showDowngradeModal.tier === 'gold' ? '2,626' : '228'}</p>
                  </div>
                </>
              )}

              {company?.subscription_tier === 'gold' && showDowngradeModal.tier === 'silver' && (
                <>
                  <div style={{margin: '10px 0', padding: '10px', background: '#FEE2E2', borderRadius: '8px', borderLeft: '4px solid #DC2626'}}>
                    <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#7F1D1D'}}>⚡ EP Multiplier: 3x → 2x</p>
                  </div>
                  <div style={{margin: '10px 0', padding: '10px', background: '#FEE2E2', borderRadius: '8px', borderLeft: '4px solid #DC2626'}}>
                    <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#7F1D1D'}}>💳 Monthly Ad Credits: SGD 200 → SGD 50</p>
                  </div>
                  <div style={{margin: '10px 0', padding: '10px', background: '#FEE2E2', borderRadius: '8px', borderLeft: '4px solid #DC2626'}}>
                    <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#7F1D1D'}}>👥 Team: Up to 15 people → 5 people</p>
                  </div>
                  <div style={{margin: '10px 0', padding: '10px', background: '#FEE2E2', borderRadius: '8px', borderLeft: '4px solid #DC2626'}}>
                    <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#7F1D1D'}}>💰 Annual Savings: SGD 2,626 → SGD 228</p>
                  </div>
                </>
              )}
            </div>

            {/* Renewal Info */}
            <div style={{background: '#fff3cd', borderRadius: '8px', padding: '16px', marginBottom: '20px', border: '2px solid #ffc107'}}>
              <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#856404'}}>⏰ Takes Effect at Next Renewal</p>
              <p style={{margin: '0 0 4px 0', fontSize: '13px', color: '#856404', fontWeight: '600'}}>August 1, 2027</p>
              <p style={{margin: 0, fontSize: '12px', color: '#856404'}}>You'll keep current benefits until then</p>
            </div>

            {/* Action Buttons */}
            <div style={{display: 'flex', gap: '12px'}}>
              {!downgradeConfirmationStep ? (
                <>
                  <button
                    onClick={() => setDowngradeConfirmationStep(true)}
                    style={{flex: 1, padding: '12px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#DC2626')}
                  >
                    Confirm Downgrade
                  </button>
                  <button
                    onClick={() => {setShowDowngradeModal(null); setDowngradeConfirmationStep(false);}}
                    style={{flex: 1, padding: '12px 20px', background: 'white', color: '#DC2626', border: '2px solid #DC2626', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FEE2E2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  >
                    Keep Current Plan
                  </button>
                </>
              ) : (
                <>
                  <div style={{flex: 1, padding: '16px', background: '#FEE2E2', borderRadius: '8px', border: '1px solid #FEC2C2', display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <span style={{fontSize: '20px'}}>⚠️</span>
                    <div>
                      <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#333'}}>Final Confirmation</p>
                      <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666'}}>You'll lose benefits effective Aug 1, 2027</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {downgradeConfirmationStep && (
              <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch('/api/subscriptions/downgrade', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({tier: showDowngradeModal.tier})
                      });
                      const data = await response.json();
                      if (data.success) {
                        setErrorMessage(`✅ Downgrade scheduled to ${showDowngradeModal.tier.toUpperCase()}. Changes take effect on August 1, 2027.`);
                        setShowDowngradeModal(null);
                        setDowngradeConfirmationStep(false);
                        setTimeout(() => window.location.reload(), 4000);
                      } else {
                        setErrorMessage(data.error || 'Failed to schedule downgrade');
                      }
                    } catch (error: any) {
                      setErrorMessage(error.message || 'An error occurred');
                    }
                  }}
                  style={{flex: 1, padding: '12px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#DC2626')}
                >
                  Yes, Downgrade Now
                </button>
                <button
                  onClick={() => setDowngradeConfirmationStep(false)}
                  style={{flex: 1, padding: '12px 20px', background: 'white', color: '#666', border: '2px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {showUpgradeModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001}}>
          <div style={{background: 'linear-gradient(135deg, #FFF8F5 0%, #FFEEE4 100%)', borderRadius: '16px', padding: '40px', maxWidth: '600px', width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', border: '2px solid #FF6B35'}}>
            <h2 style={{margin: '0 0 16px 0', fontSize: '28px', fontWeight: '800', color: '#333'}}>🎉 Upgrade to {showUpgradeModal.tier.charAt(0).toUpperCase() + showUpgradeModal.tier.slice(1)}</h2>
            <p style={{margin: '0 0 24px 0', fontSize: '16px', color: '#666', fontWeight: '500'}}>Here's what you'll GAIN with this upgrade:</p>

            {/* Benefits Comparison */}
            <div style={{background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #FFD9B3'}}>
              {(company?.subscription_tier === 'silver' && showUpgradeModal.tier === 'gold') && (
                <>
                  <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #FFD9B3'}}>
                    <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>💰 Commission Rate</p>
                    <p style={{margin: 0, fontSize: '16px', fontWeight: '800', color: '#666'}}>18% → <span style={{color: '#FF6B35', fontSize: '18px'}}>17%</span> <span style={{fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>+1% SAVE</span></p>
                  </div>
                  <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #FFD9B3'}}>
                    <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>📊 Ad Credits</p>
                    <p style={{margin: 0, fontSize: '16px', fontWeight: '800', color: '#666'}}>SGD 50/month → <span style={{color: '#FF6B35', fontSize: '18px'}}>SGD 200/month</span> <span style={{fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>+SGD 150</span></p>
                  </div>
                  <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #FFD9B3'}}>
                    <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>⚡ EP Multiplier</p>
                    <p style={{margin: 0, fontSize: '16px', fontWeight: '800', color: '#666'}}>2x → <span style={{color: '#FF6B35', fontSize: '18px'}}>3x</span> <span style={{fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>+50%</span></p>
                  </div>
                  <div>
                    <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>👥 Team Members</p>
                    <p style={{margin: 0, fontSize: '16px', fontWeight: '800', color: '#666'}}>5 people → <span style={{color: '#FF6B35', fontSize: '18px'}}>15 people</span> <span style={{fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>+10</span></p>
                  </div>
                </>
              )}
              {((company?.subscription_tier === 'silver' || company?.subscription_tier === 'gold') && showUpgradeModal.tier === 'platinum') && (
                <>
                  <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #FFD9B3'}}>
                    <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>💰 Commission Rate</p>
                    <p style={{margin: 0, fontSize: '16px', fontWeight: '800', color: '#666'}}>{company?.subscription_tier === 'silver' ? '18%' : '17%'} → <span style={{color: '#6366f1', fontSize: '18px'}}>16%</span> <span style={{fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>+{company?.subscription_tier === 'silver' ? '2' : '1'}% SAVE</span></p>
                  </div>
                  <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #FFD9B3'}}>
                    <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>📊 Ad Credits</p>
                    <p style={{margin: 0, fontSize: '16px', fontWeight: '800', color: '#666'}}>SGD {company?.subscription_tier === 'silver' ? '50' : '200'}/month → <span style={{color: '#6366f1', fontSize: '18px'}}>SGD 500/month</span> <span style={{fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>+SGD {company?.subscription_tier === 'silver' ? '450' : '300'}</span></p>
                  </div>
                  <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #FFD9B3'}}>
                    <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>⚡ EP Multiplier</p>
                    <p style={{margin: 0, fontSize: '16px', fontWeight: '800', color: '#666'}}>{company?.subscription_tier === 'silver' ? '2x' : '3x'} → <span style={{color: '#6366f1', fontSize: '18px'}}>5x</span> <span style={{fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>+{company?.subscription_tier === 'silver' ? '150' : '67'}%</span></p>
                  </div>
                  <div>
                    <p style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>👥 Team Members</p>
                    <p style={{margin: 0, fontSize: '16px', fontWeight: '800', color: '#666'}}>{company?.subscription_tier === 'silver' ? '5' : '15'} people → <span style={{color: '#6366f1', fontSize: '18px'}}>Unlimited</span> <span style={{fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>+∞</span></p>
                  </div>
                </>
              )}
            </div>

            {/* Price */}
            <div style={{background: '#fff3cd', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid #ffc107'}}>
              <p style={{margin: 0, fontSize: '16px', fontWeight: '700', color: '#856404'}}>
                💳 {showUpgradeModal.billingType === 'monthly' ? 'SGD 28/month' : 'SGD 276/year'}
                {showUpgradeModal.billingType === 'annual' && <span style={{fontSize: '12px', color: '#999'}}> (Save 18% - SGD 60/year)</span>}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{display: 'flex', gap: '12px'}}>
              {!upgradeConfirmationStep ? (
                <>
                  <button
                    onClick={() => setUpgradeConfirmationStep(true)}
                    style={{flex: 1, padding: '12px 20px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#ff8c5a')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
                  >
                    💳 Proceed to Payment
                  </button>
                  <button
                    onClick={() => {setShowUpgradeModal(null); setUpgradeConfirmationStep(false);}}
                    style={{flex: 1, padding: '12px 20px', background: 'white', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF8F5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  >
                    Back
                  </button>
                </>
              ) : (
                <>
                  <div style={{flex: 1, padding: '16px', background: '#FFF3CD', borderRadius: '8px', border: '1px solid #FFD9B3', display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <span style={{fontSize: '20px'}}>⚠️</span>
                    <div>
                      <p style={{margin: 0, fontSize: '14px', fontWeight: '700', color: '#333'}}>Final Confirmation</p>
                      <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666'}}>This will charge your card immediately</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {upgradeConfirmationStep && (
              <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch('/api/subscriptions/checkout', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({tier: showUpgradeModal.tier, billingType: showUpgradeModal.billingType})
                      });
                      const data = await response.json();
                      if (data.success) {
                        if (data.isDemo) {
                          setErrorMessage(`✅ ${data.message}. Ready to proceed to Stripe checkout.`);
                          setShowUpgradeModal(null);
                          setUpgradeConfirmationStep(false);
                        } else if (data.checkout_url) {
                          window.location.href = data.checkout_url;
                        }
                      } else {
                        setErrorMessage(data.error || 'Failed to create checkout session');
                      }
                    } catch (error: any) {
                      setErrorMessage(error.message || 'An error occurred');
                    }
                  }}
                  style={{flex: 1, padding: '12px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#16a34a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#22c55e')}
                >
                  ✅ Yes, Upgrade Now
                </button>
                <button
                  onClick={() => setUpgradeConfirmationStep(false)}
                  style={{flex: 1, padding: '12px 20px', background: 'white', color: '#666', border: '2px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Churn Prevention Modal */}
      {showChurnPreventionModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001}}>
          <div style={{background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', borderRadius: '16px', padding: '40px', maxWidth: '600px', width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', border: '2px solid #FF9800'}}>
            <div style={{textAlign: 'center', marginBottom: '24px'}}>
              <div style={{fontSize: '48px', marginBottom: '16px'}}>🎁</div>
              <h2 style={{margin: '0 0 12px 0', fontSize: '28px', fontWeight: '800', color: '#333'}}>Hold on!</h2>
              <p style={{margin: 0, fontSize: '16px', color: '#666', fontWeight: '500'}}>We have a special offer just for you</p>
            </div>

            {/* Discount Offer */}
            <div style={{background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '2px solid #FF9800', textAlign: 'center'}}>
              <div style={{fontSize: '14px', color: '#666', marginBottom: '8px'}}>Get</div>
              <div style={{fontSize: '40px', fontWeight: '800', color: '#FF9800', marginBottom: '8px'}}>10% OFF</div>
              <div style={{fontSize: '14px', color: '#666', marginBottom: '16px'}}>For your next 3 months</div>
              <div style={{fontSize: '18px', fontWeight: '700', color: '#FF6B35'}}>Save SGD $224/quarter</div>
              <p style={{margin: '16px 0 0 0', fontSize: '12px', color: '#999'}}>Just for staying with us!</p>
            </div>

            {/* Why Stay */}
            <div style={{background: '#fff9e6', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
              <p style={{margin: '0 0 8px 0', fontSize: '13px', fontWeight: '700', color: '#333'}}>✅ Keep all your benefits</p>
              <p style={{margin: '0 0 8px 0', fontSize: '13px', fontWeight: '700', color: '#333'}}>✅ No hidden fees or commitments</p>
              <p style={{margin: 0, fontSize: '13px', fontWeight: '700', color: '#333'}}>✅ Cancel anytime if you change your mind</p>
            </div>

            {/* Action Buttons */}
            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => {
                  setShowChurnPreventionModal(false);
                  setErrorMessage('✅ Discount applied! Enjoy 10% off for 3 months.');
                }}
                style={{flex: 1, padding: '14px 24px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#ff8c5a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
              >
                🎉 Claim Offer
              </button>
              <button
                onClick={() => {
                  setShowChurnPreventionModal(false);
                  setShowCancelModal(true);
                }}
                style={{flex: 1, padding: '14px 24px', background: 'white', color: '#666', border: '2px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                Still Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EP Purchase Confirmation Modal */}
      {selectedEPPackage && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001}}>
          <div style={{background: 'linear-gradient(135deg, #FFF8F5 0%, #FFEEE4 100%)', borderRadius: '16px', padding: '40px', maxWidth: '500px', width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', border: '2px solid #FF6B35'}}>
            <div style={{textAlign: 'center', marginBottom: '24px'}}>
              <div style={{fontSize: '48px', marginBottom: '16px'}}>🎉</div>
              <h2 style={{margin: '0 0 8px 0', fontSize: '26px', fontWeight: '800', color: '#333'}}>Ready to Boost Your Team?</h2>
              <p style={{margin: '0 0 24px 0', fontSize: '15px', color: '#666', fontWeight: '500'}}>Reward your team members with Errandify Points</p>
            </div>

            {/* Package Details */}
            <div style={{background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '2px solid #FFD9B3'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #FFD9B3'}}>
                <div>
                  <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase'}}>You'll Get</p>
                  <p style={{margin: 0, fontSize: '28px', fontWeight: '800', color: '#FF6B35'}}>{selectedEPPackage.ep_amount.toLocaleString()}</p>
                  <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666'}}>Errandify Points</p>
                </div>
                <div>
                  <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase'}}>You'll Pay</p>
                  <p style={{margin: 0, fontSize: '28px', fontWeight: '800', color: '#FF6B35'}}>SGD ${selectedEPPackage.price_sgd.toFixed(2)}</p>
                  {selectedEPPackage.discount_percent > 0 && (
                    <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#22c55e', fontWeight: '700'}}>💚 Save {selectedEPPackage.discount_percent}%</p>
                  )}
                </div>
              </div>

              <div style={{background: '#FFF5F0', borderRadius: '8px', padding: '12px', textAlign: 'center'}}>
                <p style={{margin: 0, fontSize: '12px', color: '#FF6B35', fontWeight: '600'}}>✨ Payment will be processed securely via Stripe</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={async () => {
                  try {
                    setEpPurchaseStep(2);
                    const token = localStorage.getItem('token');
                    const requestBody = isCustomEPPurchase
                      ? {custom_ep_amount: selectedEPPackage.ep_amount}
                      : {package_id: selectedEPPackage.id};

                    const response = await fetch('/api/wallet/purchase-ep', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify(requestBody)
                    });
                    const data = await response.json();
                    if (data.success && data.checkout_url) {
                      setErrorMessage(`✨ Redirecting to Stripe checkout for ${selectedEPPackage.ep_amount.toLocaleString()} EP...`);
                      setTimeout(() => {
                        // In demo mode, show success instead of redirecting
                        if (data.isDemo) {
                          setErrorMessage(`🎉 Your purchase of ${selectedEPPackage.ep_amount.toLocaleString()} EP for SGD $${data.total_price_sgd.toFixed(2)} (including fees) is ready! In production, you'll be redirected to Stripe.`);
                          setSelectedEPPackage(null);
                          setIsCustomEPPurchase(false);
                        } else {
                          window.location.href = data.checkout_url;
                        }
                      }, 1500);
                    } else {
                      setErrorMessage(data.error || 'Failed to initiate purchase');
                      setSelectedEPPackage(null);
                      setIsCustomEPPurchase(false);
                    }
                  } catch (error: any) {
                    setErrorMessage(error.message || 'An error occurred');
                    setSelectedEPPackage(null);
                    setIsCustomEPPurchase(false);
                  }
                }}
                style={{flex: 1, padding: '14px 20px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s ease'}}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#ff8c5a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
              >
                {epPurchaseStep === 2 ? '⏳ Processing...' : '💳 Proceed to Payment'}
              </button>
              <button
                onClick={() => setSelectedEPPackage(null)}
                style={{flex: 1, padding: '14px 20px', background: 'white', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s ease'}}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF8F5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                Not Now
              </button>
            </div>

            <p style={{margin: '16px 0 0 0', fontSize: '12px', color: '#999', textAlign: 'center'}}>
              💚 Your team will thank you for the recognition!
            </p>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001}}>
          <div style={{background: 'linear-gradient(135deg, #FFF8F5 0%, #FFEEE4 100%)', borderRadius: '16px', padding: '40px', maxWidth: '600px', width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', border: '2px solid #FF6B35'}}>
            <h2 style={{margin: '0 0 16px 0', fontSize: '28px', fontWeight: '800', color: '#333'}}>⚠️ Wait! Don't Go Yet</h2>
            <p style={{margin: '0 0 24px 0', fontSize: '16px', color: '#666', fontWeight: '500'}}>Before you cancel, let's show you what you'd be giving up:</p>

            {/* Value Breakdown */}
            <div style={{background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #FFD9B3'}}>
              <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #FFD9B3'}}>
                <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>💰 Annual Savings Lost</p>
                <p style={{margin: 0, fontSize: '24px', fontWeight: '800', color: '#FF6B35'}}>SGD {company?.subscription_tier === 'platinum' ? '1,300' : company?.subscription_tier === 'gold' ? '600' : '250'}/year</p>
                <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#999'}}>From commission reduction</p>
              </div>

              <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #FFD9B3'}}>
                <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>📊 Ad Credits Lost</p>
                <p style={{margin: 0, fontSize: '20px', fontWeight: '800', color: '#FF6B35'}}>SGD {company?.subscription_tier === 'platinum' ? '6,000' : company?.subscription_tier === 'gold' ? '2,400' : '600'}/year</p>
                <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#999'}}>Monthly allocation expires</p>
              </div>

              <div style={{marginBottom: '0', paddingBottom: '0'}}>
                <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#333'}}>⚡ EP Multiplier Lost</p>
                <p style={{margin: 0, fontSize: '20px', fontWeight: '800', color: '#FF6B35'}}>Back to 1x</p>
                <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#999'}}>From {company?.subscription_tier === 'platinum' ? '5x' : company?.subscription_tier === 'gold' ? '3x' : '2x'} multiplier</p>
              </div>
            </div>

            {/* Cancellation Date */}
            <div style={{background: '#fff3cd', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid #ffc107'}}>
              <p style={{margin: 0, fontSize: '14px', fontWeight: '600', color: '#856404'}}>
                ⏰ {company?.billing_type === 'monthly' ? 'Your subscription cancels end of this month' : 'Your subscription cancels Aug 1, 2027'}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/subscriptions/cancel', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    });
                    const data = await response.json();
                    if (data.success) {
                      setErrorMessage('✅ Subscription cancelled. Your premium benefits will end on your next renewal date.');
                      setShowCancelModal(false);
                      setTimeout(() => window.location.reload(), 2000);
                    } else {
                      setErrorMessage(data.error || 'Failed to cancel subscription');
                    }
                  } catch (error: any) {
                    setErrorMessage(error.message || 'An error occurred');
                  }
                }}
                style={{flex: 1, padding: '12px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#c82333')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc3545')}
              >
                Yes, Cancel My Subscription
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{flex: 1, padding: '12px 20px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#ff8c5a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
              >
                🎉 Keep My Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '2px solid #DC3545',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                fontSize: '32px',
                background: '#FFE5E5',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                ⚠️
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#DC3545' }}>Delete Account</h3>
            </div>

            {!canDeleteAccount && deletionBlockers.length > 0 ? (
              <>
                <div style={{
                  background: '#FFF3E0',
                  border: '2px solid #FF6B35',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333', fontWeight: '600' }}>
                    ❌ Cannot Delete Account
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                    Your account has active obligations that must be resolved before deletion.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#333' }}>
                    Pending Issues ({deletionBlockers.length}):
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deletionBlockers.map((blocker, idx) => (
                      <div key={idx} style={{
                        background: '#FCE4EC',
                        border: '1px solid #F48FB1',
                        borderRadius: '6px',
                        padding: '12px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#C2185B' }}>
                            {blocker.type === 'PENDING_ERRANDS' && '📦 Active Errands'}
                            {blocker.type === 'PAYMENT_HOLDS' && '💰 Payment Holds'}
                            {blocker.type === 'PENDING_DISPUTES' && '⚔️ Disputes'}
                            {blocker.type === 'OUTSTANDING_PAYMENTS' && '💳 Outstanding Payments'}
                            {blocker.type === 'PENDING_WITHDRAWALS' && '🏦 Pending Withdrawals'}
                            {blocker.type === 'ACTIVE_COMPANY' && '🏢 Company Owned'}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#DC3545' }}>
                            {blocker.message}
                          </span>
                        </div>
                        {blocker.details && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                            💡 {blocker.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
                  Please resolve these issues before requesting account deletion.
                </p>

                <button
                  onClick={() => {
                    setDeleteConfirmationText('');
                    setShowDeleteAccountModal(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div style={{
                  background: '#FFF3E0',
                  border: '2px solid #FF6B35',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  lineHeight: '1.6',
                }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333', fontWeight: '600' }}>
                    ⚠️ WARNING: This will permanently delete your account
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                    This action cannot be undone. All your data, including profile, transactions, and history will be permanently removed from Errandify.
                  </p>
                </div>

                <div style={{
                  background: '#E8F5E9',
                  border: '1px solid #4CAF50',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px',
                }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#2E7D32' }}>
                    ✅ Your account is eligible for deletion
                  </p>
                </div>

                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                  To confirm, type <strong>"DELETE"</strong> below:
                </p>
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    marginBottom: '16px',
                    boxSizing: 'border-box',
                  }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={async () => {
                      if (deleteConfirmationText === 'DELETE') {
                        try {
                          const token = localStorage.getItem('token');
                          const response = await fetch(`${API_URL}/api/users/delete-account`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json',
                            },
                          });

                          if (response.ok) {
                            alert('✅ Account deletion request submitted.\n\nCheck your email for a confirmation link. You have 48 hours to confirm the deletion.');
                            setDeleteConfirmationText('');
                            setShowDeleteAccountModal(false);
                          } else {
                            const error = await response.json();
                            alert(`❌ ${error.error || 'Failed to delete account'}`);
                          }
                        } catch (error: any) {
                          alert(`❌ Error: ${error.message || 'Failed to delete account'}`);
                        }
                      } else {
                        alert('❌ Please type "DELETE" to confirm account deletion');
                      }
                    }}
                    disabled={deleteConfirmationText !== 'DELETE'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: deleteConfirmationText === 'DELETE' ? '#DC3545' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: deleteConfirmationText === 'DELETE' ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    🗑️ Delete My Account
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirmationText('');
                      setShowDeleteAccountModal(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#f0f0f0',
                      color: '#333',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error/Success Modal */}
      {errorMessage && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000}}>
          <div style={{background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '500px', width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', textAlign: 'center'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>
              {errorMessage.includes('✅') ? '✅' : errorMessage.includes('Error') ? '❌' : '⚠️'}
            </div>
            <p style={{margin: '0 0 24px 0', fontSize: '16px', color: '#333', fontWeight: '600', lineHeight: '1.6'}}>
              {errorMessage}
            </p>
            <button
              onClick={() => setErrorMessage(null)}
              style={{width: '100%', padding: '12px 24px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'}}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ff8c5a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboardNew;
