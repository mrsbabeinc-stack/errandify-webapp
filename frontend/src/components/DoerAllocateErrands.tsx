import React, { useState } from 'react';

interface Errand {
  id: number;
  formattedId: string;
  title: string;
  budget: number;
  area: string;
  category: string;
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
  skills: string;
  rating: number;
  availability: string;
}

const DoerAllocateErrands: React.FC = () => {
  const [errands] = useState<Errand[]>([
    { id: 1, formattedId: 'ERR-2026-001', title: 'Office Cleaning', budget: 150, area: 'Orchard', category: 'Cleaning' },
    { id: 2, formattedId: 'ERR-2026-002', title: 'Delivery Service', budget: 85, area: 'CBD', category: 'Delivery' },
    { id: 3, formattedId: 'ERR-2026-003', title: 'Handyman Repairs', budget: 200, area: 'Bukit Merah', category: 'Handyman' },
  ]);

  const [staff] = useState<StaffMember[]>([
    { id: 1, name: 'Staff 1', role: 'Cleaner', skills: 'Cleaning, Organization', rating: 4.8, availability: 'Available' },
    { id: 2, name: 'Staff 2', role: 'Courier', skills: 'Delivery, Logistics', rating: 4.9, availability: 'Available' },
    { id: 3, name: 'Manager', role: 'Manager', skills: 'All', rating: 4.7, availability: 'Busy' },
  ]);

  const [allocations, setAllocations] = useState<{ errandId: number; staffId: number; status: string }[]>([]);
  const [selectedErrand, setSelectedErrand] = useState<number | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);

  const handleAllocate = () => {
    if (!selectedErrand || !selectedStaff) {
      alert('Please select both errand and staff member');
      return;
    }

    const newAllocation = { errandId: selectedErrand, staffId: selectedStaff, status: 'pending' };
    setAllocations([...allocations, newAllocation]);
    alert('Errand allocated successfully!');
    setSelectedErrand(null);
    setSelectedStaff(null);
  };

  const getStaffName = (staffId: number) => staff.find(s => s.id === staffId)?.name || '';
  const getErrandTitle = (errandId: number) => errands.find(e => e.id === errandId)?.title || '';

  return (
    <div className="allocate-errands-container">
      <h2>Allocate Errands to Staff</h2>
      <p className="subtitle">Assign errands to your staff members</p>

      <div className="allocation-form">
        <div className="form-group">
          <label>Select Errand *</label>
          <select
            value={selectedErrand || ''}
            onChange={(e) => setSelectedErrand(Number(e.target.value))}
            className="form-select"
          >
            <option value="">Choose an errand...</option>
            {errands.map(e => (
              <option key={e.id} value={e.id}>
                {e.title} - ${e.budget} ({e.formattedId})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Staff Member *</label>
          <select
            value={selectedStaff || ''}
            onChange={(e) => setSelectedStaff(Number(e.target.value))}
            className="form-select"
          >
            <option value="">Choose staff...</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} - {s.role} (⭐ {s.rating})
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleAllocate} className="btn-allocate">
          📦 Allocate Errand
        </button>
      </div>

      {/* Allocation History */}
      <div className="allocation-history">
        <h3>Allocation History</h3>
        {allocations.length === 0 ? (
          <div className="empty-state">
            <p>No allocations yet</p>
          </div>
        ) : (
          <div className="allocations-list">
            {allocations.map((alloc, idx) => (
              <div key={idx} className="allocation-item">
                <div className="allocation-info">
                  <span className="errand-name">{getErrandTitle(alloc.errandId)}</span>
                  <span className="staff-name">→ {getStaffName(alloc.staffId)}</span>
                </div>
                <span className={`status-badge ${alloc.status}`}>
                  {alloc.status === 'pending' ? '⏳' : '✅'} {alloc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .allocate-errands-container {
          max-width: 600px;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .allocation-form {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-of-type {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #1B5E75;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          background: white;
        }

        .form-select:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .btn-allocate {
          width: 100%;
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

        .btn-allocate:hover {
          background: #E55A24;
          transform: translateY(-1px);
        }

        .allocation-history {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 20px;
        }

        .allocation-history h3 {
          margin: 0 0 16px 0;
          color: #1B5E75;
          font-size: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 20px;
          color: #999;
        }

        .allocations-list {
          display: grid;
          gap: 12px;
        }

        .allocation-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #F8FAFB;
          border-radius: 8px;
          border: 1px solid #E8E8E8;
        }

        .allocation-info {
          display: flex;
          gap: 12px;
          align-items: center;
          flex: 1;
        }

        .errand-name {
          font-weight: 600;
          color: #1A1A1A;
          font-size: 14px;
        }

        .staff-name {
          color: #666;
          font-size: 13px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badge.pending {
          background: #FFF4E6;
          color: #FF6B35;
        }

        .status-badge.accepted {
          background: #E6F9E6;
          color: #2D7A34;
        }

        @media (max-width: 768px) {
          .allocate-errands-container {
            max-width: 100%;
          }

          .allocation-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default DoerAllocateErrands;
