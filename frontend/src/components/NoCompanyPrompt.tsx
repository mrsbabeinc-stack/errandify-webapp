import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NoCompanyPromptProps {
  dismissed?: boolean;
}

export default function NoCompanyPrompt({ dismissed = false }: NoCompanyPromptProps) {
  const navigate = useNavigate();

  if (dismissed) return null;

  return (
    <div className="no-company-prompt">
      <div className="prompt-card">
        <div className="prompt-icon">🏢</div>
        <h2>Ready to Grow Your Business?</h2>
        <p>Register your company to unlock powerful team management, bulk task posting, and analytics.</p>

        <ul className="prompt-features">
          <li>
            <span className="feature-icon">📋</span>
            <span>Post and manage bulk tasks</span>
          </li>
          <li>
            <span className="feature-icon">👥</span>
            <span>Manage employee teams</span>
          </li>
          <li>
            <span className="feature-icon">📊</span>
            <span>Access analytics dashboard</span>
          </li>
          <li>
            <span className="feature-icon">⭐</span>
            <span>Build company reputation</span>
          </li>
        </ul>

        <div className="prompt-actions">
          <button
            onClick={() => navigate('/company/register')}
            className="btn-primary"
          >
            Register Your Company
          </button>
          <button
            onClick={() => navigate('/home')}
            className="btn-secondary"
          >
            Continue as Individual
          </button>
        </div>

        <p className="prompt-hint">You can register your company anytime from your account settings</p>
      </div>
    </div>
  );
}
