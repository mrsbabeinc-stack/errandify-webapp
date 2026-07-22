import React, { useState, useEffect } from 'react';

interface Errand {
  id: number;
  formattedId: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  area: string;
  location: string;
  status: string;
  createdAt: string;
  askerName: string;
  askerType: 'individual' | 'company';
}

interface DoerBrowseErrandsProps {
  userRole?: 'owner' | 'manager' | 'staff';
}

const DoerBrowseErrands: React.FC<DoerBrowseErrandsProps> = ({ userRole = 'staff' }) => {
  // All available errands (for owner/manager)
  const allErrands: Errand[] = [
    {
      id: 1,
      formattedId: 'ERR-2026-001',
      title: 'Office Cleaning Service',
      description: 'Clean and organize office space, including desks, floors, and common areas',
      category: 'Cleaning',
      budget: 150,
      area: 'Orchard',
      location: '123 Orchard Road, Singapore 238801',
      status: 'open',
      createdAt: '2026-07-10',
      askerName: 'ABC Corp',
      askerType: 'company'
    },
    {
      id: 2,
      formattedId: 'ERR-2026-002',
      title: 'Delivery Service',
      description: 'Deliver packages to multiple locations in CBD area',
      category: 'Delivery',
      budget: 85,
      area: 'Central Business District',
      location: '1 Raffles Place, Singapore 048616',
      status: 'open',
      createdAt: '2026-07-09',
      askerName: 'Sarah Tan',
      askerType: 'individual'
    },
    {
      id: 3,
      formattedId: 'ERR-2026-003',
      title: 'Handyman Repairs',
      description: 'Fix leaky faucets and replace door handles',
      category: 'Handyman',
      budget: 200,
      area: 'Bukit Merah',
      location: '456 Jalan Bukit Merah, Singapore 150456',
      status: 'open',
      createdAt: '2026-07-08',
      askerName: 'John Lee',
      askerType: 'individual'
    }
  ];

  // Errands allocated to this staff member only
  const allocatedErrands: Errand[] = [
    {
      id: 1,
      formattedId: 'ERR-2026-001',
      title: 'Office Cleaning Service',
      description: 'Clean and organize office space, including desks, floors, and common areas',
      category: 'Cleaning',
      budget: 150,
      area: 'Orchard',
      location: '123 Orchard Road, Singapore 238801',
      status: 'allocated',
      createdAt: '2026-07-10',
      askerName: 'ABC Corp',
      askerType: 'company'
    },
  ];

  // Show all errands for owner/manager, only allocated for staff
  const displayErrands = userRole === 'staff' ? allocatedErrands : allErrands;

  const [errands] = useState<Errand[]>(displayErrands);

  const [filteredErrands, setFilteredErrands] = useState<Errand[]>(errands);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');

  useEffect(() => {
    let filtered = errands;

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    setFilteredErrands(filtered);
  }, [searchTerm, selectedCategory, errands]);

  const handleSubmitOffer = (errnd: Errand) => {
    alert(`Offer submitted for ${errnd.title}`);
    setSelectedErrand(null);
  };

  const handleAllocateErrand = (errand: Errand) => {
    if (!selectedStaff) {
      alert('Please select a staff member');
      return;
    }
    alert(`Errand allocated to ${selectedStaff}`);
    setShowAllocateModal(false);
    setSelectedErrand(null);
    setSelectedStaff('');
  };

  const canAllocate = userRole === 'owner' || userRole === 'manager';

  const isStaff = userRole === 'staff';

  return (
    <div className="doer-browse-container">
      <h2>Browse Errands</h2>
      <p className="subtitle">
        {isStaff
          ? '📋 Errands allocated to you - Complete and track progress'
          : 'Find and submit offers on available errands'}
      </p>
      {isStaff && errands.length > 0 && (
        <div className="staff-notice">
          <span className="badge">{errands.length}</span>
          <p>Errand(s) assigned to you</p>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="Search errands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-select"
        >
          <option>All Categories</option>
          <option>Cleaning</option>
          <option>Delivery</option>
          <option>Handyman</option>
          <option>Admin</option>
        </select>
      </div>

      {/* Errands Grid */}
      <div className="errands-grid">
        {filteredErrands.length === 0 ? (
          <div className="empty-state">
            <p>No errands found matching your criteria</p>
          </div>
        ) : (
          filteredErrands.map(errand => (
            <div key={errand.id} className="errand-card">
              <div className="card-header">
                <div>
                  <h3>{errand.title}</h3>
                  <p className="errand-id">{errand.formattedId}</p>
                </div>
                <span className="budget-badge">${errand.budget}</span>
              </div>

              <p className="description">{errand.description}</p>

              <div className="card-meta">
                <span className="category-tag">{errand.category}</span>
                <span className="area-tag">{errand.area}</span>
                <span className="asker-tag">
                  {errand.askerType === 'company' ? '🏢' : '👤'} {errand.askerName}
                </span>
              </div>

              <button
                className="btn-view-details"
                onClick={() => setSelectedErrand(errand)}
              >
                View Details →
              </button>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedErrand && (
        <div className="modal-overlay" onClick={() => setSelectedErrand(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedErrand(null)}>✕</button>

            <h3>{selectedErrand.title}</h3>
            <p className="modal-id">{selectedErrand.formattedId}</p>

            <div className="detail-section">
              <h4>Description</h4>
              <p>{selectedErrand.description}</p>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Budget</span>
                <span className="value">${selectedErrand.budget}</span>
              </div>
              <div className="detail-item">
                <span className="label">Location</span>
                <span className="value">{selectedErrand.location}</span>
              </div>
              <div className="detail-item">
                <span className="label">Category</span>
                <span className="value">{selectedErrand.category}</span>
              </div>
              <div className="detail-item">
                <span className="label">Area</span>
                <span className="value">{selectedErrand.area}</span>
              </div>
            </div>

            <div className="modal-actions">
              {canAllocate ? (
                <>
                  <button
                    className="btn-allocate"
                    onClick={() => setShowAllocateModal(true)}
                  >
                    📦 Allocate to Staff
                  </button>
                  <button
                    className="btn-submit-offer"
                    onClick={() => handleSubmitOffer(selectedErrand)}
                  >
                    ✋ Submit Offer
                  </button>
                </>
              ) : isStaff ? (
                <div className="staff-message">
                  <p>✅ This errand has been assigned to you</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>View progress in "Active Errands"</p>
                </div>
              ) : (
                <button
                  className="btn-submit-offer"
                  onClick={() => handleSubmitOffer(selectedErrand)}
                >
                  ✋ Submit Offer
                </button>
              )}
            </div>

            {/* Allocate Modal */}
            {showAllocateModal && (
              <div className="allocate-modal">
                <h4>Allocate to Staff</h4>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="staff-select"
                >
                  <option value="">Select staff member...</option>
                  <option value="Staff 1">Staff 1 - Cleaning Expert</option>
                  <option value="Staff 2">Staff 2 - Delivery Specialist</option>
                  <option value="Manager">Manager - John Lim</option>
                </select>
                <div className="allocate-actions">
                  <button
                    className="btn-confirm"
                    onClick={() => handleAllocateErrand(selectedErrand)}
                  >
                    Allocate
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => setShowAllocateModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .doer-browse-container {
          max-width: 100%;
        }

        .subtitle {
          color: #666;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .staff-notice {
          background: #E3F2FD;
          border: 1px solid #90CAF9;
          border-left: 4px solid #1976D2;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .staff-notice .badge {
          background: #1976D2;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        .staff-notice p {
          margin: 0;
          color: #1565C0;
          font-weight: 600;
          font-size: 14px;
        }

        .staff-message {
          background: #E8F5E9;
          border: 1px solid #C8E6C9;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          color: #2E7D32;
        }

        .staff-message p {
          margin: 0;
          font-weight: 600;
          font-size: 14px;
        }

        .filters-section {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 12px;
          margin-bottom: 24px;
        }

        .search-input,
        .category-select {
          padding: 10px 12px;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          font-size: 14px;
        }

        .search-input:focus,
        .category-select:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .errands-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .errand-card {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .errand-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #FF6B35;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .card-header h3 {
          font-size: 16px;
          margin: 0 0 4px 0;
          color: #1A1A1A;
        }

        .errand-id {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        .budget-badge {
          background: #FF6B35;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
        }

        .description {
          font-size: 13px;
          color: #666;
          margin: 0 0 12px 0;
          line-height: 1.4;
        }

        .card-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .category-tag,
        .area-tag,
        .asker-tag {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          background: #F0F0F0;
          color: #666;
        }

        .btn-view-details {
          width: 100%;
          padding: 8px 12px;
          background: #F8FAFB;
          border: 1px solid #E8E8E8;
          border-radius: 6px;
          color: #FF6B35;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-view-details:hover {
          background: #FF6B35;
          color: white;
          border-color: #FF6B35;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
        }

        .modal-content h3 {
          margin: 0 0 4px 0;
          color: #1B5E75;
        }

        .modal-id {
          font-size: 12px;
          color: #999;
          margin: 0 0 16px 0;
        }

        .detail-section {
          margin-bottom: 16px;
        }

        .detail-section h4 {
          font-size: 14px;
          color: #1B5E75;
          margin: 0 0 8px 0;
        }

        .detail-section p {
          margin: 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .detail-item {
          display: grid;
          gap: 4px;
        }

        .detail-item .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
        }

        .detail-item .value {
          font-size: 14px;
          color: #1A1A1A;
          font-weight: 500;
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .btn-allocate,
        .btn-submit-offer,
        .btn-confirm,
        .btn-cancel {
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-allocate {
          background: #1B5E75;
          color: white;
        }

        .btn-allocate:hover {
          background: #144A5A;
        }

        .btn-submit-offer {
          background: #FF6B35;
          color: white;
          grid-column: ${canAllocate ? '1 / 2' : '1 / -1'};
        }

        .btn-submit-offer:hover {
          background: #E55A24;
        }

        .allocate-modal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          padding: 16px;
          z-index: 1001;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          min-width: 300px;
        }

        .allocate-modal h4 {
          margin: 0 0 12px 0;
          color: #1B5E75;
        }

        .staff-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #E8E8E8;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .allocate-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .btn-confirm {
          background: #FF6B35;
          color: white;
        }

        .btn-confirm:hover {
          background: #E55A24;
        }

        .btn-cancel {
          background: #F0F0F0;
          color: #666;
        }

        .btn-cancel:hover {
          background: #E0E0E0;
        }

        @media (max-width: 768px) {
          .filters-section {
            grid-template-columns: 1fr;
          }

          .errands-grid {
            grid-template-columns: 1fr;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .modal-actions {
            grid-template-columns: 1fr;
          }

          .btn-submit-offer {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DoerBrowseErrands;
