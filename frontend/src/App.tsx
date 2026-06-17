import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CategorySelectionPage from './pages/CategorySelectionPage';
import CreateErrandPage from './pages/CreateErrandPage';
import BrowseErrandsPage from './pages/BrowseErrandsPage';
import ErrandsPage from './pages/ErrandsPage';
import ChatPage from './pages/ChatPage';
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
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
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

        {/* Category selection (kept for backward compatibility) */}
        <Route
          path="/category"
          element={
            isAuthenticated ? (
              <Navigate to="/create-errand" replace />
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
              <Navigate to="/login" replace />
            )
          }
        >
          <Route path="/" element={<HomePage userRole={userRole} />} />
          <Route path="/errands" element={<ErrandsPage userRole={userRole} />} />
          <Route path="/chat" element={<ChatPage userRole={userRole} />} />
          <Route path="/profile" element={<ProfilePage userRole={userRole} />} />
        </Route>
      </Routes>
    </Router>
  );
}
