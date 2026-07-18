import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { initPushNotifications } from './utils/pushNotifications';
import './styles/CompanyModuleTheme.css';
import Layout from './components/Layout';
import NotificationListener from './components/NotificationListener';
import { NotificationProvider } from './context/NotificationContext';
import NotificationToastContainer from './components/NotificationToastContainer';
import TopNotificationBar from './components/TopNotificationBar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import SingPassSimulator from './pages/SingPassSimulator';
import SingPassCallbackPage from './pages/SingPassCallbackPage';
import VerificationStep from './components/auth/VerificationStep';
import RoleSelectionStep from './components/auth/RoleSelectionStep';
import ACRALookupStep from './components/auth/ACRALookupStep';
import HomePage from './pages/HomePage';
import CategorySelectionPage from './pages/CategorySelectionPage';
import CategoryPreferencePage from './pages/CategoryPreferencePage';
import CreateErrandPage from './pages/CreateErrandPage';
import EditErrandPage from './pages/EditErrandPage';
import HanaPage from './pages/HanaPage';
import BrowseErrandsPage from './pages/BrowseErrandsPage';
import DoerBrowsePage from './pages/DoerBrowsePage';
import ErrandsPage from './pages/ErrandsPage';
import ErrandDetailPage from './pages/ErrandDetailPage';
import ChatPage from './pages/ChatPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import ReviewPage from './pages/ReviewPage';
import MyProfilePage from './pages/MyProfilePage';
import ReferralPage from './pages/ReferralPage';
import ReferralTracking from './pages/admin/ReferralTracking';
import PayoutSettingsPage from './pages/PayoutSettingsPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import ErrandifyPointsPage from './pages/ErrandifyPointsPage';
import MyRewardsPage from './pages/MyRewardsPage';
import PointsHistoryPage from './pages/PointsHistoryPage';
import TestPage from './pages/TestPage';
import TestCannotComplete from './pages/TestCannotComplete';
import TestGradient from './pages/TestGradient';
import MyOfferPage from './pages/MyOfferPage';
import TaskCompleteEvidencePage from './pages/TaskCompleteEvidencePage';
import ReviewCompletionPage from './pages/ReviewCompletionPage';
import MyKampungPage from './pages/MyKampungPage';
import MyPocketPage from './pages/MyPocketPage';
import TrustedUsersPage from './pages/TrustedUsersPage';
import BlockListPage from './pages/BlockListPage';
import AdminPanel from './pages/AdminPanel';
import FAQPage from './pages/FAQPage';
import MyAccountPage from './pages/MyAccountPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutErrandifyPage from './pages/AboutErrandifyPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import BeforeYouGetStartedPage from './pages/BeforeYouGetStartedPage';
import SafetyResourcesPage from './pages/SafetyResourcesPage';
import SupportDashboardPage from './pages/SupportDashboardPage';
import TopNotificationTestPage from './pages/TopNotificationTestPage';
import DisputeReviewPage from './pages/DisputeReviewPage';
import AppealDashboardPage from './pages/AppealDashboardPage';
import AdminDashboard from './pages/admin/Dashboard';
import CasesPage from './pages/admin/Cases';
import CategoriesPage from './pages/admin/Categories';
import VouchersPage from './pages/admin/Vouchers';
import ReportsPage from './pages/admin/Reports';
import { FinancialHealthReport } from './pages/admin/reports/FinancialHealthReport';
import { UserBehaviorReport } from './pages/admin/reports/UserBehaviorReport';
import { MarketAnalysisReport } from './pages/admin/reports/MarketAnalysisReport';
import { CategoryAnalysisReport } from './pages/admin/reports/CategoryAnalysisReport';
import { VulnerableUsersReport } from './pages/admin/reports/VulnerableUsersReport';
import { MarketTrendsReport } from './pages/admin/reports/MarketTrendsReport';
import { ActionPlansReport } from './pages/admin/reports/ActionPlansReport';
import { GTMReport } from './pages/admin/reports/GTMReport';
import { ErrandPerfReport } from './pages/admin/reports/ErrandPerfReport';
import { DemographicsReport } from './pages/admin/reports/DemographicsReport';
import { RegionalPerformanceReport } from './pages/admin/reports/RegionalPerformanceReport';
import UsersSafetyPage from './pages/admin/UsersSafety';
import DisputesPage from './pages/admin/Disputes';
import OperationsPage from './pages/admin/Operations';
import DiscountCodesPage from './pages/admin/DiscountCodesPage';
import { ErrandifyPointsEnhancedPage as AdminErrandifyPointsPage } from './pages/admin/ErrandifyPointsEnhanced';
import { GrantEPEnhancedPage as GrantPointsPage } from './pages/admin/GrantPointsEnhanced';
import { EPRulesFlexiblePage as EPRulesPage } from './pages/admin/EPRulesFlexible';
import EmailCampaigns from './pages/admin/EmailCampaigns';
import CompanyManagement from './pages/admin/CompanyManagement';
import SubscriptionPackages from './pages/admin/SubscriptionPackages';
import AdvertisingApproval from './pages/admin/AdvertisingApproval';
import PartnerTiers from './pages/admin/PartnerTiers';
import AdminAuthManagement from './pages/admin/AdminAuthManagement';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminPaymentsManagement from './pages/admin/AdminPaymentsManagement';
import AdminErrandManagement from './pages/admin/AdminErrandManagement';
import AdminCompanyDeepManagement from './pages/admin/AdminCompanyDeepManagement';
import AdminSystemConfiguration from './pages/admin/AdminSystemConfiguration';
import AdminAuditCompliance from './pages/admin/AdminAuditCompliance';
import AdminAlertsNotifications from './pages/admin/AdminAlertsNotifications';
import NotificationsManagement from './pages/admin/NotificationsManagement';
import EventReminders from './pages/admin/EventReminders';
import BlogArticles from './pages/admin/BlogArticles';
import Recognition from './pages/admin/Recognition';
import HanaFAQBrowser from './pages/admin/HanaFAQBrowser';
import HanaFAQCategories from './pages/admin/HanaFAQCategories';
import HanaFAQManage from './pages/admin/HanaFAQManage';
import NotificationSystemTest from './pages/admin/NotificationSystemTest';
import CommunityFeed from './pages/admin/CommunityFeed';
import HeroBanners from './pages/admin/HeroBanners';
import CompanyClientIntelligence from './pages/admin/CompanyClientIntelligence';
import AccountsDashboard from './pages/admin/AccountsDashboard';
import HRDashboard from './pages/admin/HRDashboard';
import PayrollDashboard from './pages/admin/PayrollDashboard';
import FinancialReportsDashboard from './pages/admin/FinancialReportsDashboard';
import InvoicingDashboard from './pages/admin/InvoicingDashboard';
import LeaveManagementDashboard from './pages/admin/LeaveManagementDashboard';
import ExpenseClaimsDashboard from './pages/admin/ExpenseClaimsDashboard';
import AIReportsDashboard from './pages/admin/AIReportsDashboard';
import AccountsHRIntegrationDashboard from './pages/admin/AccountsHRIntegrationDashboard';
import VendorManagementDashboard from './pages/admin/VendorManagementDashboard';
import ClientManagementDashboard from './pages/admin/ClientManagementDashboard';
import RecruitmentDashboard from './pages/admin/RecruitmentDashboard';
import RBACManagementDashboard from './pages/admin/RBACManagementDashboard';
import StaffSalaryBenefitsEditor from './pages/admin/StaffSalaryBenefitsEditor';
import StaffInfoEditorEnhanced from './pages/admin/StaffInfoEditorEnhanced';
import AttendanceDashboard from './pages/admin/AttendanceDashboard';
import TimesheetManagement from './pages/admin/TimesheetManagement';
import TimesheetApprovalQueue from './pages/admin/TimesheetApprovalQueue';
import AttendanceReports from './pages/admin/AttendanceReports';
import HolidayManager from './pages/admin/HolidayManager';
import CompanyRegistrationPage from './pages/CompanyRegistrationPage';
import MyCompanyDashboard from './pages/MyCompanyDashboard';
import CompanyStaffManagement from './pages/CompanyStaffManagement';
import CompanyPostErrandPage from './pages/CompanyPostErrandPage';
import CompanyDashboardNew from './pages/CompanyDashboardNew';
import StripeCheckoutDummy from './pages/StripeCheckoutDummy';
import StaffDashboard from './pages/StaffDashboard';
import DoerActiveErrands from './components/DoerActiveErrands';
import StaffLeaveApplication from './components/StaffLeaveApplication';
import JobApplicationForm from './pages/JobApplicationForm';
import RecruitmentApplicationsDashboard from './pages/admin/RecruitmentApplicationsDashboard';
import JoinUsPage from './pages/JoinUsPage';
import StaffAttendanceClockIn from './pages/StaffAttendanceClockIn';
import StaffAttendanceHistory from './pages/StaffAttendanceHistory';
import BudgetDashboard from './pages/admin/BudgetDashboard';
import APARDashboard from './pages/admin/APARDashboard';
import ApprovalWorkflows from './pages/admin/ApprovalWorkflows';
import AssetManagement from './pages/admin/AssetManagement';
import ProbationManagement from './pages/admin/ProbationManagement';
import VendorManagement from './pages/admin/VendorManagement';
import TaxManagement from './pages/admin/TaxManagement';
import FixedAssetsDetail from './pages/admin/FixedAssetsDetail';
import CashFlowForecasting from './pages/admin/CashFlowForecasting';
import PayrollGLIntegration from './pages/admin/PayrollGLIntegration';
import ExpenseAPIntegration from './pages/admin/ExpenseAPIntegration';
import LeavePayrollIntegration from './pages/admin/LeavePayrollIntegration';
import StaffBudgetIntegration from './pages/admin/StaffBudgetIntegration';
import HRAccountsReportsDashboard from './pages/admin/HRAccountsReportsDashboard';
import AdvancedReportingAnalytics from './pages/admin/AdvancedReportingAnalytics';
import SingaporeComplianceCenter from './pages/admin/SingaporeComplianceCenter';
import SecurityEncryptionHub from './pages/admin/SecurityEncryptionHub';
import AIFeaturesHub from './pages/admin/AIFeaturesHub';

type UserRole = 'asker' | 'doer' | 'admin' | 'support_l2' | 'support_l3';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('asker');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setIsAuthenticated(true);
        setUserRole(userData.role || 'asker');
      } catch {
        setIsAuthenticated(false);
      }
    }

    setIsCheckingAuth(false);

    // Initialize push notifications
    initPushNotifications().catch((error) => {
      console.error('Push notifications initialization failed:', error);
    });
  }, []);

  const handleLogin = (role: UserRole) => {
    setIsAuthenticated(true);
    setUserRole(role);
    // Update localStorage with the selected role
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      userData.role = role;
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const handleRoleChange = (role: 'asker' | 'doer') => {
    setUserRole(role);
    // Update localStorage with the selected role
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      userData.role = role;
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  // Check if user is admin or support staff
  const isAdmin = userRole === 'admin';
  const isSupport = ['support_l2', 'support_l3'].includes(userRole);
  const isStaff = isAdmin || isSupport;

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('current_role');
    // Clear SingPass auth state to prevent login issues
    localStorage.removeItem('singpass_state');
    localStorage.removeItem('singpass_nonce');
    localStorage.removeItem('singpass_mode');
    // Redirect directly to SingPass login page
    window.location.href = '/auth';
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
      <p className="text-gray-600">Loading...</p>
    </div>;
  }

  // Wrapper components for routes that need navigation
  const VerificationStepRouteWrapper = () => {
    const navigate = useNavigate();
    return (
      <VerificationStep
        onComplete={() => navigate('/auth/complete-profile')}
        onBack={() => navigate('/auth')}
      />
    );
  };

  const RoleSelectionStepRouteWrapper = () => {
    const navigate = useNavigate();
    const user = localStorage.getItem('user');
    const userData = user ? JSON.parse(user) : {};

    return (
      <RoleSelectionStep
        mockData={{
          name: userData.display_name || 'User',
          age: 25,
          nric: userData.nric_hash || '',
          address: userData.mobile || ''
        }}
        onComplete={() => navigate('/home')}
        onBack={() => navigate('/auth/complete-profile')}
      />
    );
  };

  return (
    <NotificationProvider>
      <TopNotificationBar />
      <NotificationToastContainer />
      <Router>
        {isAuthenticated && <NotificationListener />}
        <Routes>
        {/* Landing/Home page - shown first to unauthenticated users */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              isStaff ? <Navigate to="/support/dashboard" replace /> : <Navigate to="/home" replace />
            ) : (
              <LandingPage />
            )
          }
        />

        {/* Auth/Login page */}
        <Route
          path="/auth"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <AuthPage onLogin={handleLogin} />
            )
          }
        />

        {/* Legacy login route - redirect to auth */}
        <Route
          path="/login"
          element={<Navigate to="/auth" replace />}
        />

        {/* SingPass Simulator - Realistic SingPass authentication experience */}
        <Route
          path="/singpass-simulator"
          element={<SingPassSimulator />}
        />

        {/* SingPass OAuth Callback Handler */}
        <Route
          path="/auth/singpass-callback"
          element={<SingPassCallbackPage onLogin={handleLogin} />}
        />

        {/* Verification Step - Criminal screening form (after SingPass) */}
        <Route
          path="/auth/verification"
          element={
            isAuthenticated ? (
              <VerificationStepRouteWrapper />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />

        {/* Complete Profile Step - Confirm SingPass data */}
        <Route
          path="/auth/complete-profile"
          element={
            isAuthenticated ? (
              <BeforeYouGetStartedPage />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />

        {/* Role Selection Step - Choose individual or company */}
        <Route
          path="/auth/role-selection"
          element={
            isAuthenticated ? (
              <RoleSelectionStepRouteWrapper />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />

        {/* Safety Declaration - Mandatory pre-access gate */}
        <Route
          path="/before-you-get-started"
          element={
            isAuthenticated ? (
              <BeforeYouGetStartedPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Hana task creation - AI-powered errand posting */}
        <Route
          path="/create-errand-hana"
          element={
            isAuthenticated ? (
              <HanaPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Create errand - full page form */}
        <Route
          path="/create-errand"
          element={
            isAuthenticated ? (
              (() => {
                console.log('🎨 RENDERING CREATE ERRAND PAGE');
                return <CreateErrandPage />;
              })()
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Create errand - manual form with prefilled data from Hana */}
        <Route
          path="/create-errand"
          element={
            <CreateErrandPage />
          }
        />

        {/* Category selection - for both asker and doer */}
        <Route
          path="/category"
          element={
            isAuthenticated && (userRole === 'asker' || userRole === 'doer') ? (
              <CategorySelectionPage userRole={userRole} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Category preferences */}
        <Route
          path="/category-preferences"
          element={
            isAuthenticated && (userRole === 'asker' || userRole === 'doer') ? (
              <CategoryPreferencePage userRole={userRole} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Browse all errands (doer quick access) */}
        <Route
          path="/browse"
          element={
            isAuthenticated ? (
              <DoerBrowsePage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Browse errands by category (doer flow) */}
        <Route
          path="/browse-errands/:categoryId"
          element={
            isAuthenticated ? (
              <BrowseErrandsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* TEST ROUTE - to verify routing works */}
        <Route path="/test" element={<TestPage />} />
        <Route path="/test-gradient" element={<TestGradient />} />
        <Route path="/test-cannot-complete" element={<TestCannotComplete />} />
        <Route path="/test-notifications" element={<TopNotificationTestPage />} />

        {/* Profile sub-pages (outside layout for simpler rendering) */}
        <Route path="/my-profile" element={isAuthenticated ? <MyProfilePage /> : <Navigate to="/login" replace />} />
        <Route path="/referral" element={isAuthenticated ? <ReferralPage /> : <Navigate to="/login" replace />} />
        <Route path="/payout-settings" element={isAuthenticated ? <PayoutSettingsPage /> : <Navigate to="/login" replace />} />
        <Route path="/transaction-history" element={isAuthenticated ? <TransactionHistoryPage /> : <Navigate to="/login" replace />} />
        <Route path="/errandify-points" element={isAuthenticated ? <ErrandifyPointsPage /> : <Navigate to="/login" replace />} />
        <Route path="/my-rewards" element={isAuthenticated ? <MyRewardsPage /> : <Navigate to="/login" replace />} />
        <Route path="/points-history" element={isAuthenticated ? <PointsHistoryPage /> : <Navigate to="/login" replace />} />
        <Route path="/trusted-users" element={isAuthenticated ? <TrustedUsersPage /> : <Navigate to="/login" replace />} />
        <Route path="/block-list" element={isAuthenticated ? <BlockListPage /> : <Navigate to="/login" replace />} />
        <Route path="/my-offer" element={isAuthenticated ? <MyOfferPage /> : <Navigate to="/login" replace />} />
        <Route path="/task/:id/complete" element={isAuthenticated ? <TaskCompleteEvidencePage /> : <Navigate to="/login" replace />} />
        <Route path="/task/:id/review-completion" element={isAuthenticated ? <ReviewCompletionPage /> : <Navigate to="/login" replace />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<AboutErrandifyPage />} />
        <Route path="/my-account" element={isAuthenticated ? <MyAccountPage onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/admin" element={isAuthenticated && isAdmin ? <AdminPanel /> : <Navigate to="/login" replace />} />

        {/* Support Dashboard - L2/L3 Dispute Resolution */}
        <Route path="/support/dashboard" element={isAuthenticated && isSupport ? <SupportDashboardPage /> : <Navigate to="/login" replace />} />
        <Route path="/disputes/:disputeId/review" element={isAuthenticated && isSupport ? <DisputeReviewPage /> : <Navigate to="/login" replace />} />
        <Route path="/support/appeals" element={isAuthenticated && isSupport ? <AppealDashboardPage /> : <Navigate to="/login" replace />} />

        <Route path="/notification-preferences" element={isAuthenticated ? <NotificationPreferencesPage /> : <Navigate to="/login" replace />} />
        <Route path="/safety-resources" element={<SafetyResourcesPage />} />

        {/* Admin Dashboard Routes */}
        <Route path="/admin/dashboard" element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/dashboard/users" element={isAuthenticated && isAdmin ? <UsersSafetyPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/dashboard/disputes" element={isAuthenticated && isAdmin ? <DisputesPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/dashboard/operations" element={isAuthenticated && isAdmin ? <OperationsPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/dashboard/regional" element={isAuthenticated && isAdmin ? <RegionalPerformanceReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/cases" element={isAuthenticated && isAdmin ? <CasesPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/financial" element={isAuthenticated && isAdmin ? <FinancialHealthReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/user-behavior" element={isAuthenticated && isAdmin ? <UserBehaviorReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/market" element={isAuthenticated && isAdmin ? <MarketAnalysisReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/category" element={isAuthenticated && isAdmin ? <CategoryAnalysisReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/vulnerable" element={isAuthenticated && isAdmin ? <VulnerableUsersReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/trends" element={isAuthenticated && isAdmin ? <MarketTrendsReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/actions" element={isAuthenticated && isAdmin ? <ActionPlansReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/gtm" element={isAuthenticated && isAdmin ? <GTMReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/errand-perf" element={isAuthenticated && isAdmin ? <ErrandPerfReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports/demographics" element={isAuthenticated && isAdmin ? <DemographicsReport /> : <Navigate to="/login" replace />} />
        <Route path="/admin/manage/categories" element={isAuthenticated && isAdmin ? <CategoriesPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/manage/vouchers" element={isAuthenticated && isAdmin ? <VouchersPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/manage/points" element={isAuthenticated && isAdmin ? <AdminErrandifyPointsPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/manage/grant-points" element={isAuthenticated && isAdmin ? <GrantPointsPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/manage/point-rules" element={isAuthenticated && isAdmin ? <EPRulesPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/manage/discounts" element={isAuthenticated && isAdmin ? <DiscountCodesPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports" element={isAuthenticated && isAdmin ? <ReportsPage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/referral-tracking" element={isAuthenticated && isAdmin ? <ReferralTracking /> : <Navigate to="/login" replace />} />

        {/* Operations & Management Routes (TIER 1) */}
        <Route path="/admin/operations/auth-management" element={isAuthenticated && isAdmin ? <AdminAuthManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/operations/user-management" element={isAuthenticated && isAdmin ? <AdminUserManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/operations/payments" element={isAuthenticated && isAdmin ? <AdminPaymentsManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/operations/errand-management" element={isAuthenticated && isAdmin ? <AdminErrandManagement /> : <Navigate to="/login" replace />} />

        {/* Configuration & Compliance Routes (TIER 2) */}
        <Route path="/admin/config/company-management" element={isAuthenticated && isAdmin ? <AdminCompanyDeepManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/config/system-configuration" element={isAuthenticated && isAdmin ? <AdminSystemConfiguration /> : <Navigate to="/login" replace />} />
        <Route path="/admin/config/audit-compliance" element={isAuthenticated && isAdmin ? <AdminAuditCompliance /> : <Navigate to="/login" replace />} />
        <Route path="/admin/config/alerts-notifications" element={isAuthenticated && isAdmin ? <AdminAlertsNotifications /> : <Navigate to="/login" replace />} />

        {/* Communications Routes */}
        <Route path="/admin/comms/email" element={isAuthenticated && isAdmin ? <EmailCampaigns /> : <Navigate to="/login" replace />} />
        <Route path="/admin/comms/notifications" element={isAuthenticated && isAdmin ? <NotificationsManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/comms/events" element={isAuthenticated && isAdmin ? <EventReminders /> : <Navigate to="/login" replace />} />
        <Route path="/admin/comms/blog" element={isAuthenticated && isAdmin ? <BlogArticles /> : <Navigate to="/login" replace />} />
        <Route path="/admin/comms/recognition" element={isAuthenticated && isAdmin ? <Recognition /> : <Navigate to="/login" replace />} />
        <Route path="/admin/comms/feed" element={isAuthenticated && isAdmin ? <CommunityFeed /> : <Navigate to="/login" replace />} />
        <Route path="/admin/comms/banners" element={isAuthenticated && isAdmin ? <HeroBanners /> : <Navigate to="/login" replace />} />

        {/* Company Management Routes */}
        <Route path="/admin/company/intelligence" element={isAuthenticated && isAdmin ? <CompanyClientIntelligence /> : <Navigate to="/login" replace />} />
        <Route path="/admin/company/management" element={isAuthenticated && isAdmin ? <CompanyManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/company/subscriptions" element={isAuthenticated && isAdmin ? <SubscriptionPackages /> : <Navigate to="/login" replace />} />
        <Route path="/admin/company/advertising" element={isAuthenticated && isAdmin ? <AdvertisingApproval /> : <Navigate to="/login" replace />} />
        <Route path="/admin/company/partner-tiers" element={isAuthenticated && isAdmin ? <PartnerTiers /> : <Navigate to="/login" replace />} />

        {/* Accounts & HR Routes */}
        <Route path="/admin/accounts" element={isAuthenticated && isAdmin ? <AccountsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/hr" element={isAuthenticated && isAdmin ? <HRDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/payroll" element={isAuthenticated && isAdmin ? <PayrollDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/financial-reports" element={isAuthenticated && isAdmin ? <FinancialReportsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/invoicing" element={isAuthenticated && isAdmin ? <InvoicingDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/leave-management" element={isAuthenticated && isAdmin ? <LeaveManagementDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/expense-claims" element={isAuthenticated && isAdmin ? <ExpenseClaimsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/ai-reports" element={isAuthenticated && isAdmin ? <AIReportsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/accounts-hr-integration" element={isAuthenticated && isAdmin ? <AccountsHRIntegrationDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/vendors" element={isAuthenticated && isAdmin ? <VendorManagementDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/clients" element={isAuthenticated && isAdmin ? <ClientManagementDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/recruitment" element={isAuthenticated && isAdmin ? <RecruitmentDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/recruitment/applications" element={isAuthenticated && isAdmin ? <RecruitmentApplicationsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/attendance" element={isAuthenticated && isAdmin ? <AttendanceDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/timesheets" element={isAuthenticated && isAdmin ? <TimesheetManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/timesheet-approvals" element={isAuthenticated && isAdmin ? <TimesheetApprovalQueue /> : <Navigate to="/login" replace />} />
        <Route path="/admin/attendance-reports" element={isAuthenticated && isAdmin ? <AttendanceReports /> : <Navigate to="/login" replace />} />
        <Route path="/admin/budget" element={isAuthenticated && isAdmin ? <BudgetDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/apar" element={isAuthenticated && isAdmin ? <APARDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/approvals" element={isAuthenticated && isAdmin ? <ApprovalWorkflows /> : <Navigate to="/login" replace />} />
        <Route path="/admin/assets" element={isAuthenticated && isAdmin ? <AssetManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/probation" element={isAuthenticated && isAdmin ? <ProbationManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/vendors" element={isAuthenticated && isAdmin ? <VendorManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/tax" element={isAuthenticated && isAdmin ? <TaxManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/fixed-assets" element={isAuthenticated && isAdmin ? <FixedAssetsDetail /> : <Navigate to="/login" replace />} />
        <Route path="/admin/cash-flow" element={isAuthenticated && isAdmin ? <CashFlowForecasting /> : <Navigate to="/login" replace />} />
        <Route path="/admin/payroll-gl" element={isAuthenticated && isAdmin ? <PayrollGLIntegration /> : <Navigate to="/login" replace />} />
        <Route path="/admin/expense-ap" element={isAuthenticated && isAdmin ? <ExpenseAPIntegration /> : <Navigate to="/login" replace />} />
        <Route path="/admin/leave-payroll" element={isAuthenticated && isAdmin ? <LeavePayrollIntegration /> : <Navigate to="/login" replace />} />
        <Route path="/admin/staff-budget" element={isAuthenticated && isAdmin ? <StaffBudgetIntegration /> : <Navigate to="/login" replace />} />
        <Route path="/admin/hr-accounts-reports" element={isAuthenticated && isAdmin ? <HRAccountsReportsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/advanced-reporting" element={isAuthenticated && isAdmin ? <AdvancedReportingAnalytics /> : <Navigate to="/login" replace />} />
        <Route path="/admin/compliance" element={isAuthenticated && isAdmin ? <SingaporeComplianceCenter /> : <Navigate to="/login" replace />} />
        <Route path="/admin/security" element={isAuthenticated && isAdmin ? <SecurityEncryptionHub /> : <Navigate to="/login" replace />} />
        <Route path="/admin/ai-features" element={isAuthenticated && isAdmin ? <AIFeaturesHub /> : <Navigate to="/login" replace />} />
        <Route path="/apply/:jobId" element={<JobApplicationForm />} />
        <Route path="/join-us" element={<JoinUsPage />} />
        <Route path="/admin/rbac" element={isAuthenticated && isAdmin ? <RBACManagementDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/hana-faq" element={isAuthenticated && isAdmin ? <HanaFAQBrowser /> : <Navigate to="/login" replace />} />
        <Route path="/admin/hana-faq-categories" element={isAuthenticated && isAdmin ? <HanaFAQCategories /> : <Navigate to="/login" replace />} />
        <Route path="/admin/hana-faq-manage" element={isAuthenticated && isAdmin ? <HanaFAQManage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/notification-test" element={isAuthenticated && isAdmin ? <NotificationSystemTest /> : <Navigate to="/login" replace />} />
        <Route path="/admin/staff-info" element={isAuthenticated && isAdmin ? <StaffInfoEditorEnhanced /> : <Navigate to="/login" replace />} />
        <Route path="/admin/staff-salary-benefits" element={isAuthenticated && isAdmin ? <StaffSalaryBenefitsEditor /> : <Navigate to="/login" replace />} />
        <Route path="/admin/holidays" element={isAuthenticated && isAdmin ? <HolidayManager /> : <Navigate to="/login" replace />} />

        {/* Company Registration and Dashboard Routes */}
        <Route path="/company/register" element={isAuthenticated ? <CompanyRegistrationPage /> : <Navigate to="/login" replace />} />
        <Route path="/company/dashboard" element={isAuthenticated ? <CompanyDashboardNew /> : <Navigate to="/login" replace />} />
        <Route path="/company/dashboard-new" element={isAuthenticated ? <CompanyDashboardNew /> : <Navigate to="/login" replace />} />

        {/* Stripe Checkout (Dummy for testing) */}
        <Route path="/stripe-checkout" element={<StripeCheckoutDummy />} />
        <Route path="/company/staff" element={isAuthenticated ? <CompanyStaffManagement /> : <Navigate to="/login" replace />} />
        <Route path="/company/post-errand" element={isAuthenticated ? <CompanyPostErrandPage /> : <Navigate to="/login" replace />} />
        <Route path="/staff/dashboard" element={isAuthenticated ? <DoerActiveErrands /> : <Navigate to="/login" replace />} />
        <Route path="/staff/clock-in" element={isAuthenticated ? <StaffAttendanceClockIn /> : <Navigate to="/login" replace />} />
        <Route path="/staff/attendance-history" element={isAuthenticated ? <StaffAttendanceHistory /> : <Navigate to="/login" replace />} />
        <Route path="/apply-leave" element={isAuthenticated ? <StaffLeaveApplication /> : <Navigate to="/login" replace />} />

        {/* Main dashboard layout - for asker/doer AND admin users */}
        <Route
          element={
            isAuthenticated ? (
              <Layout userRole={userRole} onRoleChange={handleRoleChange} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route path="/home" element={<HomePage userRole={userRole as 'asker' | 'doer'} />} />
          <Route path="/errands" element={<ErrandsPage userRole={userRole as 'asker' | 'doer'} />} />
          <Route path="/errand/:id" element={<ErrandDetailPage userRole={userRole as 'asker' | 'doer'} />} />
          <Route path="/errand/:id/edit" element={<EditErrandPage userRole={userRole as 'asker' | 'doer'} />} />
          <Route path="/chat" element={<ChatPage userRole={userRole as 'asker' | 'doer'} />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/my-kampung" element={<MyKampungPage />} />
          <Route path="/my-pocket" element={<MyPocketPage />} />
          <Route path="/wallet" element={<MyPocketPage />} />
          <Route path="/profile" element={<Navigate to="/my-account" replace />} />
          <Route path="/review/:jobId" element={<ReviewPage />} />
        </Route>
      </Routes>
      </Router>
    </NotificationProvider>
  );
}
