import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const VouchersPage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'discount',
    category: '',
    discount: '',
    discountType: 'percentage',
    duration: 'once',
    pointsRequired: '0',
    quantityAvailable: '',
    expiryDate: '',
    description: '',
    firstTimeOnly: false,
    maxAmount: '',
  });

  const [vouchers, setVouchers] = useState([
    {
      id: 1,
      code: 'SUMMER20',
      name: 'Summer Sale',
      type: 'discount',
      category: 'Shopping',
      discount: '20',
      discountType: 'percentage',
      duration: 'once',
      pointsRequired: '100',
      quantityAvailable: '500',
      used: 342,
      status: 'active',
      expires: '2026-08-31',
      createdDate: '2026-06-01',
      description: 'Beat the heat this summer! Enjoy 20% off on all items and stay cool while saving big.',
      firstTimeOnly: false,
      maxAmount: 'None',
      image: generateHappyVoucherImage('SUMMER20', '20%', 'Summer Sale', '☀️'),
    },
    {
      id: 2,
      code: 'WELCOME50',
      name: 'Welcome Gift',
      type: 'discount',
      category: 'General',
      discount: '5',
      discountType: 'fixed',
      duration: 'once',
      pointsRequired: '50',
      quantityAvailable: '2000',
      used: 1245,
      status: 'active',
      expires: '2026-07-31',
      createdDate: '2026-06-05',
      description: 'Welcome to the Errandify family! Get $5 off your first purchase as a special welcome gift.',
      firstTimeOnly: true,
      maxAmount: 'None',
      image: generateHappyVoucherImage('WELCOME50', '$5 OFF', 'Welcome Gift', '🎁'),
    },
    {
      id: 3,
      code: 'REFER30',
      name: 'Referral Bonus',
      type: 'discount',
      category: 'Referral',
      discount: '30',
      discountType: 'percentage',
      duration: 'once',
      pointsRequired: '75',
      quantityAvailable: '300',
      used: 89,
      status: 'active',
      expires: '2026-12-31',
      createdDate: '2026-06-10',
      description: 'Share the joy, earn rewards! Refer friends and get this amazing discount.',
      firstTimeOnly: false,
      maxAmount: 'None',
      image: generateHappyVoucherImage('REFER30', '30%', 'Referral Bonus', '👥'),
    },
  ]);

  function generateHappyVoucherImage(code: string, discount: string, name: string, emoji: string): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280">
        <!-- Gradient Background -->
        <defs>
          <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ff8c42;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fff9f5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fffbf7;stop-opacity:1" />
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect fill="url(#bg1)" width="400" height="280" rx="12"/>

        <!-- Decorative Elements -->
        <circle cx="380" cy="20" r="35" fill="white" opacity="0.15"/>
        <circle cx="30" cy="250" r="45" fill="white" opacity="0.1"/>

        <!-- Errandify Logo Area -->
        <rect x="15" y="15" width="50" height="50" fill="white" opacity="0.2" rx="8"/>
        <text x="40" y="50" font-size="28" fill="white" text-anchor="middle" font-weight="bold">🏘️</text>

        <!-- Main Emoji -->
        <text x="200" y="90" font-size="56" text-anchor="middle">${emoji}</text>

        <!-- Code (Top) -->
        <text x="200" y="130" font-size="26" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">${code}</text>

        <!-- Discount Value (Center) -->
        <rect x="80" y="145" width="240" height="60" fill="white" rx="8"/>
        <text x="200" y="190" font-size="48" font-weight="bold" fill="#ff6b35" text-anchor="middle" font-family="Arial">${discount}</text>

        <!-- Voucher Name (Bottom) -->
        <text x="200" y="230" font-size="16" font-weight="600" fill="white" text-anchor="middle" font-family="Arial">${name}</text>

        <!-- Footer decoration -->
        <text x="200" y="265" font-size="12" fill="white" text-anchor="middle" opacity="0.85">✨ Exclusive Errandify Offer ✨</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type: inputType } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? (e.target as HTMLInputElement).checked : value
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
      alert('🔔 Please fill in code, name, and discount!');
      return;
    }

    const newVoucher = {
      id: vouchers.length + 1,
      code: formData.code.toUpperCase(),
      name: formData.name,
      type: formData.type,
      category: formData.category || 'General',
      discount: formData.discount,
      discountType: formData.discountType,
      duration: formData.duration,
      pointsRequired: formData.pointsRequired,
      quantityAvailable: formData.quantityAvailable,
      used: 0,
      status: 'active',
      expires: formData.expiryDate || 'None',
      createdDate: new Date().toLocaleDateString(),
      description: formData.description || 'Enjoy this special voucher!',
      firstTimeOnly: formData.firstTimeOnly,
      maxAmount: formData.maxAmount || 'None',
      image: generateHappyVoucherImage(
        formData.code.toUpperCase(),
        formData.discountType === 'fixed' ? `$${formData.discount}` : `${formData.discount}%`,
        formData.name,
        '🎉'
      ),
    };

    setVouchers([newVoucher, ...vouchers]);
    setFormData({
      code: '',
      name: '',
      type: 'discount',
      category: '',
      discount: '',
      discountType: 'percentage',
      duration: 'once',
      pointsRequired: '0',
      quantityAvailable: '',
      expiryDate: '',
      description: '',
      firstTimeOnly: false,
      maxAmount: '',
    });
    setShowCreateForm(false);
    alert('🎉 Fantastic! Your voucher has been created! Users can see it in MyRewardSpace now!');
  };

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
    General: [
      '🎁 Surprise yourself with savings! Use this voucher for instant discounts.',
      '💝 Because you deserve it! Enjoy this special treat with our voucher.',
      '✨ Make every purchase special! This voucher brings extra sparkle to your day.',
    ],
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <div>
            <h1>🎟️ Voucher Management</h1>
            <p>Create amazing vouchers that users will love!</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowCreateForm(!showCreateForm); setSelectedVoucher(null); }}>
            {showCreateForm ? '✕ Cancel' : '+ Create Voucher'}
          </button>
        </div>

        {/* Welcome Message */}
        <div className="welcome-message">
          <span className="emoji">✨</span>
          <div>
            <strong>Create Amazing Vouchers!</strong>
            <p>Every voucher you create appears instantly in MyRewardSpace. Users see beautiful cards with your Errandify logo and happy design!</p>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="create-form-card">
            <h2>🎨 Create Something Special</h2>
            <form onSubmit={handleCreateVoucher} className="voucher-form">
              <div className="form-section">
                <h3>Voucher Overview</h3>
                <div className="form-group">
                  <label>Voucher Code *</label>
                  <input type="text" name="code" value={formData.code} onChange={handleInputChange} placeholder="SUMMER20" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Voucher Name *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Summer Sale" required />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select name="type" value={formData.type} onChange={handleInputChange}>
                      <option value="discount">Discount</option>
                      <option value="freeship">Free Shipping</option>
                      <option value="freeitem">Free Item</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange}>
                      <option value="">Select Category</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Referral">Referral Bonus</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Created Date</label>
                    <input type="text" value={new Date().toLocaleDateString()} disabled />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Discount Settings</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Discount Type</label>
                    <select name="discountType" value={formData.discountType} onChange={handleInputChange}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Percentage Discount *</label>
                    <input type="number" name="discount" value={formData.discount} onChange={handleInputChange} placeholder="20" required />
                  </div>
                  <div className="form-group">
                    <label>Max Amount</label>
                    <input type="text" name="maxAmount" value={formData.maxAmount} onChange={handleInputChange} placeholder="None" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Duration & Settings</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration</label>
                    <select name="duration" value={formData.duration} onChange={handleInputChange}>
                      <option value="once">One time use</option>
                      <option value="unlimited">Unlimited</option>
                      <option value="limited">Limited use</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Points Required *</label>
                    <input type="number" name="pointsRequired" value={formData.pointsRequired} onChange={handleInputChange} placeholder="100" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity Available</label>
                    <input type="number" name="quantityAvailable" value={formData.quantityAvailable} onChange={handleInputChange} placeholder="500" />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="form-group checkbox">
                  <input type="checkbox" name="firstTimeOnly" checked={formData.firstTimeOnly} onChange={handleInputChange} id="firstTime" />
                  <label htmlFor="firstTime">First time offer only</label>
                </div>
              </div>

              <div className="form-section">
                <h3>Description & Content</h3>
                <div className="description-helper">
                  <label>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe the voucher benefits..." rows={3} />
                  {formData.category && (
                    <button type="button" className="btn-ai" onClick={() => setShowDescriptionSuggestions(!showDescriptionSuggestions)}>
                      ✨ AI Suggestions
                    </button>
                  )}
                  {showDescriptionSuggestions && (
                    <div className="suggestions-box">
                      {(descriptionSuggestions as any)[formData.category]?.map((desc: string, idx: number) => (
                        <button key={idx} type="button" className="suggestion-item" onClick={() => handleSelectDescription(desc)}>
                          {desc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {formData.code && formData.name && (
                <div className="form-section">
                  <h3>📸 Preview (Auto-Generated with Errandify Logo)</h3>
                  <div className="preview-card">
                    <img src={generateHappyVoucherImage(formData.code.toUpperCase(), formData.discountType === 'fixed' ? `$${formData.discount}` : `${formData.discount}%`, formData.name, '🎉')} alt="Voucher" className="voucher-image-preview" />
                  </div>
                </div>
              )}

              <button type="submit" className="btn-submit">🎉 Create Voucher</button>
            </form>
          </div>
        )}

        {/* Voucher Details View */}
        {selectedVoucher && (
          <div className="details-view">
            <button className="btn-close" onClick={() => setSelectedVoucher(null)}>✕ Close</button>
            <div className="details-grid">
              <div className="details-image">
                <img src={selectedVoucher.image} alt={selectedVoucher.name} />
              </div>
              <div className="details-content">
                <h2>{selectedVoucher.name}</h2>

                <div className="details-section">
                  <h3>Voucher Overview</h3>
                  <div className="detail-row"><strong>Voucher Name:</strong> {selectedVoucher.name}</div>
                  <div className="detail-row"><strong>Voucher Type:</strong> {selectedVoucher.type}</div>
                  <div className="detail-row"><strong>Category:</strong> {selectedVoucher.category}</div>
                  <div className="detail-row"><strong>Created Date:</strong> {selectedVoucher.createdDate}</div>
                  <div className="detail-row"><strong>Duration:</strong> {selectedVoucher.duration}</div>
                </div>

                <div className="details-section">
                  <h3>Settings</h3>
                  <div className="detail-row"><strong>Points required to redeem:</strong> {selectedVoucher.pointsRequired}</div>
                  <div className="detail-row"><strong>Quantity Available:</strong> {selectedVoucher.quantityAvailable || 'Unlimited'}</div>
                  <div className="detail-row"><strong>Quantity Redeemed:</strong> {selectedVoucher.used}</div>
                  <div className="detail-row"><strong>Expiry Date:</strong> {selectedVoucher.expires}</div>
                  <div className="detail-row"><strong>First time only:</strong> {selectedVoucher.firstTimeOnly ? 'Yes' : 'No'}</div>
                </div>

                <div className="details-section">
                  <h3>Voucher Content</h3>
                  <div className="detail-row"><strong>Description:</strong></div>
                  <p>{selectedVoucher.description}</p>
                  <div className="detail-row"><strong>Voucher Image:</strong></div>
                  <p>Auto-generated with Errandify logo and happy design ✨</p>
                </div>

                <div className="details-section">
                  <h3>Promotion Codes</h3>
                  <div className="detail-row">
                    <strong>Code:</strong> <code>{selectedVoucher.code}</code>
                    <button className="btn-copy">Copy</button>
                  </div>
                  <div className="detail-row"><strong>Created Date:</strong> {selectedVoucher.createdDate}</div>
                  <div className="detail-row"><strong>Expires on:</strong> {selectedVoucher.expires}</div>
                  <div className="detail-row"><strong>Redemptions:</strong> {selectedVoucher.used}</div>
                  <div className="detail-row"><strong>Maximum amount:</strong> {selectedVoucher.maxAmount}</div>
                  <div className="detail-row"><strong>First time offer only:</strong> {selectedVoucher.firstTimeOnly ? 'Yes' : 'No'}</div>
                </div>

                <div className="details-section">
                  <h3>Active Redemptions</h3>
                  <p style={{ textAlign: 'center', color: '#999' }}>No active redemptions</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vouchers Gallery */}
        {!selectedVoucher && (
          <>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-number">{vouchers.length}</div>
                <div className="stat-label">Active Vouchers</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{vouchers.reduce((a, v) => a + v.used, 0).toLocaleString()}</div>
                <div className="stat-label">Total Redeemed</div>
              </div>
            </div>

            <div className="vouchers-section">
              <h2>🎪 Your Voucher Gallery</h2>
              <div className="voucher-grid">
                {vouchers.map((v) => (
                  <div key={v.id} className="voucher-card-display" onClick={() => setSelectedVoucher(v)}>
                    <img src={v.image} alt={v.name} className="voucher-image" />
                    <div className="voucher-info">
                      <h3>{v.name}</h3>
                      <p>{v.description}</p>
                      <div className="meta">
                        <span className="category">{v.category}</span>
                        <span className="badge-active">active</span>
                      </div>
                      <small>{v.used} / {v.quantityAvailable || '∞'} used</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="info-box">
          <h3>💡 Pro Tips</h3>
          <ul>
            <li>✨ Voucher images include Errandify logo & happy design</li>
            <li>🔄 Users see vouchers INSTANTLY in MyRewardSpace</li>
            <li>💬 Warm descriptions = Higher redemption rates</li>
            <li>🎯 Click any voucher to see full details</li>
          </ul>
        </div>
      </div>

      <style>{`
        .admin-page { display: flex; flex-direction: column; gap: 16px; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .page-header h1 { font-size: 24px; font-weight: 700; margin: 0; color: #ff6b35; }
        .page-header p { font-size: 13px; color: #888; margin: 4px 0 0 0; }

        .welcome-message { background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%); border-left: 4px solid #ff6b35; border-radius: 8px; padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start; }
        .welcome-message .emoji { font-size: 24px; min-width: 24px; }
        .welcome-message strong { color: #ff6b35; font-size: 13px; display: block; margin-bottom: 2px; }
        .welcome-message p { margin: 0; font-size: 12px; color: #666; line-height: 1.5; }

        .btn-primary { padding: 10px 16px; background: #ff6b35; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .btn-primary:hover { background: #ff5722; box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3); }

        .create-form-card { background: white; border: 2px solid #ff6b35; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.1); }
        .create-form-card h2 { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #ff6b35; }

        .form-section { margin-bottom: 16px; }
        .form-section h3 { font-size: 12px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ffe6d9; }

        .voucher-form { display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #333; }
        .form-group input, .form-group select, .form-group textarea { padding: 10px; border: 1px solid #ffb88c; border-radius: 6px; font-size: 13px; font-family: inherit; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #ff6b35; box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1); }
        .form-group.checkbox { flex-direction: row; align-items: center; gap: 8px; margin-top: 8px; }
        .form-group.checkbox input { width: 16px; height: 16px; margin: 0; }
        .form-group.checkbox label { margin: 0; }

        .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }

        .description-helper { display: flex; flex-direction: column; gap: 8px; }
        .btn-ai { padding: 8px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; align-self: flex-start; }
        .btn-ai:hover { box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); }

        .suggestions-box { background: linear-gradient(135deg, #f0e6ff 0%, #ffe6f0 100%); border: 1px solid #e0c3ff; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .suggestion-item { padding: 10px; background: white; border: 1px solid #e0c3ff; border-radius: 4px; font-size: 12px; color: #333; cursor: pointer; text-align: left; transition: all 0.2s; }
        .suggestion-item:hover { background: #667eea; color: white; border-color: #667eea; }

        .preview-card { display: flex; justify-content: center; padding: 16px; background: linear-gradient(135deg, #fff5f0 0%, #fffbf7 100%); border-radius: 8px; }
        .voucher-image-preview { width: 300px; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2); }

        .btn-submit { padding: 12px 20px; background: #ff6b35; color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; align-self: flex-start; }
        .btn-submit:hover { background: #ff5722; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3); }

        .details-view { background: white; border: 1px solid #ffb88c; border-radius: 8px; padding: 20px; position: relative; }
        .btn-close { position: absolute; top: 16px; right: 16px; padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 14px; }
        .btn-close:hover { background: #ff6b35; color: white; border-color: #ff6b35; }

        .details-grid { display: grid; grid-template-columns: 300px 1fr; gap: 30px; margin-top: 20px; }
        .details-image { display: flex; justify-content: center; }
        .details-image img { width: 100%; max-width: 300px; border-radius: 8px; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15); }

        .details-content h2 { font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #ff6b35; }
        .details-section { margin-bottom: 20px; }
        .details-section h3 { font-size: 13px; font-weight: 700; color: #333; text-transform: uppercase; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ffe6d9; }
        .detail-row { font-size: 13px; color: #666; margin-bottom: 8px; line-height: 1.5; }
        .detail-row strong { color: #333; font-weight: 600; display: block; margin-bottom: 2px; }
        .detail-row code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #ff6b35; }
        .btn-copy { padding: 4px 8px; background: #ff6b35; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; margin-left: 8px; }
        .details-content p { margin: 0; font-size: 13px; color: #666; line-height: 1.6; }

        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
        .stat-card { background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(255, 107, 53, 0.15); }
        .stat-number { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .stat-label { font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }

        .vouchers-section { display: flex; flex-direction: column; gap: 12px; }
        .vouchers-section h2 { font-size: 14px; font-weight: 700; margin: 0; color: #333; text-transform: uppercase; letter-spacing: 0.5px; }

        .voucher-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .voucher-card-display { background: white; border: 1px solid #ffb88c; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(255, 107, 53, 0.1); }
        .voucher-card-display:hover { border-color: #ff6b35; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15); transform: translateY(-2px); }

        .voucher-image { width: 100%; height: 160px; object-fit: cover; display: block; }
        .voucher-info { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .voucher-info h3 { margin: 0; font-size: 13px; font-weight: 700; color: #333; }
        .voucher-info p { margin: 0; font-size: 11px; color: #666; line-height: 1.4; }
        .voucher-info .meta { display: flex; gap: 8px; font-size: 11px; }
        .category { background: #fff5f0; color: #ff6b35; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
        .badge-active { background: #e6f9f0; color: #27b55d; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
        .voucher-info small { color: #888; font-size: 10px; }

        .info-box { background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%); border-left: 4px solid #ff6b35; border-radius: 8px; padding: 14px; }
        .info-box h3 { font-size: 13px; font-weight: 700; margin: 0 0 10px 0; color: #ff6b35; }
        .info-box ul { margin: 0; padding-left: 20px; font-size: 12px; color: #666; line-height: 1.6; }
        .info-box li { margin-bottom: 6px; }

        @media (max-width: 768px) {
          .details-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
          .voucher-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </AdminLayout>
  );
};

export default VouchersPage;
