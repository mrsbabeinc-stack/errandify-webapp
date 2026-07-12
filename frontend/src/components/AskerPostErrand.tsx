import React, { useState } from 'react';

interface HanaExtraction {
  title?: string;
  description?: string;
  category?: string;
  budget?: string;
  location?: string;
  deadline?: string;
}

const AskerPostErrand: React.FC = () => {
  const [step, setStep] = useState<'hana' | 'form'>('hana');
  const [userInput, setUserInput] = useState('');
  const [extractedData, setExtractedData] = useState<HanaExtraction>({});
  const [showExtracted, setShowExtracted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    budget: '',
    location: '',
    deadline: '',
  });

  const handleHanaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    // Simulate Hana extraction
    const extracted = simulateHanaExtraction(userInput);
    setExtractedData(extracted);
    setShowExtracted(true);
    setUserInput('');
  };

  const simulateHanaExtraction = (input: string): HanaExtraction => {
    const extracted: HanaExtraction = {};
    const lowerInput = input.toLowerCase();

    // Title extraction
    if (lowerInput.includes('need') || lowerInput.includes('want') || lowerInput.includes('help')) {
      const titleMatch = input.match(/(?:need|want|help with|looking for|require)\s+(.+?)(?:\s+(?:in|at|on|for|by|budget|cost)|\.|$)/i);
      if (titleMatch) extracted.title = titleMatch[1].trim();
    }

    // Category extraction
    const categories: { [key: string]: string } = {
      'clean': 'Cleaning', 'cleaning': 'Cleaning', 'wash': 'Cleaning',
      'deliver': 'Delivery', 'delivery': 'Delivery', 'courier': 'Delivery',
      'fix': 'Handyman', 'repair': 'Handyman', 'maintenance': 'Handyman',
      'admin': 'Admin', 'data': 'Admin', 'entry': 'Admin'
    };
    for (const [key, cat] of Object.entries(categories)) {
      if (lowerInput.includes(key)) {
        extracted.category = cat;
        break;
      }
    }

    // Budget extraction
    const budgetMatch = input.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (budgetMatch) extracted.budget = budgetMatch[1].replace(/,/g, '');

    // Location extraction
    const locationKeywords = ['singapore', 'orchard', 'cbd', 'bukit', 'jurong', 'ang mo kio', 'tampines', 'clementi', 'bishan'];
    for (const loc of locationKeywords) {
      if (lowerInput.includes(loc)) {
        const locMatch = input.match(new RegExp(`(\\d+\\s+[^,]*${loc}[^,]*|${loc}[^,]*)`, 'i'));
        if (locMatch) extracted.location = locMatch[1].trim();
        break;
      }
    }

    // Deadline extraction
    const now = new Date();
    if (lowerInput.includes('today')) {
      extracted.deadline = now.toISOString().slice(0, 16);
    } else if (lowerInput.includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
      extracted.deadline = now.toISOString().slice(0, 16);
    } else if (lowerInput.includes('next week')) {
      now.setDate(now.getDate() + 7);
      extracted.deadline = now.toISOString().slice(0, 16);
    } else if (lowerInput.includes('urgent')) {
      extracted.deadline = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);
    }

    return extracted;
  };

  const handleProceedToForm = () => {
    setFormData({
      title: extractedData.title || '',
      description: extractedData.description || '',
      category: extractedData.category || 'Other',
      budget: extractedData.budget || '',
      location: extractedData.location || '',
      deadline: extractedData.deadline || '',
    });
    setStep('form');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Posting errand:', formData);
    alert('Errand posted successfully!');
    setFormData({ title: '', description: '', category: 'Other', budget: '', location: '', deadline: '' });
    setExtractedData({});
    setShowExtracted(false);
    setStep('hana');
  };

  return (
    <div className="post-errand-container">
      <h2>Post New Errand</h2>
      <p className="subtitle">Create a new task for individuals or other companies to complete</p>

      {/* HANA AI FORM - MODAL STYLE */}
      {step === 'hana' && (
        <div className="hana-modal">
          <div className="hana-header">
            <h3>Hana (Your AI Sister)</h3>
            <p>Chat With Hana</p>
          </div>

          <div className="hana-content">
            <div className="hana-greeting">
              <p>Hi! What errand do you need help with?</p>
              <div className="example">
                <strong>Example:</strong>
                <br />
                'Grocery shopping at 535239, in 3 days 2pm, 1 hour, budget $200'
              </div>
            </div>

            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 400'%3E%3Crect fill='%23e8d4c4' width='200' height='400'/%3E%3Ccircle cx='100' cy='80' r='40' fill='%23d4a574'/%3E%3Cpath d='M 80 200 Q 80 180 100 180 Q 120 180 120 200 L 120 300 Q 120 320 100 320 Q 80 320 80 300 Z' fill='%235fa3d9'/%3E%3Cpath d='M 60 240 L 50 260 Q 50 270 60 270 L 70 270 L 75 290 L 85 270 L 130 270 Q 140 270 140 260 L 130 240' fill='%23a85a50'/%3E%3Ccircle cx='85' cy='190' r='5' fill='%23333'/%3E%3Ccircle cx='115' cy='190' r='5' fill='%23333'/%3E%3Cpath d='M 85 210 Q 100 220 115 210' stroke='%23333' stroke-width='2' fill='none'/%3E%3C/svg%3E" alt="Hana" className="hana-avatar-img" />

            {showExtracted && Object.keys(extractedData).length > 0 && (
              <div className="extracted-data">
                {extractedData.title && <div>✓ Title: <strong>{extractedData.title}</strong></div>}
                {extractedData.category && <div>✓ Category: <strong>{extractedData.category}</strong></div>}
                {extractedData.budget && <div>✓ Budget: <strong>${extractedData.budget}</strong></div>}
                {extractedData.location && <div>✓ Location: <strong>{extractedData.location}</strong></div>}
                {extractedData.deadline && <div>✓ Deadline: <strong>{extractedData.deadline}</strong></div>}
              </div>
            )}
          </div>

          <form onSubmit={handleHanaSubmit} className="hana-input-section">
            <input
              type="text"
              placeholder="Type all details here..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="hana-input"
              autoFocus
            />
            <button type="submit" className="btn-send-hana">→</button>
          </form>

          {showExtracted && Object.keys(extractedData).length > 0 && (
            <button onClick={handleProceedToForm} className="btn-proceed-hana">
              Proceed →
            </button>
          )}
        </div>
      )}

      {/* STANDARD FORM */}
      {step === 'form' && (
        <form onSubmit={handleFormSubmit} className="post-form">
          <div className="form-group">
            <label>Errand Title *</label>
            <input
              type="text"
              placeholder="e.g., Office Cleaning, Delivery Service"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              placeholder="Describe what needs to be done..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option>Other</option>
                <option>Cleaning</option>
                <option>Delivery</option>
                <option>Handyman</option>
                <option>Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label>Budget (SGD) *</label>
              <input
                type="number"
                placeholder="e.g., 150"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                min="10"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              placeholder="e.g., 123 Main Street, Singapore"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Deadline *</label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">📤 Post Errand</button>
            <button type="button" className="btn-secondary" onClick={() => setStep('hana')}>← Back to Hana</button>
          </div>
        </form>
      )}

      <style>{`
        .post-errand-container {
          max-width: 800px;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }

        /* HANA MODAL STYLES */
        .hana-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 500px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
        }

        .hana-header {
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          color: white;
          padding: 20px;
          text-align: center;
          position: relative;
        }

        .hana-header h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 700;
        }

        .hana-header p {
          margin: 0;
          font-size: 13px;
          opacity: 0.95;
          font-weight: 500;
        }

        .hana-header::after {
          content: '✕';
          position: absolute;
          top: 16px;
          right: 20px;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .hana-header::after:hover {
          opacity: 1;
        }

        .hana-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .hana-greeting {
          text-align: center;
          max-width: 350px;
        }

        .hana-greeting p {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .example {
          background: #FFF4E6;
          border: 2px solid #FF6B35;
          border-radius: 16px;
          padding: 16px;
          font-size: 13px;
          line-height: 1.6;
          color: #333;
          text-align: center;
        }

        .example strong {
          display: block;
          margin-bottom: 8px;
          font-weight: 700;
          color: #1B5E75;
        }

        .hana-avatar-img {
          width: 140px;
          height: auto;
          max-height: 200px;
        }

        .extracted-data {
          background: #E8F5E9;
          border-radius: 12px;
          padding: 16px;
          width: 100%;
          max-width: 300px;
          font-size: 13px;
          line-height: 1.8;
          color: #2D7A34;
        }

        .extracted-data div {
          margin-bottom: 6px;
        }

        .extracted-data div:last-child {
          margin-bottom: 0;
        }

        .extracted-data strong {
          font-weight: 600;
          color: #1E5B25;
        }

        .hana-input-section {
          display: flex;
          gap: 8px;
          padding: 16px 24px 24px;
          background: white;
        }

        .hana-input {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid #FF6B35;
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          color: #333;
        }

        .hana-input::placeholder {
          color: #999;
        }

        .hana-input:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .btn-send-hana {
          width: 48px;
          height: 48px;
          padding: 0;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-send-hana:hover {
          background: #E55A24;
          transform: scale(1.05);
        }

        .btn-proceed-hana {
          width: calc(100% - 48px);
          margin: 0 24px 24px 24px;
          padding: 12px 24px;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-proceed-hana:hover {
          background: #E55A24;
          transform: translateY(-2px);
        }

        /* BACKDROP */
        .hana-modal::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: -1;
        }

        /* OLD STYLES - KEEP FOR FORM */
        .hana-avatar {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          border-radius: 12px;
          color: white;
        }

        .hana-avatar span {
          font-size: 48px;
          display: block;
          margin-bottom: 8px;
        }

        .hana-avatar p {
          margin: 0;
          font-weight: 600;
          font-size: 16px;
        }

        .hana-chat {
          background: #F8FAFB;
          border-radius: 8px;
          padding: 16px;
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .message.hana {
          justify-content: flex-start;
        }

        .message.user {
          justify-content: flex-end;
        }

        .message .avatar {
          font-size: 20px;
          min-width: 24px;
        }

        .bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.5;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        .message.hana .bubble {
          background: white;
          border: 1px solid #E8E8E8;
          color: #333;
        }

        .message.user .bubble {
          background: #FF6B35;
          color: white;
        }

        .hana-input-form {
          display: flex;
          gap: 8px;
        }

        .hana-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }

        .hana-input:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .btn-send {
          padding: 12px 24px;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .btn-send:hover {
          background: #E55A24;
          transform: translateY(-1px);
        }

        .btn-proceed {
          padding: 12px 24px;
          background: #1B5E75;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          width: 100%;
        }

        .btn-proceed:hover {
          background: #144A5A;
        }

        .btn-proceed.primary {
          background: #2D7A34;
        }

        .btn-proceed.primary:hover {
          background: #1E5B25;
        }

        /* STANDARD FORM STYLES */
        .post-form {
          display: grid;
          gap: 16px;
        }

        .form-group {
          display: grid;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #1B5E75;
          font-size: 14px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .btn-primary {
          flex: 1;
          padding: 12px 24px;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #E55A24;
          transform: translateY(-1px);
        }

        .btn-secondary {
          padding: 12px 24px;
          background: #F8FAFB;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #E8E8E8;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .bubble {
            max-width: 100%;
          }

          .hana-chat {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default AskerPostErrand;
