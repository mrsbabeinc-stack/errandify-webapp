import '../styles/CompanyPostErrandPage.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CompanyPostErrandPage: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [hanaInput, setHanaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [industry, setIndustry] = useState('');
  // POST /api/companies/errands requires companyId; this page never captured it
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [hanaExamples, setHanaExamples] = useState<string[]>([]);

  // Industry-based Hana examples mapping
  const examplesByIndustry: { [key: string]: string[] } = {
    'cleaning': [
      'Office needs deep cleaning this Saturday, including carpets and windows',
      'Deep clean our conference room by Friday afternoon',
      'Need someone to disinfect all common areas and touch points',
      'Organize and clean the storage room, archive old files',
      'Carpet shampooing for entire office floor',
    ],
    'delivery': [
      'Need to deliver packages to 3 client locations before 5 PM today',
      'Ship urgent parcels to 5 different addresses by tomorrow',
      'Collect documents from 3 offices and deliver to headquarters',
      'Distribute marketing materials to 10 business locations',
      'Quick delivery run to 2 client sites this afternoon',
    ],
    'security': [
      'Need security coverage for our office event this Saturday',
      'Setup security equipment and monitor our premises',
      'Event security needed for our product launch next week',
      'Conduct security audit of our office building',
      'Provide personnel for entrance monitoring during event',
    ],
    'maintenance': [
      'HVAC system needs maintenance and inspection this week',
      'Repair and maintenance of office equipment needed',
      'Fix our office lighting and electrical issues',
      'Plumbing repair needed in office washrooms',
      'General maintenance and upkeep of facilities',
    ],
    'catering': [
      'Catering needed for 50 people at our office event Saturday',
      'Need food delivery for our team lunch meeting tomorrow',
      'Setup buffet service for our client appreciation event',
      'Coffee and snacks delivery for morning meeting',
      'Full catering service for our quarterly all-hands meeting',
    ],
    'admin': [
      'Need someone to organize our office files and archive old documents',
      'Data entry for our quarterly reports this week',
      'Prepare presentation materials for next week meeting',
      'Filing and document management for our office',
      'Administrative support for end-of-month accounts',
    ],
    'training': [
      'Need staff training on new software platform, 2 hours session',
      'Conduct training workshop on workplace safety',
      'Professional development training for our team members',
      'System training needed for new office management tool',
      'Customer service training for our support staff',
    ],
    'it': [
      'IT support needed to troubleshoot our office network',
      'Setup and configuration of new computer systems',
      'Help with our office WiFi connectivity issues',
      'Technical support for our business software',
      'Computer maintenance and updates needed',
    ],
  };

  // Fetch company industry on mount
  useEffect(() => {
    const fetchCompanyIndustry = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/companies/user/my-company`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const companyIndustry = data.data.industry || 'admin';
          const industryKey = companyIndustry.toLowerCase().split('&')[0].trim();

          // Find matching industry key
          let matchedKey = 'admin';
          for (const key of Object.keys(examplesByIndustry)) {
            if (industryKey.includes(key) || key.includes(industryKey)) {
              matchedKey = key;
              break;
            }
          }

          setCompanyId(data.data.id ?? null);
          setIndustry(companyIndustry);
          setHanaExamples(examplesByIndustry[matchedKey] || examplesByIndustry['admin']);
        }
      } catch (err) {
        console.error('Error fetching company industry:', err);
        setHanaExamples(examplesByIndustry['admin']);
      }
    };

    fetchCompanyIndustry();
  }, [API_URL]);

  const handleHanaExtract = async () => {
    if (!companyId) {
      setError('Still loading your company details — give it a second and try again.');
      return;
    }
    if (!hanaInput.trim()) {
      setError('Please describe the errand');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Was /api/hana/extract, which is not a route on this server — the whole
      // form failed here. The individual Hana flow uses this endpoint.
      const res = await fetch(`${API_URL}/api/ai/extract-task-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: hanaInput, input: hanaInput }),
      });

      if (res.ok) {
        const data = await res.json();
        const extracted = data.data || data;

        // Create errand with extracted data
        const errandRes = await fetch(`${API_URL}/api/companies/errands`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId,
            title: extracted.title || hanaInput.substring(0, 50),
            description: extracted.description || hanaInput,
            // No 'general' fallback — that isn't a category, and an errand
            // stored under it is invisible to every filter. The server resolves
            // whatever Hana returns to a real slug and tells us if it can't.
            category: extracted.category,
            budget: extracted.budget || '',
            deadline: extracted.deadline || '',
            postal_code: extracted.postal_code || extracted.postalCode || '',
            // These were never sent, so every company errand had location NULL
            // and matched no area filter in the marketplace.
            location: extracted.location || extracted.area || '',
            full_address: extracted.full_address || extracted.fullAddress || extracted.address || '',
          }),
        });

        if (errandRes.ok) {
          alert('✨ Errand posted successfully!');
          navigate('/company/dashboard');
        } else {
          // Surface the server's actual reason — "Failed to post errand" hid
          // things like the missing companyId and the verification gate.
          const body = await errandRes.json().catch(() => ({}));
          setError(body.error || 'Failed to post errand');
        }
      } else {
        setError('Hana extraction failed, please try again');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="company-post-errand-hana">
      <button className="back-btn" onClick={() => navigate('/company/dashboard')}>
        ← Back to Dashboard
      </button>

      <div className="hana-container">
        <div className="hana-header">
          <h1>✨ Hana - Errand Assistant</h1>
          <p>Describe your errand naturally for your {industry || 'business'}</p>
          {industry && <span className="industry-badge">{industry}</span>}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="hana-examples-section">
          <p className="examples-label">✨ Industry Examples:</p>
          <div className="examples-grid">
            {hanaExamples.map((example, idx) => (
              <button
                key={idx}
                className="example-btn"
                onClick={() => setHanaInput(example)}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="hana-input-section">
          <label>What do you need done?</label>
          <textarea
            value={hanaInput}
            onChange={(e) => setHanaInput(e.target.value)}
            placeholder="Describe your errand in detail. Hana will extract all the information needed..."
            rows={5}
            className="hana-textarea"
          />
        </div>

        <div className="hana-actions">
          <button
            type="button"
            className="btn-submit"
            onClick={handleHanaExtract}
            disabled={loading || !hanaInput.trim()}
          >
            {loading ? '⏳ Processing...' : '✨ Post with Hana'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyPostErrandPage;
