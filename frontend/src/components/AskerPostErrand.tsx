import React, { useState } from 'react';

interface ErrandData {
  title: string;
  description: string;
  category: string;
  budget: string;
  location: string;
  fullAddress?: string;
  area?: string;
  deadline: string;
}

type ChatStep = 'title' | 'location' | 'date' | 'budget' | 'notes' | 'complete';

interface ChatMessage {
  id: string;
  role: 'hana' | 'user';
  content: string;
  timestamp: Date;
}

const AskerPostErrand: React.FC = () => {
  const [step, setStep] = useState<'hana' | 'form'>('hana');
  const [currentStep, setCurrentStep] = useState<ChatStep>('title');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'hana',
      content: "Hello! I'm Hana 🌸. Let's create your errand together. What do you need done?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [errandData, setErrandData] = useState<ErrandData>({
    title: '',
    description: '',
    category: 'Other',
    budget: '',
    location: '',
    deadline: '',
  });

  const stepPrompts: Record<ChatStep, string> = {
    title: 'What do you need done?',
    location: 'Where? (your location or specific address)',
    date: 'When do you need it? (date and time)',
    budget: "What's your budget? (in SGD)",
    notes: 'Any special requirements? (optional, you can skip)',
    complete: 'Perfect! Let me review your errand.',
  };

  const addHanaMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + Math.random()).toString(),
        role: 'hana',
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    setInput('');
    setLoading(true);

    try {
      // Process based on current step
      switch (currentStep) {
        case 'title':
          processTitle(userMessage);
          break;
        case 'location':
          processLocation(userMessage);
          break;
        case 'date':
          processDate(userMessage);
          break;
        case 'budget':
          processBudget(userMessage);
          break;
        case 'notes':
          processNotes(userMessage);
          break;
      }
    } catch (error) {
      console.error('Chat error:', error);
      addHanaMessage('Sorry, I had trouble understanding. Can you try again?');
    } finally {
      setLoading(false);
    }
  };

  const processTitle = (userInput: string) => {
    setErrandData(prev => ({ ...prev, title: userInput, description: userInput }));

    // Simple category detection
    const categoryMap: Record<string, string> = {
      'clean': 'Cleaning',
      'deliver': 'Delivery',
      'repair': 'Handyman',
      'fix': 'Handyman',
      'admin': 'Admin',
    };

    let detectedCategory = 'Other';
    for (const [key, cat] of Object.entries(categoryMap)) {
      if (userInput.toLowerCase().includes(key)) {
        detectedCategory = cat;
        break;
      }
    }

    setErrandData(prev => ({ ...prev, category: detectedCategory }));
    addHanaMessage('Got it! Now, where do you need this done?');
    setCurrentStep('location');
  };

  const processLocation = (userInput: string) => {
    setErrandData(prev => ({ ...prev, location: userInput, fullAddress: userInput }));
    addHanaMessage('Thanks! When do you need it done? (e.g., Tomorrow at 2pm, Saturday, Next week)');
    setCurrentStep('date');
  };

  const processDate = (userInput: string) => {
    // Parse natural language date - simple version
    let deadline = userInput;
    const now = new Date();

    if (userInput.toLowerCase().includes('today')) {
      deadline = now.toISOString().slice(0, 16);
    } else if (userInput.toLowerCase().includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
      deadline = now.toISOString().slice(0, 16);
    } else if (userInput.toLowerCase().includes('next week')) {
      now.setDate(now.getDate() + 7);
      deadline = now.toISOString().slice(0, 16);
    } else if (userInput.toLowerCase().includes('this weekend')) {
      const day = now.getDay();
      const daysUntilSaturday = (6 - day) % 7 || 7;
      now.setDate(now.getDate() + daysUntilSaturday);
      deadline = now.toISOString().slice(0, 16);
    }

    setErrandData(prev => ({ ...prev, deadline }));
    addHanaMessage("Perfect! What's your budget for this? (in SGD, e.g., 50, 100)");
    setCurrentStep('budget');
  };

  const processBudget = (userInput: string) => {
    const budget = userInput.replace(/[^\d.]/g, '');
    setErrandData(prev => ({ ...prev, budget }));
    addHanaMessage('Great! Any special requirements or notes? (You can skip this if not)');
    setCurrentStep('notes');
  };

  const processNotes = (userInput: string) => {
    if (userInput.toLowerCase() !== 'skip' && userInput.toLowerCase() !== 'no') {
      setErrandData(prev => ({ ...prev, description: userInput }));
    }

    // Show summary
    const summary =
      `Perfect! Here's your errand summary:\n\n` +
      `📝 ${errandData.title}\n` +
      `📍 ${errandData.location}\n` +
      `📅 ${errandData.deadline}\n` +
      `💰 SGD $${errandData.budget}\n` +
      (errandData.description && errandData.description !== errandData.title ? `📌 ${errandData.description}\n` : '') +
      `\nReady to post?`;

    addHanaMessage(summary);
    setCurrentStep('complete');
  };

  const handleSkip = () => {
    if (currentStep === 'notes') {
      processNotes('skip');
    }
  };

  const handleProceedToReview = () => {
    setStep('form');
  };

  const handleStartOver = () => {
    setCurrentStep('title');
    setMessages([
      {
        id: '1',
        role: 'hana',
        content: "Hello! I'm Hana 🌸. Let's create your errand together. What do you need done?",
        timestamp: new Date(),
      },
    ]);
    setErrandData({
      title: '',
      description: '',
      category: 'Other',
      budget: '',
      location: '',
      deadline: '',
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Posting errand:', errandData);
    alert('Errand posted successfully!');
    setErrandData({ title: '', description: '', category: 'Other', budget: '', location: '', deadline: '' });
    handleStartOver();
    setStep('hana');
  };

  return (
    <div className="post-errand-container">
      <h2>Post New Errand</h2>
      <p className="subtitle">Create a new errand for individuals or other companies to complete</p>

      {/* HANA CHAT MODE */}
      {step === 'hana' && (
        <div className="hana-chat-container">
          {/* Chat Messages */}
          <div className="hana-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                {msg.role === 'hana' && <span className="avatar">🌸</span>}
                <div className="bubble">{msg.content}</div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          {currentStep !== 'complete' ? (
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
              <div className="hana-buttons">
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="btn-send"
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
                {currentStep === 'notes' && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    className="btn-skip"
                  >
                    Skip
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="hana-buttons-complete">
              <button onClick={handleProceedToReview} className="btn-review">
                Review & Post
              </button>
              <button onClick={handleStartOver} className="btn-start-over">
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
              placeholder="e.g., 123 Main Street, Singapore"
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

          <div className="form-actions">
            <button type="submit" className="btn-primary">📤 Post Errand</button>
            <button type="button" className="btn-secondary" onClick={() => setStep('hana')}>← Back to Hana</button>
          </div>
        </form>
      )}

      <style>{`
        .post-errand-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }

        /* HANA CHAT STYLES */
        .hana-chat-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #E8E8E8;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 600px;
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
          font-size: 14px;
          line-height: 1.6;
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

        .hana-input-area {
          padding: 16px;
          background: white;
          border-top: 1px solid #E8E8E8;
          display: grid;
          gap: 12px;
        }

        .hana-input {
          width: 100%;
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

        .hana-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .hana-buttons-complete {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 16px;
          background: white;
          border-top: 1px solid #E8E8E8;
        }

        .btn-send,
        .btn-skip,
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

        .btn-send {
          background: #FF6B35;
          color: white;
        }

        .btn-send:hover:not(:disabled) {
          background: #E55A24;
          transform: translateY(-1px);
        }

        .btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-skip {
          background: white;
          color: #666;
          border: 1px solid #E8E8E8;
        }

        .btn-skip:hover:not(:disabled) {
          background: #F8FAFB;
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
          border-radius: 12px;
          border: 1px solid #E8E8E8;
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
          .hana-chat-container {
            height: 500px;
          }

          .bubble {
            max-width: 100%;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default AskerPostErrand;
