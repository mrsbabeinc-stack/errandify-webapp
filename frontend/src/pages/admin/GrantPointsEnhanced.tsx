import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const GrantPointsEnhancedPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grant' | 'history' | 'campaigns' | 'groups'>('grant');
  const [grantTarget, setGrantTarget] = useState<'individual' | 'company' | 'group'>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  const [formData, setFormData] = useState({
    pointAmount: '',
    description: '',
    message: '',
    startDate: '',
    endDate: '',
    groupName: '',
    grantDate: '',
  });

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState({ userName: '', points: 0 });

  const [groupFilter, setGroupFilter] = useState('all');
  const [demographicFilter, setDemographicFilter] = useState('all');

  const [users] = useState([
    { id: 1, username: 'account_two', name: 'Anna Tran', email: 'accounttwo@yopmail.com', currentPoints: 450, demographic: 'super_nanny', group: 'premium' },
    { id: 2, username: 'account_three', name: 'Sunny love', email: 'accountthree@yopmail.com', currentPoints: 325, demographic: 'regular', group: 'standard' },
    { id: 3, username: 'test_three', name: 'Test User', email: 'test3@yopmail.com', currentPoints: 520, demographic: 'super_nanny', group: 'premium' },
    { id: 4, username: 'USER0000109', name: 'User 109', email: 'user109@yopmail.com', currentPoints: 200, demographic: 'active_user', group: 'standard' },
    { id: 5, username: 'account_one', name: 'John Doe', email: 'accountone@yopmail.com', currentPoints: 750, demographic: 'super_nanny', group: 'vip' },
  ]);

  const [companies] = useState([
    { id: 1, name: 'ABC Cleaning Services', contactPerson: 'Mr. Lee', users: 45, currentPoints: 2250 },
    { id: 2, name: 'QuickFix Maintenance', contactPerson: 'Ms. Chen', users: 28, currentPoints: 1400 },
    { id: 3, name: 'Premium Care Ltd', contactPerson: 'Mr. Raj', users: 67, currentPoints: 3350 },
  ]);

  const [campaigns] = useState([
    { id: 1, name: 'Super Nanny Reward Q3', targetGroup: 'super_nanny', pointAmount: 100, startDate: '2026-07-01', endDate: '2026-09-30', usersReached: 234, status: 'active' },
    { id: 2, name: 'New User Welcome Bonus', targetGroup: 'new_users', pointAmount: 50, startDate: '2026-06-01', endDate: '2026-12-31', usersReached: 512, status: 'active' },
    { id: 3, name: 'Summer Campaign 2026', targetGroup: 'all', pointAmount: 75, startDate: '2026-06-21', endDate: '2026-08-31', usersReached: 1200, status: 'scheduled' },
  ]);

  const [savedGroups, setSavedGroups] = useState([
    { id: 1, name: 'Q3 Super Nannies', description: 'All super nanny users for Q3 bonus', userIds: [1, 3, 5], createdDate: '2026-07-10' },
    { id: 2, name: 'Premium Members', description: 'Premium tier users', userIds: [1, 3], createdDate: '2026-07-09' },
  ]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = groupFilter === 'all' || u.group === groupFilter;
    const matchesDemographic = demographicFilter === 'all' || u.demographic === demographicFilter;
    return matchesSearch && matchesGroup && matchesDemographic;
  });

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSelectedCompany(null);
    setFormData({ pointAmount: '', description: '', message: '', startDate: '', endDate: '', groupName: '' });
  };

  const handleSelectCompany = (company: any) => {
    setSelectedCompany(company);
    setSelectedUser(null);
    setFormData({ pointAmount: '', description: '', message: '', startDate: '', endDate: '', groupName: '' });
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

  const triggerCelebration = (userName: string, points: number) => {
    setCelebrationData({ userName, points });
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 4000);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      alert('🔔 Please enter a group name.');
      return;
    }

    if (selectedUsers.size === 0) {
      alert('🔔 Please select users for this group.');
      return;
    }

    const newGroup = {
      id: Math.max(...savedGroups.map(g => g.id), 0) + 1,
      name: newGroupName,
      description: newGroupDescription,
      userIds: Array.from(selectedUsers),
      createdDate: new Date().toISOString().split('T')[0]
    };

    setSavedGroups([...savedGroups, newGroup]);
    alert(`✅ Group "${newGroupName}" created with ${selectedUsers.size} users!`);

    setNewGroupName('');
    setNewGroupDescription('');
    setShowCreateGroupModal(false);
    setSelectedUsers(new Set());
    setSearchQuery('');
  };

  const handleLoadSavedGroup = (groupId: number) => {
    const group = savedGroups.find(g => g.id === groupId);
    if (group) {
      setSelectedUsers(new Set(group.userIds));
      setFormData(prev => ({ ...prev, groupName: group.name }));
      alert(`✅ Loaded group "${group.name}" with ${group.userIds.length} users`);
    }
  };

  const handleDeleteGroup = (groupId: number) => {
    const group = savedGroups.find(g => g.id === groupId);
    if (window.confirm(`Delete group "${group?.name}"?`)) {
      setSavedGroups(savedGroups.filter(g => g.id !== groupId));
      alert('✅ Group deleted');
    }
  };

  const handleGrantPoints = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pointAmount || !formData.description) {
      alert('🔔 Please enter point amount and description.');
      return;
    }

    if (isNaN(Number(formData.pointAmount))) {
      alert('🔔 Point amount must be a valid number.');
      return;
    }

    if (grantTarget === 'individual' && !selectedUser) {
      alert('🔔 Please select a user.');
      return;
    }

    if (grantTarget === 'company' && !selectedCompany) {
      alert('🔔 Please select a company.');
      return;
    }

    if (grantTarget === 'group' && selectedUsers.size === 0) {
      alert('🔔 Please select users for the group.');
      return;
    }

    // Trigger celebration animation
    if (grantTarget === 'individual') {
      triggerCelebration(selectedUser.name, Number(formData.pointAmount));
    } else if (grantTarget === 'company') {
      triggerCelebration(`${selectedCompany.name} (${selectedUsers.size || selectedCompany.users} users)`, Number(formData.pointAmount));
    } else if (grantTarget === 'group') {
      triggerCelebration(`${formData.groupName || 'Group'} (${selectedUsers.size} users)`, Number(formData.pointAmount));
    }

    setSelectedUser(null);
    setSelectedCompany(null);
    setSelectedUsers(new Set());
    setFormData({ pointAmount: '', description: '', message: '', startDate: '', endDate: '', groupName: '', grantDate: '' });
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', height: '100vh', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0', color: '#333' }}>
            🎁 Grant Errandify Points
          </h1>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            Award points to individuals, groups, or companies with personalized campaigns and animated notifications
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #ffe6d9', paddingBottom: '0' }}>
          {['grant', 'groups', 'campaigns', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: activeTab === tab ? '#FF6B35' : '#888',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : '3px solid transparent',
                marginBottom: '-2px',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'grant' && '✏️ Grant Points'}
              {tab === 'groups' && '👥 Saved Groups'}
              {tab === 'campaigns' && '📋 Campaigns'}
              {tab === 'history' && '📊 History'}
            </button>
          ))}
        </div>

        {/* Grant Tab */}
        {activeTab === 'grant' && (
          <div style={{ background: '#fff', border: '1px solid #ffb88c', borderRadius: '8px', padding: '20px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Target Selection */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Grant To</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['individual', 'company', 'group'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      setGrantTarget(mode as any);
                      setSelectedUser(null);
                      setSelectedCompany(null);
                      setSelectedUsers(new Set());
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: grantTarget === mode ? '#FF6B35' : '#f9f9f9',
                      color: grantTarget === mode ? '#fff' : '#666',
                      border: `1px solid ${grantTarget === mode ? '#FF6B35' : '#ddd'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {mode === 'individual' && '👤 Individual User'}
                    {mode === 'company' && '🏢 Company'}
                    {mode === 'group' && '👥 Group Campaign'}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: grantTarget === 'group' ? '1fr 1.2fr' : '1fr 1.2fr', gap: '20px', flex: 1, minHeight: 0 }}>
              {/* Left: Selection Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflowY: 'auto' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                    {grantTarget === 'individual' && '👤 Select User'}
                    {grantTarget === 'company' && '🏢 Select Company'}
                    {grantTarget === 'group' && '👥 Select Users'}
                  </label>
                  <input
                    type="text"
                    placeholder={grantTarget === 'group' ? '🔍 Search & filter users...' : '🔍 Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ffb88c',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Filters for Group Mode */}
                {grantTarget === 'group' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Group</label>
                      <select
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                      >
                        <option value="all">All Groups</option>
                        <option value="premium">Premium</option>
                        <option value="standard">Standard</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Demographic</label>
                      <select
                        value={demographicFilter}
                        onChange={(e) => setDemographicFilter(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                      >
                        <option value="all">All Demographics</option>
                        <option value="super_nanny">Super Nanny</option>
                        <option value="active_user">Active User</option>
                        <option value="regular">Regular</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Select All for Group */}
                {grantTarget === 'group' && searchQuery && filteredUsers.length > 0 && (
                  <div style={{ padding: '10px 12px', background: '#fff9f5', border: '1px solid #ffe6d9', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAllUsers}
                      id="select-all"
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="select-all" style={{ fontWeight: '600', color: '#FF6B35', margin: 0, cursor: 'pointer' }}>
                      Select All ({filteredUsers.length})
                    </label>
                  </div>
                )}

                {/* Users/Companies List */}
                <div style={{ border: '1px solid #ffe6d9', borderRadius: '6px', overflowY: 'auto', flex: 1, minHeight: '200px' }}>
                  {(grantTarget === 'individual' || grantTarget === 'group') ? (
                    filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <div
                          key={user.id}
                          onClick={() => {
                            if (grantTarget === 'individual') {
                              handleSelectUser(user);
                            } else {
                              handleToggleUserSelection(user.id);
                            }
                          }}
                          style={{
                            padding: '12px',
                            borderBottom: '1px solid #ffe6d9',
                            cursor: 'pointer',
                            background: grantTarget === 'individual' ? (selectedUser?.id === user.id ? '#fff5f0' : '#fff') : (selectedUsers.has(user.id) ? '#fff5f0' : '#fff'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'background 0.2s'
                          }}
                        >
                          {grantTarget === 'group' && (
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          )}
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FF6B35', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>
                            {user.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>{user.name}</div>
                            <div style={{ fontSize: '10px', color: '#666' }}>ID: {user.id} • {user.username}</div>
                            <div style={{ fontSize: '10px', color: '#FF6B35', fontWeight: '600', marginTop: '2px' }}>Balance: {user.currentPoints} EP</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                        {searchQuery ? 'No users found' : 'Search or select users'}
                      </div>
                    )
                  ) : (
                    filteredCompanies.length > 0 ? (
                      filteredCompanies.map(company => (
                        <div
                          key={company.id}
                          onClick={() => handleSelectCompany(company)}
                          style={{
                            padding: '12px',
                            borderBottom: '1px solid #ffe6d9',
                            cursor: 'pointer',
                            background: selectedCompany?.id === company.id ? '#fff5f0' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4CAF50', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', flexShrink: 0 }}>
                            🏢
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>{company.name}</div>
                            <div style={{ fontSize: '10px', color: '#666' }}>ID: {company.id} • {company.contactPerson} • {company.users} users</div>
                            <div style={{ fontSize: '10px', color: '#4CAF50', fontWeight: '600', marginTop: '2px' }}>Balance: {company.currentPoints} EP</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                        Search companies
                      </div>
                    )
                  )}
                </div>

                {/* Selected Summary */}
                {grantTarget === 'group' && selectedUsers.size > 0 && (
                  <div style={{ padding: '12px', background: '#E8F5E9', border: '1px solid #4CAF50', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#2E7D32', marginBottom: '8px' }}>
                      ✓ {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                    </div>
                    <button
                      onClick={() => setSelectedUsers(new Set())}
                      style={{ width: '100%', padding: '6px', background: '#fff', color: '#4CAF50', border: '1px solid #4CAF50', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}

                {selectedCompany && (
                  <div style={{ padding: '12px', background: '#E8F5E9', border: '1px solid #4CAF50', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#2E7D32', marginBottom: '4px' }}>
                      ✓ {selectedCompany.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>({selectedCompany.users} employees)</div>
                  </div>
                )}
              </div>

              {/* Right: Grant Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Points to Grant *</label>
                  <input
                    type="number"
                    name="pointAmount"
                    value={formData.pointAmount}
                    onChange={handleInputChange}
                    placeholder="e.g., 50, 100, 500"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>SGD Value: ${(Number(formData.pointAmount) || 0) * 0.05}</div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Description/Reason *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="e.g., Super Nanny Monthly Bonus, Q3 Performance Reward..."
                    rows={3}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Personal Message (Optional)</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="e.g., Thank you for being amazing! Keep up the great work! 🌟"
                    rows={2}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {grantTarget === 'group' && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Campaign Name (Optional)</label>
                    <input
                      type="text"
                      name="groupName"
                      value={formData.groupName}
                      onChange={handleInputChange}
                      placeholder="e.g., Q3 Super Nanny Reward Campaign"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Grant Date (Optional - schedule for later)</label>
                  <input
                    type="date"
                    name="grantDate"
                    value={formData.grantDate}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Leave blank to grant immediately</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Valid From</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Valid Until</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedCompany(null);
                      setSelectedUsers(new Set());
                      setFormData({ pointAmount: '', description: '', message: '', startDate: '', endDate: '', groupName: '' });
                    }}
                    style={{ flex: 1, padding: '10px', background: '#f0f0f0', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGrantPoints}
                    style={{ flex: 1, padding: '10px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    🎁 Grant Points
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Groups Tab */}
        {activeTab === 'groups' && (
          <div style={{ background: '#fff', border: '1px solid #ffb88c', borderRadius: '8px', padding: '20px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: 0 }}>👥 Saved User Groups</h3>
              <button
                onClick={() => {
                  setShowCreateGroupModal(true);
                  setSelectedUsers(new Set());
                  setSearchQuery('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#FF6B35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '12px'
                }}
              >
                + Create New Group
              </button>
            </div>

            {savedGroups.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {savedGroups.map(group => (
                  <div key={group.id} style={{ background: '#f9f9f9', border: '1px solid #ffe6d9', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#333' }}>{group.name}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{group.description}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      👥 {group.userIds.length} user{group.userIds.length !== 1 ? 's' : ''} • Created {group.createdDate}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          handleLoadSavedGroup(group.id);
                          setActiveTab('grant');
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#4CAF50',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        Load for Grant
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        style={{
                          padding: '8px 12px',
                          background: '#fff',
                          color: '#FF6B35',
                          border: '1px solid #FF6B35',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                <div style={{ fontSize: '12px', color: '#666' }}>No saved groups yet</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>Create a group to save users for future campaigns</div>
              </div>
            )}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateGroupModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' }}>Create New Group</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Group Name *</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Q3 Super Nannies"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Description (Optional)</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="e.g., All super nanny users for Q3 bonus campaign"
                    rows={2}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#333', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Select Users *</label>
                  <input
                    type="text"
                    placeholder="🔍 Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ffb88c', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }}
                  />

                  {searchQuery && filteredUsers.length > 0 && (
                    <div style={{ padding: '10px 12px', background: '#fff9f5', border: '1px solid #ffe6d9', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAllUsers}
                        id="group-select-all"
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="group-select-all" style={{ fontWeight: '600', color: '#FF6B35', margin: 0, cursor: 'pointer' }}>
                        Select All ({filteredUsers.length})
                      </label>
                    </div>
                  )}

                  <div style={{ border: '1px solid #ffe6d9', borderRadius: '6px', maxHeight: '250px', overflowY: 'auto' }}>
                    {searchQuery && filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <div
                          key={user.id}
                          onClick={() => handleToggleUserSelection(user.id)}
                          style={{
                            padding: '10px',
                            borderBottom: '1px solid #ffe6d9',
                            cursor: 'pointer',
                            background: selectedUsers.has(user.id) ? '#fff5f0' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', flex: 1 }}>{user.name}</div>
                          <div style={{ fontSize: '10px', color: '#666' }}>ID: {user.id}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                        {searchQuery ? 'No users found' : 'Search to select users'}
                      </div>
                    )}
                  </div>

                  {selectedUsers.size > 0 && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: '#E8F5E9', border: '1px solid #4CAF50', borderRadius: '4px', fontSize: '11px', color: '#2E7D32', fontWeight: '600' }}>
                      ✓ {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setNewGroupName('');
                      setNewGroupDescription('');
                      setSelectedUsers(new Set());
                      setSearchQuery('');
                    }}
                    style={{ flex: 1, padding: '10px', background: '#f0f0f0', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    style={{ flex: 1, padding: '10px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div style={{ background: '#fff', border: '1px solid #ffb88c', borderRadius: '8px', padding: '20px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' }}>Active & Scheduled Campaigns</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {campaigns.map(campaign => (
                <div key={campaign.id} style={{ background: '#f9f9f9', border: '1px solid #ffe6d9', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#333' }}>{campaign.name}</div>
                      <div style={{ fontSize: '11px', color: '#FF6B35', fontWeight: '600', marginTop: '4px' }}>{campaign.pointAmount} EP per user</div>
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#fff', background: campaign.status === 'active' ? '#4CAF50' : '#FFC107', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                      {campaign.status}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    📅 {campaign.startDate} to {campaign.endDate}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    👥 {campaign.usersReached} users reached
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    🎯 Target: <span style={{ textTransform: 'capitalize' }}>{campaign.targetGroup}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={{ background: '#fff', border: '1px solid #ffb88c', borderRadius: '8px', padding: '20px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' }}>Grant History</h3>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Granting history and campaign performance metrics coming soon...
            </div>
          </div>
        )}

        {/* Celebration Animation */}
        {showCelebration && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            animation: 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              maxWidth: '300px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', animation: 'bounce 0.6s' }}>🎁</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>Surprise!</div>
              <div style={{ fontSize: '14px', color: '#FF6B35', fontWeight: '700', marginBottom: '12px' }}>
                {celebrationData.points} EP
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                Awarded to {celebrationData.userName}
              </div>
              <div style={{ fontSize: '24px' }}>✨🎉🎊✨</div>
            </div>
            <style>{`
              @keyframes popIn {
                0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.05); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              }
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
            `}</style>
          </div>
        )}

        <style>{`
          @keyframes popIn {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.05); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
};

export default GrantPointsEnhancedPage;
