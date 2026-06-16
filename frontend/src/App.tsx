import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ErrandsPage from './pages/ErrandsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'asker' | 'doer'>('asker');

  const handleLogin = (role: 'asker' | 'doer') => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

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
