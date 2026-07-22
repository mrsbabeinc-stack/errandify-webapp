import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const GrantPointsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grant' | 'history'>('grant');
  const [grantMode, setGrantMode] = useState<'individual' | 'group'>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    pointAmount: '',
    description: '',
    expiryDate: '',
  });

  const [users] = useState([
    { id: 1, username: 'account_two', name: 'Anna Tran', email: 'accounttwo@yopmail.com', currentPoints: 450 },
    { id: 2, username: 'account_three', name: 'Sunny love', email: 'accountthree@yopmail.com', currentPoints: 325 },
    { id: 3, username: 'test_three', name: 'Test User', email: 'test3@yopmail.com', currentPoints: 520 },
    { id: 4, username: 'USER0000109', name: 'User 109', email: 'user109@yopmail.com', currentPoints: 200 },
    { id: 5, username: 'account_one', name: 'John Doe', email: 'accountone@yopmail.com', currentPoints: 750 },
  ]);

  const [grantHistory] = useState([
    { id: 1, username: 'account_two', name: 'Anna Tran', points: 30, description: 'Errand completion reward: errand B', grantedDate: '27-06-2026 02:39 PM', expiryDate: '30-06-2027 11:59 PM' },
    { id: 2, username: 'account_three', name: 'Sunny love', points: 30, description: 'Errand completion reward: errand B', grantedDate: '27-06-2026 02:39 PM', expiryDate: '30-06-2027 11:59 PM' },
    { id: 3, username: 'account_two', name: 'Anna Tran', points: 200, description: 'Errand completion reward: Weekly Apartment Cleaning 3', grantedDate: '24-06-2026 06:04 PM', expiryDate: '30-06-2027 11:59 PM' },
    { id: 4, username: 'USER0000109', name: 'Test User', points: 200, description: 'Errand completion reward: Weekly Apartment Cleaning 3', grantedDate: '24-06-2026 06:04 PM', expiryDate: '30-06-2027 11:59 PM' },
    { id: 5, username: 'account_two', name: 'Anna Tran', points: -25, description: 'Redeemed voucher: voucher b', grantedDate: '22-06-2026 11:16 PM', expiryDate: '—' },
    { id: 6, username: 'USER0000109', name: 'Test User', points: -500, description: 'Redeemed voucher: starbucks', grantedDate: '22-06-2026 06:07 PM', expiryDate: '—' },
  ]);

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setFormData({ pointAmount: '', description: '', expiryDate: '' });
  };

  const handleToggleUserSelection = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGrantPoints = (e: React.FormEvent) => {
    e.preventDefault();

    if (grantMode === 'individual') {
      if (!selectedUser || !formData.pointAmount || !formData.description) {
        alert('🔔 Please select a user, enter points, and provide a description.');
        return;
      }

      if (isNaN(Number(formData.pointAmount))) {
        alert('🔔 Point amount must be a valid number.');
        return;
      }

      alert(`🎉 Successfully granted ${formData.pointAmount} points to ${selectedUser.name}!`);
      setSelectedUser(null);
      setFormData({ pointAmount: '', description: '', expiryDate: '' });
    } else {
      if (selectedUsers.size === 0 || !formData.pointAmount || !formData.description) {
        alert('🔔 Please select users, enter points, and provide a description.');
        return;
      }

      if (isNaN(Number(formData.pointAmount))) {
        alert('🔔 Point amount must be a valid number.');
        return;
      }

      alert(`🎉 Successfully granted ${formData.pointAmount} points to ${selectedUsers.size} users!`);
      setSelectedUsers(new Set());
      setFormData({ pointAmount: '', description: '', expiryDate: '' });
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        {/* Header */}
        <div className="page-header">
          <h1>💰 Grant Points</h1>
          <p>Manually award Errandify Points to users for special achievements or corrections.</p>
        </div>

        {/* Happy Message Box */}
        <div className="happy-message-box">
          <span className="emoji">✨</span>
          <div>
            <strong>Reward Your Community!</strong>
            <p>Grant points for exceptional service, loyalty, or to correct any issues. Keep your users motivated and happy.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-header">
          <button
            className={`tab-button ${activeTab === 'grant' ? 'active' : ''}`}
            onClick={() => setActiveTab('grant')}
          >
            ✏️ Grant Points
          </button>
          <button
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 Granting History
          </button>
        </div>

        {/* Grant Points Tab */}
        {activeTab === 'grant' && (
          <div className="grant-section">
            {/* Mode Selection */}
            <div className="mode-selector">
              <button
                className={`mode-button ${grantMode === 'individual' ? 'active' : ''}`}
                onClick={() => {
                  setGrantMode('individual');
                  setSelectedUsers(new Set());
                  setSelectedUser(null);
                }}
              >
                👤 Individual User
              </button>
              <button
                className={`mode-button ${grantMode === 'group' ? 'active' : ''}`}
                onClick={() => {
                  setGrantMode('group');
                  setSelectedUser(null);
                }}
              >
                👥 Multiple Users
              </button>
            </div>

            <div className="grant-container">
              {/* Left: User Search */}
              <div className="user-search-section">
                <h3>Target Users *</h3>
                <input
                  type="text"
                  placeholder={grantMode === 'individual' ? '🔍 Search and select a user' : '🔍 Search users'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />

                {grantMode === 'group' && searchQuery && filteredUsers.length > 0 && (
                  <div className="group-select-all">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAllUsers}
                      id="select-all"
                    />
                    <label htmlFor="select-all">
                      Select All ({filteredUsers.length})
                    </label>
                  </div>
                )}

                {searchQuery && (
                  <div className="user-list">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className={`user-item ${grantMode === 'individual' && selectedUser?.id === user.id ? 'selected' : ''} ${grantMode === 'group' && selectedUsers.has(user.id) ? 'selected' : ''}`}
                        onClick={() => {
                          if (grantMode === 'individual') {
                            handleSelectUser(user);
                          } else {
                            handleToggleUserSelection(user.id);
                          }
                        }}
                      >
                        {grantMode === 'group' && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleToggleUserSelection(user.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="user-checkbox"
                          />
                        )}
                        <div className="user-avatar">{user.name.charAt(0)}</div>
                        <div className="user-details">
                          <div className="user-name">{user.name}</div>
                          <div className="user-info">{user.username} • {user.email}</div>
                          <div className="user-points">Current: {user.currentPoints} EP</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {grantMode === 'individual' && selectedUser && (
                  <div className="selected-user-card">
                    <div className="selected-header">
                      <div className="avatar">{selectedUser.name.charAt(0)}</div>
                      <div>
                        <div className="name">{selectedUser.name}</div>
                        <div className="info">{selectedUser.username}</div>
                        <div className="email">{selectedUser.email}</div>
                      </div>
                    </div>
                    <div className="current-points">
                      <span>Current Balance:</span>
                      <span className="points-value">{selectedUser.currentPoints} EP</span>
                    </div>
                  </div>
                )}

                {grantMode === 'group' && selectedUsers.size > 0 && (
                  <div className="selected-users-card">
                    <div className="selected-header">
                      <div>
                        <div className="name">✓ {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected</div>
                        <div className="info">Ready to grant points</div>
                      </div>
                    </div>
                    <button
                      className="btn-clear-selection"
                      onClick={() => setSelectedUsers(new Set())}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Point Granting Form */}
              <div className="grant-form-section">
                <h3>Point Amount *</h3>
                <input
                  type="number"
                  name="pointAmount"
                  value={formData.pointAmount}
                  onChange={handleInputChange}
                  placeholder="Enter Point Amount"
                  className="form-input"
                />
                <p className="hint">Must be a positive value, up to 2 decimal places.</p>

                <h3 style={{ marginTop: '16px' }}>Description</h3>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide additional details or notes for this point grant."
                  rows={4}
                  className="form-textarea"
                />

                <h3 style={{ marginTop: '16px' }}>Expiry Date</h3>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  className="form-input"
                />

                <div className="form-actions">
                  <button className="btn-cancel">Cancel</button>
                  <button className="btn-grant" onClick={handleGrantPoints}>
                    Grant Points
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-section">
            <div className="history-header">
              <input
                type="text"
                placeholder="🔍 Search..."
                className="search-input-small"
              />
              <span className="result-count">Showing {grantHistory.length} records</span>
            </div>

            <div className="table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Point Amount</th>
                    <th>Description</th>
                    <th>Granted Date</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {grantHistory.map((record) => (
                    <tr key={record.id}>
                      <td className="username-cell">
                        <div className="avatar-small">{record.name.charAt(0)}</div>
                        <div>
                          <div className="name">{record.name}</div>
                          <div className="username">{record.username}</div>
                        </div>
                      </td>
                      <td className={`points-cell ${record.points < 0 ? 'negative' : 'positive'}`}>
                        {record.points > 0 ? '+' : ''}{record.points}
                      </td>
                      <td className="description-cell">{record.description}</td>
                      <td className="date-cell">{record.grantedDate}</td>
                      <td className="date-cell">{record.expiryDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button className="prev-btn">← Previous</button>
              <span className="page-info">1</span>
              <button className="next-btn">Next →</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .page-header {
          margin-bottom: 8px;
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

        .happy-message-box {
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
          border-left: 4px solid #ff6b35;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .happy-message-box .emoji {
          font-size: 24px;
          min-width: 24px;
        }

        .happy-message-box strong {
          color: #ff6b35;
          font-size: 13px;
          display: block;
          margin-bottom: 2px;
        }

        .happy-message-box p {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.5;
        }

        .tabs-header {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #ffe6d9;
        }

        .tab-button {
          padding: 12px 16px;
          background: none;
          border: none;
          color: #888;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
        }

        .tab-button.active {
          color: #ff6b35;
          border-bottom-color: #ff6b35;
        }

        .tab-button:hover {
          color: #ff6b35;
        }

        /* Grant Section */
        .grant-section {
          background: white;
          border: 1px solid #ffb88c;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mode-selector {
          display: flex;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 2px solid #ffe6d9;
        }

        .mode-button {
          flex: 1;
          padding: 10px 16px;
          background: #f9f9f9;
          color: #666;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .mode-button.active {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .mode-button:hover {
          border-color: #ff6b35;
          color: #ff6b35;
        }

        .mode-button.active:hover {
          background: #ff5722;
        }

        .grant-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .group-select-all {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #fff9f5;
          border: 1px solid #ffe6d9;
          border-radius: 6px;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .group-select-all input[type="checkbox"] {
          cursor: pointer;
        }

        .group-select-all label {
          cursor: pointer;
          margin: 0;
          font-weight: 600;
          color: #ff6b35;
        }

        .user-checkbox {
          margin-right: 8px;
          cursor: pointer;
          width: 16px;
          height: 16px;
        }

        .selected-users-card {
          margin-top: 16px;
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
          border: 1px solid #ffb88c;
          border-radius: 6px;
          padding: 12px;
        }

        .selected-users-card .selected-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0;
        }

        .selected-users-card .name {
          font-size: 14px;
          font-weight: 700;
          color: #27b55d;
        }

        .selected-users-card .info {
          font-size: 11px;
          color: #888;
        }

        .btn-clear-selection {
          padding: 6px 12px;
          background: white;
          color: #ff6b35;
          border: 1px solid #ffb88c;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .btn-clear-selection:hover {
          background: #ffe6d9;
        }

        .user-search-section h3,
        .grant-form-section h3 {
          font-size: 12px;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          margin: 0 0 10px 0;
        }

        .search-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ffb88c;
          border-radius: 6px;
          font-size: 13px;
        }

        .search-input:focus {
          outline: none;
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .user-list {
          margin-top: 12px;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #ffe6d9;
          border-radius: 6px;
        }

        .user-item {
          display: flex;
          gap: 12px;
          padding: 10px;
          cursor: pointer;
          border-bottom: 1px solid #ffe6d9;
          transition: all 0.2s;
        }

        .user-item:hover {
          background: #fff9f5;
        }

        .user-item.selected {
          background: #fff5f0;
          border-left: 3px solid #ff6b35;
          padding-left: 9px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .user-details {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .user-info {
          font-size: 11px;
          color: #888;
        }

        .user-points {
          font-size: 11px;
          color: #ff6b35;
          font-weight: 600;
          margin-top: 4px;
        }

        .selected-user-card {
          margin-top: 16px;
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
          border: 1px solid #ffb88c;
          border-radius: 6px;
          padding: 12px;
        }

        .selected-header {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .selected-header .name {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .selected-header .info {
          font-size: 11px;
          color: #888;
        }

        .selected-header .email {
          font-size: 11px;
          color: #888;
        }

        .current-points {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: white;
          border-radius: 4px;
          font-size: 12px;
        }

        .current-points span:first-child {
          color: #666;
          font-weight: 600;
        }

        .points-value {
          font-size: 16px;
          font-weight: 700;
          color: #ff6b35;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ffb88c;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .hint {
          font-size: 11px;
          color: #888;
          margin: 4px 0 0 0;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          justify-content: flex-end;
        }

        .btn-cancel {
          padding: 10px 16px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-cancel:hover {
          background: #e0e0e0;
        }

        .btn-grant {
          padding: 10px 20px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
        }

        .btn-grant:hover {
          background: #ff5722;
        }

        /* History Section */
        .history-section {
          background: white;
          border: 1px solid #ffb88c;
          border-radius: 8px;
          padding: 20px;
        }

        .history-header {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          align-items: center;
        }

        .search-input-small {
          flex: 1;
          padding: 10px;
          border: 1px solid #ffb88c;
          border-radius: 6px;
          font-size: 13px;
        }

        .search-input-small:focus {
          outline: none;
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .result-count {
          font-size: 12px;
          color: #888;
          white-space: nowrap;
        }

        .table-container {
          border: 1px solid #ffb88c;
          border-radius: 6px;
          overflow: hidden;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
        }

        .history-table thead {
          background: linear-gradient(to right, #fff5f0, #fffbf7);
          border-bottom: 2px solid #ffb88c;
        }

        .history-table th {
          padding: 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #ff6b35;
          text-transform: uppercase;
        }

        .history-table tbody tr {
          border-bottom: 1px solid #ffe6d9;
          transition: background 0.2s;
        }

        .history-table tbody tr:hover {
          background: #fff9f5;
        }

        .history-table td {
          padding: 12px;
          font-size: 13px;
          color: #333;
        }

        .username-cell {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
          font-size: 12px;
        }

        .username-cell .name {
          font-weight: 600;
        }

        .username-cell .username {
          font-size: 11px;
          color: #888;
        }

        .points-cell {
          font-weight: 700;
        }

        .points-cell.positive {
          color: #27b55d;
        }

        .points-cell.negative {
          color: #ff6b35;
        }

        .description-cell {
          font-size: 12px;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .date-cell {
          font-size: 12px;
          color: #888;
        }

        .pagination {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 16px;
          align-items: center;
        }

        .prev-btn,
        .next-btn {
          padding: 6px 12px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .prev-btn:hover,
        .next-btn:hover {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .page-info {
          font-size: 12px;
          color: #ff6b35;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .grant-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default GrantPointsPage;
