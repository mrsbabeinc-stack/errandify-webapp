import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CategorySelectionPage from './pages/CategorySelectionPage';
import CategoryPreferencePage from './pages/CategoryPreferencePage';
import CreateErrandPage from './pages/CreateErrandPage';
import EditErrandPage from './pages/EditErrandPage';
import HanaTaskCreationPage from './pages/HanaTaskCreationPage';
import BrowseErrandsPage from './pages/BrowseErrandsPage';
import ErrandsPage from './pages/ErrandsPage';
import ErrandDetailPage from './pages/ErrandDetailPage';
import ChatPage from './pages/ChatPage';
import MyVillagePage from './pages/MyVillagePage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'asker' | 'doer'>('asker');
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
  }, []);

  const handleLogin = (role: 'asker' | 'doer') => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
      <p className="text-gray-600">Loading...</p>
    </div>;
  }

  return (
    <Router>
      <Routes>
        {/* Landing page - shown first to unauthenticated users */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <LandingPage />
            )
          }
        />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        {/* Hana task creation - AI-powered errand posting */}
        <Route
          path="/create-errand-hana"
          element={
            isAuthenticated ? (
              <HanaTaskCreationPage userRole={userRole} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Create errand - direct, no category page needed */}
        <Route
          path="/create-errand"
          element={
            isAuthenticated ? (
              <CreateErrandPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Category selection - for both asker and doer */}
        <Route
          path="/category"
          element={
            isAuthenticated ? (
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
            isAuthenticated ? (
              <CategoryPreferencePage userRole={userRole} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Browse errands (doer flow) */}
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

        {/* Main dashboard layout */}
        <Route
          element={
            isAuthenticated ? (
              <Layout userRole={userRole} onRoleChange={setUserRole} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route path="/home" element={<HomePage userRole={userRole} />} />
          <Route path="/errands" element={<ErrandsPage userRole={userRole} />} />
          <Route path="/errand/:id" element={<ErrandDetailPage />} />
          <Route path="/errand/:id/edit" element={<EditErrandPage userRole={userRole} />} />
          <Route path="/village" element={<MyVillagePage userRole={userRole} />} />
          <Route path="/chat" element={<ChatPage userRole={userRole} />} />
          <Route path="/profile" element={<ProfilePage userRole={userRole} />} />
        </Route>
      </Routes>
    </Router>
  );
}
