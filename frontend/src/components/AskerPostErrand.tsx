import React, { useState } from 'react';

const AskerPostErrand: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    budget: '',
    location: '',
    deadline: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Posting errand:', formData);
    alert('Errand posted successfully!');
    setFormData({ title: '', description: '', category: 'Other', budget: '', location: '', deadline: '' });
  };

  return (
    <div className="post-errand-container">
      <h2>Post New Errand</h2>
      <p className="subtitle">Create a new task for individuals or other companies to complete</p>

      <form onSubmit={handleSubmit} className="post-form">
        <div className="form-group">
          <label>Task Title *</label>
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
          <button type="reset" className="btn-secondary">Clear</button>
        </div>
      </form>

      <style>{`
        .post-errand-container {
          max-width: 600px;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
        }

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
        }
      `}</style>
    </div>
  );
};

export default AskerPostErrand;
