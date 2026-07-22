import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/BeforeYouGetStarted.css';

export default function BeforeYouGetStartedPage() {
  const navigate = useNavigate();
  const [declarations, setDeclarations] = useState({
    noConvictions: false,
    vulnerableUserCare: false,
    safetyEmergency: false,
    privacyRespect: false,
    honestyConsequences: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleCheckbox = (declaration: string) => {
    setDeclarations({
      ...declarations,
      [declaration]: !declarations[declaration],
    });
  };

  const allDeclarationsAccepted = Object.values(declarations).every(v => v === true);

  const handleAccept = async () => {
    if (!allDeclarationsAccepted) {
      setError('Please read and accept all 5 declarations before continuing.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/accept-declaration`,
        {
          declarations,
          acceptedAt: new Date().toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        localStorage.setItem('declarationAccepted', 'true');
        localStorage.setItem('declarationAcceptedAt', new Date().toISOString());
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save declaration. Please try again.');
      console.error('Declaration save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="before-you-get-started">
      <div className="declaration-container">
        {/* Header */}
        <div className="declaration-header">
          <h1>🏡 Before You Get Started</h1>
          <p>Welcome to the Errandify community!</p>
          <p className="subtitle">
            Please read and accept the following before you start browsing or posting errands
          </p>
        </div>

        {/* Declaration 1: No Convictions */}
        <div className="declaration-section">
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id="noConvictions"
              checked={declarations.noConvictions}
              onChange={() => handleCheckbox('noConvictions')}
            />
            <label htmlFor="noConvictions">
              I confirm I have no convictions involving violence, sexual misconduct, dishonesty, or harm to a vulnerable person.
            </label>
          </div>
          <div className="explanation">
            <strong>🔒 What this means:</strong>
            <p>
              This is a safety measure to protect vulnerable users (elderly, children, disabled people)
              from potential harm. If you have concerns about a past conviction, please contact our
              support team.
            </p>
          </div>
        </div>

        {/* Declaration 2: Vulnerable User Care Standards */}
        <div className="declaration-section">
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id="vulnerableUserCare"
              checked={declarations.vulnerableUserCare}
              onChange={() => handleCheckbox('vulnerableUserCare')}
            />
            <label htmlFor="vulnerableUserCare">
              I understand some categories — ElderCare, ChildCare, and Wellness — involve helping seniors,
              children, or people who need extra care. These are basic companionship and minding errands only,
              not medical or clinical care.
            </label>
          </div>
          <div className="explanation">
            <strong>⚠️ What this means:</strong>
            <ul>
              <li>✅ You're providing companionship and help with daily errands</li>
              <li>❌ NOT medical care, nursing, or professional treatment</li>
              <li>✅ Examples: keeping elderly company, helping with errands, supervised play</li>
              <li>❌ Examples: giving medication, changing medical dressings, therapy</li>
            </ul>
          </div>
        </div>

        {/* Declaration 3: Safety & Emergency Response */}
        <div className="declaration-section">
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id="safetyEmergency"
              checked={declarations.safetyEmergency}
              onChange={() => handleCheckbox('safetyEmergency')}
            />
            <label htmlFor="safetyEmergency">
              If I ever sense someone is in danger or being harmed, I will contact 999 (Police) or
              MSF (1800-777-0000) right away, and let Errandify know.
            </label>
          </div>
          <div className="explanation">
            <strong>🚨 What this means:</strong>
            <p>
              If you see signs of abuse or harm, you have a moral and legal duty to report it immediately
              to emergency services. You are protected by law for good-faith reports.
            </p>
            <div className="emergency-contacts">
              <strong>Emergency Contacts:</strong>
              <ul>
                <li>🚨 Police: 999</li>
                <li>💬 MSF: 1800-777-0000</li>
                <li>🏥 Ambulance: 995</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Declaration 4: Privacy & Respect */}
        <div className="declaration-section">
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id="privacyRespect"
              checked={declarations.privacyRespect}
              onChange={() => handleCheckbox('privacyRespect')}
            />
            <label htmlFor="privacyRespect">
              I'll treat everyone's home and privacy with respect — anything I see or hear stays private.
            </label>
          </div>
          <div className="explanation">
            <strong>🔒 What this means:</strong>
            <ul>
              <li>✅ Be professional and respectful</li>
              <li>✅ Keep family details and home information confidential</li>
              <li>❌ Don't share photos, discuss details, or post on social media</li>
              <li>❌ Breach of privacy = account suspension or termination</li>
            </ul>
          </div>
        </div>

        {/* Declaration 5: Honesty & Consequences */}
        <div className="declaration-section">
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id="honestyConsequences"
              checked={declarations.honestyConsequences}
              onChange={() => handleCheckbox('honestyConsequences')}
            />
            <label htmlFor="honestyConsequences">
              I understand giving false information here may lead to my account being removed,
              and could have legal consequences.
            </label>
          </div>
          <div className="explanation">
            <strong>⚠️ What this means:</strong>
            <p>
              Lying on this declaration is a crime. It can result in account termination,
              legal action, and criminal charges. Be honest.
            </p>
            <ul>
              <li>⚠️ Tier 1: Account warning</li>
              <li>⚠️ Tier 2: 30-day suspension</li>
              <li>❌ Tier 3: Permanent ban</li>
              <li>🚨 Tier 4: Police report + legal action</li>
            </ul>
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="error-message">❌ {error}</div>}

        {/* Acceptance Section */}
        <div className="acceptance-section">
          <h2>Ready to join Errandify?</h2>
          <p>By tapping below, I confirm:</p>
          <ul>
            <li>✓ I've read all 5 declarations above</li>
            <li>✓ I understand the rules and expectations</li>
            <li>✓ I will follow Errandify's Community Policy</li>
            <li>✓ I will treat vulnerable users with respect</li>
            <li>✓ I understand the legal consequences</li>
            <li>✓ I agree to Errandify's Terms & Conditions</li>
          </ul>

          <button
            className="accept-button"
            onClick={handleAccept}
            disabled={!allDeclarationsAccepted || loading}
          >
            {loading ? 'Processing...' : 'I UNDERSTAND & AGREE'}
          </button>

          <p className="legal-notice">
            By tapping, you're confirming you read and agree to all terms above.
            This creates a legal record.
          </p>

          {/* Footer Links */}
          <div className="footer-links">
            <a href="/terms">Read full Terms & Conditions</a>
            <span className="separator">·</span>
            <a href="/privacy">Privacy Policy</a>
            <span className="separator">·</span>
            <a href="/safety">Safety Guidelines</a>
          </div>

          <div className="support-info">
            <p>Questions? Contact <strong>support@errandify.ai</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
