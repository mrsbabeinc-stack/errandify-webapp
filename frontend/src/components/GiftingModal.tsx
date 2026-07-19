import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface GiftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGift: (data: any) => void;
  userBalance: number;
}

const GiftingModal: React.FC<GiftingModalProps> = ({ isOpen, onClose, onSendGift, userBalance }) => {
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [giftType, setGiftType] = useState<'ep' | 'voucher'>('ep');
  const [selectedVoucher, setSelectedVoucher] = useState<string>('');
  const [epAmount, setEpAmount] = useState('50');
  const [recipients, setRecipients] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [giftDate, setGiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [recipientType, setRecipientType] = useState<'staff' | 'client' | 'partner'>('staff');
  const [savedGroups, setSavedGroups] = useState([
    { id: 1, name: 'Close Friends', members: [2, 3, 4] },
    { id: 2, name: 'Team Members', members: [5, 6, 7, 8] }
  ]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const allUsers = [
    { id: 2, name: 'Sarah Johnson', role: 'Staff' },
    { id: 3, name: 'Mike Chen', role: 'Staff' },
    { id: 4, name: 'Lisa Wong', role: 'Staff' },
    { id: 5, name: 'David Lee', role: 'Manager' },
    { id: 6, name: 'Emma Davis', role: 'Staff' },
    { id: 7, name: 'James Smith', role: 'Staff' },
    { id: 8, name: 'Rachel Brown', role: 'Staff' }
  ];

  const vouchers = [
    { code: 'ERRAND5', name: '$5 Discount', ep: 50 },
    { code: 'ERRAND10', name: '$10 Discount', ep: 100 },
    { code: 'ERRAND20', name: '$20 Discount', ep: 200 },
    { code: 'STARBUCKS', name: 'Starbucks $15', ep: 120 },
    { code: 'KFC', name: 'KFC $20', ep: 150 }
  ];

  const getMessageTemplates = () => {
    const templates: Record<string, string[]> = {
      staff: [
        '🎉 Great work! Here\'s a little reward.',
        '💝 Thank you for your hard work!',
        '⭐ You deserve this bonus!',
        '🌟 Appreciation for your dedication',
        '✨ Well done on your outstanding contribution!',
        '🏆 Your efforts have not gone unnoticed.',
      ],
      client: [
        '🤝 Thank you for your continued partnership!',
        '💎 Appreciate your business and trust in us.',
        '🌟 Looking forward to working together!',
        '✨ Your support means everything to us.',
        '🎯 Grateful for the opportunity to serve you.',
      ],
      partner: [
        '🤝 Excited about our partnership!',
        '🚀 Looking forward to growing together.',
        '💼 Appreciate our collaboration and synergy.',
        '🌟 Here\'s to a successful partnership!',
        '✨ Thank you for being a valued business partner.',
      ]
    };
    return templates[recipientType] || templates.staff;
  };

  const messageTemplates = getMessageTemplates();

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  const calculateCost = () => {
    if (giftType === 'ep') {
      return parseInt(epAmount) * recipients.length;
    } else {
      const voucher = vouchers.find(v => v.code === selectedVoucher);
      return voucher ? voucher.ep * recipients.length : 0;
    }
  };

  const totalCost = calculateCost();
  const canSend = totalCost > 0 && recipients.length > 0 && userBalance >= totalCost;
  const needsMoreEP = totalCost > userBalance && userBalance > 0;
  const epDeficit = totalCost - userBalance;

  // Group management functions
  const handleCreateGroup = () => {
    if (newGroupName.trim() && recipients.length > 0) {
      const newGroup = {
        id: Math.max(...savedGroups.map(g => g.id), 0) + 1,
        name: newGroupName,
        members: [...recipients]
      };
      setSavedGroups([...savedGroups, newGroup]);
      setNewGroupName('');
      setShowGroupForm(false);
    }
  };

  const handleRenameGroup = (groupId: number) => {
    if (editingGroupName.trim()) {
      setSavedGroups(savedGroups.map(g =>
        g.id === groupId ? { ...g, name: editingGroupName } : g
      ));
      setEditingGroupId(null);
      setEditingGroupName('');
    }
  };

  const handleDeleteGroup = (groupId: number) => {
    setSavedGroups(savedGroups.filter(g => g.id !== groupId));
  };

  if (!isOpen) return null;

  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
      <div style={{background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '520px', width: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.2)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #FFF0E6'}}>
          <div>
            <h2 style={{margin: 0, fontSize: '26px', fontWeight: '800', background: 'linear-gradient(135deg, #FF6B35 0%, #E67E22 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>💝 Share the Love</h2>
            <p style={{margin: '6px 0 0 0', fontSize: '13px', color: '#999', fontWeight: '500'}}>Reward your amazing team</p>
          </div>
          <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px', color: '#999', transition: 'color 0.2s'}}>✕</button>
        </div>

        {step === 'details' && (
          <div>
            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', fontWeight: '700', marginBottom: '12px', fontSize: '15px', color: '#333'}}>What would you like to gift? ✨</label>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px'}}>
                <div
                  onClick={() => setGiftType('ep')}
                  style={{
                    border: giftType === 'ep' ? '2px solid #FF6B35' : '2px solid #FFE4C4',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    background: giftType === 'ep' ? 'linear-gradient(135deg, #FFF8F5 0%, #FFEEE4 100%)' : '#FAFAFA',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: giftType === 'ep' ? '0 4px 12px rgba(255, 107, 53, 0.15)' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{fontSize: '32px', marginBottom: '8px'}}>💰</div>
                  <div style={{fontWeight: '700', fontSize: '15px', color: '#333', marginBottom: '3px'}}>Points</div>
                  <div style={{fontSize: '12px', color: '#999'}}>Errandify Points</div>
                </div>
                <div
                  onClick={() => setGiftType('voucher')}
                  style={{
                    border: giftType === 'voucher' ? '2px solid #FF6B35' : '2px solid #FFE4C4',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    background: giftType === 'voucher' ? 'linear-gradient(135deg, #FFF8F5 0%, #FFEEE4 100%)' : '#FAFAFA',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: giftType === 'voucher' ? '0 4px 12px rgba(255, 107, 53, 0.15)' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{fontSize: '32px', marginBottom: '8px'}}>🎁</div>
                  <div style={{fontWeight: '700', fontSize: '15px', color: '#333', marginBottom: '3px'}}>Vouchers</div>
                  <div style={{fontSize: '12px', color: '#999'}}>Discount codes</div>
                </div>
              </div>
            </div>

            {giftType === 'ep' ? (
              <div style={{marginBottom: '24px', padding: '16px', background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE4C4 100%)', borderRadius: '12px', border: '1px solid #FFD9B3'}}>
                <label style={{display: 'block', fontWeight: '700', marginBottom: '10px', fontSize: '14px', color: '#333'}}>💝 How many Points per person?</label>
                <input
                  type="number"
                  value={epAmount}
                  onChange={(e) => setEpAmount(e.target.value)}
                  min="1"
                  step="10"
                  style={{width: '100%', padding: '12px', border: '1px solid #FFD9B3', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', fontWeight: '600', color: '#333'}}
                />
                <div style={{fontSize: '12px', color: '#8B4513', marginTop: '8px', fontWeight: '600'}}>💰 Your balance: <strong>{userBalance} EP</strong></div>
              </div>
            ) : (
              <div style={{marginBottom: '24px', padding: '16px', background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE4C4 100%)', borderRadius: '12px', border: '1px solid #FFD9B3'}}>
                <label style={{display: 'block', fontWeight: '700', marginBottom: '10px', fontSize: '14px', color: '#333'}}>🎉 Which voucher would they love?</label>
                <select
                  value={selectedVoucher}
                  onChange={(e) => setSelectedVoucher(e.target.value)}
                  style={{width: '100%', padding: '12px', border: '1px solid #FFD9B3', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', fontWeight: '600', background: 'white', color: '#333'}}
                >
                  <option value="">✨ Choose a voucher...</option>
                  {vouchers.map(v => (
                    <option key={v.code} value={v.code}>{v.name} ({v.ep} EP)</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', fontWeight: '700', marginBottom: '12px', fontSize: '15px', color: '#333'}}>👥 Who deserves this gift?</label>
              <input
                type="text"
                placeholder="Search for team members..."
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                style={{width: '100%', padding: '12px', border: '2px solid #FFE4C4', borderRadius: '8px', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', fontWeight: '500'}}
              />
              <div style={{background: 'linear-gradient(to bottom, #FAFAFA, #FFFBF8)', border: '1px solid #FFD9B3', borderRadius: '8px', maxHeight: '160px', overflowY: 'auto', padding: '8px'}}>
                {filteredUsers.map(user => (
                  <label key={user.id} style={{display: 'flex', alignItems: 'center', padding: '10px', cursor: 'pointer', borderRadius: '6px', transition: 'background 0.2s', background: recipients.includes(user.id) ? '#FFF3E0' : 'transparent'}}>
                    <input
                      type="checkbox"
                      checked={recipients.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRecipients([...recipients, user.id]);
                        } else {
                          setRecipients(recipients.filter(r => r !== user.id));
                        }
                      }}
                      style={{marginRight: '10px', cursor: 'pointer', accentColor: '#FF6B35'}}
                    />
                    <div style={{flex: 1}}>
                      <div style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>{user.name}</div>
                      <div style={{fontSize: '12px', color: '#B8860B'}}>{user.role}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick Groups & Group Management */}
            <div style={{marginBottom: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                <label style={{fontWeight: '700', fontSize: '14px', color: '#8B4513'}}>👥 Saved Groups</label>
                <button
                  onClick={() => setShowGroupForm(!showGroupForm)}
                  style={{padding: '4px 12px', background: '#FFE4C4', border: 'none', borderRadius: '16px', fontSize: '12px', fontWeight: '600', color: '#FF6B35', cursor: 'pointer', transition: 'all 0.2s'}}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FFD9B3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFE4C4'}
                >
                  {showGroupForm ? '✕ Cancel' : '+ New Group'}
                </button>
              </div>

              {showGroupForm && (
                <div style={{background: 'linear-gradient(135deg, #FFF9F0 0%, #FFFAF7 100%)', border: '2px solid #FFE4C4', borderRadius: '10px', padding: '14px', marginBottom: '14px'}}>
                  <label style={{display: 'block', fontSize: '12px', fontWeight: '700', color: '#8B4513', marginBottom: '8px'}}>📝 Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Executive Team"
                    style={{width: '100%', padding: '10px', border: '1px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box', fontWeight: '500'}}
                  />
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim() || recipients.length === 0}
                      style={{flex: 1, padding: '8px', background: (newGroupName.trim() && recipients.length > 0) ? '#FF6B35' : '#CCC', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: (newGroupName.trim() && recipients.length > 0) ? 'pointer' : 'not-allowed', transition: 'all 0.2s'}}
                    >
                      ✅ Create Group
                    </button>
                  </div>
                  {recipients.length === 0 && <p style={{fontSize: '11px', color: '#E74C3C', margin: '8px 0 0 0', fontWeight: '600'}}>⚠️ Please select recipients first</p>}
                </div>
              )}

              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                {savedGroups.length === 0 ? (
                  <p style={{fontSize: '12px', color: '#999', margin: 0}}>No groups yet. Create one to save time!</p>
                ) : (
                  savedGroups.map(group => (
                    <div
                      key={group.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
                        group: 'group-button'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecipients(group.members);
                        }}
                        style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer', flex: 1, fontWeight: '700', fontSize: '12px'}}
                      >
                        {editingGroupId === group.id ? (
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{width: '80px', padding: '2px 4px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '11px', borderRadius: '3px'}}
                            autoFocus
                          />
                        ) : (
                          group.name
                        )}
                      </button>
                      {editingGroupId === group.id ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameGroup(group.id);
                            }}
                            style={{background: 'rgba(255,255,255,0.3)', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: '700'}}
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGroupId(null);
                              setEditingGroupName('');
                            }}
                            style={{background: 'rgba(255,255,255,0.3)', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: '700'}}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGroupId(group.id);
                              setEditingGroupName(group.name);
                            }}
                            style={{background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: '700'}}
                            title="Rename"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                            style={{background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: '700'}}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', fontWeight: '700', marginBottom: '12px', fontSize: '15px', color: '#333'}}>👨‍💼 Who's receiving this?</label>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px'}}>
                {(['staff', 'client', 'partner'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setRecipientType(type)}
                    style={{
                      padding: '12px',
                      background: recipientType === type ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)' : 'linear-gradient(135deg, #FFF3E0 0%, #FFE4C4 100%)',
                      color: recipientType === type ? 'white' : '#333',
                      border: recipientType === type ? '2px solid #FF6B35' : '2px solid #FFD9B3',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {type === 'staff' && '👥 Staff'}
                    {type === 'client' && '🤝 Client'}
                    {type === 'partner' && '💼 Partner'}
                  </button>
                ))}
              </div>
              <div style={{fontSize: '12px', color: '#8B4513', marginTop: '8px', fontWeight: '500'}}>📝 Messages will be tailored for {recipientType === 'staff' ? 'your team' : recipientType === 'client' ? 'clients' : 'partners'}</div>
            </div>

            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', fontWeight: '700', marginBottom: '12px', fontSize: '15px', color: '#333'}}>📅 When to send?</label>
              <input
                type="date"
                value={giftDate}
                onChange={(e) => setGiftDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{width: '100%', padding: '12px', border: '2px solid #FFE4C4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontWeight: '600'}}
              />
              <div style={{fontSize: '12px', color: '#8B4513', marginTop: '8px', fontWeight: '600'}}>
                {giftDate === new Date().toISOString().split('T')[0] ? '🚀 Send immediately' : `📅 Scheduled for ${new Date(giftDate).toLocaleDateString()}`}
              </div>
            </div>

            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', fontWeight: '700', marginBottom: '12px', fontSize: '15px', color: '#333'}}>💬 Add a personal note (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell them why they're awesome..."
                maxLength={100}
                style={{width: '100%', padding: '12px', border: '2px solid #FFE4C4', borderRadius: '8px', fontSize: '14px', minHeight: '70px', fontFamily: 'inherit', boxSizing: 'border-box', fontWeight: '500'}}
              />
              <div style={{fontSize: '12px', color: '#8B4513', marginTop: '8px', fontWeight: '600'}}>{message.length}/100 characters</div>
            </div>

            {!message && (
              <div style={{marginBottom: '24px'}}>
                <div style={{fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#8B4513'}}>✨ Message Templates ({recipientType === 'staff' ? 'for staff' : recipientType === 'client' ? 'for clients' : 'for partners'})</div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '8px'}}>
                  {messageTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMessage(template)}
                      style={{padding: '10px', background: 'linear-gradient(to right, #FFF8F5, #FFEEE4)', border: '1px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500', color: '#333', transition: 'all 0.2s', textAlign: 'left'}}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FFF3E0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #FFF8F5, #FFEEE4)'}
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '12px', marginBottom: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px'}}>
                <span>Recipients</span>
                <span style={{fontWeight: '600'}}>{recipients.length}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', paddingBottom: '8px', borderBottom: '1px solid #FFD5C0'}}>
                <span>{giftType === 'ep' ? 'Per person' : 'Per voucher'}</span>
                <span style={{fontWeight: '600'}}>{giftType === 'ep' ? `${epAmount} EP` : `${vouchers.find(v => v.code === selectedVoucher)?.ep || 0} EP`}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', color: '#FF6B35'}}>
                <span>Total Cost</span>
                <span>{totalCost} EP</span>
              </div>
            </div>

            <div style={{background: 'linear-gradient(135deg, #FFF9F0 0%, #FFFAF7 100%)', border: '1px solid #FFE4C4', borderRadius: '10px', padding: '14px', marginBottom: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: '600'}}>
                <span style={{color: '#8B4513'}}>Recipients</span>
                <span style={{color: '#FF6B35'}}>{recipients.length} {recipients.length === 1 ? 'person' : 'people'}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: '600', paddingBottom: '10px', borderBottom: '1px solid #FFE4C4'}}>
                <span style={{color: '#8B4513'}}>{giftType === 'ep' ? 'Per person' : 'Per voucher'}</span>
                <span style={{color: '#333'}}>{giftType === 'ep' ? `${epAmount} EP` : `${vouchers.find(v => v.code === selectedVoucher)?.ep || 0} EP`}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', color: '#FF6B35'}}>
                <span>💰 Total Cost</span>
                <span>{totalCost} EP</span>
              </div>
            </div>

            {needsMoreEP && (
              <div style={{background: 'linear-gradient(135deg, #FFF9F0 0%, #FFFAF7 100%)', border: '2px solid #FFD9B3', borderRadius: '12px', padding: '16px', marginBottom: '24px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                  <div style={{fontSize: '24px'}}>💳</div>
                  <div>
                    <div style={{fontSize: '14px', fontWeight: '700', color: '#333'}}>Need More EP?</div>
                    <div style={{fontSize: '12px', color: '#666'}}>Buy EP to complete this gift</div>
                  </div>
                </div>
                <div style={{background: 'white', border: '1px solid #FFE4C4', borderRadius: '8px', padding: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <div style={{fontSize: '12px', color: '#666'}}>You need</div>
                    <div style={{fontSize: '18px', fontWeight: '700', color: '#FF6B35'}}>{epDeficit} more EP</div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '12px', color: '#666'}}>Approx cost:</div>
                    <div style={{fontSize: '16px', fontWeight: '700', color: '#333'}}>SGD ${(epDeficit * 0.01 + (epDeficit * 0.01 * 0.029 + 0.30)).toFixed(2)}</div>
                    <div style={{fontSize: '10px', color: '#999'}}>incl. Stripe fees</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const buyEpURL = `/company/dashboard#`;
                    window.location.href = buyEpURL;
                    onClose();
                  }}
                  style={{width: '100%', padding: '12px', background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '8px'}}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  💳 Buy {epDeficit} EP Now
                </button>
                <div style={{fontSize: '12px', color: '#999', textAlign: 'center'}}>After purchasing, return here to complete your gift</div>
              </div>
            )}

            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => setStep('details')}
                style={{flex: 1, padding: '14px', background: 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)', border: '1px solid #DDD', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', color: '#333', transition: 'all 0.2s'}}
                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #E8E8E8 0%, #DDD 100%)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)'}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!canSend}
                style={{flex: 1, padding: '14px', background: canSend ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)' : 'linear-gradient(135deg, #CCC 0%, #BBB 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: canSend ? 'pointer' : 'not-allowed', fontSize: '15px', transition: 'all 0.2s', boxShadow: canSend ? '0 4px 12px rgba(255, 107, 53, 0.3)' : 'none'}}
                onMouseEnter={(e) => canSend && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => canSend && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                Review & Confirm →
              </button>
            </div>
            {!canSend && !needsMoreEP && (
              <div style={{fontSize: '13px', color: '#E74C3C', marginTop: '12px', textAlign: 'center', fontWeight: '600'}}>
                ⚠️ Select recipients and gift details
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <div style={{textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #FFF0E6'}}>
              <div style={{fontSize: '56px', marginBottom: '12px'}}>🎉</div>
              <h3 style={{margin: '0 0 6px 0', fontSize: '22px', fontWeight: '800', background: 'linear-gradient(135deg, #FF6B35 0%, #E67E22 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Almost There!</h3>
              <p style={{margin: 0, fontSize: '14px', color: '#8B4513', fontWeight: '500'}}>Review everything one more time</p>
            </div>

            <div style={{background: 'linear-gradient(135deg, #FFF9F0 0%, #FFFAF7 100%)', border: '2px solid #FFE4C4', borderRadius: '12px', padding: '18px', marginBottom: '24px'}}>
              <div style={{marginBottom: '16px'}}>
                <div style={{fontSize: '12px', color: '#8B4513', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase'}}>🎁 Gift Type</div>
                <div style={{fontWeight: '700', fontSize: '15px', color: '#333'}}>
                  {giftType === 'ep' ? `💰 ${epAmount} EP per person` : `🎟️ ${vouchers.find(v => v.code === selectedVoucher)?.name}`}
                </div>
              </div>

              <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #FFD9B3'}}>
                <div style={{fontSize: '12px', color: '#8B4513', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase'}}>👥 Recipients ({recipients.length})</div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                  {recipients.map(recipientId => {
                    const user = allUsers.find(u => u.id === recipientId);
                    return (
                      <div key={recipientId} style={{background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)', color: 'white', padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700'}}>
                        {user?.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              {message && (
                <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #FFD9B3'}}>
                  <div style={{fontSize: '12px', color: '#8B4513', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase'}}>💬 Your Message</div>
                  <div style={{fontSize: '14px', color: '#333', fontStyle: 'italic', fontWeight: '500'}}>"{message}"</div>
                </div>
              )}

              <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #FFD9B3'}}>
                <div style={{fontSize: '12px', color: '#8B4513', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase'}}>👨‍💼 Recipient Type</div>
                <div style={{fontWeight: '700', fontSize: '14px', color: '#333'}}>
                  {recipientType === 'staff' && '👥 Staff Member'}
                  {recipientType === 'client' && '🤝 Client'}
                  {recipientType === 'partner' && '💼 Business Partner'}
                </div>
              </div>

              <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #FFD9B3'}}>
                <div style={{fontSize: '12px', color: '#8B4513', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase'}}>📅 Sending</div>
                <div style={{fontWeight: '700', fontSize: '14px', color: '#333'}}>
                  {giftDate === new Date().toISOString().split('T')[0] ? '🚀 Sending Now!' : `📅 ${new Date(giftDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
                </div>
              </div>

              <div style={{background: 'linear-gradient(to right, #FFF3E0, #FFEEE4)', padding: '12px', borderRadius: '8px', border: '1px solid #FFD9B3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700'}}>
                <span style={{color: '#8B4513', fontSize: '15px'}}>💰 Total Cost</span>
                <span style={{color: '#FF6B35', fontSize: '18px'}}>{totalCost} EP</span>
              </div>
            </div>

            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => setStep('details')}
                style={{flex: 1, padding: '14px', background: 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)', border: '1px solid #DDD', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', color: '#333', transition: 'all 0.2s'}}
                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #E8E8E8 0%, #DDD 100%)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)'}
              >
                ← Edit Details
              </button>
              <button
                onClick={() => {
                  onSendGift({
                    giftType,
                    amount: giftType === 'ep' ? parseInt(epAmount) : null,
                    voucherCode: giftType === 'voucher' ? selectedVoucher : null,
                    recipientIds: recipients,
                    message,
                    totalCost,
                    giftDate,
                    recipientType
                  });
                  setStep('details');
                  setRecipients([]);
                  setMessage('');
                  setEpAmount('50');
                  setSelectedVoucher('');
                  setGiftDate(new Date().toISOString().split('T')[0]);
                  setRecipientType('staff');
                }}
                style={{flex: 1, padding: '14px', background: 'linear-gradient(135deg, #27AE60 0%, #1E8449 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)'}}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🎉 Send Gift Now!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftingModal;
