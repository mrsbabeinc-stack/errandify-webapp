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
  const [hanaMessages, setHanaMessages] = useState<Array<{ role: 'hana' | 'user'; content: string }>>([
    {
      role: 'hana',
      content: 'Hi! 👋 I\'m Hana, your AI assistant. Let me help you post an errand. Tell me what you need done!'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [extractedData, setExtractedData] = useState<HanaExtraction>({});
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

    // Add user message to chat
    const newMessages = [...hanaMessages, { role: 'user' as const, content: userInput }];
    setHanaMessages(newMessages);

    // Simulate Hana extraction and response
    const extracted = simulateHanaExtraction(userInput);
    setExtractedData(extracted);

    // Hana response
    let hanaResponse = '';
    if (extracted.title) hanaResponse += `✓ Title: ${extracted.title}\n`;
    if (extracted.category) hanaResponse += `✓ Category: ${extracted.category}\n`;
    if (extracted.budget) hanaResponse += `✓ Budget: $${extracted.budget}\n`;
    if (extracted.location) hanaResponse += `✓ Location: ${extracted.location}\n`;
    if (extracted.deadline) hanaResponse += `✓ Deadline: ${extracted.deadline}\n`;

    if (Object.keys(extracted).length === 0) {
      hanaResponse = 'I couldn\'t extract the details. Can you provide more information? (What needs to be done, where, when, and budget?)';
    } else if (Object.keys(extracted).length === 5) {
      hanaResponse += '\n✅ Great! I have all the details. Ready to proceed?';
    } else {
      const missing = [];
      if (!extracted.title) missing.push('title');
      if (!extracted.category) missing.push('category');
      if (!extracted.budget) missing.push('budget');
      if (!extracted.location) missing.push('location');
      if (!extracted.deadline) missing.push('deadline');
      hanaResponse += `\nI still need: ${missing.join(', ')}. Can you provide these?`;
    }

    setHanaMessages([...newMessages, { role: 'hana', content: hanaResponse }]);
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
    setHanaMessages([{ role: 'hana', content: 'Hi! 👋 I\'m Hana, your AI assistant. Let me help you post an errand. Tell me what you need done!' }]);
    setExtractedData({});
    setStep('hana');
  };

  return (
    <div className="post-errand-container">
      <h2>Post New Errand</h2>
      <p className="subtitle">Create a new task for individuals or other companies to complete</p>

      {/* HANA AI FORM */}
      {step === 'hana' && (
        <div className="hana-form-container">
          <div className="hana-avatar">
            <span>🤖</span>
            <p>Hana AI Assistant</p>
          </div>

          <div className="hana-chat">
            {hanaMessages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                {msg.role === 'hana' && <span className="avatar">🤖</span>}
                <div className="bubble">{msg.content}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleHanaSubmit} className="hana-input-form">
            <input
              type="text"
              placeholder="Tell me about your errand... (e.g., 'Need office cleaning in Orchard, $150, this weekend')"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="hana-input"
              autoFocus
            />
            <button type="submit" className="btn-send">
              Send ✓
            </button>
          </form>

          {Object.keys(extractedData).length > 0 && Object.keys(extractedData).length < 5 && (
            <button onClick={handleProceedToForm} className="btn-proceed">
              Continue with form →
            </button>
          )}

          {Object.keys(extractedData).length === 5 && (
            <button onClick={handleProceedToForm} className="btn-proceed primary">
              ✅ Proceed to Review Form
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

        /* HANA FORM STYLES */
        .hana-form-container {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

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
