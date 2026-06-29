import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const VouchersPage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    discount: '',
    discountType: 'fixed',
    limit: '',
    expiryDate: '',
    description: '',
  });

  const [vouchers, setVouchers] = useState([
    {
      id: 1,
      code: 'SUMMER20',
      name: 'Summer Sale',
      category: 'Shopping',
      discount: '20%',
      used: 342,
      limit: 500,
      status: 'active',
      expires: '2026-08-31',
      description: 'Beat the heat this summer! Enjoy 20% off on all items and stay cool while saving big.',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23ff6b35" width="300" height="200"/%3E%3Ctext x="150" y="60" font-size="32" font-weight="bold" fill="white" text-anchor="middle"%3E☀️ SUMMER20%3C/text%3E%3Ctext x="150" y="100" font-size="24" font-weight="bold" fill="white" text-anchor="middle"%3E20%% OFF%3C/text%3E%3Ctext x="150" y="140" font-size="16" fill="white" text-anchor="middle"%3EAll Items%3C/text%3E%3C/svg%3E',
    },
    {
      id: 2,
      code: 'WELCOME50',
      name: 'Welcome Gift',
      category: 'General',
      discount: '$5',
      used: 1245,
      limit: 2000,
      status: 'active',
      expires: '2026-07-31',
      description: 'Welcome to the Errandify family! Get $5 off your first purchase as a special welcome gift.',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23ff8c42" width="300" height="200"/%3E%3Ctext x="150" y="60" font-size="32" font-weight="bold" fill="white" text-anchor="middle"%3E🎁 WELCOME50%3C/text%3E%3Ctext x="150" y="100" font-size="24" font-weight="bold" fill="white" text-anchor="middle"%3E%245 OFF%3C/text%3E%3Ctext x="150" y="140" font-size="16" fill="white" text-anchor="middle"%3EFirst Purchase%3C/text%3E%3C/svg%3E',
    },
    {
      id: 3,
      code: 'REFER30',
      name: 'Referral Bonus',
      category: 'Referral',
      discount: '30%',
      used: 89,
      limit: 300,
      status: 'active',
      expires: '2026-12-31',
      description: 'Share the love and earn rewards! Give 30% off to your friends and get points for each referral.',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%2327b55d" width="300" height="200"/%3E%3Ctext x="150" y="60" font-size="32" font-weight="bold" fill="white" text-anchor="middle"%3E👥 REFER30%3C/text%3E%3Ctext x="150" y="100" font-size="24" font-weight="bold" fill="white" text-anchor="middle"%3E30%% OFF%3C/text%3E%3Ctext x="150" y="140" font-size="16" fill="white" text-anchor="middle"%3EShare with Friends%3C/text%3E%3C/svg%3E',
    },
  ]);

  // AI-generated description suggestions based on category and discount
  const descriptionSuggestions = {
    Shopping: [
      '🛍️ Shop smart, save more! Enjoy this amazing discount on all shopping items.',
      '🛒 Time to refresh your wardrobe! Get this special discount on everything.',
      '💳 Smart shopping starts here! Grab this exclusive discount today.',
    ],
    'Food & Dining': [
      '🍔 Treat your taste buds! Enjoy delicious meals with this special discount.',
      '🍜 Foodie\'s delight! Save on your favorite food orders with this voucher.',
      '🥘 Satisfy your cravings affordably! Use this coupon for great savings.',
    ],
    Referral: [
      '👥 Share the joy, earn rewards! Refer friends and get this amazing discount.',
      '🤝 Spread happiness, gain benefits! Each referral gets you this special offer.',
      '💬 Friends + Rewards = Win-Win! Share this code with your loved ones.',
    ],
    Seasonal: [
      '🎉 Celebrate with us! Enjoy this special seasonal discount on everything.',
      '🎊 Festival special! Get this amazing deal during this celebration season.',
      '🌟 Special occasion? Special discount! Enjoy our seasonal offer now.',
    ],
    General: [
      '🎁 Surprise yourself with savings! Use this voucher for instant discounts.',
      '💝 Because you deserve it! Enjoy this special treat with our voucher.',
      '✨ Make every purchase special! This voucher brings extra sparkle to your day.',
    ],
  };

  const categoryColors = {
    Shopping: '#ff6b35',
    'Food & Dining': '#ff8c42',
    Referral: '#27b55d',
    Seasonal: '#667eea',
    General: '#764ba2',
  };

  const categoryIcons = {
    Shopping: '🛍️',
    'Food & Dining': '🍔',
    Referral: '👥',
    Seasonal: '🎉',
    General: '🎁',
  };

  // Generate voucher image based on details
  const generateVoucherImage = (code: string, name: string, discount: string, category: string) => {
    const color = categoryColors[category as keyof typeof categoryColors] || '#ff6b35';
    const icon = categoryIcons[category as keyof typeof categoryIcons] || '🎟️';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${adjustBrightness(color, -20)};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect fill="url(#grad)" width="300" height="200" rx="8"/>
        <text x="150" y="50" font-size="28" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">${icon} ${code}</text>
        <text x="150" y="90" font-size="32" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">${discount}</text>
        <text x="150" y="130" font-size="14" fill="white" text-anchor="middle" font-family="Arial" opacity="0.9">${name}</text>
        <rect x="10" y="150" width="280" height="1" fill="white" opacity="0.3"/>
        <text x="150" y="185" font-size="12" fill="white" text-anchor="middle" font-family="Arial" opacity="0.8">✨ Exclusive offer ✨</text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const adjustBrightness = (color: string, percent: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectDescription = (description: string) => {
    setFormData(prev => ({
      ...prev,
      description
    }));
    setShowDescriptionSuggestions(false);
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.discount) {
      alert('🔔 Hey! Please fill in the voucher code, name, and discount amount.');
      return;
    }

    const newVoucher = {
      id: vouchers.length + 1,
      code: formData.code.toUpperCase(),
      name: formData.name,
      category: formData.category || 'General',
      discount: formData.discountType === 'fixed' ? `$${formData.discount}` : `${formData.discount}%`,
      used: 0,
      limit: parseInt(formData.limit) || 0,
      status: 'active',
      expires: formData.expiryDate || 'No Expiry',
      description: formData.description || 'Enjoy this special voucher!',
      image: generateVoucherImage(
        formData.code.toUpperCase(),
        formData.name,
        formData.discountType === 'fixed' ? `$${formData.discount}` : `${formData.discount}%`,
        formData.category || 'General'
      ),
    };

    setVouchers([newVoucher, ...vouchers]);
    setFormData({
      code: '',
      name: '',
      category: '',
      discount: '',
      discountType: 'fixed',
      limit: '',
      expiryDate: '',
      description: '',
    });
    setShowCreateForm(false);
    alert('🎉 Fantastic! Your voucher has been created and users will see it right away in MyRewardSpace!');
  };

  const handleDeleteVoucher = (id: number) => {
    if (confirm('Are you sure? This voucher will be removed from MyRewardSpace.')) {
      setVouchers(vouchers.filter(v => v.id !== id));
      alert('👋 Voucher has been removed. Users can no longer see it.');
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <div>
            <h1>🎟️ Voucher Management</h1>
            <p>Create amazing vouchers that users will love to redeem!</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create Voucher'}
          </button>
        </div>

        {/* Welcome Message */}
        <div className="welcome-message">
          <span className="emoji">✨</span>
          <div>
            <strong>Welcome to Voucher Manager!</strong>
            <p>Create special offers that make users happy. Every voucher you create appears instantly in MyRewardSpace, ready for users to redeem with their Errandify Points!</p>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="create-form-card">
            <h2>🎨 Create Something Special</h2>
            <form onSubmit={handleCreateVoucher} className="voucher-form">
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-group">
                  <label>Voucher Code * <span className="hint">(e.g., SUMMER20)</span></label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="EXCLUSIVE50"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Voucher Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Summer Sale"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange}>
                      <option value="">Select Category</option>
                      <option value="Shopping">🛍️ Shopping</option>
                      <option value="Food & Dining">🍔 Food & Dining</option>
                      <option value="Referral">👥 Referral Bonus</option>
                      <option value="Seasonal">🎉 Seasonal</option>
                      <option value="General">🎁 General</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Discount Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Discount Type</label>
                    <select name="discountType" value={formData.discountType} onChange={handleInputChange}>
                      <option value="fixed">Fixed Amount ($)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Discount Amount *</label>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleInputChange}
                      placeholder={formData.discountType === 'fixed' ? '5' : '20'}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Usage Limit</label>
                    <input
                      type="number"
                      name="limit"
                      value={formData.limit}
                      onChange={handleInputChange}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Description (What Users Will See)</h3>
                <div className="description-helper">
                  <label>Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe what makes this voucher special..."
                    rows={3}
                  />
                  {formData.category && (
                    <button
                      type="button"
                      className="btn-ai"
                      onClick={() => setShowDescriptionSuggestions(!showDescriptionSuggestions)}
                    >
                      ✨ AI Suggestions for {formData.category}
                    </button>
                  )}

                  {showDescriptionSuggestions && formData.category && (
                    <div className="suggestions-box">
                      <p className="suggestions-title">Choose a description:</p>
                      {descriptionSuggestions[formData.category as keyof typeof descriptionSuggestions]?.map((desc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="suggestion-item"
                          onClick={() => handleSelectDescription(desc)}
                        >
                          {desc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {formData.code && formData.name && formData.discount && (
                <div className="form-section">
                  <h3>📸 Voucher Preview (Auto-Generated)</h3>
                  <div className="preview-card">
                    <img
                      src={generateVoucherImage(
                        formData.code.toUpperCase(),
                        formData.name,
                        formData.discountType === 'fixed' ? `$${formData.discount}` : `${formData.discount}%`,
                        formData.category || 'General'
                      )}
                      alt="Voucher Preview"
                      className="voucher-image-preview"
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="btn-submit">🎉 Create Voucher</button>
            </form>
          </div>
        )}

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number">{vouchers.length}</div>
            <div className="stat-label">Active Vouchers</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{vouchers.reduce((a, v) => a + v.used, 0).toLocaleString()}</div>
            <div className="stat-label">Total Redeemed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">${(vouchers.reduce((a, v) => a + (parseInt(v.discount.replace(/[^0-9]/g, '')) || 0), 0) * 100).toLocaleString()}</div>
            <div className="stat-label">Estimated Savings</div>
          </div>
        </div>

        {/* Vouchers Table */}
        <div className="vouchers-section">
          <h2>🎪 Your Voucher Gallery</h2>
          <div className="voucher-grid">
            {vouchers.map((v) => (
              <div key={v.id} className="voucher-card-display">
                <img src={v.image} alt={v.name} className="voucher-image" />
                <div className="voucher-info">
                  <h3>{v.name}</h3>
                  <p className="description">{v.description}</p>
                  <div className="meta">
                    <span className="category">{v.category}</span>
                    <span className={`status badge-${v.status}`}>{v.status}</span>
                  </div>
                  <div className="usage">
                    <small>{v.used} / {v.limit || '∞'} used</small>
                    {v.limit && (
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(v.used / v.limit) * 100}%` }}></div>
                      </div>
                    )}
                  </div>
                  <div className="actions">
                    <button className="btn-small delete" onClick={() => handleDeleteVoucher(v.id)}>🗑️ Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="info-box">
          <h3>💡 Pro Tips for Amazing Vouchers</h3>
          <ul>
            <li>✨ Use warm, friendly descriptions that make users smile</li>
            <li>🎨 Voucher images are auto-generated based on your details</li>
            <li>🔄 Users see vouchers INSTANTLY in MyRewardSpace</li>
            <li>🎯 Set usage limits to control promotion costs</li>
            <li>📅 Expiry dates help create urgency (or leave blank for no expiry)</li>
            <li>💬 Great descriptions = Higher redemption rates!</li>
          </ul>
        </div>
      </div>

      <style>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #ff6b35;
        }

        .page-header p {
          font-size: 13px;
          color: #888;
          margin: 4px 0 0 0;
        }

        /* Welcome Message */
        .welcome-message {
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
          border-left: 4px solid #ff6b35;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .welcome-message .emoji {
          font-size: 24px;
          min-width: 24px;
        }

        .welcome-message strong {
          color: #ff6b35;
          font-size: 13px;
          display: block;
          margin-bottom: 2px;
        }

        .welcome-message p {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.5;
        }

        .btn-primary {
          padding: 10px 16px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-primary:hover {
          background: #ff5722;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }

        /* Create Form */
        .create-form-card {
          background: white;
          border: 2px solid #ff6b35;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.1);
        }

        .create-form-card h2 {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 16px 0;
          color: #ff6b35;
        }

        .form-section {
          margin-bottom: 16px;
        }

        .form-section h3 {
          font-size: 12px;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #ffe6d9;
        }

        .voucher-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #333;
        }

        .hint {
          font-size: 11px;
          font-weight: 400;
          color: #888;
          margin-left: 4px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px;
          border: 1px solid #ffb88c;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .description-helper {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .btn-ai {
          padding: 8px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }

        .btn-ai:hover {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .suggestions-box {
          background: linear-gradient(135deg, #f0e6ff 0%, #ffe6f0 100%);
          border: 1px solid #e0c3ff;
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .suggestions-title {
          font-size: 11px;
          font-weight: 700;
          color: #667eea;
          text-transform: uppercase;
          margin: 0 0 4px 0;
        }

        .suggestion-item {
          padding: 10px;
          background: white;
          border: 1px solid #e0c3ff;
          border-radius: 4px;
          font-size: 12px;
          color: #333;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .suggestion-item:hover {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .preview-card {
          display: flex;
          justify-content: center;
          padding: 16px;
          background: linear-gradient(135deg, #fff5f0 0%, #fffbf7 100%);
          border-radius: 8px;
        }

        .voucher-image-preview {
          width: 280px;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
        }

        .btn-submit {
          padding: 12px 20px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }

        .btn-submit:hover {
          background: #ff5722;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .stat-card {
          background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
          color: white;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.15);
        }

        .stat-number {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Voucher Gallery */
        .vouchers-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .vouchers-section h2 {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .voucher-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .voucher-card-display {
          background: white;
          border: 1px solid #ffb88c;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.1);
        }

        .voucher-card-display:hover {
          border-color: #ff6b35;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
        }

        .voucher-image {
          width: 100%;
          height: 140px;
          object-fit: cover;
          display: block;
        }

        .voucher-info {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .voucher-info h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: #333;
        }

        .voucher-info .description {
          margin: 0;
          font-size: 11px;
          color: #666;
          line-height: 1.4;
        }

        .meta {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 11px;
        }

        .category {
          background: #fff5f0;
          color: #ff6b35;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }

        .badge-active {
          background: #e6f9f0;
          color: #27b55d;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }

        .badge-expired {
          background: #ffe6d9;
          color: #ff6b35;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }

        .usage {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .usage small {
          color: #888;
          font-size: 10px;
        }

        .progress-bar {
          height: 4px;
          background: #ffe6d9;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #ff6b35;
          transition: width 0.2s;
        }

        .actions {
          display: flex;
          gap: 6px;
        }

        .btn-small {
          flex: 1;
          padding: 6px 8px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .btn-small:hover {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .btn-small.delete {
          background: #ffe6d9;
          color: #ff6b35;
        }

        .btn-small.delete:hover {
          background: #ff3333;
          color: white;
          border-color: #ff3333;
        }

        /* Info Box */
        .info-box {
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
          border-left: 4px solid #ff6b35;
          border-radius: 8px;
          padding: 14px;
        }

        .info-box h3 {
          font-size: 13px;
          font-weight: 700;
          margin: 0 0 10px 0;
          color: #ff6b35;
        }

        .info-box ul {
          margin: 0;
          padding-left: 20px;
          font-size: 12px;
          color: #666;
          line-height: 1.6;
        }

        .info-box li {
          margin-bottom: 6px;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
          }

          .voucher-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default VouchersPage;
