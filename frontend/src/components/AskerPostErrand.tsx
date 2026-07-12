import React, { useState } from 'react';
import axios from 'axios';

interface ErrandData {
  title: string;
  description: string;
  category: string;
  budget: string;
  location: string;
  fullAddress?: string;
  area?: string;
  deadline: string;
  notes?: string;
}

type CollectionStep = 'input' | 'complete';

const AskerPostErrand: React.FC = () => {
  const [step, setStep] = useState<'hana' | 'form'>('hana');
  const [currentStep, setCurrentStep] = useState<CollectionStep>('input');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hanaMessage, setHanaMessage] = useState(
    `Hi! What errand do you need help with?\n\nExample:\n'Clean my office at 238857 tomorrow 2pm 2 hours budget $150'`
  );

  const [errandData, setErrandData] = useState<ErrandData>({
    title: '',
    description: '',
    category: '',
    budget: '',
    location: '',
    deadline: '',
    notes: '',
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      await extractErrandInfo(userInput);
    } catch (error) {
      console.error('Chat error:', error);
      setHanaMessage('Sorry, I had trouble understanding. Can you try again?');
      setCurrentStep('input');
    } finally {
      setLoading(false);
    }
  };

  const extractErrandInfo = async (userInput: string) => {
    try {
      // Check for serious violations
      const seriousKeywords = ['sex', 'porn', 'drug', 'cocaine', 'heroin', 'marijuana', 'bomb', 'weapon', 'gun', 'steal', 'rob', 'hacking'];
      const lowerInput = userInput.toLowerCase();

      for (const keyword of seriousKeywords) {
        if (lowerInput.includes(keyword)) {
          setHanaMessage('I cannot help with that request. It contains inappropriate content. Please describe your errand in a different way. 😊');
          setCurrentStep('input');
          return;
        }
      }

      // Call backend extraction API (same as individuals)
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/extract-task-info`,
        { input: userInput }
      );

      const extracted = response.data.data;
      console.log('[Hana Company] Extracted:', extracted);

      // Update errand data with extracted info
      const updatedErrandData: ErrandData = {
        title: extracted.title || userInput.substring(0, 50),
        description: extracted.description || '',
        category: extracted.category || '',
        location: extracted.location || '',
        fullAddress: extracted.fullAddress || extracted.location || '',
        area: extracted.area || '',
        deadline: extracted.date ? `${extracted.date}T${extracted.time || '10:00'}` : '',
        budget: extracted.budget ? String(extracted.budget) : '',
        notes: extracted.notes || '',
      };

      setErrandData(updatedErrandData);

      // Check if critical fields are missing
      const hasMissingCritical =
        !updatedErrandData.title ||
        !updatedErrandData.category ||
        !updatedErrandData.deadline ||
        !updatedErrandData.budget;

      if (hasMissingCritical) {
        setHanaMessage('✅ Got what I could! Let me take you to the form to fill in the details. 📝');
        setTimeout(() => {
          setStep('form');
        }, 1000);
        return;
      }

      // Validate date
      const errandDate = new Date(updatedErrandData.deadline.split('T')[0]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (errandDate < today) {
        setHanaMessage('That date is in the past. Please give me a future date and I will process it again. 😊');
        setCurrentStep('input');
        return;
      }

      // Check if date/time is at least 30 minutes from now
      const errandDateTime = new Date(updatedErrandData.deadline);
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      if (errandDateTime < thirtyMinutesFromNow) {
        setHanaMessage('I need at least 30 minutes from now to find someone to help you. Please give me a later time. 🙏');
        setCurrentStep('input');
        return;
      }

      // Check content moderation
      try {
        const contentCheckResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/check-content`,
          {
            title: updatedErrandData.title,
            description: updatedErrandData.description || '',
            notes: updatedErrandData.notes || '',
          }
        );

        if (!contentCheckResponse.data.data.is_safe) {
          setHanaMessage('I cannot help with that request. It contains inappropriate content. Please describe your errand in a different way. 😊');
          setCurrentStep('input');
          return;
        }
      } catch (contentCheckErr) {
        console.warn('[Hana Company] Content check error:', contentCheckErr);
      }

      setErrandData(updatedErrandData);

      // Build and show summary
      const summary = buildSummary(updatedErrandData);
      setHanaMessage(summary + '\n\nReady to post?');
      setCurrentStep('complete');
    } catch (err: any) {
      console.error('Extraction error:', err);
      setHanaMessage(`Sorry, I had trouble understanding that.\n\nPlease try again with: what you need, postal code, date, time, and budget.`);
      setCurrentStep('input');
    }
  };

  const buildSummary = (data: ErrandData) => {
    let summary = '✓ Errand Summary:\n\n';
    if (data.title) summary += `📝 ${data.title}\n`;
    if (data.fullAddress) summary += `📍 ${data.fullAddress}\n`;
    else if (data.location) summary += `📍 ${data.location}\n`;
    if (data.area) summary += `🏘️ ${data.area}\n`;
    if (data.deadline) {
      const [date, time] = data.deadline.split('T');
      const dateStr = new Date(date).toLocaleDateString('en-SG');
      summary += `📅 ${dateStr}`;
      if (time) summary += ` at ${time}`;
      summary += '\n';
    }
    if (data.budget) summary += `💰 SGD $${data.budget}\n`;
    if (data.notes) summary += `📌 ${data.notes}`;
    return summary;
  };

  const handleReviewAndPost = () => {
    setStep('form');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Posting errand:', errandData);
    alert('Errand posted successfully!');

    // Reset
    setErrandData({ title: '', description: '', category: '', budget: '', location: '', deadline: '', notes: '' });
    setInput('');
    setHanaMessage(`Hi! What errand do you need help with?\n\nExample:\n'Clean my office at 238857 tomorrow 2pm 2 hours budget $150'`);
    setCurrentStep('input');
    setStep('hana');
  };

  const handleFormBack = () => {
    setStep('hana');
  };

  return (
    <div className="post-errand-container">
      <h2>Post New Errand</h2>
      <p className="subtitle">Create a new errand for individuals or other companies to complete</p>

      {/* HANA CHAT MODE */}
      {step === 'hana' && (
        <div className="hana-chat">
          <div className="hana-header">
            <div>
              <h3>Hana (Your AI Sister)</h3>
              <p>Chat With Hana</p>
            </div>
          </div>

          <div className="hana-messages">
            <div className="message hana">
              <span className="avatar">🌸</span>
              <div className="bubble">{hanaMessage}</div>
            </div>
          </div>

          {currentStep === 'input' ? (
            <form onSubmit={handleSendMessage} className="hana-input-area">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
                className="hana-input"
                disabled={loading}
                autoFocus
              />
              <button type="submit" disabled={loading || !input.trim()} className="btn-send">
                {loading ? '...' : '→'}
              </button>
            </form>
          ) : (
            <div className="hana-buttons">
              <button onClick={handleReviewAndPost} className="btn-review">
                Review & Post
              </button>
              <button
                onClick={() => {
                  setCurrentStep('input');
                  setInput('');
                  setHanaMessage(`Hi! What errand do you need help with?\n\nExample:\n'Clean my office at 238857 tomorrow 2pm 2 hours budget $150'`);
                }}
                className="btn-start-over"
              >
                Start Over
              </button>
            </div>
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
              value={errandData.title}
              onChange={(e) => setErrandData({ ...errandData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              placeholder="Describe what needs to be done..."
              value={errandData.description}
              onChange={(e) => setErrandData({ ...errandData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={errandData.category}
                onChange={(e) => setErrandData({ ...errandData, category: e.target.value })}
                required
              >
                <option value="">Select Category</option>
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
                value={errandData.budget}
                onChange={(e) => setErrandData({ ...errandData, budget: e.target.value })}
                min="10"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              placeholder="e.g., 123 Main Street or Postal Code"
              value={errandData.location}
              onChange={(e) => setErrandData({ ...errandData, location: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Deadline *</label>
            <input
              type="datetime-local"
              value={errandData.deadline}
              onChange={(e) => setErrandData({ ...errandData, deadline: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              placeholder="Any special requirements..."
              value={errandData.notes}
              onChange={(e) => setErrandData({ ...errandData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">📤 Post Errand</button>
            <button type="button" className="btn-secondary" onClick={handleFormBack}>← Back to Hana</button>
          </div>
        </form>
      )}

      <style>{`
        .post-errand-container {
          max-width: 800px;
          margin: 0 auto;
        }

        h2 {
          color: #1B5E75;
          margin-bottom: 8px;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }

        /* HANA CHAT STYLES */
        .hana-chat {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          height: 600px;
          overflow: hidden;
        }

        .hana-header {
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        }

        .hana-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: #F8FAFB;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .message.hana {
          justify-content: flex-start;
        }

        .message .avatar {
          font-size: 24px;
          min-width: 28px;
          text-align: center;
        }

        .bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.6;
          word-wrap: break-word;
          white-space: pre-wrap;
          background: white;
          border: 1px solid #E8E8E8;
          color: #333;
        }

        .hana-input-area {
          display: flex;
          gap: 8px;
          padding: 16px;
          background: white;
          border-top: 1px solid #E8E8E8;
        }

        .hana-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #FF6B35;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }

        .hana-input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .btn-send {
          width: 48px;
          height: 48px;
          padding: 0;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-send:hover:not(:disabled) {
          background: #E55A24;
        }

        .btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .hana-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 16px;
          background: white;
          border-top: 1px solid #E8E8E8;
        }

        .btn-review,
        .btn-start-over {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-review {
          background: #FF6B35;
          color: white;
        }

        .btn-review:hover {
          background: #E55A24;
        }

        .btn-start-over {
          background: white;
          color: #666;
          border: 1px solid #E8E8E8;
        }

        .btn-start-over:hover {
          background: #F8FAFB;
        }

        /* STANDARD FORM STYLES */
        .post-form {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 24px;
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
        }

        .btn-secondary {
          padding: 12px 24px;
          background: white;
          color: #666;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #F8FAFB;
        }

        @media (max-width: 768px) {
          .hana-chat {
            height: 500px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .hana-buttons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AskerPostErrand;
