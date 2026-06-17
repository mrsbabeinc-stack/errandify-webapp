import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  userRole: 'asker' | 'doer';
}

export default function HomePage({ userRole }: HomePageProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Friend');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.name || 'Friend');
      } catch {
        setUserName('Friend');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-errandify-bg">
      {/* Page Container */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-errandify-brown mb-2">
            Welcome, {userName}! 👋
          </h1>
          <p className="text-gray-600">
            {userRole === 'asker'
              ? 'Post errands and find reliable doers to complete them'
              : 'Browse available errands and earn by helping others'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/create-errand')}
            className="bg-errandify-orange text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-2 block">📝</span>
            <span className="font-semibold text-sm">Post an Errand</span>
          </button>

          <button
            onClick={() => navigate('/errands')}
            className="bg-blue-500 text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-2 block">
              {userRole === 'asker' ? '📋' : '✓'}
            </span>
            <span className="font-semibold text-sm">
              {userRole === 'asker' ? 'My Errands' : 'My Work'}
            </span>
          </button>
        </div>

        {/* Role-Specific Feature List */}
        <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
          <h2 className="font-bold text-errandify-brown mb-4">How Errandify Works</h2>
          {userRole === 'asker' ? (
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-lg">📝</span>
                <span><strong>Post an Errand:</strong> Describe what you need done</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">👥</span>
                <span><strong>Find a Doer:</strong> Browse qualified neighbours who can help</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">✓</span>
                <span><strong>Review & Approve:</strong> Get it done and rate your doer</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-lg">🔍</span>
                <span><strong>Browse Errands:</strong> See what's available in your area</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">💪</span>
                <span><strong>Apply & Accept:</strong> Pick errands that match your skills</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">💰</span>
                <span><strong>Get Paid:</strong> Earn money by helping others</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
