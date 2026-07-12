import React, { useState } from 'react';

interface ActiveErrand {
  id: number;
  errandId: string;
  title: string;
  askerName: string;
  status: 'in_progress' | 'paused' | 'completed';
  progress: number;
  startedAt: string;
  expectedCompletion: string;
  budget: number;
  location: string;
  notes: string;
}

const DoerActiveErrands: React.FC = () => {
  const [errands] = useState<ActiveErrand[]>([
    {
      id: 1,
      errandId: 'ERR-2026-001',
      title: 'Office Cleaning Service',
      askerName: 'ABC Corp',
      status: 'in_progress',
      progress: 65,
      startedAt: '2026-07-10T09:00',
      expectedCompletion: '2026-07-10T14:00',
      budget: 150,
      location: '123 Orchard Road, Singapore 238801',
      notes: 'Desks cleared, now cleaning floors',
    },
    {
      id: 2,
      errandId: 'ERR-2026-002',
      title: 'Delivery Service',
      askerName: 'Sarah Tan',
      status: 'in_progress',
      progress: 40,
      startedAt: '2026-07-11T10:00',
      expectedCompletion: '2026-07-11T16:00',
      budget: 85,
      location: '1 Raffles Place, Singapore 048616',
      notes: 'First delivery completed, heading to second location',
    },
  ]);

  const [selectedErrand, setSelectedErrand] = useState<ActiveErrand | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [filteredErrands, setFilteredErrands] = useState<ActiveErrand[]>(errands);
  const [selectedFilter, setSelectedFilter] = useState('in_progress');

  const handleFilter = (filter: string) => {
    setSelectedFilter(filter);
    if (filter === 'all') {
      setFilteredErrands(errands);
    } else {
      setFilteredErrands(errands.filter(e => e.status === filter));
    }
  };

  const handleAddNote = () => {
    if (newNote.trim() && selectedErrand) {
      alert(`Note added: "${newNote}"`);
      setNewNote('');
      setShowNotesModal(false);
    }
  };

  const handleMarkComplete = (errandId: number) => {
    alert(`Errand #${errandId} marked as complete. Awaiting asker review.`);
    setSelectedErrand(null);
  };

  const getStatusInfo = (status: string) => {
    const statuses: { [key: string]: { bg: string; color: string; icon: string; text: string } } = {
      in_progress: { bg: '#E3F2FD', color: '#1976D2', icon: '⚙️', text: 'In Progress' },
      paused: { bg: '#FFF3E0', color: '#F57C00', icon: '⏸️', text: 'Paused' },
      completed: { bg: '#E8F5E9', color: '#388E3C', icon: '✅', text: 'Completed' },
    };
    return statuses[status] || statuses.in_progress;
  };

  const getProgressColor = (progress: number) => {
    if (progress < 33) return '#FF6B35';
    if (progress < 66) return '#FFA500';
    return '#2D7A34';
  };

  return (
    <div className="active-errands-container">
      <h2>Active Errands</h2>
      <p className="subtitle">Track work in progress</p>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['in_progress', 'paused', 'all'].map(tab => (
          <button
            key={tab}
            className={`filter-tab ${selectedFilter === tab ? 'active' : ''}`}
            onClick={() => handleFilter(tab)}
          >
            {tab === 'in_progress' ? 'In Progress' : tab === 'paused' ? 'Paused' : 'All'}
            <span className="count">
              {tab === 'all'
                ? errands.length
                : errands.filter(e => e.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Active Errands List */}
      <div className="active-errands-list">
        {filteredErrands.length === 0 ? (
          <div className="empty-state">
            <p>No active errands</p>
          </div>
        ) : (
          filteredErrands.map(errand => {
            const statusInfo = getStatusInfo(errand.status);
            const progressColor = getProgressColor(errand.progress);
            return (
              <div key={errand.id} className="errand-card">
                <div className="card-header">
                  <div>
                    <h3>{errand.title}</h3>
                    <p className="errand-id">{errand.errandId}</p>
                  </div>
                  <span className="status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                    {statusInfo.icon} {statusInfo.text}
                  </span>
                </div>

                <div className="progress-section">
                  <div className="progress-header">
                    <span className="label">Progress</span>
                    <span className="percentage" style={{ color: progressColor }}>
                      {errand.progress}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${errand.progress}%`, background: progressColor }}
                    />
                  </div>
                </div>

                <div className="errand-details">
                  <div className="detail-row">
                    <span className="label">Asker</span>
                    <span className="value">🏢 {errand.askerName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Location</span>
                    <span className="value">{errand.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Budget</span>
                    <span className="value">${errand.budget}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Expected Completion</span>
                    <span className="value">{new Date(errand.expectedCompletion).toLocaleString()}</span>
                  </div>
                </div>

                {errand.notes && (
                  <div className="notes-section">
                    <p className="notes-label">📝 Latest Note</p>
                    <p className="notes-text">{errand.notes}</p>
                  </div>
                )}

                <div className="card-actions">
                  <button
                    className="btn-add-note"
                    onClick={() => {
                      setSelectedErrand(errand);
                      setShowNotesModal(true);
                    }}
                  >
                    📝 Add Note
                  </button>
                  <button
                    className="btn-complete"
                    onClick={() => handleMarkComplete(errand.id)}
                  >
                    ✅ Mark Complete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notes Modal */}
      {showNotesModal && selectedErrand && (
        <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowNotesModal(false)}>✕</button>
            <h3>Add Note to {selectedErrand.title}</h3>

            <textarea
              placeholder="Write an update about your progress..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="note-input"
              rows={4}
            />

            <div className="modal-actions">
              <button className="btn-save" onClick={handleAddNote}>
                💾 Save Note
              </button>
              <button className="btn-cancel" onClick={() => setShowNotesModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .active-errands-container {
          max-width: 100%;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #E8E8E8;
          padding-bottom: 12px;
        }

        .filter-tab {
          padding: 8px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-tab.active {
          color: #FF6B35;
          border-bottom-color: #FF6B35;
        }

        .filter-tab .count {
          background: #E8E8E8;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .filter-tab.active .count {
          background: #FFE8D6;
          color: #FF6B35;
        }

        .active-errands-list {
          display: grid;
          gap: 16px;
        }

        .errand-card {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }

        .errand-card:hover {
          border-color: #FF6B35;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .card-header h3 {
          margin: 0 0 4px 0;
          color: #1A1A1A;
          font-size: 16px;
        }

        .errand-id {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
        }

        .progress-section {
          margin-bottom: 16px;
          padding: 12px;
          background: #F8FAFB;
          border-radius: 8px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .progress-header .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
        }

        .progress-header .percentage {
          font-weight: 600;
          font-size: 14px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #E8E8E8;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .errand-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-row .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
        }

        .detail-row .value {
          font-size: 13px;
          color: #1A1A1A;
          font-weight: 500;
          text-align: right;
        }

        .notes-section {
          padding: 12px;
          background: #FFF9F5;
          border-left: 3px solid #FF6B35;
          border-radius: 4px;
          margin-bottom: 12px;
        }

        .notes-label {
          margin: 0 0 6px 0;
          font-size: 12px;
          font-weight: 600;
          color: #FF6B35;
        }

        .notes-text {
          margin: 0;
          font-size: 13px;
          color: #666;
          line-height: 1.4;
        }

        .card-actions {
          display: flex;
          gap: 12px;
        }

        .btn-add-note,
        .btn-complete {
          flex: 1;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-add-note {
          background: #E3F2FD;
          color: #1976D2;
        }

        .btn-add-note:hover {
          background: #1976D2;
          color: white;
        }

        .btn-complete {
          background: #2D7A34;
          color: white;
        }

        .btn-complete:hover {
          background: #1E5B25;
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
          margin: 0 0 16px 0;
          color: #1B5E75;
        }

        .note-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 16px;
        }

        .note-input:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .btn-save {
          padding: 10px 16px;
          background: #2D7A34;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-save:hover {
          background: #1E5B25;
        }

        .btn-cancel {
          padding: 10px 16px;
          background: #F0F0F0;
          color: #666;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #E0E0E0;
        }

        @media (max-width: 768px) {
          .errand-details {
            grid-template-columns: 1fr;
          }

          .card-actions {
            flex-direction: column;
          }

          .btn-add-note,
          .btn-complete {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default DoerActiveErrands;
