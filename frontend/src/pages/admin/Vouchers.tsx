import React, { useState, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

// Get random mascot image (Hana or Sora)
function getRandomMascot(): string {
  const mascots = [
    '/images/hana-avatar.png',
    '/images/Hana_Pose_1_4K.png',
    '/images/Hana_Pose_2_4K.png',
    '/images/Sora_4K.png',
  ];
  return mascots[Math.floor(Math.random() * mascots.length)];
}

export const VouchersPage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

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
      image: '/images/Hana_Pose_1_4K.png',
      redemptions: [
        { id: 1, username: 'Sarah Tan', alias: '@sarahtan', date: '2 hours ago', timestamp: '2026-06-29 14:30', pointsSpent: '100', status: 'redeemed' },
        { id: 2, username: 'John Lee', alias: '@johnlee88', date: '4 hours ago', timestamp: '2026-06-29 12:15', pointsSpent: '100', status: 'redeemed' },
        { id: 3, username: 'Alice Wong', alias: '@alicew', date: '1 day ago', timestamp: '2026-06-28 18:45', pointsSpent: '100', status: 'redeemed' },
        { id: 4, username: 'Bob Chen', alias: '@bobchen22', date: '2 days ago', timestamp: '2026-06-27 09:20', pointsSpent: '100', status: 'redeemed' },
      ],
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
      image: '/images/hana-avatar.png',
      redemptions: [
        { id: 1, username: 'Eve Kumar', alias: '@evekumar', date: '30 mins ago', timestamp: '2026-06-29 16:45', pointsSpent: '50', status: 'redeemed' },
        { id: 2, username: 'Frank Zhou', alias: '@frankz', date: '1 hour ago', timestamp: '2026-06-29 16:15', pointsSpent: '50', status: 'redeemed' },
        { id: 3, username: 'Grace Lim', alias: '@graceLim99', date: '3 hours ago', timestamp: '2026-06-29 14:30', pointsSpent: '50', status: 'redeemed' },
      ],
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
      image: '/images/Sora_4K.png',
      redemptions: [
        { id: 1, username: 'Henry Tang', alias: '@henrytang', date: '5 hours ago', timestamp: '2026-06-29 11:30', pointsSpent: '75', status: 'redeemed' },
        { id: 2, username: 'Iris Ng', alias: '@irisng88', date: '1 day ago', timestamp: '2026-06-28 15:20', pointsSpent: '75', status: 'redeemed' },
      ],
    },
  ]);

  // Filter and search vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchesSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || v.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [vouchers, searchTerm, filterCategory, filterStatus]);

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
      image: getRandomMascot(),
      redemptions: [],
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
            <p>Every voucher you create appears instantly in MyRewardSpace. Users see beautiful cards with Errandify branding!</p>
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
                    <label>Amount *</label>
                    <input type="number" name="discount" value={formData.discount} onChange={handleInputChange} placeholder="20" required />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Duration & Settings</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Points Required *</label>
                    <input type="number" name="pointsRequired" value={formData.pointsRequired} onChange={handleInputChange} placeholder="100" required />
                  </div>
                  <div className="form-group">
                    <label>Quantity Available</label>
                    <input type="number" name="quantityAvailable" value={formData.quantityAvailable} onChange={handleInputChange} placeholder="500" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Description</h3>
                <div className="description-helper">
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

              <button type="submit" className="btn-submit">🎉 Create Voucher</button>
            </form>
          </div>
        )}

        {/* Search & Filter */}
        {!selectedVoucher && (
          <div className="search-filter-section">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search by code or name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-row">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="filter-select">
                <option value="all">All Categories</option>
                <option value="Shopping">Shopping</option>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Referral">Referral Bonus</option>
                <option value="General">General</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
              <div className="results-count">Showing {filteredVouchers.length} of {vouchers.length}</div>
            </div>
          </div>
        )}

        {/* Voucher Details View - Professional Compact Card */}
        {selectedVoucher && (
          <div className="details-view">
            <button className="btn-close" onClick={() => setSelectedVoucher(null)}>✕ Close</button>

            <div className="voucher-detail-card">
              {/* Info Section - Full Width */}
              <div className="detail-info-section">
                {/* Header */}
                <div className="detail-header">
                  <div>
                    <h2>{selectedVoucher.name}</h2>
                    <p className="detail-code">Code: <code>{selectedVoucher.code}</code></p>
                  </div>
                  <div className="detail-discount">
                    <div className="discount-big">{selectedVoucher.discount}</div>
                  </div>
                </div>

                {/* Description */}
                <p className="detail-description">{selectedVoucher.description}</p>

                {/* Key Info Grid */}
                <div className="detail-info-grid">
                  <div className="info-item">
                    <div className="info-label">Category</div>
                    <div className="info-value">{selectedVoucher.category}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Points</div>
                    <div className="info-value">{selectedVoucher.pointsRequired}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Created</div>
                    <div className="info-value">{selectedVoucher.createdDate}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Redeemed</div>
                    <div className="info-value">{selectedVoucher.used}</div>
                  </div>
                </div>

                {/* Redemption History - Full Details Table */}
                {selectedVoucher.redemptions && selectedVoucher.redemptions.length > 0 && (
                  <div className="redemption-section">
                    <div className="redemption-header">
                      <h3>Redemption History</h3>
                      <span className="redemption-count">{selectedVoucher.redemptions.length} redeemed</span>
                    </div>
                    <div className="redemption-table">
                      {selectedVoucher.redemptions.map((r: any) => (
                        <div key={r.id} className="redemption-row">
                          <div className="redemption-col alias">
                            <div className="user-name">{r.username}</div>
                            <div className="user-alias">{r.alias}</div>
                          </div>
                          <div className="redemption-col date">
                            <div className="timestamp-label">Date & Time</div>
                            <div className="timestamp">{r.timestamp}</div>
                          </div>
                          <div className="redemption-col points">
                            <div className="points-label">Points</div>
                            <div className="points-value">{r.pointsSpent}</div>
                          </div>
                          <div className="redemption-col status">
                            <span className="status-badge">✓ {r.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vouchers Gallery */}
        {!selectedVoucher && (
          <>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-number">{filteredVouchers.length}</div>
                <div className="stat-label">Vouchers</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{filteredVouchers.reduce((a, v) => a + v.used, 0)}</div>
                <div className="stat-label">Redeemed</div>
              </div>
            </div>

            <div className="vouchers-section">
              <h2>🎪 Voucher Gallery</h2>
              {filteredVouchers.length > 0 ? (
                <div className="voucher-grid">
                  {filteredVouchers.map((v) => (
                    <div key={v.id} className="voucher-card-display" onClick={() => setSelectedVoucher(v)}>
                      <div className="voucher-image-container">
                        <img src={v.image} alt={v.name} className="voucher-image" />
                        <div className="discount-badge">
                          <div className="discount-value">{v.discount}</div>
                          <div className="discount-label">SAVE</div>
                        </div>
                      </div>
                      <div className="voucher-info">
                        <h3>{v.name}</h3>
                        <p>{v.description}</p>
                        <div className="meta">
                          <span className="category">{v.category}</span>
                          <span className="badge-active">active</span>
                        </div>
                        <small>{v.used} redeemed</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-results">
                  <p>😕 No vouchers found</p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="info-box">
          <h3>💡 Pro Tips</h3>
          <ul>
            <li>✨ Auto-generated beautiful voucher images</li>
            <li>🔍 Search by code or name</li>
            <li>📊 Click any voucher to see redemption history</li>
            <li>🔄 Users see vouchers INSTANTLY in MyRewardSpace</li>
          </ul>
        </div>
      </div>

      <style>{`
        .admin-page { display: flex; flex-direction: column; gap: 16px; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .page-header h1 { font-size: 24px; font-weight: 700; margin: 0; color: #ff6b35; }
        .page-header p { font-size: 13px; color: #888; margin: 4px 0 0 0; }

        .welcome-message { background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%); border-left: 4px solid #ff6b35; border-radius: 8px; padding: 12px 14px; display: flex; gap: 12px; }
        .welcome-message strong { color: #ff6b35; font-size: 13px; display: block; }
        .welcome-message p { margin: 4px 0 0 0; font-size: 12px; color: #666; line-height: 1.5; }

        .btn-primary { padding: 10px 16px; background: #ff6b35; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; }
        .btn-primary:hover { background: #ff5722; box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3); }

        .search-filter-section { background: white; border: 1px solid #ffb88c; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
        .search-input { flex: 1; padding: 10px; border: 1px solid #ffb88c; border-radius: 6px; font-size: 13px; }
        .search-input:focus { outline: none; border-color: #ff6b35; box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1); }
        .filter-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .filter-select { padding: 10px; border: 1px solid #ffb88c; border-radius: 6px; font-size: 13px; background: white; cursor: pointer; }
        .results-count { font-size: 12px; color: #888; }

        .create-form-card { background: white; border: 2px solid #ff6b35; border-radius: 8px; padding: 20px; }
        .create-form-card h2 { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #ff6b35; }

        .form-section { margin-bottom: 16px; }
        .form-section h3 { font-size: 12px; font-weight: 700; color: #333; text-transform: uppercase; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ffe6d9; }

        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #333; }
        .form-group input, .form-group select, .form-group textarea { padding: 10px; border: 1px solid #ffb88c; border-radius: 6px; font-size: 13px; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #ff6b35; box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1); }

        .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }

        .description-helper { display: flex; flex-direction: column; gap: 8px; }
        .btn-ai { padding: 8px 12px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; align-self: flex-start; }
        .btn-ai:hover { background: #667eea; }

        .suggestions-box { background: #f0e6ff; border: 1px solid #e0c3ff; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .suggestion-item { padding: 10px; background: white; border: 1px solid #e0c3ff; border-radius: 4px; font-size: 12px; cursor: pointer; text-align: left; }
        .suggestion-item:hover { background: #667eea; color: white; }

        .btn-submit { padding: 12px 20px; background: #ff6b35; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; }
        .btn-submit:hover { background: #ff5722; }

        .details-view { background: white; border: 1px solid #ffb88c; border-radius: 8px; padding: 16px; position: relative; }
        .btn-close { position: absolute; top: 12px; right: 12px; padding: 6px 10px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 13px; }
        .btn-close:hover { background: #ff6b35; color: white; }

        .voucher-detail-card { display: block; }

        .detail-info-section { display: flex; flex-direction: column; gap: 12px; }

        .detail-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .detail-header h2 { font-size: 20px; font-weight: 700; margin: 0; color: #333; }
        .detail-code { margin: 4px 0 0 0; font-size: 12px; color: #888; }
        .detail-code code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #ff6b35; font-weight: 600; }

        .detail-discount { text-align: center; }
        .discount-big { font-size: 32px; font-weight: 800; color: #ff6b35; line-height: 1; }

        .detail-description { margin: 0; font-size: 13px; color: #666; line-height: 1.5; }

        .detail-info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .info-item { background: #fff9f5; border-radius: 6px; padding: 10px; text-align: center; border: 1px solid #ffe6d9; }
        .info-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .info-value { font-size: 14px; font-weight: 700; color: #ff6b35; }

        .redemption-section { background: #fff9f5; border-radius: 6px; padding: 12px; border: 1px solid #ffe6d9; }

        .redemption-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .redemption-header h3 { font-size: 12px; font-weight: 700; color: #333; text-transform: uppercase; margin: 0; }
        .redemption-count { font-size: 11px; color: #ff6b35; font-weight: 600; background: white; padding: 2px 6px; border-radius: 3px; }

        .redemption-table { display: flex; flex-direction: column; gap: 8px; }
        .redemption-row { display: grid; grid-template-columns: 1.2fr 1.5fr 0.8fr 0.8fr; gap: 12px; padding: 8px; background: white; border-radius: 4px; border: 1px solid #ffe6d9; align-items: center; font-size: 12px; }
        .redemption-row:hover { background: #fffbf8; }

        .redemption-col { display: flex; flex-direction: column; gap: 2px; }
        .redemption-col.alias { }
        .user-name { font-weight: 600; color: #333; }
        .user-alias { font-size: 11px; color: #888; }

        .redemption-col.date { }
        .timestamp-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; }
        .timestamp { font-size: 11px; color: #333; font-family: monospace; }

        .redemption-col.points { }
        .points-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; }
        .points-value { font-size: 14px; font-weight: 700; color: #27b55d; }

        .redemption-col.status { text-align: center; }
        .status-badge { display: inline-block; background: #e6f9f0; color: #27b55d; padding: 4px 8px; border-radius: 3px; font-weight: 600; font-size: 11px; white-space: nowrap; }

        @media (max-width: 768px) {
          .detail-info-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
        .stat-card { background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; border-radius: 8px; padding: 16px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .stat-label { font-size: 12px; opacity: 0.9; }

        .vouchers-section { display: flex; flex-direction: column; gap: 12px; }
        .vouchers-section h2 { font-size: 14px; font-weight: 700; margin: 0; color: #333; }

        .voucher-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .voucher-card-display { background: white; border: 1px solid #ffb88c; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
        .voucher-card-display:hover { border-color: #ff6b35; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15); transform: translateY(-2px); }

        .voucher-image-container { position: relative; overflow: hidden; background: #f5f5f5; aspect-ratio: 3/2; }
        .voucher-image { width: 100%; height: 100%; object-fit: contain; display: block; padding: 8px; background: white; }

        .discount-badge { position: absolute; top: 6px; right: 6px; background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; border-radius: 50%; width: 54px; height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.25); border: 3px solid white; z-index: 10; }
        .discount-value { font-size: 14px; font-weight: 800; line-height: 1; }
        .discount-label { font-size: 8px; font-weight: 700; text-transform: uppercase; margin-top: 1px; letter-spacing: 0.5px; }
        .voucher-info { padding: 12px; }
        .voucher-info h3 { margin: 0; font-size: 13px; font-weight: 700; color: #333; }
        .voucher-info p { margin: 4px 0 0 0; font-size: 11px; color: #666; line-height: 1.4; }
        .voucher-info .meta { display: flex; gap: 8px; font-size: 11px; margin: 8px 0; }
        .category { background: #fff5f0; color: #ff6b35; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
        .badge-active { background: #e6f9f0; color: #27b55d; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
        .voucher-info small { color: #888; font-size: 10px; }

        .no-results { text-align: center; padding: 40px; color: #888; }

        .info-box { background: #fff9f5; border-left: 4px solid #ff6b35; border-radius: 8px; padding: 14px; }
        .info-box h3 { font-size: 13px; font-weight: 700; margin: 0 0 10px 0; color: #ff6b35; }
        .info-box ul { margin: 0; padding-left: 20px; font-size: 12px; color: #666; line-height: 1.6; }
        .info-box li { margin-bottom: 6px; }

        @media (max-width: 768px) {
          .details-grid { grid-template-columns: 1fr; }
          .table-header, .table-row { grid-template-columns: 1fr !important; }
          .voucher-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </AdminLayout>
  );
};

export default VouchersPage;
